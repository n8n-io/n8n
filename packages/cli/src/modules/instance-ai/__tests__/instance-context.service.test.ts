import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type {
	ActivityEvent,
	ActivityEventRepository,
	ExecutionRepository,
	Project,
	ProjectRepository,
	WorkflowRepository,
} from '@n8n/db';
import { mock, type MockProxy } from 'vitest-mock-extended';

import {
	InstanceContextService,
	readInstanceContextCursor,
	type InstanceContextCursor,
} from '../instance-context.service';

const NOW = new Date('2026-09-04T12:00:00.000Z');
const USER_ID = 'user-1';
const PROJECT_ID = 'project-1';

function entry(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
	return {
		id: 1,
		category: 'workflow',
		action: 'saved',
		typeVersion: 1,
		userId: USER_ID,
		projectId: PROJECT_ID,
		resourceType: 'workflow',
		resourceId: 'wf-1',
		resourceName: 'Lead enrichment',
		data: null,
		createdAt: new Date(NOW.getTime() - 60_000),
		...overrides,
	} as ActivityEvent;
}

function run(overrides = {}) {
	return {
		workflowId: 'wf-1',
		workflowName: 'Lead enrichment',
		total: 3,
		failed: 0,
		lastStoppedAt: new Date(NOW.getTime() - 60_000),
		lastFailedExecutionId: null,
		...overrides,
	};
}

describe('InstanceContextService', () => {
	const logger = mock<Logger>({ scoped: () => mock<Logger>() });
	let activityEventRepository: MockProxy<ActivityEventRepository>;
	let executionRepository: MockProxy<ExecutionRepository>;
	let projectRepository: MockProxy<ProjectRepository>;
	let workflowRepository: MockProxy<WorkflowRepository>;

	function serviceWith(enabled = true) {
		activityEventRepository = mock<ActivityEventRepository>();
		executionRepository = mock<ExecutionRepository>();
		projectRepository = mock<ProjectRepository>();
		workflowRepository = mock<WorkflowRepository>();

		activityEventRepository.findFeed.mockResolvedValue([]);
		executionRepository.summariseRunsForProjects.mockResolvedValue([]);
		workflowRepository.findRecentForProjects.mockResolvedValue({ total: 0, workflows: [] });

		return new InstanceContextService(
			logger,
			mock<GlobalConfig>({ instanceAi: { instanceContextEnabled: enabled } }),
			activityEventRepository,
			executionRepository,
			projectRepository,
			workflowRepository,
		);
	}

	describe('buildBlock', () => {
		it('builds nothing with the flag off, and reads nothing either', async () => {
			const service = serviceWith(false);

			expect(await service.buildBlock({ userId: USER_ID, cursor: null, now: NOW })).toBeNull();
			expect(activityEventRepository.findFeed).not.toHaveBeenCalled();
			expect(executionRepository.summariseRunsForProjects).not.toHaveBeenCalled();
		});

		it('builds nothing on a machine follow-up turn, and reads nothing either', async () => {
			const service = serviceWith();
			workflowRepository.findRecentForProjects.mockResolvedValue({
				total: 5,
				workflows: [{ id: 'wf-1', name: 'Lead enrichment', active: true }],
			});

			const built = await service.buildBlock({
				userId: USER_ID,
				projectId: PROJECT_ID,
				cursor: null,
				isMachineFollowUp: true,
				now: NOW,
			});

			expect(built).toBeNull();
			expect(activityEventRepository.findFeed).not.toHaveBeenCalled();
			expect(executionRepository.summariseRunsForProjects).not.toHaveBeenCalled();
			expect(workflowRepository.findRecentForProjects).not.toHaveBeenCalled();
		});

		/** Project is the only boundary the run leg has, so no project means no block. */
		it('builds nothing when the user has no project in scope', async () => {
			const service = serviceWith();
			projectRepository.getAccessibleProjects.mockResolvedValue([]);

			expect(await service.buildBlock({ userId: USER_ID, cursor: null, now: NOW })).toBeNull();
			expect(executionRepository.summariseRunsForProjects).not.toHaveBeenCalled();
		});

		it('builds nothing when nothing exists, has changed, or has run', async () => {
			const service = serviceWith();

			expect(
				await service.buildBlock({
					userId: USER_ID,
					projectId: PROJECT_ID,
					cursor: null,
					now: NOW,
				}),
			).toBeNull();
		});

		/** The case the block exists for: a quiet instance that still holds work worth picking up. */
		it('builds a block from the inventory alone when nothing has happened lately', async () => {
			const service = serviceWith();
			workflowRepository.findRecentForProjects.mockResolvedValue({
				total: 3,
				workflows: [{ id: 'wf-1', name: 'Lead enrichment', active: true }],
			});

			const built = await service.buildBlock({
				userId: USER_ID,
				projectId: PROJECT_ID,
				cursor: null,
				now: NOW,
			});

			expect(built?.block).toContain('<instance-context>');
			expect(built?.block).toContain('Workflows that already exist here: 3');
			expect(built?.block).toContain('"Lead enrichment" (workflow:wf-1) [published]');
			expect(built?.block).toContain('... and 2 more');
		});

		it('reports runs with their counts and points at the failure, not the newest run', async () => {
			const service = serviceWith();
			executionRepository.summariseRunsForProjects.mockResolvedValue([
				run({ total: 43, failed: 2, lastFailedExecutionId: '9001' }),
			]);

			const built = await service.buildBlock({
				userId: USER_ID,
				projectId: PROJECT_ID,
				cursor: null,
				now: NOW,
			});

			expect(built?.block).toContain('ran 43×, 2 failed');
			expect(built?.block).toContain('last failure execution:9001');
		});

		it('renders which node types a save added, and that the assistant made it', async () => {
			const service = serviceWith();
			activityEventRepository.findFeed.mockResolvedValue([
				entry({ data: { source: 'n8n-ai', nodesAdded: ['slack'], nodesAddedTotal: 1 } }),
			]);

			const built = await service.buildBlock({
				userId: USER_ID,
				projectId: PROJECT_ID,
				cursor: null,
				now: NOW,
			});

			expect(built?.block).toContain('+1 slack');
			expect(built?.block).toContain('by the assistant');
		});

		it('drops entries older than the window', async () => {
			const service = serviceWith();
			activityEventRepository.findFeed.mockResolvedValue([
				entry({ id: 7, createdAt: new Date(NOW.getTime() - 30 * 24 * 60 * 60_000) }),
			]);

			expect(
				await service.buildBlock({
					userId: USER_ID,
					projectId: PROJECT_ID,
					cursor: null,
					now: NOW,
				}),
			).toBeNull();
		});

		it('scopes every leg to the conversation project', async () => {
			const service = serviceWith();
			workflowRepository.findRecentForProjects.mockResolvedValue({
				total: 1,
				workflows: [{ id: 'wf-1', name: 'Lead enrichment', active: false }],
			});

			await service.buildBlock({
				userId: USER_ID,
				projectId: PROJECT_ID,
				cursor: null,
				now: NOW,
			});

			expect(projectRepository.getAccessibleProjects).not.toHaveBeenCalled();
			expect(activityEventRepository.findFeed).toHaveBeenCalledWith(
				expect.objectContaining({ projectIds: [PROJECT_ID] }),
			);
			expect(executionRepository.summariseRunsForProjects).toHaveBeenCalledWith(
				expect.objectContaining({ projectIds: [PROJECT_ID] }),
			);
			expect(workflowRepository.findRecentForProjects).toHaveBeenCalledWith([PROJECT_ID], 8);
		});

		it('widens to every project the user belongs to when the conversation is unscoped', async () => {
			const service = serviceWith();
			projectRepository.getAccessibleProjects.mockResolvedValue([
				mock<Project>({ id: 'project-a' }),
				mock<Project>({ id: 'project-b' }),
			]);
			activityEventRepository.findFeed.mockResolvedValue([entry()]);

			await service.buildBlock({ userId: USER_ID, cursor: null, now: NOW });

			expect(activityEventRepository.findFeed).toHaveBeenCalledWith(
				expect.objectContaining({ projectIds: ['project-a', 'project-b'] }),
			);
		});

		describe('deltas', () => {
			const cursor: InstanceContextCursor = {
				activityMark: 500,
				activitySeen: [500, 499],
				runsThrough: new Date(NOW.getTime() - 10 * 60_000).toISOString(),
			};

			it('says it is an addition, and leaves the inventory out', async () => {
				const service = serviceWith();
				activityEventRepository.findFeed.mockResolvedValue([entry({ id: 501 })]);

				const built = await service.buildBlock({
					userId: USER_ID,
					projectId: PROJECT_ID,
					cursor,
					now: NOW,
				});

				expect(built?.block).toContain('since the list earlier in this conversation');
				expect(built?.block).not.toContain('Workflows that already exist here');
				expect(workflowRepository.findRecentForProjects).not.toHaveBeenCalled();
			});

			/**
			 * The correctness property: ids are an ordering key, not a watermark, so a delta reads
			 * below the mark and de-duplicates rather than trusting `> mark`.
			 */
			it('reads below the mark and shows an entry that committed behind it', async () => {
				const service = serviceWith();
				activityEventRepository.findFeed.mockResolvedValue([
					entry({ id: 500 }),
					entry({ id: 498, resourceName: 'Committed late' }),
				]);

				const built = await service.buildBlock({
					userId: USER_ID,
					projectId: PROJECT_ID,
					cursor,
					now: NOW,
				});

				expect(activityEventRepository.findFeed).toHaveBeenCalledWith(
					expect.objectContaining({ afterId: 300 }),
				);
				// 498 was never shown, so it appears; 500 was, so it does not.
				expect(built?.block).toContain('[498]');
				expect(built?.block).not.toContain('[500]');
			});

			it('bounds the runs read by the last block rather than the whole window', async () => {
				const service = serviceWith();
				activityEventRepository.findFeed.mockResolvedValue([entry({ id: 501 })]);

				await service.buildBlock({
					userId: USER_ID,
					projectId: PROJECT_ID,
					cursor,
					now: NOW,
				});

				const { stoppedAfter } = vi.mocked(executionRepository.summariseRunsForProjects).mock
					.calls[0][0];
				// The stated cursor, less the lag that absorbs clock skew and late commits.
				expect(stoppedAfter).toEqual(new Date(Date.parse(cursor.runsThrough) - 120_000));
			});

			it('advances the mark past every entry it saw, and remembers only ids inside the band', async () => {
				const service = serviceWith();
				activityEventRepository.findFeed.mockResolvedValue([
					entry({ id: 600 }),
					entry({ id: 350 }),
				]);

				const built = await service.buildBlock({
					userId: USER_ID,
					projectId: PROJECT_ID,
					cursor,
					now: NOW,
				});

				expect(built?.cursor.activityMark).toBe(600);
				// 350 is below 600 − 200, so the floor already excludes it next time.
				expect(built?.cursor.activitySeen).toEqual([600, 500, 499]);
			});

			it('builds nothing when the delta is empty', async () => {
				const service = serviceWith();

				expect(
					await service.buildBlock({
						userId: USER_ID,
						projectId: PROJECT_ID,
						cursor,
						now: NOW,
					}),
				).toBeNull();
			});
		});

		it('returns nothing rather than failing the turn when a read throws', async () => {
			const service = serviceWith();
			activityEventRepository.findFeed.mockRejectedValue(new Error('db is down'));

			expect(
				await service.buildBlock({
					userId: USER_ID,
					projectId: PROJECT_ID,
					cursor: null,
					now: NOW,
				}),
			).toBeNull();
		});
	});

	describe('list', () => {
		it('passes a known category through and ignores one it does not recognise', async () => {
			const service = serviceWith();

			await service.list({
				userId: USER_ID,
				projectId: PROJECT_ID,
				limit: 5,
				category: 'workflow',
			});
			expect(activityEventRepository.findFeed).toHaveBeenLastCalledWith(
				expect.objectContaining({ category: 'workflow' }),
			);

			await service.list({
				userId: USER_ID,
				projectId: PROJECT_ID,
				limit: 5,
				category: 'nonsense',
			});
			expect(activityEventRepository.findFeed).toHaveBeenLastCalledWith(
				expect.not.objectContaining({ category: expect.anything() }),
			);
		});
	});

	describe('expand', () => {
		it('returns nothing for an id it cannot see, which is also how a pruned id answers', async () => {
			const service = serviceWith();
			activityEventRepository.findEntry.mockResolvedValue(null);

			expect(await service.expand({ id: 42, userId: USER_ID, projectId: PROJECT_ID })).toBeNull();
		});

		it("returns the entry with the rest of its resource's history and where to fetch the record", async () => {
			const service = serviceWith();
			activityEventRepository.findEntry.mockResolvedValue(entry({ id: 10 }));
			activityEventRepository.findByResource.mockResolvedValue([
				entry({ id: 10 }),
				entry({ id: 4, action: 'created' }),
			]);

			const expansion = await service.expand({ id: 10, userId: USER_ID, projectId: PROJECT_ID });

			expect(expansion?.entry.id).toBe(10);
			// The entry itself is not repeated inside its own history.
			expect(expansion?.resourceHistory.map((other) => other.id)).toEqual([4]);
			expect(expansion?.liveRecordHint).toBe('workflows(action="get", workflowId="wf-1")');
			expect(activityEventRepository.findByResource).toHaveBeenCalledWith(
				expect.objectContaining({ projectIds: [PROJECT_ID] }),
			);
		});
	});
});

describe('readInstanceContextCursor', () => {
	it('reads a stored cursor', () => {
		const stored = { activityMark: 12, activitySeen: [12, 11], runsThrough: NOW.toISOString() };

		expect(readInstanceContextCursor({ instanceContext: stored })).toEqual(stored);
	});

	it.each([
		['no metadata', undefined],
		['no cursor', {}],
		['a cursor of the wrong shape', { instanceContext: { activityMark: 'nope' } }],
		['an unparseable timestamp', { instanceContext: { activityMark: 1, runsThrough: 'soon' } }],
	])('starts over on %s', (_case, metadata) => {
		expect(readInstanceContextCursor(metadata)).toBeNull();
	});

	it('drops entries of the wrong type from the seen ids', () => {
		const cursor = readInstanceContextCursor({
			instanceContext: {
				activityMark: 5,
				activitySeen: [5, 'four', null],
				runsThrough: NOW.toISOString(),
			},
		});

		expect(cursor?.activitySeen).toEqual([5]);
	});
});
