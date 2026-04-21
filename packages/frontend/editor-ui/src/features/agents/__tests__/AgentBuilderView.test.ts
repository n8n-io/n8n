/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- test-only patterns: @vue/test-utils is a transitive devDep and private-state reads */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';

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

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: vi.fn() }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

vi.mock('../composables/useAgentApi', () => ({
	getAgent: vi.fn().mockResolvedValue({
		id: 'a1',
		name: 'Agent One',
		description: null,
		tools: {},
		updatedAt: '2026-01-01T00:00:00Z',
	}),
	updateAgent: vi.fn(),
	deleteAgent: vi.fn(),
	publishAgent: vi.fn(),
}));

vi.mock('../composables/useAgentConfig', () => ({
	useAgentConfig: () => ({
		config: { value: { name: 'Agent One', instructions: '' } },
		fetchConfig: vi.fn().mockResolvedValue(undefined),
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

describe('AgentBuilderView — chat mode toggle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	async function renderView() {
		const { default: AgentBuilderView } = await import('../views/AgentBuilderView.vue');
		const wrapper = mount(AgentBuilderView, {
			global: {
				stubs: {
					AgentChatPanel: {
						name: 'AgentChatPanel',
						template: '<div data-testid="chat-panel-stub" :data-endpoint="endpoint" />',
						props: ['endpoint', 'projectId', 'agentId', 'mode', 'initialMessage'],
					},
					AgentHomeContent: { template: '<div data-testid="home-stub" />' },
					AgentBuilderProgress: { template: '<div data-testid="progress-stub" />' },
					AgentSettingsSidebar: { template: '<div data-testid="settings-stub" />' },
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
});
