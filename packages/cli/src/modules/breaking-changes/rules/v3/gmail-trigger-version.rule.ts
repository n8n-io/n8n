import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { BreakingChangeRule } from '@n8n/decorators';
import type { INode } from 'n8n-workflow';

import { reportAffectedNodes } from '../../detection-report';
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
			impact: 'behaviorChanges',
			assistant: 'review',
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Replace the node with Gmail Trigger 1.4',
				description:
					"Add a new Gmail Trigger node with the same name, connections, credential and settings. If the version 1.4 behavior works for this workflow, set the finding to Won't fix instead.",
			},
			{
				action: 'Raise "Max Emails per Poll"',
				description:
					'If a poll can return more than 10 emails and the workflow must process them at once, raise this limit on the new node.',
			},
			{
				action: 'Enable "Include Drafts"',
				description: 'If the workflow must run on drafts, enable "Include Drafts" in Filters.',
			},
			{
				action: 'Poll sent or scheduled emails on a schedule',
				description:
					'If the workflow must run on sent or scheduled emails, use a Schedule Trigger and a Gmail "Get Many messages" operation with the search "in:sent" or "in:scheduled". Add a Remove Duplicates node set to "Remove Items Processed in Previous Executions" on the message ID, just before the steps that must not repeat. Raise its History Size (10,000 by default) if the search can return more messages than that.',
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

		return reportAffectedNodes(affectedNodes, (node) => ({
			title: `Node '${node.name}' uses Gmail Trigger version ${node.typeVersion}`,
			description:
				'This node will run with v1.4 behavior: emails per poll are limited by "Max Emails per Poll" (default 10, the remainder is picked up in later polls), drafts are excluded unless the "Include Drafts" filter is enabled, and sent (non-inbox) and scheduled emails no longer trigger the workflow.',
			level: 'warning',
		}));
	}
}
