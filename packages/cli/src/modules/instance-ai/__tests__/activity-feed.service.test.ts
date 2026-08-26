import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { ActivityEvent, ActivityEventRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ActivityFeedService, readLastInjectedActivityId } from '../activity-feed.service';
import { cleanStoredUserMessage } from '../internal-messages';

const now = new Date('2026-08-26T12:00:00.000Z');

function minutesAgo(minutes: number): Date {
	return new Date(now.getTime() - minutes * 60_000);
}

function entry(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
	return {
		id: 1,
		category: 'workflow',
		action: 'saved',
		typeVersion: 1,
		userId: 'user1',
		projectId: 'project1',
		resourceType: 'workflow',
		resourceId: 'wf1',
		resourceName: 'Lead enrichment',
		data: null,
		createdAt: minutesAgo(5),
		...overrides,
	} as ActivityEvent;
}

describe('ActivityFeedService', () => {
	const repository = mock<ActivityEventRepository>();
	const logger = mock<Logger>({ scoped: () => mock<Logger>() });

	function createService(activityLogEnabled = true) {
		const globalConfig = mock<GlobalConfig>({ instanceAi: { activityLogEnabled } });
		return new ActivityFeedService(logger, globalConfig, repository);
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('builds nothing when the activity log is disabled', async () => {
		const result = await createService(false).buildBlock({ userId: 'user1', sinceId: 0, now });

		expect(result).toBeNull();
		expect(repository.findFeed).not.toHaveBeenCalled();
	});

	it('builds nothing when the thread has already been shown everything', async () => {
		repository.findFeed.mockResolvedValueOnce([]);

		const result = await createService().buildBlock({ userId: 'user1', sinceId: 42, now });

		expect(result).toBeNull();
		expect(repository.findFeed).toHaveBeenCalledWith(expect.objectContaining({ afterId: 42 }));
	});

	it('sends only what is new to a thread that has seen a feed before, and says so', async () => {
		repository.findFeed.mockResolvedValueOnce([entry({ id: 43, action: 'published' })]);

		const result = await createService().buildBlock({ userId: 'user1', sinceId: 42, now });

		expect(repository.findFeed).toHaveBeenCalledWith(expect.objectContaining({ afterId: 42 }));
		expect(result?.block).toContain('since the list earlier in this conversation');
		expect(result?.block).toContain('additions, not a replacement');
		expect(result?.newestId).toBe(43);
	});

	it('sends the whole window to a thread seeing its first feed', async () => {
		repository.findFeed.mockResolvedValueOnce([entry({ id: 43 })]);

		const result = await createService().buildBlock({ userId: 'user1', sinceId: 0, now });

		expect(repository.findFeed).toHaveBeenCalledWith(
			expect.not.objectContaining({ afterId: expect.anything() }),
		);
		expect(result?.block).toContain('Recent activity on this instance');
	});

	it('builds nothing rather than an empty feed when nothing is recent enough', async () => {
		repository.findFeed.mockResolvedValueOnce([
			entry({ id: 42, createdAt: minutesAgo(60 * 24 * 30) }),
		]);

		const result = await createService().buildBlock({ userId: 'user1', sinceId: 0, now });

		expect(result).toBeNull();
	});

	it('renders newest first, with the id, age, name and detail of each entry', async () => {
		repository.findFeed.mockResolvedValueOnce([
			entry({ id: 20, action: 'saved', createdAt: minutesAgo(4), data: { nodeDelta: 2 } }),
			entry({
				id: 12,
				action: 'created',
				resourceId: 'cred9',
				resourceType: 'credential',
				category: 'credential',
				resourceName: 'slackApi',
				createdAt: minutesAgo(180),
			}),
		]);

		const result = await createService().buildBlock({
			userId: 'user1',
			projectId: 'project1',
			sinceId: 0,
			now,
		});

		expect(result?.newestId).toBe(20);
		const lines = result!.block.split('\n');
		expect(lines.at(-3)).toBe(
			'[20] · 4m ago · workflow · saved · "Lead enrichment" (workflow:wf1) · +2 nodes',
		);
		expect(lines.at(-2)).toBe(
			'[12] · 3h ago · credential · created · "slackApi" (credential:cred9)',
		);
		expect(repository.findFeed).toHaveBeenCalledWith(
			expect.objectContaining({ projectId: 'project1' }),
		);
	});

	it('folds repeated runs of one workflow into a single counted entry', async () => {
		repository.findFeed.mockResolvedValueOnce([
			entry({ id: 30, category: 'execution', action: 'succeeded', createdAt: minutesAgo(1) }),
			// A different workflow between them: adjacency-only collapsing would miss this.
			entry({
				id: 29,
				category: 'execution',
				action: 'succeeded',
				resourceId: 'wf2',
				resourceName: 'Daily digest',
				createdAt: minutesAgo(2),
			}),
			entry({
				id: 28,
				category: 'execution',
				action: 'failed',
				createdAt: minutesAgo(3),
				data: { failedNode: 'HTTP Request' },
			}),
			entry({ id: 27, category: 'execution', action: 'succeeded', createdAt: minutesAgo(4) }),
		]);

		const result = await createService().buildBlock({ userId: 'user1', sinceId: 0, now });

		expect(result?.block).toContain(
			'[30] · 1m ago · execution · ran 3×, 1 failed · "Lead enrichment" (workflow:wf1) · failed at "HTTP Request"',
		);
		expect(result?.block).toContain('[29] · 2m ago · execution · succeeded · "Daily digest"');
		expect(result?.block).not.toContain('[28]');
	});

	it('caps how many workflows contribute runs, so schedules cannot crowd out edits', async () => {
		const runs = Array.from({ length: 20 }, (_, index) =>
			entry({
				id: 100 - index,
				category: 'execution',
				action: 'succeeded',
				resourceId: `wf${index}`,
				resourceName: `Scheduled ${index}`,
				createdAt: minutesAgo(index + 1),
			}),
		);
		const edit = entry({ id: 50, action: 'saved', createdAt: minutesAgo(30) });
		repository.findFeed.mockResolvedValueOnce([...runs, edit]);

		const result = await createService().buildBlock({ userId: 'user1', sinceId: 0, now });

		const runLines = result!.block.split('\n').filter((line) => line.includes('· execution ·'));
		expect(runLines).toHaveLength(12);
		expect(result?.block).toContain('[50]');
	});

	it('marks entries the current user did not cause', async () => {
		repository.findFeed.mockResolvedValueOnce([entry({ id: 5, userId: 'someone-else' })]);

		const result = await createService().buildBlock({ userId: 'user1', sinceId: 0, now });

		expect(result?.block).toContain('by another user');
	});

	it('wraps the feed so the UI strips it from the stored user message', async () => {
		repository.findFeed.mockResolvedValueOnce([entry({ id: 7 })]);

		const result = await createService().buildBlock({ userId: 'user1', sinceId: 0, now });
		const stored = `${result!.block}\n\nadd a slack node`;

		expect(cleanStoredUserMessage(stored)).toBe('add a slack node');
	});

	it('returns nothing when the read fails, so the turn is not lost with it', async () => {
		repository.findFeed.mockRejectedValueOnce(new Error('db down'));

		const result = await createService().buildBlock({ userId: 'user1', sinceId: 0, now });

		expect(result).toBeNull();
	});

	describe('readLastInjectedActivityId', () => {
		it('starts over for a thread that has no mark, or an unusable one', () => {
			expect(readLastInjectedActivityId(undefined)).toBe(0);
			expect(readLastInjectedActivityId({})).toBe(0);
			expect(readLastInjectedActivityId({ lastInjectedActivityId: 'nope' })).toBe(0);
			expect(readLastInjectedActivityId({ lastInjectedActivityId: 17 })).toBe(17);
		});
	});
});
