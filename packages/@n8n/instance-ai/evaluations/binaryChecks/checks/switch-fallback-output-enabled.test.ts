import { switchFallbackOutputEnabled } from './switch-fallback-output-enabled';
import type { WorkflowResponse } from '../../clients/n8n-client';

const switchRules = {
	values: [
		{
			outputKey: 'Urgent',
			conditions: {
				options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
				conditions: [
					{
						leftValue: '={{ $json.priority }}',
						rightValue: 'urgent',
						operator: { type: 'string', operation: 'equals' },
					},
				],
				combinator: 'and',
			},
		},
		{
			outputKey: 'Normal',
			conditions: {
				options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
				conditions: [
					{
						leftValue: '={{ $json.priority }}',
						rightValue: 'normal',
						operator: { type: 'string', operation: 'equals' },
					},
				],
				combinator: 'and',
			},
		},
	],
};

function workflowWithSwitch(options?: Record<string, unknown>): WorkflowResponse {
	return {
		id: 'wf-1',
		name: 'Switch fallback test',
		active: false,
		versionId: 'version-1',
		nodes: [
			{
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				parameters: {},
			},
			{
				name: 'Route Priority',
				type: 'n8n-nodes-base.switch',
				typeVersion: 3.4,
				parameters: {
					mode: 'rules',
					rules: switchRules,
					...(options ? { options } : {}),
				},
			},
			{
				name: 'Fallback',
				type: 'n8n-nodes-base.noOp',
				parameters: {},
			},
		],
		connections: {
			'Manual Trigger': {
				main: [[{ node: 'Route Priority', type: 'main', index: 0 }]],
			},
			'Route Priority': {
				main: [[], [], [{ node: 'Fallback', type: 'main', index: 0 }]],
			},
		},
	};
}

describe('switchFallbackOutputEnabled', () => {
	it('fails when a Switch fallback branch is wired without fallbackOutput extra', async () => {
		const result = await switchFallbackOutputEnabled.run(workflowWithSwitch(), { prompt: '' });

		expect(result.pass).toBe(false);
		expect(result.comment).toContain("options.fallbackOutput is set to 'extra'");
	});

	it('passes when fallbackOutput extra creates the fallback branch', async () => {
		const result = await switchFallbackOutputEnabled.run(
			workflowWithSwitch({ fallbackOutput: 'extra' }),
			{ prompt: '' },
		);

		expect(result).toEqual({ pass: true });
	});
});
