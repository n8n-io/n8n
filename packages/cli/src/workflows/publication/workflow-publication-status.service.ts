import type { WorkflowPublicationStatus, WorkflowListPublicationStatus } from '@n8n/api-types';
import {
	WorkflowPublicationOutboxRepository,
	UNPUBLISH_VERSION_SENTINEL,
	type OperationContext,
	type WorkflowPublicationTriggerStatus,
	WorkflowPublicationTriggerStatusRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError, UserError } from '@n8n/errors';
import { withTimeout } from '@n8n/utils/promise/with-timeout';
import { sleep } from '@n8n/utils/sleep';
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
	) {}

	/**
	 * Get the publication status of a workflow.
	 *
	 * The status is derived from the in-flight publication (if any) and the current
	 * trigger statuses. The outbox is consulted only to detect an in-flight
	 * publication; settled state comes entirely from the trigger statuses.
	 *
	 * NOTE: we only update the trigger statuses when a publication is completed,
	 * so if there is a publication in progress, the trigger statuses may not reflect the latest state.
	 */
	async getStatus(
		workflowId: string,
		ctx: OperationContext = {},
	): Promise<WorkflowPublicationStatus> {
		const { publicationStatus } = await this.getStatusWithTriggerRows(workflowId, ctx);
		return publicationStatus;
	}

	private async getStatusWithTriggerRows(workflowId: string, ctx: OperationContext = {}) {
		const [inFlightPublication, currentTriggerStatuses] = await Promise.all([
			this.outboxRepository.findInFlightByWorkflowId(workflowId, ctx),
			this.triggerStatusRepository.findByWorkflowId(workflowId, ctx),
		]);

		const triggers = currentTriggerStatuses.map((r) => ({
			nodeId: r.nodeId,
			status: r.status,
			errorMessage: r.errorMessage,
		}));

		const isPublishing = inFlightPublication !== null;
		const pendingVersionId = inFlightPublication?.publishedVersionId ?? null;

		// The settled rows ARE the running triggers; if none are activated, nothing is live.
		const activatedRow = currentTriggerStatuses.find((r) => r.status === 'activated');
		const liveVersionId = activatedRow?.versionId ?? null;

		const status = this.deriveStatus(isPublishing, currentTriggerStatuses);
		return {
			publicationStatus: { status, liveVersionId, pendingVersionId, triggers },
			triggerRows: currentTriggerStatuses,
		};
	}

	/** Include the latest request so callers can correlate failures that have no trigger rows. */
	async getLatestStatus(workflowId: string): Promise<WorkflowPublicationStatusWithDetails> {
		const latestPublication = await this.outboxRepository.findLatestByWorkflowId(workflowId);
		const { publicationStatus: status, triggerRows } =
			await this.getStatusWithTriggerRows(workflowId);
		// Cleanup can retain an old failure after a newer completed record expires.
		const publication =
			latestPublication &&
			latestPublication.status !== 'pending' &&
			latestPublication.status !== 'in_progress' &&
			triggerRows.some((row) => row.updatedAt > latestPublication.updatedAt)
				? null
				: latestPublication;
		const versionId =
			publication?.publishedVersionId ??
			status.pendingVersionId ??
			triggerRows[0]?.versionId ??
			null;
		const failures = status.triggers.filter((trigger) => trigger.status === 'failed');
		const result: WorkflowPublicationStatusWithDetails = {
			...status,
			versionId: versionId === UNPUBLISH_VERSION_SENTINEL ? null : versionId,
			errorMessage: failures.length
				? formatFailedActivationError(
						failures.map((trigger) => ({
							nodeName: trigger.nodeId,
							message: trigger.errorMessage || UNKNOWN_FAILURE_REASON,
						})),
					)
				: null,
		};

		if (publication?.status === 'pending' || publication?.status === 'in_progress') {
			return {
				...result,
				status: 'in_progress',
				pendingVersionId: result.versionId,
				errorMessage: null,
			};
		}
		if (status.status === 'in_progress') return { ...result, errorMessage: null };

		if (publication?.status === 'failed' || publication?.status === 'partial_success') {
			return {
				...result,
				status: publication.status === 'failed' ? 'failed' : 'partial',
				errorMessage: publication.errorMessage ?? UNKNOWN_FAILURE_REASON,
			};
		}

		return result;
	}

	/** Wait for this version only. Return a pollable state when the wait expires. */
	async waitForPublication(
		workflowId: string,
		versionId: string,
		timeoutMs = 5_000,
	): Promise<WorkflowPublicationStatusWithDetails> {
		let pending: WorkflowPublicationStatusWithDetails = {
			status: 'in_progress',
			versionId,
			liveVersionId: null,
			pendingVersionId: versionId,
			triggers: [],
			errorMessage: null,
		};
		const controller = new AbortController();
		const timeout = new OperationalError('Workflow publication is still in progress');
		const poll = async () => {
			while (!controller.signal.aborted) {
				const status = await this.getLatestStatus(workflowId);
				if (controller.signal.aborted) break;
				if (
					status.status === 'not_published' ||
					(status.versionId !== null && status.versionId !== versionId)
				) {
					throw new UserError(
						'Another publication replaced this request. Check the current workflow publication status.',
					);
				}
				const settled =
					status.status === 'failed' ||
					((status.status === 'published' || status.status === 'partial') &&
						status.liveVersionId === versionId);
				if (status.versionId === versionId && settled) {
					return status;
				}
				pending = {
					...status,
					status: 'in_progress',
					versionId,
					pendingVersionId: versionId,
					errorMessage: null,
				};
				await sleep(100, controller.signal);
			}
			return pending;
		};

		try {
			return await withTimeout(poll(), timeoutMs, () => timeout);
		} catch (error) {
			if (error === timeout) return pending;
			throw error;
		} finally {
			controller.abort(timeout);
		}
	}

	/**
	 * Batch-derive the terminal publication status for many workflows, for the list view.
	 *
	 * Unlike getStatus, this does NOT consult the outbox: the list surfaces only settled
	 * states (published/partial/failed) and deliberately never shows in_progress. Workflows
	 * with no trigger rows are omitted (the card falls back to its legacy indicator).
	 */
	async getListStatusesByWorkflowIds(
		workflowIds: string[],
	): Promise<Map<string, WorkflowListPublicationStatus>> {
		const counts = await this.triggerStatusRepository.getStatusCountsByWorkflowIds(workflowIds);

		const statuses = new Map<string, WorkflowListPublicationStatus>();
		// getStatusCountsByWorkflowIds only returns workflows with ≥1 settled row, so total is always ≥1.
		for (const [workflowId, { total, failed }] of counts) {
			statuses.set(workflowId, this.deriveSettledStatus(total, failed));
		}
		return statuses;
	}

	/**
	 * The activation error of a workflow whose last publication failed, worded
	 * like the outbox record and the push on the activation-outcome path. Null
	 * unless every trigger row is `failed`. Rows carry no node name and no order,
	 * so `nodes` supplies both (nodeId fallback, unknown ids last, by id).
	 */
	async getFailedActivationError(
		workflowId: string,
		nodes: Array<Pick<INode, 'id' | 'name'>>,
	): Promise<string | null> {
		const rows = await this.triggerStatusRepository.findByWorkflowId(workflowId);
		if (this.deriveStatus(false, rows) !== 'failed') return null;

		const position = new Map(nodes.map((node, index) => [node.id, index]));
		const at = (row: WorkflowPublicationTriggerStatus) => position.get(row.nodeId) ?? nodes.length;
		const ordered = [...rows].sort((a, b) => at(a) - at(b) || a.nodeId.localeCompare(b.nodeId));
		return formatFailedActivationError(
			ordered.map((row) => ({
				nodeName: nodes[at(row)]?.name ?? row.nodeId, // unknown id: index out of range
				message: row.errorMessage || UNKNOWN_FAILURE_REASON,
			})),
		);
	}

	private deriveStatus(
		isPublishing: boolean,
		currentTriggerStatuses: WorkflowPublicationTriggerStatus[],
	): WorkflowPublicationStatus['status'] {
		if (isPublishing) return 'in_progress';
		if (currentTriggerStatuses.length === 0) return 'not_published';
		const failed = currentTriggerStatuses.filter((r) => r.status === 'failed').length;
		return this.deriveSettledStatus(currentTriggerStatuses.length, failed);
	}

	/**
	 * The one settled-state ladder, shared by the detail and list derivations so
	 * the two endpoints can never disagree about the same trigger rows.
	 */
	private deriveSettledStatus(total: number, failed: number): WorkflowListPublicationStatus {
		if (failed === 0) return 'published';
		return failed < total ? 'partial' : 'failed';
	}
}
