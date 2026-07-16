import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, ref, type Ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { AgentSkill, InlineAgentConfig } from '@n8n/api-types';

import type { INodeUi } from '@/Interface';
import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants/nodeTypes';
import { ndvEventBus } from '@/features/ndv/shared/ndv.eventBus';
import type { UseAgentCapabilitiesActionsDeps } from '@/features/agents/composables/useAgentCapabilitiesActions';
import { useInlineAgentConfig, type UseInlineAgentConfigReturn } from '../useInlineAgentConfig';

// Capture the deps the composable wires into the capability actions — the
// localSkills seam callbacks are the SUT here; the actions composable itself
// (stores, modals) is covered by its own tests.
let capturedCapsDeps: UseAgentCapabilitiesActionsDeps | null = null;
vi.mock('@/features/agents/composables/useAgentCapabilitiesActions', () => ({
	useAgentCapabilitiesActions: (deps: UseAgentCapabilitiesActionsDeps) => {
		capturedCapsDeps = deps;
		return { appliedSkills: ref([]) };
	},
}));

const PROJECT_ID = 'project-1';
vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		currentProjectId: PROJECT_ID,
		personalProject: { id: PROJECT_ID },
	}),
}));

const triage: AgentSkill = {
	name: 'Triage',
	description: 'Triage incoming requests',
	instructions: 'Categorize the request and route it.',
};

function makeInlineNode(inlineAgent?: InlineAgentConfig): INodeUi {
	return {
		id: 'node-1',
		name: 'Message an Agent',
		type: MESSAGE_AN_AGENT_NODE_TYPE,
		typeVersion: 2,
		position: [0, 0],
		parameters: {
			agentSource: 'inline',
			...(inlineAgent ? { inlineAgent } : {}),
		},
	} as unknown as INodeUi;
}

const mountedWrappers: Array<VueWrapper<unknown>> = [];

function mountComposable(activeNode: Ref<INodeUi | null>) {
	let api!: UseInlineAgentConfigReturn;
	const TestHost = defineComponent({
		setup() {
			api = useInlineAgentConfig(activeNode);
			return () => null;
		},
	});
	const wrapper = mount(TestHost);
	mountedWrappers.push(wrapper as VueWrapper<unknown>);
	return { api, localSkills: capturedCapsDeps?.localSkills };
}

describe('useInlineAgentConfig — skills in the node parameter', () => {
	let emitSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		capturedCapsDeps = null;
		emitSpy = vi.spyOn(ndvEventBus, 'emit');
	});

	afterEach(() => {
		emitSpy.mockRestore();
		while (mountedWrappers.length) mountedWrappers.pop()?.unmount();
	});

	function lastEmittedValue(): { config: Record<string, unknown>; skills?: unknown } {
		expect(emitSpy).toHaveBeenCalledTimes(1);
		const [event, payload] = emitSpy.mock.calls[0] as unknown as [
			string,
			{ name: string; node: string; value: { config: Record<string, unknown>; skills?: unknown } },
		];
		expect(event).toBe('updateParameterValue');
		expect(payload.name).toBe('parameters.inlineAgent');
		expect(payload.node).toBe('Message an Agent');
		return payload.value;
	}

	it('exposes the parameter skill bodies through the localSkills seam', () => {
		const node = ref<INodeUi | null>(
			makeInlineNode({
				config: {
					name: 'Embedded',
					model: 'openai/gpt-5',
					instructions: '',
					skills: [{ type: 'skill', id: 'skill_triage' }],
				},
				skills: { skill_triage: triage },
			}),
		);
		const { localSkills } = mountComposable(node);

		expect(localSkills?.bodies.value).toEqual({ skill_triage: triage });
	});

	it('createSkill lands the body and its ref in one parameter write', () => {
		const node = ref<INodeUi | null>(
			makeInlineNode({
				config: { name: 'Embedded', model: 'openai/gpt-5', instructions: '' },
			}),
		);
		const { localSkills } = mountComposable(node);

		localSkills?.createSkill(triage);

		const value = lastEmittedValue();
		const refs = value.config.skills as Array<{ type: string; id: string }>;
		expect(refs).toHaveLength(1);
		expect(refs[0].type).toBe('skill');
		expect(refs[0].id).toMatch(/^skill_[A-Za-z0-9_-]+$/);
		expect(value.skills).toEqual({ [refs[0].id]: triage });
	});

	it('createSkill mints an id that does not collide with existing bodies', () => {
		const node = ref<INodeUi | null>(
			makeInlineNode({
				config: {
					name: 'Embedded',
					model: 'openai/gpt-5',
					instructions: '',
					skills: [{ type: 'skill', id: 'skill_triage' }],
				},
				skills: { skill_triage: triage },
			}),
		);
		const { localSkills } = mountComposable(node);

		localSkills?.createSkill({ ...triage, name: 'Second' });

		const value = lastEmittedValue();
		const refs = value.config.skills as Array<{ id: string }>;
		expect(refs).toHaveLength(2);
		expect(refs[1].id).not.toBe('skill_triage');
		expect(Object.keys(value.skills as Record<string, unknown>)).toHaveLength(2);
	});

	it('updateSkill replaces the body in one write and leaves the refs untouched', () => {
		const node = ref<INodeUi | null>(
			makeInlineNode({
				config: {
					name: 'Embedded',
					model: 'openai/gpt-5',
					instructions: '',
					skills: [{ type: 'skill', id: 'skill_triage' }],
				},
				skills: { skill_triage: triage },
			}),
		);
		const { localSkills } = mountComposable(node);

		localSkills?.updateSkill('skill_triage', { ...triage, name: 'Renamed' });

		const value = lastEmittedValue();
		expect(value.config.skills).toEqual([{ type: 'skill', id: 'skill_triage' }]);
		expect(value.skills).toEqual({ skill_triage: { ...triage, name: 'Renamed' } });
	});

	it('updateSkill ignores an id that is no longer referenced', () => {
		const node = ref<INodeUi | null>(
			makeInlineNode({
				config: { name: 'Embedded', model: 'openai/gpt-5', instructions: '' },
				skills: { skill_gone: triage },
			}),
		);
		const { localSkills } = mountComposable(node);

		localSkills?.updateSkill('skill_gone', { ...triage, name: 'Renamed' });

		expect(emitSpy).not.toHaveBeenCalled();
	});

	it('removing the last skill ref prunes its body and drops the empty skills key', () => {
		const node = ref<INodeUi | null>(
			makeInlineNode({
				config: {
					name: 'Embedded',
					model: 'openai/gpt-5',
					instructions: '',
					skills: [{ type: 'skill', id: 'skill_triage' }],
				},
				skills: { skill_triage: triage },
			}),
		);
		const { api } = mountComposable(node);

		api.scheduleConfigUpdate({ skills: [] });

		const value = lastEmittedValue();
		expect(value.config.skills).toEqual([]);
		expect(value).not.toHaveProperty('skills');
	});

	it('an unrelated config update carries the skill bodies forward', () => {
		const node = ref<INodeUi | null>(
			makeInlineNode({
				config: {
					name: 'Embedded',
					model: 'openai/gpt-5',
					instructions: '',
					skills: [{ type: 'skill', id: 'skill_triage' }],
				},
				skills: { skill_triage: triage },
			}),
		);
		const { api } = mountComposable(node);

		api.scheduleConfigUpdate({ name: 'Renamed Agent' });

		const value = lastEmittedValue();
		expect(value.config.name).toBe('Renamed Agent');
		expect(value.config.skills).toEqual([{ type: 'skill', id: 'skill_triage' }]);
		expect(value.skills).toEqual({ skill_triage: triage });
	});

	it('keeps skill refs when writing — skills is an inline config key', () => {
		const node = ref<INodeUi | null>(
			makeInlineNode({
				config: { name: 'Embedded', model: 'openai/gpt-5', instructions: '' },
			}),
		);
		const { api } = mountComposable(node);

		api.scheduleConfigUpdate({ skills: [{ type: 'skill', id: 'skill_triage' }] });

		// The ref survives pickInlineConfigKeys; its body is pruned because no
		// body exists yet (createSkill is the path that writes both together).
		const value = lastEmittedValue();
		expect(value.config.skills).toEqual([{ type: 'skill', id: 'skill_triage' }]);
	});
});
