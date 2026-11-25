import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentTestChatPage from '@/features/agents/components/AgentTestChatPage.vue';

const { sendMessageFromOutsideMock } = vi.hoisted(() => ({
	sendMessageFromOutsideMock: vi.fn(),
}));

const AgentChatPanelStub = defineComponent({
	name: 'AgentChatPanel',
	setup(_, { slots, expose }) {
		expose({
			focusInput: vi.fn(),
			getConversationMarkdown: vi.fn().mockResolvedValue(''),
			clearBudgetStops: vi.fn(),
			sendMessageFromOutside: sendMessageFromOutsideMock,
		});

		return () =>
			h('div', { 'data-testid': 'chat-panel-stub' }, [
				slots['empty-state']
					? h('div', { 'data-testid': 'custom-empty-state-slot' }, slots['empty-state']())
					: h('div', { 'data-testid': 'default-empty-state-fallback' }),
			]);
	},
});

const AgentTestScenariosEmptyStateStub = defineComponent({
	name: 'AgentTestScenariosEmptyState',
	props: ['projectId', 'agentId', 'beforeGenerate', 'autoRun'],
	emits: ['select', 'auto-run-consumed'],
	template: `
		<div data-testid="scenarios-empty-state-stub" :data-auto-run="String(Boolean(autoRun))">
			<button data-testid="trigger-select" @click="$emit('select', 'Run scenario 1')" />
			<button data-testid="trigger-consumed" @click="$emit('auto-run-consumed')" />
		</div>
	`,
});

function mountPage(props: Partial<InstanceType<typeof AgentTestChatPage>['$props']> = {}) {
	return mount(AgentTestChatPage, {
		props: {
			initialized: true,
			projectId: 'project-1',
			agentId: 'agent-1',
			agent: null,
			localConfig: null,
			connectedTriggers: [],
			effectiveSessionId: 'session-1',
			...props,
		},
		global: {
			stubs: {
				AgentChatPanel: AgentChatPanelStub,
				AgentTestScenariosEmptyState: AgentTestScenariosEmptyStateStub,
			},
		},
	});
}

describe('AgentTestChatPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('falls back to the default empty state when showTestScenarios is false', () => {
		const wrapper = mountPage({ showTestScenarios: false });

		expect(wrapper.find('[data-testid="default-empty-state-fallback"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="scenarios-empty-state-stub"]').exists()).toBe(false);
	});

	it('renders the suggested scenarios empty state and sends selected scenarios when enabled', async () => {
		const wrapper = mountPage({ showTestScenarios: true });

		const emptyState = wrapper.get('[data-testid="scenarios-empty-state-stub"]');
		expect(emptyState.attributes('data-auto-run')).toBe('false');

		await wrapper.get('[data-testid="trigger-select"]').trigger('click');
		expect(sendMessageFromOutsideMock).toHaveBeenCalledExactlyOnceWith('Run scenario 1');
	});

	it('passes autoRun to the scenarios empty state when autoStartTest is true and forwards consumption', async () => {
		const wrapper = mountPage({ showTestScenarios: true, autoStartTest: true });

		expect(
			wrapper.get('[data-testid="scenarios-empty-state-stub"]').attributes('data-auto-run'),
		).toBe('true');

		await wrapper.get('[data-testid="trigger-consumed"]').trigger('click');
		await flushPromises();
		expect(wrapper.emitted('auto-start-consumed')).toEqual([[]]);
	});

	it('suppresses autoRun when an explicit initialPrompt is already present', async () => {
		const wrapper = mountPage({
			showTestScenarios: true,
			autoStartTest: true,
			initialPrompt: 'Run scheduled check',
		});
		await flushPromises();

		expect(
			wrapper.get('[data-testid="scenarios-empty-state-stub"]').attributes('data-auto-run'),
		).toBe('false');
		expect(sendMessageFromOutsideMock).toHaveBeenCalledWith('Run scheduled check');
	});
});
