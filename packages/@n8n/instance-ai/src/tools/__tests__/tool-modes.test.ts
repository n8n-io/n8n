import type { InstanceAiThreadArtifactsContext } from '@n8n/api-types';

import { ALWAYS_LOADED_TOOL_NAMES, DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS } from '../tool-ids';
import {
	createToolModesConfig,
	INSTANCE_AI_TOOL_MODES,
	resolveStartingToolMode,
} from '../tool-modes';

function artifacts(
	activeType: InstanceAiThreadArtifactsContext['artifacts'][number]['type'],
): InstanceAiThreadArtifactsContext {
	return {
		artifacts: [
			{ type: 'workflow', id: 'wf-1' },
			{ type: activeType, id: 'active-1' },
		],
		activeId: 'active-1',
	};
}

describe('resolveStartingToolMode', () => {
	it('uses the mode that the user picked over the page', () => {
		expect(
			resolveStartingToolMode({ requested: 'debug', threadArtifacts: artifacts('agent') }),
		).toBe('debug');
	});

	it('starts in agents mode for an agent preview hand-off', () => {
		expect(
			resolveStartingToolMode({
				handoffContext: { source: 'agent-preview' } as never,
				threadArtifacts: artifacts('data-table'),
			}),
		).toBe('agents');
	});

	it.each([
		['workflow', 'build'],
		['agent', 'agents'],
		['data-table', 'data'],
	] as const)('maps a focused %s tab to %s mode', (type, mode) => {
		expect(resolveStartingToolMode({ threadArtifacts: artifacts(type) })).toBe(mode);
	});

	it('ignores tabs when none is focused', () => {
		const context = { ...artifacts('agent'), activeId: undefined };

		expect(resolveStartingToolMode({ threadArtifacts: context })).toBe('build');
	});

	it('falls back to build mode', () => {
		expect(resolveStartingToolMode({})).toBe('build');
	});
});

const alwaysLoaded: string[] = [
	...ALWAYS_LOADED_TOOL_NAMES,
	// Always loaded when the Agents feature is on.
	ORCHESTRATION_TOOL_IDS.BUILD_AGENT,
	ORCHESTRATION_TOOL_IDS.LIST_AGENT_CAPABILITIES,
];

describe('createToolModesConfig', () => {
	it('drops mode tools that the run does not register', () => {
		const config = createToolModesConfig(
			'agents',
			new Set([DOMAIN_TOOL_IDS.AGENTS, DOMAIN_TOOL_IDS.EXECUTIONS]),
		);

		expect(config.initialMode).toBe('agents');
		expect(config.modes.agents.tools).toEqual([DOMAIN_TOOL_IDS.AGENTS]);
		expect(config.modes.debug.tools).toEqual([DOMAIN_TOOL_IDS.EXECUTIONS]);
		expect(config.modes.build.tools).toEqual([DOMAIN_TOOL_IDS.EXECUTIONS]);
	});

	it('scopes only always-loaded tools, so no mode names a deferred tool', () => {
		for (const mode of Object.values(INSTANCE_AI_TOOL_MODES)) {
			for (const tool of mode.tools) expect(alwaysLoaded).toContain(tool);
		}
	});

	it('keeps only the core tools bound in every mode', () => {
		const modeTools = new Set<string>(
			Object.values(INSTANCE_AI_TOOL_MODES).flatMap((mode) => mode.tools),
		);

		expect(alwaysLoaded.filter((tool) => !modeTools.has(tool)).sort()).toEqual(
			[
				DOMAIN_TOOL_IDS.ACTIVITY,
				DOMAIN_TOOL_IDS.ASK_USER,
				DOMAIN_TOOL_IDS.PARSE_FILE,
				DOMAIN_TOOL_IDS.SAVE_USER_PREFERENCE,
			].sort(),
		);
	});
});
