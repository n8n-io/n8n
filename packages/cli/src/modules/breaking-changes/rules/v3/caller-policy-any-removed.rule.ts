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
import { REMOVED_CALLER_POLICY } from './caller-policy-default-any.rule';

/**
 * Workflows that store the removed policy themselves. Workflows that merely inherit it from
 * the instance default are the same one-line fix for the admin, so they are reported once by
 * `caller-policy-default-any-v3` instead of once per workflow here.
 */
@BreakingChangeRule({ version: 'v3' })
export class CallerPolicyAnyRemovedRule implements IBreakingChangeWorkflowRule {
	id = 'caller-policy-any-removed-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Workflows set to the removed "Any workflow" caller policy',
			// The report renders only the title, description and docs link, so the remedy
			// has to fit in the description.
			description:
				'These workflows set "This workflow can be called by → Any workflow", so any project on the instance can call them. Version 3 removes the option: give each one a new policy in its settings, or its sub-workflow calls fail.',
			category: BreakingChangeCategory.workflow,
			severity: 'medium',
			documentationUrl:
				'https://docs.n8n.io/build/manage-workflows/configure-workflow-settings#this-workflow-can-be-called-by',
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Pick a new caller policy for each affected workflow',
				description:
					'Open the workflow, go to Settings → "This workflow can be called by" and choose "Selected workflows" (then list the calling workflow IDs) or the same-project option. Do this before upgrading, because after the upgrade these sub-workflow calls fail.',
			},
		];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async detectWorkflow(
		workflow: WorkflowEntity,
		_nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		// Widened to string: v3 drops 'any' from the union, but the value is still in the database.
		const storedPolicy: string | undefined = workflow.settings?.callerPolicy;

		if (storedPolicy !== REMOVED_CALLER_POLICY) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: [
				{
					title: 'Workflow is set to be callable by "Any workflow"',
					description:
						'Version 3 removes this option. Pick "Selected workflows" or the same-project option in this workflow\'s settings.',
					level: 'error',
				},
			],
		};
	}
}
