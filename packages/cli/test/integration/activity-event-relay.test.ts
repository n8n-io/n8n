import { Logger } from '@n8n/backend-common';
import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { ActivityEventRepository, WorkflowRepository } from '@n8n/db';
import type { Project, User, WorkflowEntity, ActivityEvent } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import { ActivityEventRelay } from '@/events/relays/activity.event-relay';
import { ActivityPruningTask } from '@/services/pruning/activity-pruning.task';
import { WorkflowService } from '@/workflows/workflow.service';

import { createOwner } from './shared/db/users';

const node = (type: string, name: string): INode => ({
	id: name,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

/**
 * The relay is only worth anything end to end. A mocked repository would let every one of these
 * pass with the relay wired to nothing, so this drives a real event through a real event bus into
 * a real table, and reads the row back out.
 */
describe('ActivityEventRelay', () => {
	let repository: ActivityEventRepository;
	let eventService: EventService;
	let project: Project;
	let workflow: WorkflowEntity;
	let owner: User;

	/** `activity_event.userId` is a foreign key, so the acting user has to be a real row. */
	const actor = () => ({
		id: owner.id,
		email: owner.email,
		firstName: owner.firstName,
		lastName: owner.lastName,
		role: { slug: owner.role.slug },
	});

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(ActivityEventRepository);
		eventService = Container.get(EventService);
		Container.get(GlobalConfig).activityLog.enabled = true;
		Container.get(ActivityEventRelay).init();
	});

	beforeEach(async () => {
		owner = await createOwner();
		project = await createTeamProject();
		workflow = await createWorkflow({ name: 'Lead enrichment' }, project);
	});

	afterEach(async () => await testDb.truncate(['ActivityEvent']));
	afterAll(async () => await testDb.terminate());

	/** A handler awaits a lookup and an insert, so the row lands some turns after the emit. */
	const waitForEntry = async (projectId: string) =>
		await vi.waitFor(async () => {
			const entries = await repository.findFeed({ projectIds: [projectId], limit: 10 });
			expect(entries).not.toHaveLength(0);
			return entries;
		});

	it('resolves the project of a live workflow and writes a readable entry', async () => {
		eventService.emit('workflow-saved', {
			user: actor(),
			workflow: { ...workflow, nodes: [node('n8n-nodes-base.slack', 'Slack')] },
			previousWorkflow: { ...workflow, nodes: [] },
			publicApi: false,
			source: 'n8n-ai',
		});
		const [entry] = await waitForEntry(project.id);

		expect(entry).toMatchObject({
			category: 'workflow',
			action: 'saved',
			projectId: project.id,
			resourceType: 'workflow',
			resourceId: workflow.id,
			resourceName: 'Lead enrichment',
			data: { source: 'n8n-ai', nodeCount: 1, nodesAdded: ['slack'] },
		});
	});

	it('keeps a deletion entry after the workflow it describes is gone', async () => {
		// Through the service, not the event: name and owning project only reach the relay because
		// `delete` resolves them ahead of the cascade. Emitting by hand would assert nothing about
		// that ordering, and would leave the workflow the entry describes alive.
		// `force`, since the workflow is unarchived — the same argument the public API passes.
		await Container.get(WorkflowService).delete(owner, workflow.id, true);

		expect(await Container.get(WorkflowRepository).findOneBy({ id: workflow.id })).toBeNull();

		const [entry] = await waitForEntry(project.id);

		expect(entry).toMatchObject({
			category: 'workflow',
			action: 'deleted',
			projectId: project.id,
			resourceId: workflow.id,
			resourceName: 'Lead enrichment',
		});
	});

	it('holds the table to its caps on an instance busy enough to need more than one batch', async () => {
		// Past the repository's 500-row batch, so the sweep has to walk the backlog rather than
		// clear it in a single pass.
		const backlog = 1_200;
		const keep = 100;

		const old = new Date(Date.now() - 30 * Time.days.toMilliseconds);
		for (let written = 0; written < backlog; written += 100) {
			await repository.insert(
				Array.from({ length: 100 }, (_, i) => ({
					category: 'workflow' as const,
					action: 'saved',
					typeVersion: 1,
					projectId: project.id,
					resourceType: 'workflow' as const,
					resourceId: workflow.id,
					// Half the backlog is old enough for the age cap, so both sweeps do work.
					createdAt: written + i < backlog / 2 ? old : new Date(),
				})),
			);
		}
		expect(await repository.count()).toBe(backlog);

		// Leadership, scheduling and shutdown belong to the task runner, so a direct run is the
		// whole of what this task does.
		Object.assign(Container.get(GlobalConfig).activityLog, { retentionDays: 14, maxEntries: keep });

		await new ActivityPruningTask(
			Container.get(Logger),
			repository,
			Container.get(GlobalConfig).activityLog,
		).run(new AbortController().signal);

		expect(await repository.count()).toBe(keep);

		// What survived is the newest, not an arbitrary hundred.
		const survivors = await repository.find({ order: { id: 'DESC' } });
		expect(survivors.every((entry: ActivityEvent) => entry.createdAt > old)).toBe(true);
	});
});
