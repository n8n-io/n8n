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
				'Gmail Trigger versions below 1.4 are removed and every Gmail Trigger node runs with v1.4 behavior: the number of emails fetched per poll is limited by "Max Emails per Poll" (default 10, the remainder is picked up in later polls), drafts are excluded unless the "Include Drafts" filter is enabled, and sent (non-inbox) and scheduled emails no longer trigger the workflow. Check that each affected Gmail Trigger node still receives the emails its workflow needs.',
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
				action: 'Adjust Gmail Trigger nodes on versions below 1.4',
				description:
					'Replace each affected node with a new Gmail Trigger node, which uses version 1.4, and keep its name and connections. "Max Emails per Poll" exists only on version 1.4. If a poll can return more than 10 emails and the workflow must process them at once, raise "Max Emails per Poll". If the workflow must run on drafts, enable "Include Drafts" in Filters. If it must run on sent or scheduled emails, use a Schedule Trigger with a Gmail "Get Many messages" operation instead, for example with the search "in:sent" or "in:scheduled". Add a Remove Duplicates node set to "Remove Items Processed in Previous Executions" on the message ID, so that later runs skip messages the workflow already processed. If the version 1.4 behavior is acceptable as it is, set the finding to Won\'t fix.',
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
