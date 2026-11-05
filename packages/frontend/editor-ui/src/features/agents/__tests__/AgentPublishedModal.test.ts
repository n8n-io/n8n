import { configure, fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';

import { LOCAL_STORAGE_HIDE_AGENT_PUBLISHED_CONFIRMATION } from '../constants';
import AgentPublishedModal from '../components/AgentPublishedModal.vue';
import { AgentModalTestStub } from './utils/AgentModalTestStub';

configure({ testIdAttribute: 'data-testid' });

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

const trackDismissedAgentPublishedModal = vi.fn();
vi.mock('../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackDismissedAgentPublishedModal }),
}));

const routerPush = vi.fn();
vi.mock('vue-router', () => ({ useRouter: () => ({ push: routerPush }) }));

vi.mock('../composables/useAgentProjectBreadcrumb', async () => {
	const { computed } = await import('vue');
	return { useAgentProjectBreadcrumb: () => ({ projectName: computed(() => 'Personal') }) };
});

const stubs = {
	AgentModal: AgentModalTestStub,
	N8nText: { template: '<span><slot /></span>' },
	N8nButton: {
		template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
	},
	N8nCheckbox: {
		props: ['modelValue'],
		emits: ['update:modelValue'],
		template:
			'<input type="checkbox" v-bind="$attrs" :checked="modelValue === true" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
	},
};

const MODAL_NAME = 'agentPublished';

describe('AgentPublishedModal', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		localStorage.removeItem(LOCAL_STORAGE_HIDE_AGENT_PUBLISHED_CONFIRMATION);
		trackDismissedAgentPublishedModal.mockClear();
		routerPush.mockClear();
		const uiStore = mockedStore(useUIStore);
		uiStore.openModal(MODAL_NAME);
		uiStore.closeModal = vi.fn();
	});

	it('persists the "Don\'t show again" checkbox to localStorage immediately', async () => {
		const { getByTestId } = createComponentRenderer(AgentPublishedModal, {
			global: { stubs },
		})({
			props: {
				modalName: MODAL_NAME,
				data: { agentId: 'a1', projectId: 'p1', n8nChatLive: false },
			},
		});

		expect(localStorage.getItem(LOCAL_STORAGE_HIDE_AGENT_PUBLISHED_CONFIRMATION)).toBeNull();
		await fireEvent.click(getByTestId('agent-published-modal-dont-show-again'));
		expect(localStorage.getItem(LOCAL_STORAGE_HIDE_AGENT_PUBLISHED_CONFIRMATION)).toBe('true');
	});

	it('tracks dismissal with the checkbox state and closes on "Got it"', async () => {
		const { getByTestId } = createComponentRenderer(AgentPublishedModal, {
			global: { stubs },
		})({
			props: {
				modalName: MODAL_NAME,
				data: { agentId: 'a1', projectId: 'p1', n8nChatLive: false },
			},
		});

		await fireEvent.click(getByTestId('agent-published-modal-dont-show-again'));
		await fireEvent.click(getByTestId('agent-published-modal-got-it'));

		expect(trackDismissedAgentPublishedModal).toHaveBeenCalledWith({
			agentId: 'a1',
			dontShowAgain: true,
			action: 'got_it',
			n8nChatLive: false,
		});
		expect(mockedStore(useUIStore).closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('tracks dismissal without the checkbox when "Got it" is clicked directly', async () => {
		const { getByTestId } = createComponentRenderer(AgentPublishedModal, {
			global: { stubs },
		})({
			props: {
				modalName: MODAL_NAME,
				data: { agentId: 'a1', projectId: 'p1', n8nChatLive: false },
			},
		});

		await fireEvent.click(getByTestId('agent-published-modal-got-it'));

		expect(trackDismissedAgentPublishedModal).toHaveBeenCalledWith({
			agentId: 'a1',
			dontShowAgain: false,
			action: 'got_it',
			n8nChatLive: false,
		});
		expect(mockedStore(useUIStore).closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('hides the n8n Chat line and the Talk to agent button when n8n Chat is not live', () => {
		const { queryByTestId } = createComponentRenderer(AgentPublishedModal, {
			global: { stubs },
		})({
			props: {
				modalName: MODAL_NAME,
				data: { agentId: 'a1', projectId: 'p1', n8nChatLive: false },
			},
		});

		expect(queryByTestId('agent-published-modal-n8n-chat')).toBeNull();
		expect(queryByTestId('agent-published-modal-talk-to-agent')).toBeNull();
	});

	it('opens the agent in n8n Chat and tracks the action on "Talk to agent"', async () => {
		const { getByTestId } = createComponentRenderer(AgentPublishedModal, {
			global: { stubs },
		})({
			props: { modalName: MODAL_NAME, data: { agentId: 'a1', projectId: 'p1', n8nChatLive: true } },
		});

		expect(getByTestId('agent-published-modal-n8n-chat')).toBeInTheDocument();
		await fireEvent.click(getByTestId('agent-published-modal-talk-to-agent'));

		expect(trackDismissedAgentPublishedModal).toHaveBeenCalledWith({
			agentId: 'a1',
			dontShowAgain: false,
			action: 'talk_to_agent',
			n8nChatLive: true,
		});
		expect(mockedStore(useUIStore).closeModal).toHaveBeenCalledWith(MODAL_NAME);
		expect(routerPush).toHaveBeenCalledWith({
			name: 'AgentN8nChatView',
			params: { agentId: 'a1' },
		});
	});
});
