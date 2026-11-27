import type { AgentConfigValidationIssue } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { unpublishedWorkflowTools } from './validationIssues';

function notPublished(
	path: string,
	capability: AgentConfigValidationIssue['capability'],
): AgentConfigValidationIssue {
	return {
		code: 'incompatible_reference',
		reason: 'not_published',
		path,
		capability,
	} as AgentConfigValidationIssue;
}

describe('unpublishedWorkflowTools', () => {
	it('reads the workflow ID of a direct tool from the tool config', () => {
		const issues = [
			notPublished('tools[0]', { kind: 'tool', id: 'Report', toolType: 'workflow', index: 0 }),
		];

		expect(
			unpublishedWorkflowTools(issues, [
				{ type: 'workflow', workflow: 'Report', workflowId: 'wf1' },
			]),
		).toEqual([{ name: 'Report', workflowId: 'wf1' }]);
	});

	it('reads the workflow ID of a workflow that a skill mentions from the issue path', () => {
		const issues = [
			notPublished('skills.skill-1.workflows.wf2', {
				kind: 'tool',
				id: 'Notify',
				toolType: 'workflow',
			}),
		];

		expect(unpublishedWorkflowTools(issues, [])).toEqual([{ name: 'Notify', workflowId: 'wf2' }]);
	});

	it('leaves the workflow ID empty for a tool that only has a name', () => {
		const issues = [
			notPublished('tools[0]', { kind: 'tool', id: 'Report', toolType: 'workflow', index: 0 }),
		];

		expect(unpublishedWorkflowTools(issues, [{ type: 'workflow', workflow: 'Report' }])).toEqual([
			{ name: 'Report', workflowId: undefined },
		]);
	});
});
