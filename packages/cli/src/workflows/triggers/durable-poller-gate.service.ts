import { Logger } from '@n8n/backend-common';
import { PollerStateRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { NodeTypes } from '@/node-types';
import { Telemetry } from '@/telemetry';

import { WorkflowPublishedDataService } from '../workflow-published-data.service';
import { WorkflowValidationService } from '../workflow-validation.service';
import { getEnabledTriggerNodes } from './enabled-trigger-nodes';

/**
 * Boot-time safety check for durable pollers: refuses both durable cursors and
 * durable-scheduler poll triggers instance-wide when an active workflow's
 * published version has duplicate or missing trigger node ids — two such nodes
 * would share one `poller_state` row and one durable job. Deliberately
 * disposable: becomes dead code when CAT-4056's heal-before-activate lands.
 */
@Service()
export class DurablePollerGateService {
	/** Fail-closed: durable pollers stay off until a scan has completed clean. */
	private allowed_ = false;

	get allowed() {
		return this.allowed_;
	}

	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowPublishedDataService: WorkflowPublishedDataService,
		private readonly workflowValidationService: WorkflowValidationService,
		private readonly nodeTypes: NodeTypes,
		private readonly pollerStateRepository: PollerStateRepository,
		private readonly telemetry: Telemetry,
	) {
		this.logger = this.logger.scoped('poll-trigger');
	}

	/**
	 * Boot-only by design: mid-process arrivals of faulty data (source-control
	 * pull, legacy-path republish) are an accepted residual until CAT-4056's
	 * heal-before-activate checks at import/activation time. A leader-takeover
	 * re-check was deliberately dropped — it would remediate at an arbitrary
	 * point after the harm began.
	 */
	async init() {
		const ids = await this.workflowRepository.getActiveIds();
		const offenders: Array<{ workflowId: string; detail: string }> = [];
		const unscannable: Array<{ workflowId: string; detail: string }> = [];

		for (const id of ids) {
			try {
				const data = await this.workflowPublishedDataService.getPublishedWorkflowData(id);
				if (data === null) {
					continue;
				}

				const triggerNodes = getEnabledTriggerNodes(data.publishedVersion, this.nodeTypes);

				const result = this.workflowValidationService.validateTriggerNodeIds(triggerNodes);

				if (!result.isValid) {
					offenders.push({ workflowId: id, detail: result.error ?? 'invalid trigger node ids' });
				}
			} catch (error) {
				// A workflow that cannot be scanned (e.g. node-type resolution throws
				// for an uninstalled community node) must never crash startup. It
				// cannot be verified either, so it closes the gate — but its rows are
				// kept: without a scan there is no confirmed duplicate to justify
				// deleting cursor state.
				unscannable.push({ workflowId: id, detail: ensureError(error).message });
			}
		}

		this.allowed_ = offenders.length === 0 && unscannable.length === 0;

		if (unscannable.length > 0) {
			this.logger.error(
				`Durable pollers are disabled on this instance: active workflows [${unscannable.map(({ workflowId }) => workflowId).join(', ')}] could not be scanned for duplicate trigger node ids. Fix the reported error, e.g. by installing the missing node package, then restart.`,
				{ unscannable },
			);
		}

		if (offenders.length > 0) {
			const workflowIds = offenders.map(({ workflowId }) => workflowId);
			// Deletion is terminal only because the gate keeps `enabled` false —
			// otherwise the next poll would recreate the rows via getOrCreateCursor.
			const deletedCursorRows = await this.pollerStateRepository.deleteWorkflowCursors(workflowIds);
			this.logger.error(
				`Durable pollers are disabled on this instance: active workflows [${workflowIds.join(', ')}] have duplicate or missing trigger node ids in their published version. Re-publish them after removing and re-adding the affected trigger nodes.`,
				{ offenders, deletedCursorRows },
			);
			this.telemetry.track(TELEMETRY_EVENT.INSTANCE.INSTANCE_REFUSED_DURABLE_POLLERS, {
				workflow_ids: workflowIds,
				deleted_cursor_rows: deletedCursorRows,
			});
		}
	}
}
