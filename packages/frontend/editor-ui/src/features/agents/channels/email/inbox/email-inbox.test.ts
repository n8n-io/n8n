import { describe, expect, it } from 'vitest';

import type { AgentExecutionThread } from '../../../composables/useAgentThreadsApi';
import {
	buildInboxAnalytics,
	filterInboxThreads,
	formatInboxTime,
	toInboxThread,
} from './email-inbox';

function thread(
	partial: Partial<AgentExecutionThread> & Pick<AgentExecutionThread, 'id'>,
): AgentExecutionThread {
	return {
		agentId: 'agent-1',
		agentName: 'Mailer',
		parentThreadId: null,
		parentAgentId: null,
		projectId: 'p1',
		taskId: null,
		sessionNumber: 1,
		title: null,
		emoji: null,
		totalPromptTokens: 0,
		totalCompletionTokens: 0,
		totalCost: 0,
		totalDuration: 0,
		createdAt: '2026-09-10T09:00:00.000Z',
		updatedAt: '2026-09-10T09:00:00.000Z',
		...partial,
	};
}

describe('toInboxThread', () => {
	it('uses the first message as subject when the title is empty', () => {
		const item = toInboxThread(
			thread({ id: 't1', firstMessage: 'can you convert this to pdf' }),
			'Untitled',
		);
		expect(item.subject).toBe('can you convert this to pdf');
		expect(item.preview).toBe('');
	});

	it('marks running and error threads as needing attention', () => {
		expect(toInboxThread(thread({ id: 'a', status: 'running' }), 'x').needsAttention).toBe(true);
		expect(toInboxThread(thread({ id: 'b', status: 'error' }), 'x').needsAttention).toBe(true);
		expect(toInboxThread(thread({ id: 'c', status: 'succeeded' }), 'x').needsAttention).toBe(false);
	});
});

describe('filterInboxThreads', () => {
	const items = [
		toInboxThread(thread({ id: 'ok', title: 'PDF conversion', status: 'succeeded' }), 'x'),
		toInboxThread(thread({ id: 'bad', title: 'Broken image', status: 'error' }), 'x'),
	];

	it('keeps only attention threads in that folder', () => {
		expect(filterInboxThreads(items, 'needsAttention', '').map((row) => row.id)).toEqual(['bad']);
	});

	it('matches subject search', () => {
		expect(filterInboxThreads(items, 'inbox', 'pdf').map((row) => row.id)).toEqual(['ok']);
	});
});

describe('buildInboxAnalytics', () => {
	it('counts replies, errors, and average duration', () => {
		const now = new Date('2026-09-10T12:00:00.000Z');
		const analytics = buildInboxAnalytics(
			[
				toInboxThread(
					thread({
						id: '1',
						status: 'succeeded',
						totalDuration: 2000,
						createdAt: '2026-09-10T08:00:00.000Z',
					}),
					'x',
				),
				toInboxThread(
					thread({
						id: '2',
						status: 'error',
						totalDuration: 4000,
						createdAt: '2026-09-09T08:00:00.000Z',
					}),
					'x',
				),
			],
			now,
		);

		expect(analytics.received).toBe(2);
		expect(analytics.replies).toBe(1);
		expect(analytics.errors).toBe(1);
		expect(analytics.avgResponseMs).toBe(3000);
		expect(analytics.byDay.at(-1)?.received).toBeGreaterThanOrEqual(1);
		expect(analytics.byDay.reduce((sum, day) => sum + day.received, 0)).toBe(2);
		expect(analytics.byDay.reduce((sum, day) => sum + day.replied, 0)).toBe(1);
	});
});

describe('formatInboxTime', () => {
	it('shows time for today and a date otherwise', () => {
		const now = new Date('2026-09-10T12:00:00');
		expect(formatInboxTime('2026-09-10T09:40:00', now)).toMatch(/^\d{2}:\d{2}$/);
		expect(formatInboxTime('2026-09-09T09:40:00', now)).not.toMatch(/^\d{2}:\d{2}$/);
	});
});
