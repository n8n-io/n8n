import type { AgentConfigValidationIssue } from '@n8n/api-types';

import { unpublishedWorkflowTools } from '../utils/validationIssues';

it('links an unpublished decision workflow through its human review', () => {
	const issues: AgentConfigValidationIssue[] = [
		{
			code: 'incompatible_reference',
			path: 'hitlConfigurations.0.workflowId',
			capability: { kind: 'humanInteraction', id: 'interaction_id', index: 0 },
			reason: 'not_published',
		},
	];
	expect(
		unpublishedWorkflowTools(
			issues,
			[],
			[
				{
					id: 'interaction_id',
					name: 'Review changes',
					method: 'workflow',
					workflowId: 'decision-workflow',
				},
			],
		),
	).toEqual([{ name: 'Review changes', workflowId: 'decision-workflow' }]);
	expect(unpublishedWorkflowTools(issues, [], [])).toEqual([]);
});
it('keeps the existing workflow tool publish flow', () => {
	const issues: AgentConfigValidationIssue[] = [
		{
			code: 'incompatible_reference',
			path: 'tools.0.workflowId',
			capability: { kind: 'tool', id: 'Lookup', index: 0, toolType: 'workflow' },
			reason: 'not_published',
		},
	];
	expect(
		unpublishedWorkflowTools(issues, [
			{ type: 'workflow', workflow: 'Lookup', workflowId: 'lookup-workflow' },
		]),
	).toEqual([{ name: 'Lookup', workflowId: 'lookup-workflow' }]);
});
