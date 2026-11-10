/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, RouterLinkStub, shallowMount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { computed, nextTick, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import * as toastModule from '@n8n/composables/useToast';
import type { AgentPreviewHandoffParams } from '@/features/ai/instanceAi/composables/useInstanceAiAgentPreviewHandoff';
import { useAgentSessionsStore } from '../agentSessions.store';
import type { AgentExecutionThread } from '../composables/useAgentThreadsApi';
import AgentSessionsListView from '../views/AgentSessionsListView.vue';
import { AGENT_SESSION_ASSISTANT_KEY } from '../components/agentBuilderInjectionKeys';

const fixButton = '[data-test-id="agent-session-fix-with-assistant"]';
const ready = ref(true);
const handoffToPanel = vi.fn<(params: AgentPreviewHandoffParams) => Promise<boolean>>();
const showError = vi.fn<ReturnType<typeof toastModule.useToast>['showError']>();
const useRealToast = toastModule.useToast;

function makeThread(overrides: Partial<AgentExecutionThread> = {}): AgentExecutionThread {
	return {
		id: 'thread-1',
		canContinueInPreview: true,
		agentId: 'row-agent',
		agentName: 'Support agent',
		projectId: 'row-project',
		parentThreadId: null,
		parentAgentId: null,
		taskId: null,
		sessionNumber: 1,
		title: 'Failed session',
		emoji: null,
		totalPromptTokens: 100,
		totalCompletionTokens: 50,
		totalCost: 0,
		totalDuration: 2000,
		createdAt: '2026-07-20T10:00:00.000Z',
		updatedAt: '2026-07-20T10:05:00.000Z',
		firstMessage: null,
		failureSummary: null,
		status: 'error',
		...overrides,
	};
}

function failureSummary(message: string | null) {
	return {
		count: 1,
		latest: {
			kind: 'execution',
			name: null,
			message,
			occurredAt: 1,
			executionId: 'execution-1',
		},
	} satisfies AgentExecutionThread['failureSummary'];
}

async function mountView(threads = [makeThread()], provideAssistant = true) {
	const pinia = createPinia();
	setActivePinia(pinia);
	useAgentSessionsStore().threads = threads;
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/', component: { template: '<div />' } }],
	});
	await router.push('/');
	await router.isReady();

	return shallowMount(AgentSessionsListView, {
		props: {
			embedded: true,
			projectId: 'view-project',
			agentId: 'view-agent',
			manageStoreLifecycle: false,
		},
		global: {
			plugins: [pinia, router],
			provide: provideAssistant
				? {
						[AGENT_SESSION_ASSISTANT_KEY as symbol]: {
							isAvailable: computed(() => ready.value),
							handoff: handoffToPanel,
						},
					}
				: {},
			renderStubDefaultSlot: true,
			stubs: { RouterLink: RouterLinkStub, N8nButton: false, AgentSessionListItem: false },
		},
	});
}

enableAutoUnmount(afterEach);

describe('AgentSessionsListView Assistant handoff', () => {
	beforeEach(() => {
		ready.value = true;
		handoffToPanel.mockReset().mockResolvedValue(true);
		showError.mockReset();
		vi.spyOn(toastModule, 'useToast').mockImplementation(() => ({
			...useRealToast(),
			showError,
		}));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('hides the action without an Assistant provider', async () => {
		const wrapper = await mountView([makeThread()], false);

		expect(wrapper.find(fixButton).exists()).toBe(false);
		expect(handoffToPanel).not.toHaveBeenCalled();
	});

	it('shows the action for an error without a failure summary only while Assistant is ready', async () => {
		ready.value = false;
		const wrapper = await mountView();
		expect(wrapper.find(fixButton).exists()).toBe(false);

		ready.value = true;
		await nextTick();
		expect(wrapper.find(fixButton).exists()).toBe(true);
		expect(wrapper.get(fixButton).text()).toBe(
			useI18n().baseText('agentSessions.fixWithAssistant'),
		);

		ready.value = false;
		await nextTick();
		expect(wrapper.find(fixButton).exists()).toBe(false);
		expect(handoffToPanel).not.toHaveBeenCalled();
	});

	it.each(['running', 'succeeded', 'cancelled', 'interrupted', null, undefined] as const)(
		'hides the action for status %s even with a failure summary',
		async (status) => {
			const wrapper = await mountView([
				makeThread({ status, failureSummary: failureSummary('Earlier failure') }),
			]);
			expect(wrapper.find(fixButton).exists()).toBe(false);
		},
	);

	it('passes the row identifiers, latest execution, and error draft to Assistant', async () => {
		const wrapper = await mountView([
			makeThread({ failureSummary: failureSummary('Service unavailable') }),
		]);
		await wrapper.get(fixButton).trigger('click');
		await flushPromises();

		expect(handoffToPanel).toHaveBeenCalledExactlyOnceWith({
			projectId: 'row-project',
			agentId: 'row-agent',
			threadId: 'thread-1',
			agentName: 'Support agent',
			sessionTitle: 'Failed session',
			executionId: 'execution-1',
			initialDraft: {
				text: 'Fix this error: Service unavailable',
				prefillType: 'handoff_agent_change_request',
			},
		});
	});

	it.each([null, undefined, failureSummary(null), failureSummary('')])(
		'uses the error and session title fallbacks with summary %j',
		async (summary) => {
			const wrapper = await mountView([
				makeThread({ title: null, firstMessage: 'Help with my report', failureSummary: summary }),
			]);
			await wrapper.get(fixButton).trigger('click');
			await flushPromises();

			expect(handoffToPanel).toHaveBeenCalledExactlyOnceWith({
				projectId: 'row-project',
				agentId: 'row-agent',
				threadId: 'thread-1',
				agentName: 'Support agent',
				sessionTitle: 'Help with my report',
				executionId: summary?.latest.executionId,
				initialDraft: {
					text: `Fix this error: ${useI18n().baseText('agentSessions.status.error')}`,
					prefillType: 'handoff_agent_change_request',
				},
			});
		},
	);

	it('blocks concurrent clicks across rows and clears loading after completion', async () => {
		const pending = Promise.withResolvers<boolean>();
		handoffToPanel.mockReturnValueOnce(pending.promise);
		const wrapper = await mountView([makeThread(), makeThread({ id: 'thread-2' })]);
		const buttons = wrapper.findAllComponents(N8nButton);
		const first = buttons[0];
		const second = buttons[1];

		await first.trigger('click');
		expect(first.props('loading')).toBe(true);
		expect(second.props('loading')).toBe(false);
		expect(first.props('disabled')).toBe(true);
		expect(second.props('disabled')).toBe(true);
		/** Emitted clicks also check the handler guard, not only the native disabled state. */
		first.vm.$emit('click');
		second.vm.$emit('click');
		expect(handoffToPanel).toHaveBeenCalledTimes(1);

		pending.resolve(true);
		await flushPromises();
		expect(first.props('loading')).toBe(false);
		expect(first.props('disabled')).toBe(false);
		expect(second.props('disabled')).toBe(false);
		await second.trigger('click');
		expect(handoffToPanel).toHaveBeenCalledTimes(2);
	});

	it('shows a toast on failure and allows a retry', async () => {
		const error = new Error('Could not open Assistant');
		handoffToPanel.mockRejectedValueOnce(error);
		const wrapper = await mountView();
		await wrapper.get(fixButton).trigger('click');
		await flushPromises();

		expect(showError).toHaveBeenCalledExactlyOnceWith(
			error,
			useI18n().baseText('instanceAi.handoff.openFailed.title'),
		);
		const button = wrapper.getComponent(N8nButton);
		expect(button.props('loading')).toBe(false);
		expect(button.props('disabled')).toBe(false);
		await wrapper.get(fixButton).trigger('click');
		await flushPromises();
		expect(handoffToPanel).toHaveBeenCalledTimes(2);
	});
});
