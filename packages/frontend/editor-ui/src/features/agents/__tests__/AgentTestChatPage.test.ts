import {
	AI_GATEWAY_MANAGED_TAG,
	MANAGED_CREDENTIAL_TOKEN,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentTestChatPage from '@/features/agents/components/AgentTestChatPage.vue';

function makeLocalConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'Support Triage',
		model: 'openai/gpt-4.1',
		credential: 'cred-1',
		instructions: 'Summarize incoming support tickets.',
		...overrides,
	};
}

const { sendHostMessageMock, sendMessageFromOutsideMock } = vi.hoisted(() => ({
	sendHostMessageMock: vi.fn(),
	sendMessageFromOutsideMock: vi.fn(),
}));

const AgentChatPanelStub = defineComponent({
	name: 'AgentChatPanel',
	setup(_, { slots, expose }) {
		expose({
			focusInput: vi.fn(),
			getConversationMarkdown: vi.fn().mockResolvedValue(''),
			clearBudgetStops: vi.fn(),
			sendHostMessage: sendHostMessageMock,
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

	it('renders the suggested scenarios empty state and sends selected scenarios via sendHostMessage', async () => {
		const beforeSend = vi.fn();
		const beforeGenerate = vi.fn();
		const wrapper = mountPage({
			showTestScenarios: true,
			localConfig: makeLocalConfig(),
			beforeSend,
			beforeGenerate,
		});

		const emptyState = wrapper.findComponent(AgentTestScenariosEmptyStateStub);
		expect(emptyState.exists()).toBe(true);
		expect(emptyState.props('beforeGenerate')).toBe(beforeGenerate);

		await wrapper.get('[data-testid="trigger-select"]').trigger('click');
		expect(sendHostMessageMock).toHaveBeenCalledExactlyOnceWith('Run scenario 1');
		expect(sendMessageFromOutsideMock).not.toHaveBeenCalled();
	});

	it('renders the suggested scenarios empty state for Gateway credits credentials', () => {
		const wrapper = mountPage({
			showTestScenarios: true,
			localConfig: makeLocalConfig({ credential: AI_GATEWAY_MANAGED_TAG }),
		});

		expect(wrapper.find('[data-testid="scenarios-empty-state-stub"]').exists()).toBe(true);
	});

	it.each([
		['null config', null],
		['missing instructions', makeLocalConfig({ instructions: '   ' })],
		['missing model', makeLocalConfig({ model: '' })],
		['missing credential', makeLocalConfig({ credential: '' })],
		['legacy managed credential', makeLocalConfig({ credential: MANAGED_CREDENTIAL_TOKEN })],
	])('falls back to the default empty state when config is not ready (%s)', (_, localConfig) => {
		const wrapper = mountPage({
			showTestScenarios: true,
			localConfig,
		});

		expect(wrapper.find('[data-testid="default-empty-state-fallback"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="scenarios-empty-state-stub"]').exists()).toBe(false);
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
