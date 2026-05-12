/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import type * as VueUse from '@vueuse/core';

import AgentAdvancedPanel from '../components/AgentAdvancedPanel.vue';
import { getAgentMemoryProfiles } from '../composables/useAgentApi';
import type { AgentJsonConfig } from '../types';

const { restApiContext } = vi.hoisted(() => ({ restApiContext: {} }));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agents.builder.advanced.title': 'Advanced',
				'agents.builder.advanced.thinking.label': 'Thinking',
				'agents.builder.advanced.thinking.hint': 'Set reasoning behavior.',
				'agents.builder.advanced.thinking.unsupportedTooltip': 'Unsupported provider',
				'agents.builder.advanced.thinking.unsupportedProviderFallback': 'provider',
				'agents.builder.advanced.budgetTokens.label': 'Budget tokens',
				'agents.builder.advanced.reasoningEffort.label': 'Reasoning effort',
				'agents.builder.advanced.concurrency.label': 'Tool call concurrency',
				'agents.builder.advanced.concurrency.hint': 'Run tools at the same time.',
				'agents.builder.advanced.approval.label': 'Require approval',
				'agents.builder.advanced.approval.hint': 'Ask before tools run.',
				'agents.builder.memory.profiles.title': 'User profile',
				'agents.builder.memory.profiles.userProfile.description':
					'What the agent remembers about you.',
				'agents.builder.memory.profiles.userProfile.empty': 'No user profile has been saved yet.',
				'agents.builder.memory.profiles.loading': 'Loading user profile...',
				'agents.builder.memory.profiles.error': "Couldn't load user profile.",
			})[key] ?? key,
	}),
}));

// Sub-control flips depend on debouncing — execute synchronously in the test.
vi.mock('@vueuse/core', async (importOriginal) => {
	const actual = await importOriginal<typeof VueUse>();
	return {
		...actual,
		useDebounceFn: (fn: (...args: unknown[]) => unknown) => fn,
	};
});

const globalStubs = {
	N8nCollapsiblePanel: {
		props: ['modelValue', 'title', 'disabled'],
		emits: ['update:modelValue'],
		template: `
			<section v-bind="$attrs">
				<button :disabled="disabled" @click="$emit('update:modelValue', !modelValue)">
					{{ title }}
				</button>
				<div v-show="modelValue"><slot /></div>
			</section>
		`,
	},
	N8nText: { template: '<span><slot /></span>' },
	N8nTooltip: { template: '<div><slot /></div>' },
	N8nInput: {
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
		template:
			'<input :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
	},
	N8nSelect: {
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
		template: '<select :disabled="disabled"><slot /></select>',
	},
	N8nOption: { template: '<option><slot /></option>' },
	N8nSwitch2: {
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
		template:
			'<button :disabled="disabled" :data-checked="modelValue" @click="$emit(\'update:modelValue\', !modelValue)" />',
	},
	LazyAgentMiniEditor: {
		props: ['modelValue', 'language', 'readonly', 'minHeight', 'maxHeight'],
		template: '<pre v-bind="$attrs">{{ modelValue }}</pre>',
	},
};

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext }),
}));

vi.mock('../composables/useAgentApi', () => ({
	getAgentMemoryProfiles: vi.fn(),
}));

function makeConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'A',
		instructions: 'i',
		model: 'anthropic/claude-sonnet-4-6',
		credential: 'c',
		...overrides,
	} as AgentJsonConfig;
}

const getAgentMemoryProfilesMock = vi.mocked(getAgentMemoryProfiles);

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});

	return { promise, resolve };
}

function mountPanel(
	props: Partial<{
		config: AgentJsonConfig | null;
		projectId: string;
		agentId: string;
		disabled: boolean;
		collapsible: boolean;
	}> = {},
) {
	return mount(AgentAdvancedPanel, {
		props: {
			config: makeConfig(),
			...props,
		},
		global: { stubs: globalStubs },
	});
}

function mountPanelWithProfile(props: Parameters<typeof mountPanel>[0] = {}) {
	return mountPanel({ projectId: 'project-1', agentId: 'agent-1', ...props });
}

describe('AgentAdvancedPanel', () => {
	beforeEach(() => {
		getAgentMemoryProfilesMock.mockReset();
		getAgentMemoryProfilesMock.mockResolvedValue({ userProfile: null });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows the budget-tokens sub-control for Anthropic when thinking is on', async () => {
		const config = makeConfig({
			config: { thinking: { provider: 'anthropic', budgetTokens: 1024 } },
		} as Partial<AgentJsonConfig>);
		const wrapper = mountPanel({ config });
		await nextTick();
		expect(wrapper.find('[data-testid="agent-budget-tokens-input"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-reasoning-effort-select"]').exists()).toBe(false);
	});

	it('shows the reasoning-effort sub-control for OpenAI when thinking is on', async () => {
		const config = makeConfig({
			model: 'openai/gpt-4o',
			config: { thinking: { provider: 'openai', reasoningEffort: 'high' } },
		} as Partial<AgentJsonConfig>);
		const wrapper = mountPanel({ config });
		await nextTick();
		expect(wrapper.find('[data-testid="agent-reasoning-effort-select"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-budget-tokens-input"]').exists()).toBe(false);
	});

	it('disables the thinking toggle for providers that do not support it', () => {
		const config = makeConfig({ model: 'google/gemini-pro' });
		const wrapper = mountPanel({ config });
		const toggle = wrapper.find('[data-testid="agent-thinking-toggle"]');
		expect(toggle.exists()).toBe(true);
		expect(toggle.attributes('disabled')).toBeDefined();
	});

	it('emits update:config with the thinking subtree when the toggle flips on', async () => {
		const config = makeConfig();
		const wrapper = mountPanel({ config });
		await wrapper.find('[data-testid="agent-thinking-toggle"]').trigger('click');
		const events = wrapper.emitted('update:config') ?? [];
		expect(events.length).toBeGreaterThan(0);
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect((last.config as { thinking: { provider: string } }).thinking.provider).toBe('anthropic');
	});

	it('disables every control when the disabled prop is true', () => {
		const config = makeConfig();
		const wrapper = mountPanel({ config, disabled: true });
		const toggle = wrapper.find('[data-testid="agent-thinking-toggle"]');
		expect(toggle.attributes('disabled')).toBeDefined();
		const concurrency = wrapper.find('[data-testid="agent-concurrency-input"]');
		expect(concurrency.attributes('disabled')).toBeDefined();
	});

	it('does not render memory controls in the advanced panel', () => {
		const config = makeConfig();
		const wrapper = mountPanel({ config });

		expect(wrapper.find('[data-testid="agent-episodic-memory-toggle"]').exists()).toBe(false);
	});

	it('renders the user profile section below the advanced controls', () => {
		const wrapper = mountPanel();

		expect(wrapper.find('[data-testid="agent-user-profile-divider"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-user-profile-section"]').text()).toContain(
			'User profile',
		);
	});

	it('loads the user profile and displays profile content', async () => {
		getAgentMemoryProfilesMock.mockResolvedValue({
			userProfile: 'The user prefers direct answers.',
		});
		const wrapper = mountPanelWithProfile();

		await flushPromises();

		expect(getAgentMemoryProfilesMock).toHaveBeenCalledWith(restApiContext, 'project-1', 'agent-1');
		expect(wrapper.text()).toContain('What the agent remembers about you.');
		expect(wrapper.find('[data-testid="agent-memory-user-profile"]').text()).toContain(
			'The user prefers direct answers.',
		);
	});

	it('shows empty and error profile states', async () => {
		getAgentMemoryProfilesMock.mockResolvedValueOnce({ userProfile: null });
		const emptyWrapper = mountPanelWithProfile();

		await flushPromises();

		expect(emptyWrapper.text()).toContain('No user profile has been saved yet.');

		getAgentMemoryProfilesMock.mockRejectedValueOnce(new Error('failed'));
		const errorWrapper = mountPanelWithProfile();

		await flushPromises();

		expect(errorWrapper.text()).toContain("Couldn't load user profile.");
	});

	it('shows the loading profile state', async () => {
		getAgentMemoryProfilesMock.mockImplementationOnce(() => new Promise(() => {}));
		const wrapper = mountPanelWithProfile();

		await nextTick();

		expect(wrapper.text()).toContain('Loading user profile...');
	});

	it('starts loading the new profile if the agent id changes while a request is in flight', async () => {
		const firstLoad = deferred<{ userProfile: string | null }>();
		const secondLoad = deferred<{ userProfile: string | null }>();
		getAgentMemoryProfilesMock
			.mockReturnValueOnce(firstLoad.promise)
			.mockReturnValueOnce(secondLoad.promise);
		const wrapper = mountPanelWithProfile();

		await nextTick();
		expect(getAgentMemoryProfilesMock).toHaveBeenCalledWith(restApiContext, 'project-1', 'agent-1');

		await wrapper.setProps({ agentId: 'agent-2' });
		expect(getAgentMemoryProfilesMock).toHaveBeenLastCalledWith(
			restApiContext,
			'project-1',
			'agent-2',
		);

		secondLoad.resolve({ userProfile: 'Profile for the second agent.' });
		await flushPromises();
		expect(wrapper.find('[data-testid="agent-memory-user-profile"]').text()).toContain(
			'Profile for the second agent.',
		);

		firstLoad.resolve({ userProfile: 'Stale first profile.' });
		await flushPromises();
		expect(wrapper.find('[data-testid="agent-memory-user-profile"]').text()).toContain(
			'Profile for the second agent.',
		);
	});

	it('does not start a duplicate profile request when switching back to an in-flight agent id', async () => {
		const firstLoad = deferred<{ userProfile: string | null }>();
		const secondLoad = deferred<{ userProfile: string | null }>();
		getAgentMemoryProfilesMock
			.mockReturnValueOnce(firstLoad.promise)
			.mockReturnValueOnce(secondLoad.promise);
		const wrapper = mountPanelWithProfile();

		await nextTick();
		await wrapper.setProps({ agentId: 'agent-2' });
		await wrapper.setProps({ agentId: 'agent-1' });

		expect(getAgentMemoryProfilesMock).toHaveBeenCalledTimes(2);
		expect(getAgentMemoryProfilesMock).toHaveBeenNthCalledWith(
			1,
			restApiContext,
			'project-1',
			'agent-1',
		);
		expect(getAgentMemoryProfilesMock).toHaveBeenNthCalledWith(
			2,
			restApiContext,
			'project-1',
			'agent-2',
		);

		secondLoad.resolve({ userProfile: 'Stale second profile.' });
		await flushPromises();
		expect(wrapper.text()).toContain('Loading user profile...');

		firstLoad.resolve({ userProfile: 'Profile for the first agent.' });
		await flushPromises();
		expect(wrapper.find('[data-testid="agent-memory-user-profile"]').text()).toContain(
			'Profile for the first agent.',
		);
	});

	it('polls the user profile while the advanced section is expanded', async () => {
		vi.useFakeTimers();
		getAgentMemoryProfilesMock.mockResolvedValue({ userProfile: 'Profile content.' });
		mountPanelWithProfile();

		await flushPromises();

		expect(getAgentMemoryProfilesMock).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(5000);
		await flushPromises();

		expect(getAgentMemoryProfilesMock).toHaveBeenCalledTimes(2);
	});

	it('stops polling when the advanced section is collapsed', async () => {
		vi.useFakeTimers();
		getAgentMemoryProfilesMock.mockResolvedValue({ userProfile: 'Profile content.' });
		const wrapper = mountPanelWithProfile({ collapsible: true });

		await wrapper.find('[data-testid="agent-behavior-panel"] button').trigger('click');
		await flushPromises();
		await wrapper.find('[data-testid="agent-behavior-panel"] button').trigger('click');
		await vi.advanceTimersByTimeAsync(5000);
		await flushPromises();

		expect(getAgentMemoryProfilesMock).toHaveBeenCalledTimes(1);
	});

	it('stops polling when unmounted', async () => {
		vi.useFakeTimers();
		getAgentMemoryProfilesMock.mockResolvedValue({ userProfile: 'Profile content.' });
		const wrapper = mountPanelWithProfile();

		await flushPromises();
		wrapper.unmount();
		await vi.advanceTimersByTimeAsync(5000);
		await flushPromises();

		expect(getAgentMemoryProfilesMock).toHaveBeenCalledTimes(1);
	});

	it('does not load the user profile when the advanced panel is disabled', async () => {
		const wrapper = mountPanelWithProfile({ disabled: true });

		expect(wrapper.find('[data-testid="agent-memory-user-profile"]').text()).toContain(
			'No user profile has been saved yet.',
		);

		expect(getAgentMemoryProfilesMock).not.toHaveBeenCalled();
	});
});
