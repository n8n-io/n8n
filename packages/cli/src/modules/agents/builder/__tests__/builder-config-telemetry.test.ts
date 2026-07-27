import type { AgentJsonConfig } from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import {
	collectBuilderConfigDiffEvents,
	skillIdentifiersFromConfig,
	taskIdentifiersFromConfig,
	toolIdentifiersFromConfig,
} from '../builder-config-telemetry';

const baseConfig: AgentJsonConfig = {
	name: 'Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
};

describe('toolIdentifiersFromConfig', () => {
	it('resolves each tool type through its identifier fallback chain, filters falsy, and sorts', () => {
		const config: AgentJsonConfig = {
			...baseConfig,
			tools: [
				{ type: 'custom', id: 'custom_tool' },
				{ type: 'workflow', workflow: 'wf-id', name: 'Named Workflow' },
				{ type: 'workflow', workflow: 'wf-id-2' },
				{
					type: 'node',
					name: 'Named Node',
					node: { nodeType: 'n8n-nodes-base.slack', nodeTypeVersion: 1, nodeParameters: {} },
				},
				{
					type: 'node',
					node: { nodeType: 'n8n-nodes-base.httpRequest', nodeTypeVersion: 1 },
				} as never,
			],
		};

		expect(toolIdentifiersFromConfig(config)).toEqual(
			[
				'Named Node',
				'Named Workflow',
				'custom_tool',
				'n8n-nodes-base.httpRequest',
				'wf-id-2',
			].sort(),
		);
	});

	it('returns an empty array for a null config or one with no tools', () => {
		expect(toolIdentifiersFromConfig(null)).toEqual([]);
		expect(toolIdentifiersFromConfig(baseConfig)).toEqual([]);
	});
});

describe('skillIdentifiersFromConfig', () => {
	it('returns sorted skill ids', () => {
		const config: AgentJsonConfig = {
			...baseConfig,
			skills: [
				{ type: 'skill', id: 'skill_b' },
				{ type: 'skill', id: 'skill_a' },
			],
		};
		expect(skillIdentifiersFromConfig(config)).toEqual(['skill_a', 'skill_b']);
	});
});

describe('taskIdentifiersFromConfig', () => {
	it('returns unique, sorted task ids', () => {
		const config: AgentJsonConfig = {
			...baseConfig,
			tasks: [
				{ type: 'task', id: 'task_b', enabled: true },
				{ type: 'task', id: 'task_a', enabled: true },
				{ type: 'task', id: 'task_a', enabled: false },
			],
		};
		expect(taskIdentifiersFromConfig(config)).toEqual(['task_a', 'task_b']);
	});
});

describe('collectBuilderConfigDiffEvents', () => {
	it('produces no events when nothing changed', () => {
		expect(collectBuilderConfigDiffEvents(baseConfig, baseConfig)).toEqual([]);
	});

	it('emits one event per added tool, skill, and task, and per removed task', () => {
		const oldConfig: AgentJsonConfig = {
			...baseConfig,
			tools: [{ type: 'custom', id: 'existing_tool' }],
			skills: [{ type: 'skill', id: 'existing_skill' }],
			tasks: [{ type: 'task', id: 'existing_task', enabled: true }],
		};
		const newConfig: AgentJsonConfig = {
			...baseConfig,
			tools: [
				{ type: 'custom', id: 'existing_tool' },
				{ type: 'custom', id: 'new_tool' },
			],
			skills: [
				{ type: 'skill', id: 'existing_skill' },
				{ type: 'skill', id: 'new_skill' },
			],
			tasks: [{ type: 'task', id: 'new_task', enabled: true }],
		};

		const events = collectBuilderConfigDiffEvents(oldConfig, newConfig);

		expect(events).toEqual([
			{
				entry: TELEMETRY_EVENT.AGENTS.BUILDER_ADDED_TOOLS,
				properties: { tool_added: 'new_tool', tools: ['existing_tool', 'new_tool'] },
			},
			{
				entry: TELEMETRY_EVENT.AGENTS.BUILDER_ADDED_SKILLS,
				properties: { skill_added: 'new_skill', skills: ['existing_skill', 'new_skill'] },
			},
			{
				entry: TELEMETRY_EVENT.AGENTS.BUILDER_ADDED_TASKS,
				properties: { task_added: 'new_task', tasks: ['new_task'] },
			},
			{
				entry: TELEMETRY_EVENT.AGENTS.BUILDER_REMOVED_TASKS,
				properties: { task_removed: 'existing_task', tasks: ['new_task'] },
			},
		]);
	});
});
