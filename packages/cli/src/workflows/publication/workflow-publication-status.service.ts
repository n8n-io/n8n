import type { WorkflowPublicationStatus, WorkflowListPublicationStatus } from '@n8n/api-types';
import {
	WorkflowPublicationOutboxRepository,
	UNPUBLISH_VERSION_SENTINEL,
	type OperationContext,
	type WorkflowPublicationOutbox,
	type WorkflowPublicationTriggerStatus,
	WorkflowPublicationTriggerStatusRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError } from '@n8n/errors';
import { withTimeout } from '@n8n/utils/promise/with-timeout';
import { sleep } from '@n8n/utils/sleep';
import groupBy from 'lodash/groupBy';
import type { INode } from 'n8n-workflow';

import { UNKNOWN_FAILURE_REASON } from '@/constants';
import { formatFailedActivationError } from '@/workflows/publication/format-node-failures';

export type WorkflowPublicationStatusWithDetails = WorkflowPublicationStatus & {
	versionId: string | null;
	errorMessage: string | null;
};

@Service()
export class WorkflowPublicationStatusService {
	constructor(
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly triggerStatusRepository: WorkflowPublicationTriggerStatusRepository,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	/** Report the current request outcome and the triggers that still run. */
	async getStatus(
		workflowId: string,
		ctx: OperationContext = {},
	): Promise<WorkflowPublicationStatus> {
		const { status, liveVersionId, pendingVersionId, triggers } = await this.readStatus(
			workflowId,
			ctx,
		);
		return { status, liveVersionId, pendingVersionId, triggers };
	}

	/** Include the request version and error for publication callers. */
	async getLatestStatus(workflowId: string): Promise<WorkflowPublicationStatusWithDetails> {
		return await this.readStatus(workflowId);
	}

	private async readStatus(
		workflowId: string,
		ctx: OperationContext = {},
		nodes: Array<Pick<INode, 'id' | 'name'>> = [],
	): Promise<WorkflowPublicationStatusWithDetails> {
		const [record, rows, activeVersions] = await Promise.all([
			this.outboxRepository.findLatestByWorkflowId(workflowId, ctx),
			this.triggerStatusRepository.findByWorkflowId(workflowId, ctx),
			this.workflowRepository.findActiveVersionIds([workflowId], ctx),
		]);
		return this.derivePublicationStatus(
			record,
			rows,
			activeVersions.get(workflowId) ?? null,
			true,
			nodes,
		);
	}

	/** Wait for this version only. Return the latest state when the wait expires or is replaced. */
	async waitForPublication(
		workflowId: string,
		versionId: string,
		timeoutMs = 5_000,
	): Promise<WorkflowPublicationStatusWithDetails> {
		const deadline = Date.now() + timeoutMs;
		// A blocked first read must still return a pollable response at the deadline.
		let status: WorkflowPublicationStatusWithDetails = {
			status: 'in_progress',
			versionId,
			liveVersionId: null,
			pendingVersionId: versionId,
			triggers: [],
			errorMessage: null,
		};
		const timeout = new OperationalError('Workflow publication is still in progress');
		try {
			do {
				status = await withTimeout(
					this.getLatestStatus(workflowId),
					Math.max(0, deadline - Date.now()),
					() => timeout,
				);
				if (!this.isWaitingForPublication(status, versionId)) break;
				await sleep(Math.max(0, Math.min(100, deadline - Date.now())));
			} while (Date.now() < deadline);
		} catch (error) {
			if (error !== timeout) throw error;
		}
		return status;
	}

	private isWaitingForPublication(
		status: WorkflowPublicationStatusWithDetails,
		versionId: string,
	): boolean {
		return (
			status.versionId === versionId &&
			(status.status === 'in_progress' ||
				((status.status === 'published' || status.status === 'partial') &&
					status.liveVersionId !== versionId))
		);
	}

	/** Share settled outcomes and live versions with list and activity readers. */
	async getSettledStatusesByWorkflowIds(
		workflowIds: string[],
	): Promise<Map<string, WorkflowPublicationStatusWithDetails>> {
		const [records, rows, activeVersions] = await Promise.all([
			this.outboxRepository.findLatestByWorkflowIds(workflowIds),
			this.triggerStatusRepository.findByWorkflowIds(workflowIds),
			this.workflowRepository.findActiveVersionIds(workflowIds),
		]);
		const recordsByWorkflowId = new Map(records.map((record) => [record.workflowId, record]));
		const rowsByWorkflowId = groupBy(rows, 'workflowId');
		return new Map(
			workflowIds.map((workflowId) => [
				workflowId,
				this.derivePublicationStatus(
					recordsByWorkflowId.get(workflowId) ?? null,
					rowsByWorkflowId[workflowId] ?? [],
					activeVersions.get(workflowId) ?? null,
					false,
				),
			]),
		);
	}

	/** Omit unpublished workflows. Keep the last settled state while a request is in flight. */
	async getListStatusesByWorkflowIds(
		workflowIds: string[],
	): Promise<Map<string, WorkflowListPublicationStatus>> {
		const publications = await this.getSettledStatusesByWorkflowIds(workflowIds);
		const statuses = new Map<string, WorkflowListPublicationStatus>();
		for (const [workflowId, { status }] of publications) {
			if (status === 'published' || status === 'partial' || status === 'failed') {
				statuses.set(workflowId, status);
			}
		}
		return statuses;
	}

	/** Report the current publication failure. Use node names when only trigger rows remain. */
	async getFailedActivationError(
		workflowId: string,
		nodes: Array<Pick<INode, 'id' | 'name'>>,
	): Promise<string | null> {
		const publication = await this.readStatus(workflowId, {}, nodes);
		return publication.status === 'failed' ? publication.errorMessage : null;
	}

	private derivePublicationStatus(
		record: WorkflowPublicationOutbox | null,
		rows: WorkflowPublicationTriggerStatus[],
		activeVersionId: string | null,
		includeInFlight: boolean,
		nodes: Array<Pick<INode, 'id' | 'name'>> = [],
	): WorkflowPublicationStatusWithDetails {
		const inFlight = record?.status === 'pending' || record?.status === 'in_progress';
		// Cleanup can retain a failure after a newer publish or unpublish record expires.
		const request =
			record &&
			(inFlight ||
				(record.publishedVersionId === activeVersionId &&
					!rows.some((row) => row.updatedAt > record.updatedAt)))
				? record
				: null;
		const outcome =
			request?.status === 'failed'
				? 'failed'
				: request?.status === 'partial_success'
					? 'partial'
					: undefined;
		const requestedVersionId = request?.publishedVersionId ?? rows[0]?.versionId ?? null;
		const versionId = requestedVersionId === UNPUBLISH_VERSION_SENTINEL ? null : requestedVersionId;
		return {
			status: includeInFlight && inFlight ? 'in_progress' : (outcome ?? this.deriveStatus(rows)),
			versionId,
			liveVersionId: rows.find((row) => row.status === 'activated')?.versionId ?? null,
			pendingVersionId: inFlight ? versionId : null,
			triggers: rows.map(({ nodeId, status, errorMessage }) => ({ nodeId, status, errorMessage })),
			errorMessage: inFlight
				? null
				: outcome
					? (request?.errorMessage ?? UNKNOWN_FAILURE_REASON)
					: this.formatRowFailures(rows, nodes),
		};
	}

	private formatRowFailures(
		rows: WorkflowPublicationTriggerStatus[],
		nodes: Array<Pick<INode, 'id' | 'name'>>,
	): string | null {
		const failures = rows.filter((row) => row.status === 'failed');
		if (failures.length === 0) return null;
		const position = new Map(nodes.map((node, index) => [node.id, index]));
		const at = (row: WorkflowPublicationTriggerStatus) => position.get(row.nodeId) ?? nodes.length;
		failures.sort((a, b) => at(a) - at(b) || a.nodeId.localeCompare(b.nodeId));
		return formatFailedActivationError(
			failures.map((row) => ({
				nodeName: nodes[at(row)]?.name ?? row.nodeId,
				message: row.errorMessage || UNKNOWN_FAILURE_REASON,
			})),
		);
	}

	private deriveStatus(
		rows: WorkflowPublicationTriggerStatus[],
	): WorkflowPublicationStatus['status'] {
		if (rows.length === 0) return 'not_published';
		const failed = rows.filter((row) => row.status === 'failed').length;
		if (failed === 0) return 'published';
		return failed < rows.length ? 'partial' : 'failed';
	}
}
