import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { AGENT_BUILDER_VIEW, CONTINUE_SESSION_ID_PARAM, OPEN_PREVIEW_PARAM } from '../constants';
import type { AgentBackgroundJobDto } from '@n8n/api-types';
import { N8nIcon, N8nSpinner } from '@n8n/design-system';
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
	it('opens Preview on the parent session to review approval', async () => {
		const router = createRouter({
			history: createMemoryHistory(),
			routes: [
				{ path: '/', component: { template: '<div />' } },
				{
					path: '/projects/:projectId/agents/:agentId',
					name: AGENT_BUILDER_VIEW,
					component: { template: '<div />' },
				},
			],
		});
		await router.push('/');
		const wrapper = mount(SessionBackgroundTaskItem, {
			props: {
				item: backgroundTasksToTimelineItems([
					{
						...task,
						status: 'suspended',
						approval: { runId: 'background-job-job-1', toolCallId: 'gate-1' },
					},
				])[0],
				selected: false,
				projectId: 'project-1',
				agentId: 'agent-1',
				threadId: 'parent-thread',
			},
			global: { plugins: [router] },
		});
		const link = wrapper.get('[data-test-id="review-background-task-approval"]');
		expect(link.text()).toBe('Approve');
		const href = link.attributes('href');
		expect(href).toBeDefined();
		if (href === undefined) throw new Error('Approval link must have an href');
		const destination = router.resolve(href);
		expect(destination.name).toBe(AGENT_BUILDER_VIEW);
		expect(destination.params).toEqual({ projectId: 'project-1', agentId: 'agent-1' });
		expect(destination.query).toEqual({
			[CONTINUE_SESSION_ID_PARAM]: 'parent-thread',
			[OPEN_PREVIEW_PARAM]: 'true',
		});
		await wrapper.setProps({ item: backgroundTasksToTimelineItems([task])[0] });
		expect(wrapper.find('[data-test-id="review-background-task-approval"]').exists()).toBe(false);
	});

	it('does not offer approval navigation without parent session context', () => {
		const wrapper = mount(SessionBackgroundTaskItem, {
			props: {
				item: backgroundTasksToTimelineItems([
					{
						...task,
						status: 'suspended',
						approval: { runId: 'background-job-job-1', toolCallId: 'gate-1' },
					},
				])[0],
				selected: false,
			},
		});
		expect(wrapper.find('[data-test-id="review-background-task-approval"]').exists()).toBe(false);
	});

	it('does not offer approval navigation for a suspension without an approval', () => {
		const wrapper = mount(SessionBackgroundTaskItem, {
			props: {
				item: backgroundTasksToTimelineItems([{ ...task, status: 'suspended' }])[0],
				selected: false,
				projectId: 'project-1',
				agentId: 'agent-1',
				threadId: 'parent-thread',
			},
		});
		expect(wrapper.find('[data-test-id="review-background-task-approval"]').exists()).toBe(false);
	});

	it('shows only the task name and grid spinner while running', () => {
		const wrapper = mount(SessionBackgroundTaskItem, {
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
