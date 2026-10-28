import { i18nInstance } from '@n8n/i18n';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentBackgroundJobDto, AgentChatResumeDto } from '@n8n/api-types';
import { N8nApprovalCard, N8nIcon, N8nSpinner } from '@n8n/design-system';
import SessionBackgroundTaskItem from '../components/timeline-items/SessionBackgroundTaskItem.vue';
import { backgroundTasksToTimelineItems } from '../utils/background-task-timeline';
import { timelineItemSearchText } from '../session-timeline.utils';

const task: AgentBackgroundJobDto = {
	id: 'job-1',
	title: 'Research suppliers',
	kind: 'subagent',
	status: 'running',
	startedAt: '2026-09-09T10:00:00.000Z',
};

enableAutoUnmount(afterEach);

describe('SessionBackgroundTaskItem', () => {
	const suspendedTask: AgentBackgroundJobDto = {
		...task,
		status: 'suspended',
		approval: {
			runId: 'background-job-job-1',
			toolCallId: 'gate-1',
			suspendPayload: {
				type: 'approval',
				toolName: 'send_message',
				displayName: 'Send message',
				args: { channel: '#updates', message: 'The report is ready.' },
			},
		},
	};

	function mountApproval(job = suspendedTask) {
		const respondToApproval = vi
			.fn<(payload: AgentChatResumeDto) => Promise<void>>()
			.mockResolvedValue(undefined);
		const wrapper = mount(SessionBackgroundTaskItem, {
			global: { plugins: [i18nInstance] },
			props: {
				item: backgroundTasksToTimelineItems([job])[0],
				selected: false,
				respondToApproval,
			},
		});
		return { wrapper, respondToApproval };
	}

	it('shows the tool and its inputs inline', () => {
		const { wrapper } = mountApproval();
		expect(wrapper.text()).toContain('Send message');
		expect(wrapper.getComponent(N8nApprovalCard).props('autoFocus')).toBe(false);
		expect(wrapper.get('[data-test-id="approval-card-args"]').text()).toContain('#updates');
		expect(wrapper.find('[data-test-id="approval-card-always-allow"]').exists()).toBe(false);
		expect(wrapper.find('a').exists()).toBe(false);
	});

	it('shows the agent name in the approval sentence', async () => {
		const { wrapper } = mountApproval();
		await wrapper.setProps({ agentName: 'Research agent' });
		expect(wrapper.text().replace(/\s+/g, ' ')).toContain(
			'Research agent wants to use Send message',
		);
	});

	it.each([
		['allow-once', { approved: true }],
		['deny', { approved: false }],
	])('submits %s for the current approval', async (choice, resumeData) => {
		const { wrapper, respondToApproval } = mountApproval();
		await wrapper.get(`[data-test-id="approval-card-${choice}"]`).trigger('click');
		expect(respondToApproval).toHaveBeenCalledWith({
			runId: 'background-job-job-1',
			toolCallId: 'gate-1',
			resumeData,
		});
	});

	it('preserves session approval when the backend supports it', async () => {
		const { wrapper, respondToApproval } = mountApproval({
			...suspendedTask,
			approval: {
				runId: 'background-job-job-1',
				toolCallId: 'gate-1',
				suspendPayload: {
					type: 'approval',
					toolName: 'send_message',
					supportsSessionApproval: true,
					args: {},
				},
			},
		});
		await wrapper.get('[data-test-id="approval-card-always-allow"]').trigger('click');
		expect(respondToApproval).toHaveBeenCalledWith({
			runId: 'background-job-job-1',
			toolCallId: 'gate-1',
			resumeData: { approved: true, scope: 'session' },
		});
	});

	it('disables submissions while a response is pending and permits a retry', async () => {
		const { wrapper, respondToApproval } = mountApproval();
		await wrapper.setProps({ approvalPending: true });
		await wrapper.get('[data-test-id="approval-card-allow-once"]').trigger('click');
		expect(respondToApproval).not.toHaveBeenCalled();
		await wrapper.setProps({ approvalPending: false });
		await wrapper.get('[data-test-id="approval-card-allow-once"]').trigger('click');
		expect(respondToApproval).toHaveBeenCalledOnce();
	});

	it('removes the card when the job resumes', async () => {
		const { wrapper } = mountApproval();
		await wrapper.setProps({ item: backgroundTasksToTimelineItems([task])[0] });
		expect(wrapper.find('[data-testid="agent-approval-card"]').exists()).toBe(false);
	});

	it('does not show active choices without a response handler', () => {
		const wrapper = mount(SessionBackgroundTaskItem, {
			global: { plugins: [i18nInstance] },
			props: { item: backgroundTasksToTimelineItems([suspendedTask])[0], selected: false },
		});
		expect(wrapper.find('[data-testid="agent-approval-card"]').exists()).toBe(false);
	});

	it.each([
		{ ...task, status: 'suspended' },
		{ ...suspendedTask, status: 'completed' },
		{
			...suspendedTask,
			approval: { runId: 'run-1', toolCallId: 'gate-1', suspendPayload: { type: 'question' } },
		},
	] satisfies AgentBackgroundJobDto[])(
		'does not show choices for a job without a live tool approval',
		(job) => {
			const { wrapper } = mountApproval(job);
			expect(wrapper.find('[data-testid="agent-approval-card"]').exists()).toBe(false);
		},
	);

	it('shows only the task name and grid spinner while running', () => {
		const wrapper = mount(SessionBackgroundTaskItem, {
			global: { plugins: [i18nInstance] },
			props: { item: backgroundTasksToTimelineItems([task])[0], selected: false },
		});
		expect(wrapper.get('button').text()).toBe(task.title);
		expect(wrapper.getComponent(N8nSpinner).props('type')).toBe('grid');
		expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('Running');
		expect(wrapper.get('[role="img"]').attributes('aria-hidden')).toBeUndefined();
	});

	it.each([
		{ status: 'paused', label: 'Paused', icon: 'circle-pause' },
		{ status: 'suspended', label: 'Awaiting approval', icon: 'hourglass' },
		{ status: 'completed', label: 'Done', icon: 'circle-check' },
		{ status: 'failed', label: 'Failed', icon: 'circle-x' },
		{ status: 'cancelled', label: 'Canceled', icon: 'circle-x' },
	] satisfies Array<{ status: AgentBackgroundJobDto['status']; label: string; icon: string }>)(
		'shows the current $status state',
		({ status, label, icon }) => {
			const wrapper = mount(SessionBackgroundTaskItem, {
				global: { plugins: [i18nInstance] },
				props: { item: backgroundTasksToTimelineItems([{ ...task, status }])[0], selected: false },
			});
			expect(wrapper.get('button').text()).toBe(`${task.title} • ${label}`);
			expect(wrapper.getComponent(N8nIcon).props('icon')).toBe(icon);
			expect(wrapper.findComponent(N8nSpinner).exists()).toBe(false);
		},
	);

	it('keeps the task identity and start time when the current state changes', () => {
		const running = backgroundTasksToTimelineItems([task])[0];
		const completed = backgroundTasksToTimelineItems([
			{
				...task,
				status: 'completed',
				settledAt: '2026-09-09T10:05:00.000Z',
			},
		])[0];
		expect(completed.executionId).toBe(running.executionId);
		expect(completed.timestamp).toBe(running.timestamp);
		expect(completed.endTimestamp).toBe(Date.parse('2026-09-09T10:05:00.000Z'));
		expect(completed.activityStatus).toBe('completed');
		expect(timelineItemSearchText(completed, (key) => key)).toContain(task.title.toLowerCase());
	});
});
