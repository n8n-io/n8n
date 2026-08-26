import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type {
	ActivityEvent,
	ActivityEventRepository,
	Project,
	ProjectRepository,
	WorkflowRepository,
} from '@n8n/db';
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
	const projectRepository = mock<ProjectRepository>();
	const workflowRepository = mock<WorkflowRepository>();

	function createService(activityLogEnabled = true) {
		const globalConfig = mock<GlobalConfig>({ instanceAi: { activityLogEnabled } });
		return new ActivityFeedService(
			logger,
			globalConfig,
			repository,
			projectRepository,
			workflowRepository,
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		workflowRepository.findRecentForProjects.mockResolvedValue({ total: 0, workflows: [] });
		projectRepository.getAccessibleProjects.mockResolvedValue([
			mock<Project>({ id: 'project1' }),
			mock<Project>({ id: 'project2' }),
		]);
	});

	describe('project scope', () => {
		it('limits an unscoped conversation to the projects the user can open', async () => {
			repository.findFeed.mockResolvedValueOnce([entry({ id: 3 })]);

			await createService().buildBlock({ userId: 'user1', sinceId: 0, now });

			expect(projectRepository.getAccessibleProjects).toHaveBeenCalledWith('user1');
			expect(repository.findFeed).toHaveBeenCalledWith(
				expect.objectContaining({ projectIds: ['project1', 'project2'] }),
			);
		});

		it('limits a project-scoped conversation to that project alone', async () => {
			repository.findFeed.mockResolvedValueOnce([entry({ id: 3 })]);

			await createService().buildBlock({
				userId: 'user1',
				projectId: 'project7',
				sinceId: 0,
				now,
			});

			expect(projectRepository.getAccessibleProjects).not.toHaveBeenCalled();
			expect(repository.findFeed).toHaveBeenCalledWith(
				expect.objectContaining({ projectIds: ['project7'] }),
			);
		});
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
			expect.objectContaining({ projectIds: ['project1'] }),
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

	describe('existing-work inventory', () => {
		it('names what already exists, which the event log cannot express', async () => {
			repository.findFeed.mockResolvedValueOnce([entry({ id: 9 })]);
			workflowRepository.findRecentForProjects.mockResolvedValueOnce({
				total: 12,
				workflows: [
					{ id: 'wfA', name: 'Missed Call Text-Back', active: false },
					{ id: 'wfB', name: 'Nightly Sync', active: true },
				],
			});

			const result = await createService().buildBlock({ userId: 'user1', sinceId: 0, now });

			expect(result?.block).toContain('Workflows that already exist here: 12');
			// A workflow with no activity entry at all still has to be nameable — that is the point.
			expect(result?.block).toContain('"Missed Call Text-Back" (workflow:wfA)');
			expect(result?.block).toContain('"Nightly Sync" (workflow:wfB) [published]');
			expect(result?.block).toContain('and 10 more');
		});

		it('says an empty project is empty rather than staying silent about it', async () => {
			repository.findFeed.mockResolvedValueOnce([entry({ id: 9 })]);
			workflowRepository.findRecentForProjects.mockResolvedValueOnce({ total: 0, workflows: [] });

			const result = await createService().buildBlock({ userId: 'user1', sinceId: 0, now });

			expect(result?.block).toContain('no workflows yet');
		});

		it('still names existing work when nothing has happened lately', async () => {
			// The case that motivated the inventory: workflows exist, no events at all. Gating the
			// block on events meant the one instance that most needed "here is what exists" got
			// silence instead.
			repository.findFeed.mockResolvedValueOnce([]);
			workflowRepository.findRecentForProjects.mockResolvedValueOnce({
				total: 3,
				workflows: [{ id: 'wfQuiet', name: 'Untouched Workflow', active: false }],
			});

			const result = await createService().buildBlock({ userId: 'user1', sinceId: 0, now });

			expect(result?.block).toContain('"Untouched Workflow" (workflow:wfQuiet)');
		});

		it('stays silent only when the project is genuinely empty', async () => {
			repository.findFeed.mockResolvedValueOnce([]);
			workflowRepository.findRecentForProjects.mockResolvedValueOnce({ total: 0, workflows: [] });

			expect(await createService().buildBlock({ userId: 'user1', sinceId: 0, now })).toBeNull();
		});

		it('leaves the inventory out of a delta, where it would just be repetition', async () => {
			repository.findFeed.mockResolvedValueOnce([entry({ id: 43 })]);

			const result = await createService().buildBlock({ userId: 'user1', sinceId: 42, now });

			expect(result?.block).not.toContain('already exist here');
			expect(workflowRepository.findRecentForProjects).not.toHaveBeenCalled();
		});
	});

	describe('list', () => {
		it('passes the filters through, scoped to what the caller may see', async () => {
			repository.findFeed.mockResolvedValueOnce([entry({ id: 9, data: { nodeCount: 4 } })]);

			const entries = await createService().list({
				userId: 'user1',
				projectId: 'project1',
				limit: 5,
				category: 'workflow',
				resourceId: 'wf1',
				beforeId: 50,
			});

			expect(repository.findFeed).toHaveBeenCalledWith({
				limit: 5,
				projectIds: ['project1'],
				category: 'workflow',
				resourceId: 'wf1',
				beforeId: 50,
			});
			expect(entries).toEqual([
				{
					id: 9,
					at: minutesAgo(5).toISOString(),
					category: 'workflow',
					action: 'saved',
					byCurrentUser: true,
					resourceType: 'workflow',
					resourceId: 'wf1',
					resourceName: 'Lead enrichment',
					detail: { nodeCount: 4 },
				},
			]);
		});

		it('drops a category it does not recognise rather than filtering on it', async () => {
			repository.findFeed.mockResolvedValueOnce([]);

			await createService().list({ userId: 'user1', limit: 5, category: 'nonsense' });

			expect(repository.findFeed).toHaveBeenCalledWith(
				expect.not.objectContaining({ category: expect.anything() }),
			);
		});
	});

	describe('expand', () => {
		it('returns the entry, the rest of its resource history, and where to get the live record', async () => {
			repository.findById.mockResolvedValueOnce(
				entry({ id: 10, category: 'execution', action: 'failed', data: { executionId: 'exec5' } }),
			);
			repository.findByResource.mockResolvedValueOnce([
				entry({ id: 10, category: 'execution', action: 'failed' }),
				entry({ id: 4, action: 'saved' }),
			]);

			const result = await createService().expand({
				id: 10,
				userId: 'user1',
				projectId: 'project1',
			});

			expect(result?.entry.id).toBe(10);
			// The entry itself is not repeated inside its own history.
			expect(result?.resourceHistory.map((other) => other.id)).toEqual([4]);
			expect(result?.liveRecordHint).toBe('executions(action="get", executionId="exec5")');
		});

		it("is indistinguishable from a pruned id when the entry is outside the caller's scope", async () => {
			repository.findById.mockResolvedValueOnce(entry({ id: 10, projectId: 'other-project' }));

			const result = await createService().expand({
				id: 10,
				userId: 'user1',
				projectId: 'project1',
			});

			expect(result).toBeNull();
			expect(repository.findByResource).not.toHaveBeenCalled();
		});

		it('returns nothing for an entry that has been pruned', async () => {
			repository.findById.mockResolvedValueOnce(null);

			const result = await createService().expand({ id: 999, userId: 'user1' });

			expect(result).toBeNull();
		});
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
