import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { defineComponent, ref, type Ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import type { INodeUi } from '@/Interface';
import type { AgentJsonConfig, AgentResource } from '@/features/agents/types';
import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants/nodeTypes';
import { agentsEventBus } from '@/features/agents/agents.eventBus';
// Real composable — exercised directly for the stale-key drop contract that
// `useNdvAgentConfig.saveConfig` relies on (see the stale-save test note).
import { useAgentConfig } from '@/features/agents/composables/useAgentConfig';
import { useNdvAgentConfig, type UseNdvAgentConfigReturn } from '../useNdvAgentConfig';

// The API layer is the seam under our control. `useAgentConfig` /
// `useAgentConfigAutosave` are the REAL composables so the stale-key drop and
// debounce are exercised authentically.
const getAgentMock = vi.fn();
const getAgentConfigMock = vi.fn();
const updateAgentConfigMock = vi.fn();

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	getAgent: (...args: unknown[]) => getAgentMock(...args),
	getAgentConfig: (...args: unknown[]) => getAgentConfigMock(...args),
	updateAgentConfig: (...args: unknown[]) => updateAgentConfigMock(...args),
}));

// `useAgentCapabilitiesActions` pulls in UI/nodeTypes stores + i18n we don't
// exercise here; stub it so the composable's own read/autosave loop is the SUT.
vi.mock('@/features/agents/composables/useAgentCapabilitiesActions', () => ({
	useAgentCapabilitiesActions: () => ({ appliedSkills: ref([]) }),
}));

const showErrorMock = vi.fn();
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

const PROJECT_ID = 'project-1';
vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		currentProjectId: PROJECT_ID,
		personalProject: { id: PROJECT_ID },
	}),
}));

function makeConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'Support Agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Help the user.',
		tools: [],
		...overrides,
	} as AgentJsonConfig;
}

function makeAgent(overrides: Partial<AgentResource> = {}): AgentResource {
	return {
		id: 'agent-1',
		name: 'Support Agent',
		projectId: PROJECT_ID,
		resourceType: 'agent',
		isCompiled: true,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		versionId: 'v1',
		activeVersionId: null,
		tools: {},
		skills: {},
		activeVersion: null,
		...overrides,
	} as AgentResource;
}

function makeAgentNode(agentId: string): INodeUi {
	return {
		id: 'node-1',
		name: 'Message an Agent',
		type: MESSAGE_AN_AGENT_NODE_TYPE,
		// The NDV agent experience is v2-gated (v1 keeps the raw layout).
		typeVersion: 2,
		position: [0, 0],
		parameters: { agentId: { __rl: true, mode: 'list', value: agentId } },
	} as unknown as INodeUi;
}

function makePlainNode(): INodeUi {
	return {
		id: 'node-2',
		name: 'Set',
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	} as unknown as INodeUi;
}

/**
 * Mount the composable in a throwaway component so `inject` /
 * `onBeforeUnmount` / stores resolve exactly as they would in the NDV tree,
 * and expose its return for assertions.
 */
// The event bus + API mocks are module-level singletons. Track every mounted
// host so `afterEach` can unmount it — that fires the composable's
// `onBeforeUnmount`, which deregisters its `agentUpdated` listener. Without
// this, listeners from earlier tests leak and re-fire on later `emit`s.
const mountedWrappers: Array<VueWrapper<unknown>> = [];

function mountComposable(activeNode: Ref<INodeUi | null>) {
	let api!: UseNdvAgentConfigReturn;
	const TestHost = defineComponent({
		setup() {
			api = useNdvAgentConfig(activeNode);
			return () => null;
		},
	});
	const wrapper = mount(TestHost);
	mountedWrappers.push(wrapper as VueWrapper<unknown>);
	return { wrapper, api };
}

describe('useNdvAgentConfig', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createTestingPinia());
		getAgentMock.mockReset().mockResolvedValue(makeAgent());
		getAgentConfigMock.mockReset().mockResolvedValue(makeConfig());
		updateAgentConfigMock.mockReset().mockResolvedValue({ config: makeConfig(), versionId: 'v2' });
		showErrorMock.mockReset();
	});

	afterEach(() => {
		while (mountedWrappers.length) mountedWrappers.pop()?.unmount();
		vi.useRealTimers();
	});

	it('does not fetch config for a non-agent node and reports isAgentNode=false', async () => {
		const node = ref<INodeUi | null>(makePlainNode());
		const { api } = mountComposable(node);
		await flushPromises();

		expect(api.isAgentNode.value).toBe(false);
		expect(api.agentId.value).toBe('');
		expect(getAgentConfigMock).not.toHaveBeenCalled();
		expect(getAgentMock).not.toHaveBeenCalled();
		expect(api.localConfig.value).toBeNull();
	});

	it('fetches config + agent on mount for an agent node and populates localConfig / isPublished', async () => {
		getAgentConfigMock.mockResolvedValue(makeConfig({ instructions: 'Fetched instructions.' }));
		getAgentMock.mockResolvedValue(makeAgent({ activeVersionId: 'published-v1' }));

		const node = ref<INodeUi | null>(makeAgentNode('agent-1'));
		const { api } = mountComposable(node);
		await flushPromises();

		expect(api.isAgentNode.value).toBe(true);
		expect(getAgentConfigMock).toHaveBeenCalledWith(expect.anything(), PROJECT_ID, 'agent-1');
		expect(getAgentMock).toHaveBeenCalledWith(expect.anything(), PROJECT_ID, 'agent-1');
		expect(api.localConfig.value).toEqual(
			expect.objectContaining({ instructions: 'Fetched instructions.' }),
		);
		// localConfig is a working copy, not the same reference as the fetched config.
		expect(api.localConfig.value).not.toBe(getAgentConfigMock.mock.results[0].value);
		// isPublished reflects a set activeVersionId.
		expect(api.isPublished.value).toBe(true);
	});

	it('reports isPublished=false when the agent has no active version', async () => {
		getAgentMock.mockResolvedValue(makeAgent({ activeVersionId: null }));

		const node = ref<INodeUi | null>(makeAgentNode('agent-1'));
		const { api } = mountComposable(node);
		await flushPromises();

		expect(api.isPublished.value).toBe(false);
	});

	it('short-circuits when no agent is referenced (agentId === "")', async () => {
		const node = ref<INodeUi | null>(makeAgentNode(''));
		const { api } = mountComposable(node);
		await flushPromises();

		expect(api.isAgentNode.value).toBe(true);
		expect(api.agentId.value).toBe('');
		expect(getAgentConfigMock).not.toHaveBeenCalled();
		expect(getAgentMock).not.toHaveBeenCalled();
		expect(api.localConfig.value).toBeNull();
	});

	it('loads agent B after switching A→B and never applies A load onto B', async () => {
		getAgentConfigMock.mockImplementation(async (_ctx, _pid, aid: string) =>
			makeConfig({ instructions: `config-${aid}` }),
		);
		getAgentMock.mockImplementation(async (_ctx, _pid, aid: string) =>
			makeAgent({ id: aid, name: `agent-${aid}` }),
		);

		const node = ref<INodeUi | null>(makeAgentNode('agent-A'));
		const { api } = mountComposable(node);
		await flushPromises();
		expect(api.localConfig.value?.instructions).toBe('config-agent-A');

		// Switch the referenced agent — the watcher flushes A's pending save,
		// then loads B.
		node.value = makeAgentNode('agent-B');
		await flushPromises();

		expect(getAgentConfigMock).toHaveBeenCalledWith(expect.anything(), PROJECT_ID, 'agent-B');
		expect(api.localConfig.value?.instructions).toBe('config-agent-B');
		expect(api.agent.value?.id).toBe('agent-B');

		// Ordering: A's fetch pair precedes B's fetch pair (A settled before repointing).
		const configCallOrder = getAgentConfigMock.mock.calls.map((c) => c[2]);
		expect(configCallOrder).toEqual(['agent-A', 'agent-B']);
	});

	it('drops the working copy during an agent switch so mid-load edits cannot write A onto B', async () => {
		let resolveB: (value: ReturnType<typeof makeConfig>) => void = () => {};
		getAgentConfigMock.mockImplementation(async (_ctx, _pid, aid: string) => {
			if (aid === 'agent-B') {
				return await new Promise<ReturnType<typeof makeConfig>>((resolve) => (resolveB = resolve));
			}
			return makeConfig({ instructions: `config-${aid}` });
		});
		getAgentMock.mockImplementation(async (_ctx, _pid, aid: string) =>
			makeAgent({ id: aid, name: `agent-${aid}` }),
		);

		const node = ref<INodeUi | null>(makeAgentNode('agent-A'));
		const { api } = mountComposable(node);
		await flushPromises();
		expect(api.localConfig.value?.instructions).toBe('config-agent-A');

		// Switch to B; its config fetch stays in flight.
		node.value = makeAgentNode('agent-B');
		await flushPromises();

		// The old working copy is dropped for the duration of the load — an edit
		// in this window must not autosave agent A's content onto agent B.
		expect(api.localConfig.value).toBeNull();
		api.scheduleConfigUpdate({ instructions: 'typed during load' });
		await vi.advanceTimersByTimeAsync(1000);
		await flushPromises();
		expect(updateAgentConfigMock).not.toHaveBeenCalled();

		resolveB(makeConfig({ instructions: 'config-agent-B' }));
		await flushPromises();
		expect(api.localConfig.value?.instructions).toBe('config-agent-B');
	});

	// NDV agent editing is hidden until polished: `canUpdate` is hard-off, so no
	// edit path may ever reach the write API — even for users with agent:update.
	it('reports canUpdate=false and never schedules a save', async () => {
		const node = ref<INodeUi | null>(makeAgentNode('agent-1'));
		const { api } = mountComposable(node);
		await flushPromises();

		expect(api.canUpdate.value).toBe(false);

		api.scheduleConfigUpdate({ instructions: 'edited while read-only' });
		await vi.advanceTimersByTimeAsync(1000);
		await api.flush();
		await flushPromises();

		expect(updateAgentConfigMock).not.toHaveBeenCalled();
		// The working copy is untouched too — the guard rejects the edit outright.
		expect(api.localConfig.value?.instructions).toBe('Help the user.');
	});

	// NOTE (case #6, stale save): The composable's `agentId` watcher awaits
	// `flushAutosave()` (which awaits the in-flight save) BEFORE it runs
	// `load(newAgent)`. That serialization means a save's `updateConfig` always
	// resolves while `latestKey` still points at its own agent — so
	// `result.stale` is effectively unreachable via the switch path (the guard
	// in `saveConfig` is defensive). We therefore verify the stale-drop at its
	// real boundary: `useAgentConfig.updateConfig`, whose `{ stale }` result is
	// exactly what `saveConfig`'s `if (result.stale) return` consumes. Then we
	// assert the observable composable-level guarantee: a save that lands after
	// a switch never corrupts the newly-loaded agent's state.
	it('useAgentConfig.updateConfig flags stale when the active pair changed mid-save', async () => {
		vi.useRealTimers(); // pure boundary test — no debounce involved
		getAgentConfigMock.mockResolvedValue(makeConfig({ instructions: 'config-B' }));
		let resolveUpdate: (v: { config: AgentJsonConfig; versionId: string | null }) => void =
			() => {};
		updateAgentConfigMock.mockImplementation(
			async () =>
				await new Promise<{ config: AgentJsonConfig; versionId: string | null }>((resolve) => {
					resolveUpdate = resolve;
				}),
		);

		const { config, fetchConfig, updateConfig } = useAgentConfig();

		// Start a save for agent-A (its key becomes latest).
		const savePromise = updateConfig(PROJECT_ID, 'agent-A', makeConfig({ instructions: 'A edit' }));
		// A fetch for agent-B lands first, moving `latestKey` to agent-B.
		await fetchConfig(PROJECT_ID, 'agent-B');
		expect(config.value).toEqual(expect.objectContaining({ instructions: 'config-B' }));

		// Now let agent-A's save resolve — it must report stale and NOT clobber
		// agent-B's freshly fetched config.
		resolveUpdate({ config: makeConfig({ instructions: 'A stale write' }), versionId: 'sv' });
		const result = await savePromise;

		expect(result.stale).toBe(true);
		expect(config.value).toEqual(expect.objectContaining({ instructions: 'config-B' }));
	});

	it('marks the config unavailable and stops autosaving after a 404 on load', async () => {
		getAgentConfigMock.mockRejectedValue({ httpStatusCode: 404 });
		getAgentMock.mockRejectedValue({ httpStatusCode: 404 });

		const node = ref<INodeUi | null>(makeAgentNode('agent-1'));
		const { api } = mountComposable(node);
		await flushPromises();

		expect(api.isUnavailable.value).toBe(true);

		updateAgentConfigMock.mockClear();
		api.scheduleConfigUpdate({ instructions: 'should be ignored' });
		await vi.advanceTimersByTimeAsync(1000);
		await flushPromises();

		expect(updateAgentConfigMock).not.toHaveBeenCalled();
	});

	it('refetches config when another surface emits agentUpdated', async () => {
		const node = ref<INodeUi | null>(makeAgentNode('agent-1'));
		mountComposable(node);
		await flushPromises();

		expect(getAgentConfigMock).toHaveBeenCalledTimes(1);

		agentsEventBus.emit('agentUpdated');
		await flushPromises();

		expect(getAgentConfigMock).toHaveBeenCalledTimes(2);
		expect(getAgentConfigMock).toHaveBeenLastCalledWith(expect.anything(), PROJECT_ID, 'agent-1');
	});

	it('does not refetch on agentUpdated events for a different agent', async () => {
		const node = ref<INodeUi | null>(makeAgentNode('agent-1'));
		mountComposable(node);
		await flushPromises();
		getAgentConfigMock.mockClear();

		agentsEventBus.emit('agentUpdated', { agentId: 'agent-other', source: 'agent-builder' });
		await flushPromises();

		expect(getAgentConfigMock).not.toHaveBeenCalled();
	});

	it('stops reacting to agentUpdated once the host component unmounts', async () => {
		const node = ref<INodeUi | null>(makeAgentNode('agent-1'));
		const { wrapper } = mountComposable(node);
		await flushPromises();
		getAgentConfigMock.mockClear();

		wrapper.unmount();
		agentsEventBus.emit('agentUpdated');
		await flushPromises();

		expect(getAgentConfigMock).not.toHaveBeenCalled();
	});
});
