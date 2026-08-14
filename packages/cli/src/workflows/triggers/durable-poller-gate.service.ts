import { Logger } from '@n8n/backend-common';
import { PollerStateRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { NodeTypes } from '@/node-types';
import { Telemetry } from '@/telemetry';

import { WorkflowPublishedDataService } from '../workflow-published-data.service';
import { WorkflowValidationService } from '../workflow-validation.service';
import { getEnabledTriggerNodes } from './enabled-trigger-nodes';

@Service()
export class DurablePollerGateService {
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

		for (const id of ids) {
			const data = await this.workflowPublishedDataService.getPublishedWorkflowData(id);
			if (data === null) {
				continue;
			}

			const triggerNodes = getEnabledTriggerNodes(data.publishedVersion, this.nodeTypes);

			const result = this.workflowValidationService.validateTriggerNodeIds(triggerNodes);

			if (!result.isValid) {
				offenders.push({ workflowId: id, detail: result.error ?? 'invalid trigger node ids' });
			}
		}

		if (offenders.length > 0) {
			const workflowIds = offenders.map(({ workflowId }) => workflowId);
			this.allowed_ = false;
			this.logger.error(
				`Durable pollers are disabled on this instance: active workflows [${workflowIds.join(', ')}] have duplicate or missing trigger node ids in their published version. Re-publish them after removing and re-adding the affected trigger nodes.`,
				{ offenders },
			);
			this.telemetry.track(TELEMETRY_EVENT.INSTANCE.INSTANCE_REFUSED_DURABLE_POLLERS, {
				workflow_ids: workflowIds,
			});
			await this.pollerStateRepository.deleteWorkflowCursors(workflowIds);
		} else {
			this.allowed_ = true;
		}
	}
}
