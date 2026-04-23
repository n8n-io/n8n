/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- test-only patterns: @vue/test-utils is a transitive devDep and private-state reads */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick, ref } from 'vue';

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
	useRoute: () => ({ params: { projectId: 'p1', agentId: 'a1' }, query: {} }),
	onBeforeRouteLeave: vi.fn(),
	RouterLink: { template: '<a><slot/></a>' },
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({ personalProject: { id: 'p1' } }),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		fetchAllCredentials: vi.fn().mockResolvedValue(undefined),
		fetchCredentialTypes: vi.fn().mockResolvedValue(undefined),
	}),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: vi.fn() }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		openModalWithData: vi.fn(),
		closeModal: vi.fn(),
	}),
}));

const updateAgentMock = vi.fn();
const getIntegrationStatusMock = vi.fn();
const publishAgentMock = vi.fn();

vi.mock('../composables/useAgentApi', () => ({
	getAgent: vi.fn().mockResolvedValue({
		id: 'a1',
		name: 'Agent One',
		description: null,
		tools: {},
		updatedAt: '2026-01-01T00:00:00Z',
		publishedVersion: null,
		versionId: 'v1',
	}),
	updateAgent: updateAgentMock,
	deleteAgent: vi.fn(),
	publishAgent: publishAgentMock,
	getIntegrationStatus: getIntegrationStatusMock,
}));

const trackClickedNewAgentMock = vi.fn();
const trackSubmittedMessageMock = vi.fn();
const trackEditedConfigMock = vi.fn();
const trackAddedTriggerMock = vi.fn();
const trackAddedToolsMock = vi.fn();
const trackPublishedAgentMock = vi.fn();
const trackUnpublishedAgentMock = vi.fn();

vi.mock('../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({
		trackClickedNewAgent: trackClickedNewAgentMock,
		trackSubmittedMessage: trackSubmittedMessageMock,
		trackEditedConfig: trackEditedConfigMock,
		trackAddedTrigger: trackAddedTriggerMock,
		trackAddedTools: trackAddedToolsMock,
		trackPublishedAgent: trackPublishedAgentMock,
		trackUnpublishedAgent: trackUnpublishedAgentMock,
	}),
}));

// Real ref so the view's `watch(config, ...)` fires and populates `localConfig`.
// Tests that need an unbuilt agent flip this to empty instructions before render.
const mockConfig = ref<{ name: string; instructions: string } | null>({
	name: 'Agent One',
	instructions: 'You are a helpful assistant.',
});
// Stash the "desired config" separately so the fetchConfig mock can restore
// the ref after `initialize()` clears `localConfig` and re-fetches. Without
// this, the view's `localConfig = null` reset sticks — the config ref hasn't
// changed, so the `watch(config, ...)` listener doesn't re-fire.
let intendedConfig: { name: string; instructions: string } | null = {
	name: 'Agent One',
	instructions: 'You are a helpful assistant.',
};

vi.mock('../composables/useAgentConfig', () => ({
	useAgentConfig: () => ({
		config: mockConfig,
		fetchConfig: vi.fn().mockImplementation(async () => {
			// Mimic the real composable: re-publish the fetched config by touching
			// the ref, which triggers watchers even when the shape is unchanged.
			mockConfig.value = intendedConfig ? { ...intendedConfig } : null;
		}),
		updateConfig: vi.fn().mockResolvedValue({ versionId: 'v1' }),
	}),
}));

vi.mock('../agentSessions.store', () => ({
	useAgentSessionsStore: () => ({
		threads: [],
		fetchThreads: vi.fn().mockResolvedValue(undefined),
	}),
}));

const baseTextFn = (key: string) => {
	const map: Record<string, string> = {
		'agents.builder.chatMode.build': 'Build',
		'agents.builder.chatMode.test': 'Test',
		'agents.builder.chatMode.ariaLabel': 'Switch chat mode',
	};
	return map[key] ?? key;
};

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: baseTextFn }),
	i18n: { baseText: baseTextFn },
}));

// The first test in this file pays the one-time SFC transform cost for
// AgentBuilderView.vue and its dependencies. A generous timeout gives that
// first render enough headroom; subsequent tests hit the cached module and
// finish well under the default budget.
vi.setConfig({ testTimeout: 30_000 });

describe('AgentBuilderView — chat mode toggle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset to a built agent; tests that need an unbuilt agent override locally.
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
		};
		mockConfig.value = { ...intendedConfig };
		getIntegrationStatusMock.mockResolvedValue({ status: 'ok', integrations: [] });
	});

	async function renderView() {
		const { default: AgentBuilderView } = await import('../views/AgentBuilderView.vue');
		const wrapper = mount(AgentBuilderView, {
			global: {
				stubs: {
					AgentChatPanel: {
						name: 'AgentChatPanel',
						template: '<div data-testid="chat-panel-stub" :data-endpoint="endpoint" />',
						props: [
							'endpoint',
							'projectId',
							'agentId',
							'mode',
							'initialMessage',
							'agentConfig',
							'agentStatus',
							'connectedTriggers',
						],
					},
					AgentHomeContent: {
						name: 'AgentHomeContent',
						emits: ['update:name', 'update:description'],
						template: '<div data-testid="home-stub" />',
					},
					AgentSettingsSidebar: {
						name: 'AgentSettingsSidebar',
						emits: ['update:connected-triggers'],
						template: '<div data-testid="settings-stub" />',
					},
					N8nIcon: { template: '<i v-bind="$attrs"></i>', props: ['icon', 'size'] },
					N8nText: { template: '<span v-bind="$attrs"><slot/></span>' },
					N8nActionDropdown: { template: '<div />' },
					Transition: { template: '<div><slot/></div>' },
				},
			},
		});
		await flushPromises();
		return wrapper;
	}

	it('shows the toggle in chat mode with Test active by default', async () => {
		const wrapper = await renderView();
		(wrapper.vm as unknown as { mode: string }).mode = 'chat';
		await nextTick();

		expect(wrapper.find('[data-testid="agent-chat-mode-toggle"]').exists()).toBe(true);
		const radios = wrapper.findAll('[role="radio"]');
		const testRadio = radios.find((r) => r.text().includes('Test'));
		const buildRadio = radios.find((r) => r.text().includes('Build'));
		expect(testRadio?.attributes('aria-checked')).toBe('true');
		expect(buildRadio?.attributes('aria-checked')).toBe('false');
	});

	it('lazy-mounts each chat panel on first activation and toggles visibility via v-show afterwards', async () => {
		// Entering chat mode with the default `test` tab should only mount the
		// test panel — the build panel stays unmounted until the user clicks
		// Build, so we don't fire a second loadHistory() for a tab the user
		// may never open.
		const wrapper = await renderView();
		const vm = wrapper.vm as unknown as {
			mode: string;
			activeChatSessionId: string | null;
		};
		// Test requires an active session (a real user would reach this by
		// sending a message from the home input, which mints one). Seed it
		// directly so we can exercise the lazy-mount/v-show behavior.
		vm.activeChatSessionId = 'test-session-1';
		vm.mode = 'chat';
		await nextTick();

		const testPanel = wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="chat"]');
		expect(testPanel.exists()).toBe(true);
		expect(wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="build"]').exists()).toBe(
			false,
		);
		expect((testPanel.element as HTMLElement).style.display).not.toBe('none');

		// Clicking Build mounts the build panel for the first time; test is now
		// hidden via v-show but still mounted so its state is preserved.
		await wrapper.find('[data-test-id="radio-button-build"]').trigger('click');
		await nextTick();

		const buildPanel = wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="build"]');
		expect(buildPanel.exists()).toBe(true);
		expect((testPanel.element as HTMLElement).style.display).toBe('none');
		expect((buildPanel.element as HTMLElement).style.display).not.toBe('none');

		// Switching back to Test should not unmount Build — both panels stay
		// mounted once opened so neither re-runs loadHistory on toggle.
		await wrapper.find('[data-test-id="radio-button-test"]').trigger('click');
		await nextTick();

		expect(wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="chat"]').exists()).toBe(
			true,
		);
		expect(wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="build"]').exists()).toBe(
			true,
		);
		expect((testPanel.element as HTMLElement).style.display).not.toBe('none');
		expect((buildPanel.element as HTMLElement).style.display).toBe('none');
	});

	it('drops unbuilt agents straight into the build chat on load', async () => {
		// Unbuilt agents go to the build chat unconditionally so the build
		// panel mounts, triggers loadHistory, and any prior conversation with
		// the builder is visible instead of being stranded behind the home
		// screen (where the Test tab is locked and clicking Build is a no-op).
		intendedConfig = { name: 'Agent One', instructions: '' };
		mockConfig.value = { ...intendedConfig };

		const wrapper = await renderView();
		const vm = wrapper.vm as unknown as { mode: string; chatMode: string };

		expect(vm.mode).toBe('chat');
		expect(vm.chatMode).toBe('build');
	});

	it('lands built agents on the home screen', async () => {
		const wrapper = await renderView();
		const vm = wrapper.vm as unknown as { mode: string; chatMode: string };

		expect(vm.mode).toBe('home');
		expect(vm.chatMode).toBe('test');
	});

	it('locks the Test tab when the agent has no instructions', async () => {
		intendedConfig = { name: 'Agent One', instructions: '' };
		mockConfig.value = { ...intendedConfig };
		const wrapper = await renderView();
		const vm = wrapper.vm as unknown as { chatMode: string; mode: string };

		// Get into Build mode first (it's clickable on any agent state).
		await wrapper.find('[data-test-id="radio-button-build"]').trigger('click');
		await nextTick();
		expect(vm.chatMode).toBe('build');

		// Clicking Test on an unbuilt agent must be a no-op — the RadioButton
		// option is disabled and the click handler returns early.
		await wrapper.find('[data-test-id="radio-button-test"]').trigger('click');
		await nextTick();
		expect(vm.chatMode).toBe('build');
	});

	it('transitions from home to chat when a toggle segment is clicked', async () => {
		const wrapper = await renderView();
		const vm = wrapper.vm as unknown as { mode: string; chatMode: string };

		expect(vm.mode).toBe('home');

		await wrapper.find('[data-test-id="radio-button-build"]').trigger('click');
		await nextTick();

		expect(vm.mode).toBe('chat');
		expect(vm.chatMode).toBe('build');

		const buildPanel = wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="build"]');
		expect(buildPanel.exists()).toBe(true);
		expect((buildPanel.element as HTMLElement).style.display).not.toBe('none');
	});

	it('navigates directly to build chat on startChat for an unbuilt agent (no progress screen)', async () => {
		const wrapper = await renderView();
		const vm = wrapper.vm as unknown as {
			mode: string;
			chatMode: string;
			startChat: (msg: string) => void;
			isBuilt: boolean;
		};

		// Agent has no instructions — isBuilt should be false.
		expect(vm.isBuilt).toBe(false);

		vm.startChat('Build me a Slack triage agent');
		await nextTick();

		// Should go directly into build chat — no 'building' mode.
		expect(vm.mode).toBe('chat');
		expect(vm.chatMode).toBe('build');

		// No progress screen rendered
		expect(wrapper.find('[data-testid="progress-stub"]').exists()).toBe(false);

		// Build chat panel should be visible
		const buildPanel = wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="build"]');
		expect(buildPanel.exists()).toBe(true);
	});
});

describe('AgentBuilderView — telemetry', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getIntegrationStatusMock.mockResolvedValue({ status: 'ok', integrations: [] });
		updateAgentMock.mockImplementation(
			async (_ctx, _pid, _aid, patch: Record<string, unknown>) => ({
				id: 'a1',
				name: typeof patch.name === 'string' ? patch.name : 'Agent One',
				description: typeof patch.description === 'string' ? patch.description : null,
				tools: {},
				updatedAt: '2026-01-02T00:00:00Z',
				publishedVersion: null,
				versionId: 'v1',
			}),
		);
	});

	async function renderViewWithEmittableStubs() {
		const { default: AgentBuilderView } = await import('../views/AgentBuilderView.vue');
		const wrapper = mount(AgentBuilderView, {
			global: {
				stubs: {
					AgentChatPanel: {
						name: 'AgentChatPanel',
						template: '<div data-testid="chat-panel-stub" />',
						props: [
							'endpoint',
							'projectId',
							'agentId',
							'mode',
							'initialMessage',
							'agentConfig',
							'agentStatus',
							'connectedTriggers',
						],
					},
					AgentHomeContent: {
						name: 'AgentHomeContent',
						emits: ['update:name', 'update:description'],
						template: '<div data-testid="home-stub" />',
					},
					AgentBuilderProgress: { template: '<div data-testid="progress-stub" />' },
					AgentSettingsSidebar: {
						name: 'AgentSettingsSidebar',
						emits: ['update:connected-triggers'],
						template: '<div data-testid="settings-stub" />',
					},
					N8nIcon: { template: '<i v-bind="$attrs"></i>', props: ['icon', 'size'] },
					N8nText: { template: '<span v-bind="$attrs"><slot/></span>' },
					N8nActionDropdown: { template: '<div />' },
					Transition: { template: '<div><slot/></div>' },
				},
			},
		});
		await flushPromises();
		return wrapper;
	}

	afterEach(async () => {
		// Drain any telemetry IIFEs (crypto.subtle digest + track call) so
		// pending work doesn't leak across tests and pollute later mocks.
		for (let i = 0; i < 5; i++) await flushPromises();
	});

	it('fires User edited agent config with part=name when the agent name is updated', async () => {
		const wrapper = await renderViewWithEmittableStubs();
		const home = wrapper.findComponent({ name: 'AgentHomeContent' });

		home.vm.$emit('update:name', 'Renamed Agent');

		await vi.waitFor(() => {
			expect(trackEditedConfigMock).toHaveBeenCalledWith(
				expect.objectContaining({ agentId: 'a1', part: 'name' }),
			);
		});
		expect(updateAgentMock).toHaveBeenCalledWith(expect.anything(), 'p1', 'a1', {
			name: 'Renamed Agent',
		});
	});

	it('fires User edited agent config with part=description when the description is updated', async () => {
		const wrapper = await renderViewWithEmittableStubs();
		const home = wrapper.findComponent({ name: 'AgentHomeContent' });

		home.vm.$emit('update:description', 'A new description');

		await vi.waitFor(() => {
			expect(trackEditedConfigMock).toHaveBeenCalledWith(
				expect.objectContaining({ agentId: 'a1', part: 'description' }),
			);
		});
		expect(updateAgentMock).toHaveBeenCalledWith(
			expect.anything(),
			'p1',
			'a1',
			expect.objectContaining({ description: 'A new description' }),
		);
	});

	it('fires User edited agent config with part=triggers when the connected-triggers list changes', async () => {
		const wrapper = await renderViewWithEmittableStubs();
		const sidebar = wrapper.findComponent({ name: 'AgentSettingsSidebar' });

		// Baseline starts at [] from loadInitialConnectedTriggers (mocked to
		// return no integrations). Emitting a different list should fire.
		sidebar.vm.$emit('update:connected-triggers', ['slack']);

		await vi.waitFor(() => {
			expect(trackEditedConfigMock).toHaveBeenCalledWith(
				expect.objectContaining({ agentId: 'a1', part: 'triggers' }),
			);
		});
	});

	it('does not fire User edited agent config when the connected-triggers list is unchanged', async () => {
		// Pre-seed the baseline to ['slack'] so an emission of the same list is a no-op.
		getIntegrationStatusMock.mockResolvedValueOnce({
			status: 'ok',
			integrations: [{ type: 'slack', credentialId: 'c1' }],
		});

		const wrapper = await renderViewWithEmittableStubs();
		const sidebar = wrapper.findComponent({ name: 'AgentSettingsSidebar' });

		trackEditedConfigMock.mockClear();
		sidebar.vm.$emit('update:connected-triggers', ['slack']);
		for (let i = 0; i < 5; i++) await flushPromises();

		expect(trackEditedConfigMock).not.toHaveBeenCalled();
	});
});
