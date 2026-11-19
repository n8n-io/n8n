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
export class SlackCredentialSignatureSecretRule implements IBreakingChangeWorkflowRule {
	constructor(private readonly credentialsRepository: CredentialsRepository) {}

	id = 'slack-credential-signature-secret-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Slack API credential without a signature secret cannot be saved',
			description:
				'The "Signature Secret" field of the Slack API credential is now required. Slack nodes keep working with a credential that has no signature secret, but you cannot save that credential again until you add the secret.',
			category: BreakingChangeCategory.workflow,
			impact: 'capabilityRemoved',
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
					'Copy the signature secret into the "Signature Secret" field of the Slack API credential. Slack calls it the "Signing Secret" and shows it under "Basic Information" of your Slack app. You can do this the next time you edit the credential.',
			},
		];
	}

	async detectWorkflow(
		workflow: WorkflowEntity,
		_nodesGroupedByType: Map<string, INode[]>,
		context: WorkflowScanContext = createWorkflowScanContext(),
	): Promise<WorkflowDetectionReport> {
		// The trigger rule reports Slack Trigger nodes, where the missing secret stops the workflow.
		const affectedNodes = await findSlackNodesWithoutSignatureSecret(
			this.credentialsRepository,
			workflow.nodes.filter((node) => node.type !== SLACK_TRIGGER_NODE_TYPE),
			context.slackSignatureSecretMissing,
		);

		return reportAffectedNodes(affectedNodes, (node) => ({
			title: `Node '${node.name}' uses a Slack API credential without a signature secret`,
			description:
				'The node keeps working, but you cannot save the Slack API credential again until you add the signature secret of your Slack app to it.',
			level: 'warning',
		}));
	}
}
