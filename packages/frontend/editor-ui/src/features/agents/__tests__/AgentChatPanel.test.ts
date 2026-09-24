import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref, nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { AGENT_SESSION_DETAIL_VIEW } from '../constants';
import { APPROVAL_TOOL_NAME, N8N_CHAT_ACTION_TOOL_NAME, WAIT_TOOL_NAME } from '@n8n/api-types';
import type { AgentChatQueueItem, AgentBackgroundJobDto } from '@n8n/api-types';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import AgentChatPanel from '../components/AgentChatPanel.vue';
import AgentPreviewDock from '../components/AgentPreviewDock.vue';
import {
	buildAgentConfigFingerprint,
	type AgentConfigFingerprint,
} from '../composables/agentTelemetry.utils';
import type { AgentJsonConfig } from '../types';

const sendMessageMock = vi.fn();
const stopGeneratingMock = vi.fn();
const detachStreamMock = vi.fn();
const loadHistoryMock = vi.fn();
const refreshMock = vi.fn();
const cancelAndSteerMock = vi.fn();
const focusInputMock = vi.fn();
const messagesMock = ref<ChatMessage[]>([]);
const isStreamingMock = ref(false);
const isSubmittingMock = ref(false);
const isLoadingHistoryMock = ref(false);
const trackSubmittedMessageMock = vi.fn();
const queuedMessagesMock = ref<AgentChatQueueItem[]>([]);
const removeQueuedMessageMock = vi.fn();
const updateQueuedMessageMock = vi.fn();
const isCancellingMock = ref(false);
const backgroundJobsMock = ref<AgentBackgroundJobDto[]>([]);
vi.mock('../composables/useAgentBackgroundJobs', () => ({
	useAgentBackgroundJobs: () => ({ jobs: backgroundJobsMock }),
}));
let onHistoryLoaded: ((count: number) => void) | undefined;

const fatalErrorMock = ref<{ missing: string[] } | null>(null);

const defaultAgentConfig: AgentJsonConfig = {
	name: 'Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help.',
};

vi.mock('@n8n/i18n', () => {
	const baseText = (
		key: string,
		options?: { interpolate?: Record<string, string | number>; adjustToNumber?: number },
	) => {
		const translations: Record<string, string> = {
			'agents.chat.input.placeholder.withAgent': `Message ${options?.interpolate?.agentName}…`,
			'agents.chat.queue.title': `${options?.interpolate?.count} more pending ${options?.adjustToNumber === 1 ? 'message' : 'messages'}`,
			'agents.chat.misconfigured.issuesPrefix': 'Check:',
			'agents.chat.misconfigured.missing.tools': 'Tool configuration',
			'agents.chat.misconfigured.missing.mcpServers': 'MCP server',
			'agents.chat.misconfigured.missing.subAgents.agents': 'Sub-agent',
			'agents.chat.backgroundTasks.finished':
				options?.adjustToNumber === 1 ? 'Background task finished' : 'Background tasks finished',
			'agents.chat.backgroundTasks.runningCount': `Running ${options?.interpolate?.count} background ${String(options?.interpolate?.count) === '1' ? 'task' : 'tasks'}`,
			'agents.chat.backgroundTasks.subagent': `Sub-agent — ${options?.interpolate?.title}`,
			'agents.chat.backgroundTasks.workflow': `Workflow — ${options?.interpolate?.title}`,
			'agents.chat.backgroundTasks.viewTrace': 'View trace',
			'agents.chat.backgroundTasks.status.waiting': 'Waiting',
			'agents.chat.backgroundTasks.status.running': 'Running',
			'agents.chat.backgroundTasks.status.completed': 'Completed',
			'agents.chat.backgroundTasks.status.failed': 'Failed',
			'agents.chat.backgroundTasks.status.cancelled': 'Canceled',
		};
		return translations[key] ?? key;
	};
	const i18n = { baseText };
	return { useI18n: () => i18n, i18n };
});

vi.mock('../components/AgentSessionTimelinePanel.vue', () => ({
	default: {
		name: 'AgentSessionTimelinePanel',
		props: ['projectId', 'agentId', 'threadId'],
		template: '<div data-testid="agent-preview-session-timeline" />',
	},
}));

vi.mock('@n8n/design-system', async (importOriginal) => ({
	N8nAiActivityStepGroup: (await importOriginal<typeof import('@n8n/design-system')>())
		.N8nAiActivityStepGroup,
	N8nLink: (await importOriginal<typeof import('@n8n/design-system')>()).N8nLink,
	useDropdownSearch: (await importOriginal<typeof import('@n8n/design-system')>())
		.useDropdownSearch,
	N8nInput: (await importOriginal<typeof import('@n8n/design-system')>()).N8nInput,
	N8nButton: { template: '<button><slot name="icon" /><slot /></button>' },
	N8nCallout: { template: '<div><slot /><slot name="trailingContent" /></div>' },
	N8nDropdownMenu: { template: '<div><slot name="trigger" /></div>' },
	N8nHeading: { template: '<div><slot /></div>' },
	N8nIcon: { name: 'N8nIcon', props: ['icon', 'spin'], template: '<i />' },
	N8nIconButton: {
		emits: ['click'],
		template: '<button v-bind="$attrs" @click="$emit(\'click\')" />',
	},
	N8nText: { template: '<span><slot /></span>' },
	N8nSendStopButton: {
		name: 'N8nSendStopButton',
		props: ['streaming', 'stopButtonTestId'],
		emits: ['stop'],
		template: '<button :data-test-id="stopButtonTestId" @click="$emit(\'stop\')" />',
	},
	N8nTooltip: { template: '<div><slot /></div>' },
	TOOLTIP_DELAY_MS: 500,
}));

vi.mock('@/app/components/KeyboardShortcutTooltip.vue', () => ({
	default: { template: '<div><slot /></div>' },
}));

vi.mock('@/app/composables/useKeybindings', () => ({
	useKeybindings: vi.fn(),
}));

vi.mock('@/app/composables/useMessage', function mockUseMessage() {
	return {
		useMessage: function useMessage() {
			return { confirm: vi.fn() };
		},
	};
});

vi.mock('../agentSessions.store', function mockAgentSessionsStore() {
	return {
		useAgentSessionsStore: function useAgentSessionsStore() {
			return { deleteThread: vi.fn() };
		},
	};
});

vi.mock('../components/AgentPreviewMoreMenu.vue', function mockPreviewMoreMenu() {
	return { default: { template: '<button />' } };
});

vi.mock('../composables/useAgentSessionLangSmithExport', () => ({
	useAgentSessionLangSmithExport: () => ({
		isEnabled: false,
		isExporting: false,
		sendSession: vi.fn(),
	}),
}));

// Reads a Pinia store for notifications — irrelevant to panel behavior.
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: vi.fn() }),
}));

vi.mock('@/features/ai/shared/components/ChatInputBase.vue', async () => {
	const { defineComponent, ref } = await import('vue');
	return {
		default: defineComponent({
			name: 'ChatInputBase',
			template:
				'<form data-testid="chat-input-stub" @submit.prevent="$emit(\'submit\')"><slot name="header" /><textarea ref="input" /><slot name="footer-start" /></form>',
			props: ['modelValue', 'placeholder', 'isStreaming', 'canSubmit', 'disabled', 'maxLength'],
			emits: ['submit', 'stop', 'update:modelValue', 'files-selected'],
			setup(_, { expose }) {
				const input = ref<HTMLTextAreaElement>();
				expose({
					focus: (options?: FocusOptions) => {
						focusInputMock(options);
						input.value?.focus(options);
					},
				});
				return { input };
			},
		}),
	};
});

vi.mock('../components/AgentChatEmptyState.vue', () => ({
	default: { template: '<div data-testid="empty-state-stub" />' },
}));

vi.mock('../components/AgentChatMessageList.vue', () => ({
	default: {
		name: 'AgentChatMessageList',
		template: '<div data-testid="message-list-stub" />',
		props: ['messages'],
		emits: ['send-to-assistant'],
	},
}));

vi.mock('../composables/useAgentChatStream', () => ({
	useAgentChatStream: (options: { onHistoryLoaded: (count: number) => void }) => {
		onHistoryLoaded = options.onHistoryLoaded;
		return {
			messages: messagesMock,
			isStreaming: isStreamingMock,
			isSubmitting: isSubmittingMock,
			isLoadingHistory: isLoadingHistoryMock,
			queuedMessages: queuedMessagesMock,
			removingQueueIds: ref(new Set()),
			removeQueuedMessage: removeQueuedMessageMock,
			updateQueuedMessage: updateQueuedMessageMock,
			isCancelling: isCancellingMock,
			messagingState: computed(() => (isStreamingMock.value ? 'receiving' : 'idle')),
			fatalError: fatalErrorMock,
			loadHistory: loadHistoryMock,
			refresh: refreshMock,
			sendMessage: sendMessageMock,
			stopGenerating: stopGeneratingMock,
			detachStream: detachStreamMock,
			resume: vi.fn(),
			cancelAndSteer: cancelAndSteerMock,
			dismissFatalError: vi.fn(),
		};
	},
}));

vi.mock('../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackSubmittedMessage: trackSubmittedMessageMock }),
}));

vi.mock('../composables/agentTelemetry.utils', () => ({
	deriveAgentStatus: vi.fn(() => 'draft'),
	buildAgentConfigFingerprint: vi.fn().mockResolvedValue({
		instructions: '',
		tools: [],
		skills: [],
		triggers: [],
		memory: null,
		model: null,
		config_version: 'test-version',
	}),
}));

describe('AgentChatPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		updateQueuedMessageMock.mockReset().mockResolvedValue('updated');
		messagesMock.value = [];
		isStreamingMock.value = false;
		isSubmittingMock.value = false;
		isLoadingHistoryMock.value = false;
		queuedMessagesMock.value = [];
		isCancellingMock.value = false;
		backgroundJobsMock.value = [];
		fatalErrorMock.value = null;
		onHistoryLoaded = undefined;
	});

	function mountPanel(
		overrides: Partial<{
			visible: boolean;
			continueSessionId: string;
			agentConfig: AgentJsonConfig | null;
			beforeSend: () => Promise<void> | void;
			backgroundJobsActive: boolean;
		}> = {},
		attachTo?: HTMLElement,
	) {
		const router = createRouter({
			history: createMemoryHistory(),
			routes: [
				{ path: '/', component: { template: '<div />' } },
				{
					path: '/projects/:projectId/agents/:agentId/sessions/:threadId',
					name: AGENT_SESSION_DETAIL_VIEW,
					component: { template: '<div />' },
				},
			],
		});
		return mount(AgentChatPanel, {
			attachTo,
			global: { plugins: [router] },
			props: {
				projectId: 'p1',
				agentId: 'a1',
				agentConfig: defaultAgentConfig,
				agentStatus: 'draft',
				connectedTriggers: [],
				...overrides,
			},
		});
	}

	it('keeps two pending messages in the composer below background tasks and removes them without adding conversation bubbles', async () => {
		queuedMessagesMock.value = [
			{ id: '1', message: 'Next message', createdAt: new Date().toISOString() },
			{
				id: '2',
				message: '',
				createdAt: new Date().toISOString(),
				attachments: [
					{ id: 'file-1', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 5 },
				],
			},
		];
		backgroundJobsMock.value = [
			{
				id: 'job-1',
				kind: 'subagent',
				title: 'Research',
				status: 'running',
				startedAt: new Date().toISOString(),
			},
		];
		isStreamingMock.value = true;
		const wrapper = mountPanel({ backgroundJobsActive: true });
		const composer = wrapper.findComponent({ name: 'ChatInputBase' });
		expect(composer.find('[data-testid="agent-message-queue"]').exists()).toBe(true);
		expect(composer.find('[data-testid="agent-background-jobs"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-message-queue"] [aria-expanded]').exists()).toBe(
			false,
		);
		expect(
			wrapper.findAll('[data-testid="agent-queued-message"]').map((row) => row.text()),
		).toEqual(['Next message', 'notes.txt']);
		expect(wrapper.html().indexOf('agent-background-jobs')).toBeLessThan(
			wrapper.html().indexOf('agent-message-queue'),
		);
		expect(messagesMock.value).toEqual([]);
		const removeButtons = wrapper.findAll('[aria-label="agents.chat.queue.remove"]');
		for (const button of removeButtons) {
			expect(button.findComponent({ name: 'N8nIcon' }).props('icon')).toBe('trash-2');
		}
		await removeButtons[1].trigger('click');
		expect(removeQueuedMessageMock).toHaveBeenCalledWith('2');
		queuedMessagesMock.value = [];
		await nextTick();
		expect(wrapper.find('[data-testid="agent-message-queue"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-background-jobs"]').exists()).toBe(true);
		wrapper.unmount();
	});

	it('collapses only the third and later pending messages as the queue grows and shrinks', async () => {
		const items = [1, 2, 3, 4].map((id) => ({
			id: String(id),
			message: `Message ${id}`,
			createdAt: '2026-09-24T12:00:00.000Z',
		}));
		queuedMessagesMock.value = items.slice(0, 2);
		const wrapper = mountPanel();
		const queue = wrapper.get('[data-testid="agent-message-queue"]');
		expect(queue.find('[aria-expanded]').exists()).toBe(false);

		queuedMessagesMock.value = items.slice(0, 3);
		await nextTick();
		const toggle = queue.get('button[aria-expanded]');
		expect(toggle.attributes('aria-expanded')).toBe('false');
		expect(toggle.text()).toBe('1 more pending message');
		expect(queue.findAll('li').map((row) => row.text())).toEqual(['Message 1', 'Message 2']);

		queuedMessagesMock.value = items;
		await nextTick();
		expect(toggle.text()).toBe('2 more pending messages');
		expect(queue.findAll('li').map((row) => row.text())).toEqual(['Message 1', 'Message 2']);
		await toggle.trigger('click');
		expect(queue.findAll('li').map((row) => row.text())).toEqual([
			'Message 1',
			'Message 2',
			'Message 3',
			'Message 4',
		]);
		await toggle.trigger('click');
		expect(queue.findAll('li').map((row) => row.text())).toEqual(['Message 1', 'Message 2']);

		queuedMessagesMock.value = items.slice(1, 3);
		await nextTick();
		expect(queue.find('[aria-expanded]').exists()).toBe(false);
		expect(queue.findAll('li').map((row) => row.text())).toEqual(['Message 2', 'Message 3']);
		wrapper.unmount();
	});

	it('edits queued text inline while preserving attachments and the composer draft', async () => {
		queuedMessagesMock.value = [
			{
				id: '1',
				message: 'original',
				createdAt: new Date().toISOString(),
				attachments: [{ id: 'file', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 5 }],
			},
		];
		const wrapper = mountPanel();
		const composer = wrapper.findComponent({ name: 'ChatInputBase' });
		composer.vm.$emit('update:modelValue', 'next draft');
		await wrapper.get('[aria-label="agents.chat.queue.edit"]').trigger('click');
		let editor = wrapper.get('textarea[aria-label="agents.chat.queue.edit"]');
		await editor.setValue('changed');
		await editor.trigger('keydown', { key: 'Escape' });
		expect(wrapper.find('textarea[aria-label="agents.chat.queue.edit"]').exists()).toBe(false);
		expect(updateQueuedMessageMock).not.toHaveBeenCalled();
		await wrapper.get('[aria-label="agents.chat.queue.edit"]').trigger('click');
		editor = wrapper.get('textarea[aria-label="agents.chat.queue.edit"]');
		await editor.setValue('updated text');
		await editor.trigger('keydown', { key: 'Enter', shiftKey: true });
		expect(updateQueuedMessageMock).not.toHaveBeenCalled();
		await editor.trigger('keydown', { key: 'Enter', isComposing: true });
		expect(updateQueuedMessageMock).not.toHaveBeenCalled();
		await editor.trigger('keydown', { key: 'Enter' });
		await flushPromises();
		expect(updateQueuedMessageMock).toHaveBeenCalledExactlyOnceWith('1', 'updated text');
		expect(composer.props('modelValue')).toBe('next draft');
		expect(wrapper.get('[data-testid="agent-queued-message"]').text()).toContain('notes.txt');
		expect(sendMessageMock).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it.each(['notification', 'conflict'])(
		'preserves edits when a message starts before saving (%s)',
		async (source) => {
			queuedMessagesMock.value = [
				{ id: '1', message: 'original', createdAt: new Date().toISOString() },
			];
			const wrapper = mountPanel();
			await wrapper.get('[aria-label="agents.chat.queue.edit"]').trigger('click');
			const editor = wrapper.get('textarea[aria-label="agents.chat.queue.edit"]');
			await editor.setValue('unsaved text');
			if (source === 'notification') queuedMessagesMock.value = [];
			else {
				updateQueuedMessageMock.mockResolvedValueOnce('unavailable');
				await editor.trigger('keydown', { key: 'Enter' });
			}
			await flushPromises();
			expect(editor.element).toHaveProperty('value', 'unsaved text');
			expect(editor.attributes('readonly')).toBeDefined();
			expect(
				wrapper.get('[aria-label="agents.chat.queue.save"]').attributes('disabled'),
			).toBeDefined();
			expect(wrapper.text()).toContain('agents.chat.queue.editUnavailable');
			await wrapper.get('[aria-label="agents.chat.queue.cancelEdit"]').trigger('click');
			expect(wrapper.find('textarea[aria-label="agents.chat.queue.edit"]').exists()).toBe(false);
			wrapper.unmount();
		},
	);

	describe('background task panel', () => {
		afterEach(() => vi.useRealTimers());
		const job: AgentBackgroundJobDto = {
			id: 'job-1',
			kind: 'subagent',
			title: 'Check escalations',
			status: 'running',
			startedAt: '2026-09-09T10:00:00.000Z',
		};

		it.each(['trigger', 'trace'])(
			'moves focus from the %s to the composer on completion',
			async (target) => {
				backgroundJobsMock.value = [job];
				const wrapper = mountPanel(
					{ backgroundJobsActive: true, continueSessionId: 't1' },
					document.body,
				);
				try {
					const trigger = wrapper.get('[data-testid="agent-background-jobs"] button');
					await trigger.trigger('click');
					const focused =
						target === 'trigger'
							? trigger
							: wrapper.get('[data-testid="agent-background-jobs-trace"]');
					(focused.element as HTMLElement).focus();
					expect(document.activeElement).toBe(focused.element);
					backgroundJobsMock.value = [];
					await flushPromises();
					expect(document.activeElement).toBe(wrapper.get('textarea').element);
				} finally {
					wrapper.unmount();
				}
			},
		);

		it('keeps focus outside the card when jobs finish', async () => {
			backgroundJobsMock.value = [job];
			const wrapper = mountPanel(
				{ backgroundJobsActive: true, continueSessionId: 't1' },
				document.body,
			);
			const outside = document.createElement('button');
			document.body.append(outside);
			try {
				outside.focus();
				backgroundJobsMock.value = [];
				await flushPromises();
				expect(document.activeElement).toBe(outside);
			} finally {
				wrapper.unmount();
				outside.remove();
			}
		});

		it('keeps a new focus target chosen while the card is removed', async () => {
			backgroundJobsMock.value = [job];
			const wrapper = mountPanel(
				{ backgroundJobsActive: true, continueSessionId: 't1' },
				document.body,
			);
			const outside = document.createElement('button');
			document.body.append(outside);
			try {
				(
					wrapper.get('[data-testid="agent-background-jobs"] button').element as HTMLElement
				).focus();
				backgroundJobsMock.value = [];
				await nextTick();
				outside.focus();
				await flushPromises();
				expect(document.activeElement).toBe(outside);
			} finally {
				wrapper.unmount();
				outside.remove();
			}
		});

		it('does not focus the composer when the session changes', async () => {
			backgroundJobsMock.value = [job];
			const wrapper = mountPanel(
				{ backgroundJobsActive: true, continueSessionId: 't1' },
				document.body,
			);
			try {
				(
					wrapper.get('[data-testid="agent-background-jobs"] button').element as HTMLElement
				).focus();
				backgroundJobsMock.value = [];
				await wrapper.setProps({ continueSessionId: 't2' });
				await flushPromises();
				expect(document.activeElement).not.toBe(wrapper.get('textarea').element);
			} finally {
				wrapper.unmount();
			}
		});

		it('does not restore focus after the panel unmounts', async () => {
			backgroundJobsMock.value = [job];
			const wrapper = mountPanel(
				{ backgroundJobsActive: true, continueSessionId: 't1' },
				document.body,
			);
			(wrapper.get('[data-testid="agent-background-jobs"] button').element as HTMLElement).focus();
			backgroundJobsMock.value = [];
			await nextTick();
			wrapper.unmount();
			await flushPromises();
			expect(focusInputMock).not.toHaveBeenCalled();
		});

		it('keeps finished rows and expansion until the entire group finishes', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-09-09T10:00:31Z'));
			const wrapper = mountPanel({ backgroundJobsActive: true, continueSessionId: 't1' });
			expect(wrapper.find('[data-testid="agent-background-jobs"]').exists()).toBe(false);
			backgroundJobsMock.value = [job, { ...job, id: 'job-2', title: 'Check tickets' }];
			await flushPromises();
			const panel = wrapper.get('[data-testid="agent-background-jobs"]');
			const trigger = panel.get('button');
			expect(trigger.text()).toContain('Running 2 background tasks');
			expect(trigger.attributes('aria-expanded')).toBe('false');
			expect(panel.get('[data-testid="agent-background-jobs-timer"]').text()).toBe('0:31');
			await trigger.trigger('click');
			expect(trigger.attributes('aria-expanded')).toBe('true');
			expect(panel.findAll('li').map((li) => li.text())).toEqual([
				'Sub-agent — Check escalations',
				'Sub-agent — Check tickets',
			]);
			backgroundJobsMock.value = [
				{ ...job, status: 'completed' },
				{ ...job, id: 'job-2', title: 'Check tickets' },
			];
			await flushPromises();
			expect(trigger.text()).toContain('Running 1 background task');
			expect(panel.findAll('li').map((li) => li.text())).toEqual([
				'Sub-agent — Check escalations',
				'Sub-agent — Check tickets',
			]);
			expect(panel.get('[data-status="completed"]').attributes('aria-label')).toBe('Completed');
			expect(panel.findAll('[data-status="running"]')).toHaveLength(1);
			expect(trigger.attributes('aria-expanded')).toBe('true');
			expect(wrapper.findComponent({ name: 'ChatInputBase' }).props('disabled')).toBe(false);
			backgroundJobsMock.value = [];
			await flushPromises();
			expect(wrapper.find('[data-testid="agent-background-jobs"]').exists()).toBe(false);
			backgroundJobsMock.value = [job];
			await flushPromises();
			expect(
				wrapper.get('[data-testid="agent-background-jobs"] button').attributes('aria-expanded'),
			).toBe('false');
			expect(wrapper.get('[data-testid="agent-background-jobs"] button').text()).toContain(
				'Running 1 background task',
			);
			wrapper.unmount();
		});

		it('keeps final statuses and expansion with a stopped timer while results await delivery', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-09-09T10:00:30Z'));
			backgroundJobsMock.value = [job, { ...job, id: 'job-2' }];
			const wrapper = mountPanel({ backgroundJobsActive: true });
			const panel = wrapper.get('[data-testid="agent-background-jobs"]');
			const trigger = panel.get('button');
			await trigger.trigger('click');
			backgroundJobsMock.value = [
				{ ...job, status: 'completed', settledAt: '2026-09-09T10:00:31Z' },
				{ ...job, id: 'job-2', status: 'failed', settledAt: '2026-09-09T10:00:32Z' },
			];
			await flushPromises();
			expect(trigger.text()).toContain('Background tasks finished');
			expect(trigger.attributes('aria-expanded')).toBe('true');
			expect(panel.get('[data-testid="agent-background-jobs-timer"]').text()).toBe('0:32');
			for (const icon of panel.findAllComponents({ name: 'N8nIcon' })) {
				expect(icon.props('spin')).toBe(false);
			}
			await vi.advanceTimersByTimeAsync(10_000);
			expect(panel.get('[data-testid="agent-background-jobs-timer"]').text()).toBe('0:32');
			expect(wrapper.findComponent({ name: 'ChatInputBase' }).props('disabled')).toBe(false);
			expect(vi.getTimerCount()).toBe(0);
			backgroundJobsMock.value = [];
			await flushPromises();
			expect(wrapper.find('[data-testid="agent-background-jobs"]').exists()).toBe(false);
			wrapper.unmount();
		});

		it('shows waiting workflows and links to the current parent session trace', async () => {
			backgroundJobsMock.value = [
				job,
				{ ...job, id: 'job-2', kind: 'workflow', title: 'Forecast refresh' },
			];
			const wrapper = mountPanel({ backgroundJobsActive: true, continueSessionId: 't1' });
			expect(wrapper.find('[data-testid="agent-background-jobs-trace"]').exists()).toBe(false);
			const trigger = wrapper.get('[data-testid="agent-background-jobs"] button');
			await trigger.trigger('click');
			const workflow = wrapper.findAll('li')[1];
			expect(workflow.text()).toBe('Workflow — Forecast refresh');
			expect(workflow.get('[role="img"]').attributes('aria-label')).toBe('Waiting');
			expect(workflow.findComponent({ name: 'N8nIcon' }).props()).toMatchObject({
				icon: 'circle',
				spin: false,
			});
			const link = wrapper.get('[data-testid="agent-background-jobs-trace"]');
			expect(link.text()).toBe('View trace');
			expect(link.attributes('href')).toBe('/projects/p1/agents/a1/sessions/t1');
			expect(
				trigger.element.compareDocumentPosition(link.element) & Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
			await link.trigger('click');
			await flushPromises();
			expect(wrapper.vm.$router.currentRoute.value).toMatchObject({
				name: AGENT_SESSION_DETAIL_VIEW,
				params: { projectId: 'p1', agentId: 'a1', threadId: 't1' },
			});
			await wrapper.setProps({ continueSessionId: 't2' });
			const newTrigger = wrapper.get('[data-testid="agent-background-jobs"] button');
			expect(newTrigger.attributes('aria-expanded')).toBe('false');
			await newTrigger.trigger('click');
			expect(wrapper.get('[data-testid="agent-background-jobs-trace"]').attributes('href')).toBe(
				'/projects/p1/agents/a1/sessions/t2',
			);
			wrapper.unmount();
		});

		it.each([
			['completed', 'Completed', 'circle-check'],
			['failed', 'Failed', 'circle-x'],
			['cancelled', 'Canceled', 'circle-x'],
		] as const)('shows the %s status without a spinner', async (status, label, icon) => {
			backgroundJobsMock.value = [
				{ ...job, status },
				{ ...job, id: 'job-2' },
			];
			const wrapper = mountPanel({ backgroundJobsActive: true });
			await wrapper.get('[data-testid="agent-background-jobs"] button').trigger('click');
			const statusIcon = wrapper.get(`[data-status="${status}"]`);
			expect(statusIcon.attributes('aria-label')).toBe(label);
			expect(statusIcon.findComponent({ name: 'N8nIcon' }).props()).toMatchObject({
				icon,
				spin: false,
			});
			wrapper.unmount();
		});

		it('advances the local timer through an hour and stops it after the panel hides', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-09-09T10:59:59Z'));
			const wrapper = mountPanel({ backgroundJobsActive: true });
			backgroundJobsMock.value = [
				{ ...job, status: 'completed' },
				{ ...job, id: 'job-2', startedAt: '2026-09-09T10:59:00.000Z' },
			];
			await flushPromises();
			expect(wrapper.get('[data-testid="agent-background-jobs-timer"]').text()).toBe('59:59');
			await vi.advanceTimersByTimeAsync(1000);
			expect(wrapper.get('[data-testid="agent-background-jobs-timer"]').text()).toBe('1:00:00');
			backgroundJobsMock.value = [];
			await flushPromises();
			expect(vi.getTimerCount()).toBe(0);
			wrapper.unmount();
		});

		it('does not show background tasks outside the active preview', () => {
			backgroundJobsMock.value = [job];
			const wrapper = mountPanel();
			expect(wrapper.find('[data-testid="agent-background-jobs"]').exists()).toBe(false);
			wrapper.unmount();
		});
	});

	it('refreshes history when the preview reopens', async () => {
		isStreamingMock.value = true;
		const wrapper = mountPanel({ visible: false });
		expect(refreshMock).not.toHaveBeenCalled();
		await wrapper.setProps({ visible: true });
		expect(refreshMock).toHaveBeenCalledTimes(1);
		await wrapper.setProps({ visible: false });
		expect(refreshMock).toHaveBeenCalledTimes(1);
		expect(stopGeneratingMock).not.toHaveBeenCalled();
		isStreamingMock.value = false;
		wrapper.unmount();
	});

	it('formats conversation markdown in message order with speaker labels', function formatsConversation() {
		messagesMock.value = [
			{ id: 'user-1', role: 'user', content: '  Hello  ', status: 'success' },
			{ id: 'assistant-1', role: 'assistant', content: '\n**Welcome**\n', status: 'success' },
			{ id: 'assistant-2', role: 'assistant', content: ' \n ', status: 'success' },
			{ id: 'user-2', role: 'user', content: 'Next question', status: 'success' },
		];
		const wrapper = mountPanel();

		expect(wrapper.vm.getConversationMarkdown()).toBe(
			'**User:**\n\nHello\n\n---\n\n**Agent:**\n\n**Welcome**\n\n---\n\n**User:**\n\nNext question',
		);
	});

	it('returns empty markdown without messages', function formatsEmptyConversation() {
		const wrapper = mountPanel();

		expect(wrapper.vm.getConversationMarkdown()).toBe('');
	});

	it('returns empty markdown when messages contain only whitespace', function skipsBlankMessages() {
		messagesMock.value = [
			{ id: 'user-1', role: 'user', content: ' \n\t ', status: 'success' },
			{ id: 'assistant-1', role: 'assistant', content: '', status: 'success' },
		];
		const wrapper = mountPanel();

		expect(wrapper.vm.getConversationMarkdown()).toBe('');
	});

	it('uses the live agent name in the normal chat placeholder', async () => {
		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('placeholder')).toBe('Message Agent…');

		await wrapper.setProps({
			agentConfig: { ...defaultAgentConfig, name: 'Support Agent' },
		});

		expect(chatInput.props('placeholder')).toBe('Message Support Agent…');
	});

	it.each([
		['a missing config', null],
		['a blank agent name', { ...defaultAgentConfig, name: '   ' }],
	] satisfies Array<[string, AgentJsonConfig | null]>)(
		'uses the generic chat placeholder for %s',
		(_description, agentConfig) => {
			const wrapper = mountPanel({ agentConfig });
			const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

			expect(chatInput.props('placeholder')).toBe('agents.chat.input.placeholder');
		},
	);

	it('emits the loaded history count with the session that produced it', () => {
		const wrapper = mountPanel({
			continueSessionId: 'session-1',
			agentConfig: null,
		});

		expect(onHistoryLoaded).toBeDefined();
		onHistoryLoaded?.(3);

		expect(wrapper.emitted('continue-loaded')).toEqual([[{ sessionId: 'session-1', count: 3 }]]);
	});

	it('forwards Fix with Assistant metadata from the message list', () => {
		messagesMock.value = [
			{ id: 'assistant-1', role: 'assistant', content: 'Failed', status: 'error' },
		];
		const fixEvent = {
			executionId: 'execution-1',
			failures: [
				{
					toolCallId: 'call-1',
					toolName: 'http_request',
					toolDisplayName: 'HTTP request',
					error: 'Request failed',
				},
			],
		};
		const wrapper = mountPanel();

		wrapper.findComponent({ name: 'AgentChatMessageList' }).vm.$emit('send-to-assistant', fixEvent);

		expect(wrapper.emitted('send-to-assistant')).toEqual([[fixEvent]]);
	});

	/**
	 * A non-approval interactive card (`chat_action`) — these put the chat
	 * input into cancel-and-steer mode. Approval cards keep ordinary input queued.
	 */
	function openInteractiveMessage(): ChatMessage {
		return {
			id: 'assistant-1',
			role: 'assistant',
			content: '',
			status: 'awaitingUser',
			interactive: {
				toolName: N8N_CHAT_ACTION_TOOL_NAME,
				toolCallId: 'tc-1',
				runId: 'run-1',
				input: {
					card: { components: [{ type: 'button', label: 'Pick Slack', value: 'slack' }] },
				},
			},
		};
	}

	it('awaits beforeSend before sending a chat message', async () => {
		const events: string[] = [];
		let resolveBeforeSend: () => void = () => {};
		const beforeSend = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveBeforeSend = () => {
						events.push('beforeSend');
						resolve();
					};
				}),
		);
		sendMessageMock.mockImplementation(async () => {
			events.push('sendMessage');
		});

		const wrapper = mountPanel({ beforeSend });

		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('update config');
		await flushPromises();

		expect(beforeSend).toHaveBeenCalledTimes(1);
		expect(sendMessageMock).not.toHaveBeenCalled();

		resolveBeforeSend();
		await flushPromises();

		expect(sendMessageMock).toHaveBeenCalledWith('update config', undefined, expect.any(Function));
		expect(events).toEqual(['beforeSend', 'sendMessage']);
	});

	it('retains an outside prompt during initial loading and consumes it only after acceptance', async () => {
		isLoadingHistoryMock.value = true;
		isStreamingMock.value = true;
		const response = Promise.withResolvers<'sent'>();
		sendMessageMock.mockReturnValueOnce(response.promise);
		const wrapper = mountPanel();
		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('Test this task');
		await flushPromises();
		const input = wrapper.findComponent({ name: 'ChatInputBase' });
		expect(input.props('canSubmit')).toBe(false);
		expect(wrapper.findComponent({ name: 'N8nSendStopButton' }).exists()).toBe(false);
		expect(input.props('modelValue')).toBe('Test this task');
		expect(sendMessageMock).not.toHaveBeenCalled();
		expect(trackSubmittedMessageMock).not.toHaveBeenCalled();
		expect(wrapper.emitted('initial-consumed')).toBeUndefined();

		isLoadingHistoryMock.value = false;
		await flushPromises();
		expect(wrapper.findComponent({ name: 'N8nSendStopButton' }).exists()).toBe(true);
		expect(sendMessageMock).toHaveBeenCalledExactlyOnceWith(
			'Test this task',
			undefined,
			expect.any(Function),
		);
		expect(wrapper.emitted('initial-consumed')).toBeUndefined();
		expect(trackSubmittedMessageMock).not.toHaveBeenCalled();
		sendMessageMock.mock.lastCall?.[2]?.();
		response.resolve('sent');
		await flushPromises();
		expect(input.props('modelValue')).toBe('');
		expect(wrapper.emitted('initial-consumed')).toEqual([[]]);
		expect(trackSubmittedMessageMock).toHaveBeenCalledOnce();
		wrapper.unmount();
	});

	it('submits an outside message while the current stream runs', async () => {
		const response = Promise.withResolvers<'sent'>();
		sendMessageMock.mockReturnValueOnce(response.promise);
		isStreamingMock.value = true;
		const wrapper = mountPanel();

		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('Test these instructions');
		await flushPromises();

		expect(wrapper.findComponent({ name: 'ChatInputBase' }).props('modelValue')).toBe(
			'Test these instructions',
		);
		expect(wrapper.emitted('initial-consumed')).toBeUndefined();

		expect(sendMessageMock).toHaveBeenCalledExactlyOnceWith(
			'Test these instructions',
			undefined,
			expect.any(Function),
		);
		sendMessageMock.mock.lastCall?.[2]?.();
		await nextTick();
		expect(wrapper.emitted('initial-consumed')).toEqual([[]]);
		wrapper.unmount();
		response.resolve('sent');
		await flushPromises();
	});

	it('does not consume a queued message when its session changes during send', async () => {
		const response = Promise.withResolvers<'sent'>();
		sendMessageMock.mockReturnValueOnce(response.promise);
		const wrapper = mountPanel({ continueSessionId: 'session-1' });

		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('update config');
		await vi.waitFor(() => expect(sendMessageMock).toHaveBeenCalledOnce());
		await wrapper.setProps({ continueSessionId: 'session-2' });
		isStreamingMock.value = true;
		response.resolve('sent');
		await flushPromises();

		expect(wrapper.emitted('initial-consumed')).toBeUndefined();
		wrapper.unmount();
	});

	it.each([
		[
			'the session changes',
			async (wrapper: ReturnType<typeof mountPanel>) => {
				await wrapper.setProps({ continueSessionId: 'session-2' });
			},
		],
		['the panel unmounts', async (wrapper: ReturnType<typeof mountPanel>) => wrapper.unmount()],
	])('does not send a message after beforeSend resolves if %s', async (_condition, invalidate) => {
		const beforeSend = Promise.withResolvers<void>();
		const wrapper = mountPanel({
			continueSessionId: 'session-1',
			beforeSend: () => beforeSend.promise,
		});

		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('update config');
		await flushPromises();
		await invalidate(wrapper);
		beforeSend.resolve();
		await flushPromises();

		expect(sendMessageMock).not.toHaveBeenCalled();
	});

	it('does not send a message if the session changes while preparing telemetry', async () => {
		const fingerprint = Promise.withResolvers<AgentConfigFingerprint>();
		vi.mocked(buildAgentConfigFingerprint).mockReturnValueOnce(fingerprint.promise);
		const wrapper = mountPanel({ continueSessionId: 'session-1' });

		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('update config');
		await vi.waitFor(() => expect(buildAgentConfigFingerprint).toHaveBeenCalledOnce());
		await wrapper.setProps({ continueSessionId: 'session-2' });
		fingerprint.resolve({
			instructions: '',
			tools: [],
			skills: [],
			tasks: [],
			triggers: [],
			vector_stores: [],
			memory: null,
			model: null,
			config_version: 'test-version',
		});
		await flushPromises();

		expect(sendMessageMock).not.toHaveBeenCalled();
	});

	it.each([
		{ state: 'streaming', busy: isStreamingMock },
		{ state: 'cancellation', busy: isCancellingMock },
	])('submits when $state starts during telemetry preparation', async ({ busy }) => {
		const fingerprint = Promise.withResolvers<AgentConfigFingerprint>();
		vi.mocked(buildAgentConfigFingerprint).mockReturnValueOnce(fingerprint.promise);
		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });
		const draft = '  keep this draft  ';
		const file = new File(['notes'], 'notes.txt', { type: 'text/plain' });
		chatInput.vm.$emit('update:modelValue', draft);
		chatInput.vm.$emit('files-selected', [file]);
		chatInput.vm.$emit('submit');
		await vi.waitFor(() => expect(buildAgentConfigFingerprint).toHaveBeenCalledOnce());

		busy.value = true;
		fingerprint.resolve({
			instructions: '',
			tools: [],
			skills: [],
			tasks: [],
			triggers: [],
			vector_stores: [],
			memory: null,
			model: null,
			config_version: 'test-version',
		});
		await flushPromises();
		expect(sendMessageMock).toHaveBeenCalledExactlyOnceWith(
			draft.trim(),
			[file],
			expect.any(Function),
		);
		sendMessageMock.mock.lastCall?.[2]?.();
		await nextTick();
		expect(chatInput.props('modelValue')).toBe('');
		wrapper.unmount();
	});

	it('submits while suspended-run cancellation is pending', async () => {
		isCancellingMock.value = true;
		const wrapper = mountPanel();

		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('keep this draft');
		await flushPromises();

		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });
		expect(chatInput.props('modelValue')).toBe('keep this draft');
		expect(chatInput.props('disabled')).toBe(false);
		expect(sendMessageMock).toHaveBeenCalledWith(
			'keep this draft',
			undefined,
			expect.any(Function),
		);
		wrapper.unmount();
	});

	it.each(['sent', 'busy'] as const)(
		'keeps edits and attachments while a submitted message is %s',
		async (outcome) => {
			const response = Promise.withResolvers<'sent' | 'busy'>();
			sendMessageMock.mockImplementationOnce(() => {
				isSubmittingMock.value = true;
				return response.promise;
			});
			const wrapper = mountPanel();
			const input = wrapper.findComponent({ name: 'ChatInputBase' });
			const file = new File(['notes'], 'notes.txt', { type: 'text/plain' });
			input.vm.$emit('update:modelValue', 'original draft');
			input.vm.$emit('files-selected', [file]);
			input.vm.$emit('submit');
			await flushPromises();
			expect(input.props('disabled')).toBe(false);
			expect(input.props('canSubmit')).toBe(false);
			input.vm.$emit('update:modelValue', 'edited draft');
			const nextFile = new File(['more'], 'more.txt', { type: 'text/plain' });
			input.vm.$emit('files-selected', [nextFile]);
			messagesMock.value = [
				{ id: 'snapshot', role: 'assistant', content: 'progress', status: 'streaming' },
			];
			if (outcome === 'sent') sendMessageMock.mock.lastCall?.[2]?.();
			isSubmittingMock.value = false;
			response.resolve(outcome);
			await flushPromises();
			expect(input.props('modelValue')).toBe('edited draft');
			input.vm.$emit('submit');
			await flushPromises();
			expect(sendMessageMock).toHaveBeenLastCalledWith(
				'edited draft',
				outcome === 'busy' ? [file, nextFile] : [nextFile],
				expect.any(Function),
			);
			wrapper.unmount();
		},
	);

	it('enables chat input and shows answer-question placeholder while an interactive question is unresolved', () => {
		messagesMock.value = [openInteractiveMessage()];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		// Input should be ENABLED so the user can cancel and steer
		expect(chatInput.props('disabled')).toBe(false);
		expect(chatInput.props('placeholder')).toBe('agents.chat.answerQuestionPlaceholder');
	});

	it('calls cancelAndSteer (not sendMessage) when the user submits while an interactive question is open', async () => {
		messagesMock.value = [openInteractiveMessage()];

		const wrapper = mountPanel();

		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('go another direction');
		await flushPromises();

		expect(cancelAndSteerMock).toHaveBeenCalledWith('go another direction', expect.any(Function));
		expect(sendMessageMock).not.toHaveBeenCalled();
	});

	it('keeps a steering draft after a busy rejection without retrying it', async () => {
		messagesMock.value = [openInteractiveMessage()];
		cancelAndSteerMock.mockResolvedValueOnce('busy');
		const wrapper = mountPanel();
		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('keep this direction');
		await flushPromises();
		expect(wrapper.findComponent({ name: 'ChatInputBase' }).props('modelValue')).toBe(
			'keep this direction',
		);
		expect(wrapper.emitted('initial-consumed')).toBeUndefined();
		isStreamingMock.value = true;
		await nextTick();
		isStreamingMock.value = false;
		await flushPromises();
		expect(cancelAndSteerMock).toHaveBeenCalledOnce();
		wrapper.unmount();
	});

	it('keeps chat enabled when the interactive card is resolved', () => {
		messagesMock.value = [
			{
				...openInteractiveMessage(),
				status: 'success',
				interactive: {
					toolName: APPROVAL_TOOL_NAME,
					toolCallId: 'tc-1',
					resolvedAt: 1,
					input: { type: 'approval', toolName: 'send_message', args: {} },
					resolvedValue: { approved: true },
				},
			},
		];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('disabled')).toBe(false);
		expect(chatInput.props('placeholder')).toBe('Message Agent…');
	});

	it('enables chat input while an interactive card is unresolved (cancel-and-steer mode)', () => {
		messagesMock.value = [openInteractiveMessage()];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		// Input should be enabled — the user can cancel and steer
		expect(chatInput.props('disabled')).toBe(false);
	});

	it('shows send and stop controls while an interactive question is unresolved', async () => {
		messagesMock.value = [openInteractiveMessage()];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('isStreaming')).toBe(false);
		const stopButton = wrapper.find('[data-test-id="agent-chat-stop-button"]');
		expect(stopButton.exists()).toBe(true);
		await stopButton.trigger('click');
		await flushPromises();
		expect(stopGeneratingMock).toHaveBeenCalledTimes(1);
	});

	/**
	 * A workflow tool parked on a Wait node. It renders a card, but nobody is
	 * being asked anything — the workflow resumes it — so the input must be
	 * queued rather than routed into cancel-and-steer.
	 */
	function openWaitMessage(): ChatMessage {
		return {
			id: 'assistant-1',
			role: 'assistant',
			content: '',
			status: 'awaitingUser',
			toolCalls: [
				{ tool: 'approval_workflow', toolCallId: 'tc-1', runId: 'run-1', state: 'suspended' },
			],
			interactive: {
				toolName: WAIT_TOOL_NAME,
				toolCallId: 'tc-1',
				runId: 'run-1',
				input: {
					card: {
						title: 'Waiting on "Approval workflow"',
						components: [{ type: 'button', label: 'Stop waiting', value: 'cancel' }],
					},
				},
			},
		};
	}

	it('allows queue submissions while a waiting card is open', () => {
		messagesMock.value = [openWaitMessage()];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('disabled')).toBe(false);
		expect(chatInput.props('isStreaming')).toBe(false);
		expect(wrapper.find('[data-test-id="agent-chat-stop-button"]').exists()).toBe(true);
		expect(chatInput.props('placeholder')).toBe('Message Agent…');
	});

	it('queues ordinary messages without steering a waiting card', async () => {
		messagesMock.value = [openWaitMessage()];

		const wrapper = mountPanel();

		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('any news?');
		await flushPromises();

		expect(sendMessageMock).toHaveBeenCalledWith('any news?', undefined, expect.any(Function));
		expect(cancelAndSteerMock).not.toHaveBeenCalled();
	});

	// The workflow woke the run and the answer landed after the card. Nothing is
	// parked any more, so the input has to come back on its own — the user never
	// clicked the card and never will.
	it('frees the chat input once a turn lands after the waiting card', () => {
		messagesMock.value = [
			openWaitMessage(),
			{
				id: 'assistant-2',
				role: 'assistant',
				content: "Here's the result of the long wait test",
				status: 'success',
			},
		];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('disabled')).toBe(false);
		expect(chatInput.props('placeholder')).toBe('Message Agent…');
	});

	// An abandoned card from an earlier turn is scrolled far out of view, so
	// blocking on it would wedge the chat with no way to see what it points at.
	it('does not let an abandoned card from an earlier turn hold the input', () => {
		messagesMock.value = [
			{ ...openWaitMessage(), id: 'assistant-old' },
			{ id: 'user-2', role: 'user', content: 'and now something else', status: 'success' },
			{
				id: 'assistant-2',
				role: 'assistant',
				content: 'Done.',
				status: 'success',
			},
		];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('disabled')).toBe(false);
	});

	// Typing is a new message, not an answer: a waiting card is not a question,
	// so it must never be routed into cancel-and-steer.
	it('does not steer an earlier waiting card when the user types', async () => {
		messagesMock.value = [
			{ ...openWaitMessage(), id: 'assistant-old' },
			{ id: 'assistant-2', role: 'assistant', content: 'Done.', status: 'success' },
		];

		const wrapper = mountPanel();

		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('something new');
		await flushPromises();

		expect(cancelAndSteerMock).not.toHaveBeenCalled();
		expect(sendMessageMock).toHaveBeenCalledWith('something new', undefined, expect.any(Function));
	});

	// An abandoned wait card earlier in the thread must not hide a real question
	// on the current turn: that question is answerable and typing steers it.
	it('keeps a tail question answerable behind an abandoned waiting card', async () => {
		messagesMock.value = [
			{ ...openWaitMessage(), id: 'assistant-old' },
			{
				...openInteractiveMessage(),
				id: 'assistant-2',
				toolCalls: [
					{ tool: 'chat_action', toolCallId: 'tc-2', runId: 'run-2', state: 'suspended' },
				],
				interactive: {
					toolName: N8N_CHAT_ACTION_TOOL_NAME,
					toolCallId: 'tc-2',
					runId: 'run-2',
					input: {
						card: { components: [{ type: 'button', label: 'Pick Slack', value: 'slack' }] },
					},
				},
			},
		];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('disabled')).toBe(false);
		expect(chatInput.props('placeholder')).toBe('agents.chat.answerQuestionPlaceholder');

		(
			wrapper.vm as unknown as { sendMessageFromOutside: (message: string) => void }
		).sendMessageFromOutside('go another direction');
		await flushPromises();

		expect(cancelAndSteerMock).toHaveBeenCalledWith('go another direction', expect.any(Function));
		expect(sendMessageMock).not.toHaveBeenCalled();
	});

	// The run is parked and would restart from a context with the pending tool
	// call stripped out, so the model would call the same tool again.
	it('allows queue submissions for a suspension with no card', () => {
		messagesMock.value = [
			{
				id: 'assistant-1',
				role: 'assistant',
				content: '',
				toolCalls: [
					{ tool: 'external_action', toolCallId: 'tc-1', runId: 'run-1', state: 'suspended' },
				],
			},
		];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('disabled')).toBe(false);
	});

	it('keeps the stop control available for a non-card suspension', () => {
		messagesMock.value = [
			{
				id: 'assistant-1',
				role: 'assistant',
				content: '',
				toolCalls: [
					{
						tool: 'external_action',
						toolCallId: 'tc-1',
						runId: 'run-1',
						state: 'suspended',
					},
				],
			},
		];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('isStreaming')).toBe(false);
		expect(wrapper.find('[data-test-id="agent-chat-stop-button"]').exists()).toBe(true);
	});

	it('shows stop while tool calls are in-flight even when the stream ended (desync)', () => {
		// Stream ended (isStreaming=false) but a tool call is still `running` —
		// the pulsing desync. Stop must stay visible so the user can clear it.
		isStreamingMock.value = false;
		messagesMock.value = [
			{
				id: 'assistant-1',
				role: 'assistant',
				content: '',
				toolCalls: [
					{
						tool: 'create_issue',
						toolCallId: 'tc-stuck',
						state: 'running',
					},
				],
			},
		];

		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('isStreaming')).toBe(false);
		expect(wrapper.find('[data-test-id="agent-chat-stop-button"]').exists()).toBe(true);
	});

	it('does not apply a build-specific character limit', () => {
		const wrapper = mountPanel();
		const chatInput = wrapper.findComponent({ name: 'ChatInputBase' });

		expect(chatInput.props('maxLength')).toBe(undefined);
	});

	it('humanises runtime issue paths with generic localized labels', () => {
		fatalErrorMock.value = {
			missing: [
				'tools.0.workflow',
				'mcpServers.0.url',
				'subAgents.agents.0.agentId',
				'integrations.0.credentialId',
			],
		};

		const wrapper = mountPanel();

		expect(wrapper.text()).toContain('Check:');
		expect(wrapper.text()).toContain('Tool configuration');
		expect(wrapper.text()).toContain('MCP server');
		expect(wrapper.text()).toContain('Sub-agent');
		expect(wrapper.text()).toContain('integrations.0.credentialId');
	});
});

describe('AgentPreviewDock stream lifecycle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		messagesMock.value = [];
		isStreamingMock.value = true;
		isCancellingMock.value = false;
		fatalErrorMock.value = null;
	});

	function mountPreviewDock() {
		return mount(
			defineComponent({
				setup() {
					const open = ref(true);
					const sessionId = ref('session-1');
					return () =>
						open.value
							? h(AgentPreviewDock, {
									isOpen: true,
									sessionTitle: 'Session',
									sessionOptions: [],
									hasSession: true,
									initialized: true,
									projectId: 'p1',
									agentId: 'a1',
									agent: null,
									localConfig: defaultAgentConfig,
									connectedTriggers: [],
									effectiveSessionId: sessionId.value,
									onClose: () => (open.value = false),
									onNewSession: () => (sessionId.value = 'session-2'),
								})
							: null;
				},
			}),
		);
	}

	it('detaches an in-flight stream when the preview starts a new session', async () => {
		const wrapper = mountPreviewDock();

		await wrapper.get('[data-testid="agent-preview-new-chat-btn"]').trigger('click');
		await flushPromises();

		expect(detachStreamMock).toHaveBeenCalledOnce();
		expect(stopGeneratingMock).not.toHaveBeenCalled();
		isStreamingMock.value = false;
		wrapper.unmount();
	});

	it('detaches an in-flight stream when the preview unmounts', async () => {
		const wrapper = mountPreviewDock();

		wrapper.unmount();
		await flushPromises();

		expect(detachStreamMock).toHaveBeenCalledOnce();
		expect(stopGeneratingMock).not.toHaveBeenCalled();
	});
});
