import type { AgentJsonConfig } from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import {
	collectBuilderConfigDiffEvents,
	taskIdentifiersFromConfig,
} from '../builder-config-telemetry';

const baseConfig: AgentJsonConfig = {
	name: 'Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
};

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

	it('emits one event per added task and ignores removals and other capabilities', () => {
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

		expect(collectBuilderConfigDiffEvents(oldConfig, newConfig)).toEqual([
			{
				entry: TELEMETRY_EVENT.AGENTS.BUILDER_ADDED_TASKS,
				properties: { task_added: 'new_task', tasks: ['new_task'] },
			},
		]);
	});
});
