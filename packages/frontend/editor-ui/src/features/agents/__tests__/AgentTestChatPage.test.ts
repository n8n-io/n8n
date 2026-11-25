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
	props: ['projectId', 'agentId', 'beforeGenerate'],
	emits: ['select'],
	template: `
		<div data-testid="scenarios-empty-state-stub">
			<button data-testid="trigger-select" @click="$emit('select', 'Run scenario 1')" />
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

		expect(wrapper.find('[data-testid="scenarios-empty-state-stub"]').exists()).toBe(true);

		await wrapper.get('[data-testid="trigger-select"]').trigger('click');
		expect(sendMessageFromOutsideMock).toHaveBeenCalledExactlyOnceWith('Run scenario 1');
	});

	it('sends an explicit initialPrompt when provided', async () => {
		mountPage({
			showTestScenarios: true,
			initialPrompt: 'Run scheduled check',
		});
		await flushPromises();

		expect(sendMessageFromOutsideMock).toHaveBeenCalledWith('Run scheduled check');
	});
});
