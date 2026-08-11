import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { BreakingChangeRule } from '@n8n/decorators';
import type { INode } from 'n8n-workflow';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

const GMAIL_TRIGGER_NODE_TYPE = 'n8n-nodes-base.gmailTrigger';
const GMAIL_TRIGGER_LATEST_VERSION = 1.4;

@BreakingChangeRule({ version: 'v3' })
export class GmailTriggerVersionRule implements IBreakingChangeWorkflowRule {
	id = 'gmail-trigger-version-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Gmail Trigger always runs with version 1.4 behavior',
			description:
				'Gmail Trigger versions below 1.4 are removed and every Gmail Trigger node runs with v1.4 behavior: the number of emails fetched per poll is limited by "Max Emails per Poll" (default 10, the remainder is picked up in later polls), drafts are excluded unless the "Include Drafts" filter is enabled, and sent (non-inbox) and scheduled emails no longer trigger the workflow.',
			category: BreakingChangeCategory.workflow,
			severity: 'medium',
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Review Gmail Trigger nodes on versions below 1.4',
				description:
					'Each trigger event now emits at most 10 emails by default (configurable via "Max Emails per Poll"); the rest are picked up in later polls. Drafts only trigger workflows if "Include Drafts" is enabled in Filters. Sent (non-inbox) and scheduled emails no longer trigger workflows at all — if a workflow depends on them, use a Schedule Trigger with a Gmail "Get Many messages" operation (e.g. search "in:sent") instead.',
			},
		];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		const affectedNodes = (nodesGroupedByType.get(GMAIL_TRIGGER_NODE_TYPE) ?? []).filter(
			(node) => node.typeVersion < GMAIL_TRIGGER_LATEST_VERSION,
		);

		if (affectedNodes.length === 0) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: affectedNodes.map((node) => ({
				title: `Node '${node.name}' uses Gmail Trigger version ${node.typeVersion}`,
				description:
					'This node will run with v1.4 behavior: emails per poll are limited by "Max Emails per Poll" (default 10, the remainder is picked up in later polls), drafts are excluded unless the "Include Drafts" filter is enabled, and sent (non-inbox) and scheduled emails no longer trigger the workflow.',
				level: 'warning',
				nodeId: node.id,
				nodeName: node.name,
			})),
		};
	}
}
