import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@n8n/api-types';
import { CredentialsRepository } from '@n8n/db';
import type { WorkflowEntity } from '@n8n/db';
import { BreakingChangeRule } from '@n8n/decorators';
import type { INode } from 'n8n-workflow';

import {
	SLACK_DOCUMENTATION_URL,
	SLACK_TRIGGER_NODE_TYPE,
	findSlackNodesWithoutSignatureSecret,
} from './slack-credential-secret';
import { reportAffectedNodes } from '../../detection-report';
import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
	WorkflowScanContext,
} from '../../types';
import { BreakingChangeCategory, createWorkflowScanContext } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class SlackTriggerSignatureSecretRule implements IBreakingChangeWorkflowRule {
	constructor(private readonly credentialsRepository: CredentialsRepository) {}

	id = 'slack-trigger-signature-secret-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Slack Trigger requires a signature secret on its credential',
			description:
				'The "Signature Secret" field of the Slack API credential is now required. A workflow with a Slack Trigger node whose credential has no signature secret can no longer be activated.',
			category: BreakingChangeCategory.workflow,
			impact: 'executionsFail',
			documentationUrl: SLACK_DOCUMENTATION_URL,
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Add the signature secret to the Slack API credential',
				description:
					'Copy the signature secret into the "Signature Secret" field of the Slack API credential. Slack calls it the "Signing Secret" and shows it under "Basic Information" of your Slack app. Then activate the workflow again. No workflow edit is needed.',
			},
		];
	}

	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
		context: WorkflowScanContext = createWorkflowScanContext(),
	): Promise<WorkflowDetectionReport> {
		const affectedNodes = await findSlackNodesWithoutSignatureSecret(
			this.credentialsRepository,
			nodesGroupedByType.get(SLACK_TRIGGER_NODE_TYPE) ?? [],
			context.slackSignatureSecretMissing,
		);

		return reportAffectedNodes(affectedNodes, (node) => ({
			title: `Node '${node.name}' blocks activation of the workflow: its Slack API credential has no signature secret`,
			description:
				'In v3 a workflow with a Slack Trigger node fails to activate when the Slack API credential has no signature secret. Add the signature secret of your Slack app to the credential.',
			level: 'error',
		}));
	}
}
