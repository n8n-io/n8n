import { z } from 'zod';

import { createRuntimeSkillSource } from '../../skills/registry';
import type { AgentRuntimeConfig } from '../../types/runtime/agent-runtime';
import type { BuiltTool } from '../../types/sdk/tool';
import { activateSkillDependencyTools } from '../skills/skill-dependency-tools';

function makeTool(name: string): BuiltTool {
	return {
		name,
		description: `Tool ${name}`,
		inputSchema: z.object({}),
		handler: async () => await Promise.resolve({}),
	};
}

const skillSource = createRuntimeSkillSource([
	{
		id: 'model-selection',
		name: 'model-selection',
		description: 'Choose a model.',
		instructions: 'Search the catalog.',
		dependencies: { tools: ['search_models', 'unregistered'] },
	},
]);

function makeConfig(overrides: Partial<AgentRuntimeConfig>): AgentRuntimeConfig {
	return { name: 'agent', model: 'anthropic/claude-sonnet-4-5', instructions: '', ...overrides };
}

describe('activateSkillDependencyTools', () => {
	it('moves deferred skill dependencies after the active tools', () => {
		const active = makeTool('active');
		const searchModels = makeTool('search_models');
		const other = makeTool('other');

		const config = activateSkillDependencyTools(
			makeConfig({ skillSource, tools: [active], deferredTools: [searchModels, other] }),
		);

		expect(config.tools).toEqual([active, searchModels]);
		expect(config.deferredTools).toEqual([other]);
	});

	it('returns the same config when no deferred tool is a skill dependency', () => {
		const original = makeConfig({ skillSource, deferredTools: [makeTool('other')] });
		expect(activateSkillDependencyTools(original)).toBe(original);
	});

	it('returns the same config without a skill source', () => {
		const original = makeConfig({ deferredTools: [makeTool('search_models')] });
		expect(activateSkillDependencyTools(original)).toBe(original);
	});
});
