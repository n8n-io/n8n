import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { defineComponent, ref, type Ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { InlineAgentConfig } from '@n8n/api-types';

import type { INodeUi } from '@/Interface';
import type { AgentJsonConfig, AgentResource } from '@/features/agents/types';
import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants/nodeTypes';
import { agentsEventBus } from '@/features/agents/agents.eventBus';
import { ndvEventBus } from '@/features/ndv/shared/ndv.eventBus';
import { useNdvAgentConfig, type UseNdvAgentConfigReturn } from '../useNdvAgentConfig';

// The API layer is the seam under our control; `useAgentConfig` is the REAL
// composable so its stale-fetch drop is exercised authentically.
const getAgentMock = vi.fn();
const getAgentConfigMock = vi.fn();

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	getAgent: (...args: unknown[]) => getAgentMock(...args),
	getAgentConfig: (...args: unknown[]) => getAgentConfigMock(...args),
}));

// `useAgentCapabilitiesActions` pulls in UI/nodeTypes stores + i18n we don't
// exercise here; stub it so the facade's own read/write paths are the SUT.
vi.mock('@/features/agents/composables/useAgentCapabilitiesActions', () => ({
	useAgentCapabilitiesActions: () => ({ appliedSkills: ref([]) }),
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

function makeAgentNode(agentId: string, extraParameters: Record<string, unknown> = {}): INodeUi {
	return {
		id: 'node-1',
		name: 'Message an Agent',
		type: MESSAGE_AN_AGENT_NODE_TYPE,
		// The NDV agent experience is v2-gated (v1 keeps the raw layout).
		typeVersion: 2,
		position: [0, 0],
		parameters: {
			agentId: { __rl: true, mode: 'list', value: agentId },
			...extraParameters,
		},
	} as unknown as INodeUi;
}

function makeInlineAgentNode(inlineAgent?: InlineAgentConfig, leftoverAgentId = ''): INodeUi {
	return makeAgentNode(leftoverAgentId, {
		agentSource: 'inline',
		...(inlineAgent ? { inlineAgent } : {}),
	});
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
		setActivePinia(createTestingPinia());
		getAgentMock.mockReset().mockResolvedValue(makeAgent());
		getAgentConfigMock.mockReset().mockResolvedValue(makeConfig());
	});

	afterEach(() => {
		while (mountedWrappers.length) mountedWrappers.pop()?.unmount();
	});

	it('does not fetch config for a non-agent node and reports isAgentNode=false', async () => {
		const node = ref<INodeUi | null>(makePlainNode());
		const { api } = mountComposable(node);
		await flushPromises();

		expect(api.isAgentNode.value).toBe(false);
		expect(api.agentId.value).toBe('');
		expect(getAgentConfigMock).not.toHaveBeenCalled();
		expect(getAgentMock).not.toHaveBeenCalled();
		expect(api.referenced.config.value).toBeNull();
	});

	describe('referenced mode', () => {
		it('fetches config + agent on mount and populates the summary / isPublished', async () => {
			getAgentConfigMock.mockResolvedValue(makeConfig({ instructions: 'Fetched instructions.' }));
			getAgentMock.mockResolvedValue(makeAgent({ activeVersionId: 'published-v1' }));

			const node = ref<INodeUi | null>(makeAgentNode('agent-1'));
			const { api } = mountComposable(node);
			await flushPromises();

			expect(api.isAgentNode.value).toBe(true);
			expect(api.mode.value).toBe('referenced');
			expect(getAgentConfigMock).toHaveBeenCalledWith(expect.anything(), PROJECT_ID, 'agent-1');
			expect(getAgentMock).toHaveBeenCalledWith(expect.anything(), PROJECT_ID, 'agent-1');
			expect(api.referenced.config.value).toEqual(
				expect.objectContaining({ instructions: 'Fetched instructions.' }),
			);
			expect(api.referenced.isPublished.value).toBe(true);
		});

		it('short-circuits when no agent is referenced (agentId === "")', async () => {
			const node = ref<INodeUi | null>(makeAgentNode(''));
			const { api } = mountComposable(node);
			await flushPromises();

			expect(api.isAgentNode.value).toBe(true);
			expect(api.agentId.value).toBe('');
			expect(getAgentConfigMock).not.toHaveBeenCalled();
			expect(getAgentMock).not.toHaveBeenCalled();
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
			expect(api.referenced.config.value?.instructions).toBe('config-agent-A');

			node.value = makeAgentNode('agent-B');
			await flushPromises();

			expect(getAgentConfigMock).toHaveBeenCalledWith(expect.anything(), PROJECT_ID, 'agent-B');
			expect(api.referenced.config.value?.instructions).toBe('config-agent-B');
			expect(api.referenced.agent.value?.id).toBe('agent-B');
		});

		it('marks the agent unavailable after a 404 on load', async () => {
			getAgentConfigMock.mockRejectedValue({ httpStatusCode: 404 });
			getAgentMock.mockRejectedValue({ httpStatusCode: 404 });

			const node = ref<INodeUi | null>(makeAgentNode('agent-1'));
			const { api } = mountComposable(node);
			await flushPromises();

			expect(api.referenced.isUnavailable.value).toBe(true);
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

		it('resolves skill names from the agent record for the summary chips', async () => {
			getAgentConfigMock.mockResolvedValue(
				makeConfig({ skills: [{ type: 'skill', id: 'triage' }] }),
			);
			getAgentMock.mockResolvedValue(
				makeAgent({
					skills: { triage: { name: 'Triage Issues', description: '', instructions: '' } },
				}),
			);

			const node = ref<INodeUi | null>(makeAgentNode('agent-1'));
			const { api } = mountComposable(node);
			await flushPromises();

			expect(api.referenced.appliedSkills.value).toEqual([
				{ id: 'triage', skill: expect.objectContaining({ name: 'Triage Issues' }) },
			]);
		});
	});

	describe('inline mode', () => {
		it('idles the referenced loader, even with a leftover agentId param', async () => {
			const node = ref<INodeUi | null>(makeInlineAgentNode(undefined, /* leftover */ 'agent-1'));
			const { api } = mountComposable(node);
			await flushPromises();

			expect(api.mode.value).toBe('inline');
			// The facade reports no referenced agent (the banner treats inline as
			// "create a draft", not "open the leftover reference").
			expect(api.agentId.value).toBe('');
			expect(getAgentConfigMock).not.toHaveBeenCalled();
			expect(getAgentMock).not.toHaveBeenCalled();
		});

		it('exposes the stored inline config', async () => {
			const node = ref<INodeUi | null>(
				makeInlineAgentNode({
					config: { name: 'Embedded', model: 'openai/gpt-5', instructions: 'Do things.' },
				}),
			);
			const { api } = mountComposable(node);

			expect(api.inline.localConfig.value).toEqual(
				expect.objectContaining({ name: 'Embedded', model: 'openai/gpt-5' }),
			);
		});

		it('falls back to a display-only default config without writing it back', async () => {
			const node = ref<INodeUi | null>(makeInlineAgentNode());
			const emitSpy = vi.spyOn(ndvEventBus, 'emit');
			const { api } = mountComposable(node);

			expect(api.inline.localConfig.value).toEqual(
				expect.objectContaining({
					name: 'AI Agent',
					model: '',
					instructions: 'You are a helpful agent',
				}),
			);
			expect(emitSpy).not.toHaveBeenCalled();
			emitSpy.mockRestore();
		});

		it('writes merged updates to the inlineAgent parameter, addressed to the node', async () => {
			const node = ref<INodeUi | null>(
				makeInlineAgentNode({
					config: { name: 'Embedded', model: 'openai/gpt-5', instructions: 'Old.' },
				}),
			);
			const emitSpy = vi.spyOn(ndvEventBus, 'emit');
			const { api } = mountComposable(node);

			api.inline.scheduleConfigUpdate({ instructions: 'New.' });

			expect(emitSpy).toHaveBeenCalledWith('updateParameterValue', {
				name: 'parameters.inlineAgent',
				value: {
					config: expect.objectContaining({
						name: 'Embedded',
						model: 'openai/gpt-5',
						instructions: 'New.',
					}),
				},
				node: 'Message an Agent',
			});
			emitSpy.mockRestore();
		});

		it('persists MCP servers from the tools modal payload', async () => {
			const node = ref<INodeUi | null>(
				makeInlineAgentNode({
					config: { name: 'Embedded', model: 'openai/gpt-5', instructions: '' },
				}),
			);
			const emitSpy = vi.spyOn(ndvEventBus, 'emit');
			const { api } = mountComposable(node);

			const mcpServer = {
				name: 'github',
				url: 'https://mcp.example.com',
				transport: 'streamableHttp' as const,
				authentication: 'none' as const,
			};
			api.inline.scheduleConfigUpdate({ tools: [], mcpServers: [mcpServer] });

			expect(emitSpy).toHaveBeenCalledWith('updateParameterValue', {
				name: 'parameters.inlineAgent',
				value: {
					config: expect.objectContaining({ mcpServers: [mcpServer] }),
				},
				node: 'Message an Agent',
			});
			emitSpy.mockRestore();
		});

		it('strips config keys outside the inline scope before writing', async () => {
			const node = ref<INodeUi | null>(
				makeInlineAgentNode({
					config: { name: 'Embedded', model: 'openai/gpt-5', instructions: '' },
				}),
			);
			const emitSpy = vi.spyOn(ndvEventBus, 'emit');
			const { api } = mountComposable(node);

			// Model changes from the shared info panel can carry saved-agent-only
			// keys (options block, provider tools) — persisting them would fail
			// strict validation at execution time.
			api.inline.scheduleConfigUpdate({
				model: 'anthropic/claude-sonnet-4-5',
				config: { webSearch: { enabled: true } },
				providerTools: { anthropic: {} },
			} as Partial<AgentJsonConfig>);

			const [, payload] = emitSpy.mock.calls[0] as unknown as [
				string,
				{ value: { config: Record<string, unknown> } },
			];
			expect(payload.value.config.model).toBe('anthropic/claude-sonnet-4-5');
			expect(payload.value.config).not.toHaveProperty('config');
			expect(payload.value.config).not.toHaveProperty('providerTools');
			emitSpy.mockRestore();
		});

		it('resumes referenced fetching when the node toggles back to referenced', async () => {
			const node = ref<INodeUi | null>(makeInlineAgentNode(undefined, 'agent-1'));
			const { api } = mountComposable(node);
			await flushPromises();
			expect(getAgentConfigMock).not.toHaveBeenCalled();

			// Toggle back: same node, agentSource flips to referenced — the
			// retained agentId param takes effect again.
			node.value = makeAgentNode('agent-1');
			await flushPromises();

			expect(api.mode.value).toBe('referenced');
			expect(getAgentConfigMock).toHaveBeenCalledWith(expect.anything(), PROJECT_ID, 'agent-1');
		});
	});
});
