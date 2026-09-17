import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project, User } from '@n8n/db';
import { ActivityEventRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { InstanceContextService } from '@/modules/instance-ai/instance-context.service';

import { createExecution } from '@test-integration/db/executions';
import { createMember } from '@test-integration/db/users';

describe('InstanceContextService', () => {
	let service: InstanceContextService;
	let activity: ActivityEventRepository;
	let user: User;
	let project: Project;
	let otherProject: Project;

	const recently = () => new Date(Date.now() - 60_000);

	beforeAll(async () => {
		await testDb.init();
		Container.get(GlobalConfig).instanceAi.instanceContextEnabled = true;
		service = Container.get(InstanceContextService);
		activity = Container.get(ActivityEventRepository);
		user = await createMember();
		project = await createTeamProject(undefined, user);
		otherProject = await createTeamProject();
	});

	beforeEach(
		async () => await testDb.truncate(['ActivityEvent', 'ExecutionEntity', 'WorkflowEntity']),
	);
	afterAll(async () => await testDb.terminate());

	/** `userId` is foreign-keyed, so an entry needs a real user to belong to. */
	async function record(overrides: Parameters<ActivityEventRepository['record']>[0]) {
		await activity.record({ userId: user.id, ...overrides });
	}

	it('carries what exists, what changed and what ran, in one block', async () => {
		const workflow = await createActiveWorkflow({ name: 'Lead enrichment' }, project);
		await record({
			category: 'workflow',
			action: 'saved',
			projectId: project.id,
			resourceType: 'workflow',
			resourceId: workflow.id,
			resourceName: workflow.name,
			data: { source: 'ui', nodesAdded: ['slack'], nodesAddedTotal: 1 },
		});
		await createExecution({ status: 'error', stoppedAt: recently() }, workflow);

		const built = await service.buildBlock({
			user,
			projectId: project.id,
			cursor: null,
		});

		expect(built?.block).toContain('Workflows that already exist here: 1');
		expect(built?.block).toContain('"Lead enrichment" (workflow:' + workflow.id + ') [published]');
		expect(built?.block).toContain('ran 1×, 1 failed');
		expect(built?.block).toContain('+1 slack');
	});

	it('builds nothing with the reader disabled', async () => {
		const config = Container.get(GlobalConfig);
		await createWorkflow({ name: 'Lead enrichment' }, project);
		config.instanceAi.instanceContextEnabled = false;

		try {
			expect(await service.buildBlock({ user, projectId: project.id, cursor: null })).toBeNull();
		} finally {
			config.instanceAi.instanceContextEnabled = true;
		}
	});

	describe('scoping', () => {
		it("never shows another project's work, on any leg", async () => {
			const theirs = await createWorkflow({ name: 'Their secret plan' }, otherProject);
			await record({
				category: 'workflow',
				action: 'deleted',
				projectId: otherProject.id,
				resourceType: 'workflow',
				resourceId: 'gone-1',
				resourceName: 'Their deleted workflow',
			});
			await createExecution({ status: 'error', stoppedAt: recently() }, theirs);

			// Something of ours, so the block is built at all and the absence is meaningful.
			await createWorkflow({ name: 'Ours' }, project);

			const built = await service.buildBlock({
				user,
				projectId: project.id,
				cursor: null,
			});

			expect(built?.block).toContain('Ours');
			expect(built?.block).not.toContain('Their secret plan');
			expect(built?.block).not.toContain('Their deleted workflow');
			expect(built?.block).toContain('Workflows that already exist here: 1');
		});

		it('returns nothing for an entry in a project the user cannot see', async () => {
			await record({
				category: 'workflow',
				action: 'saved',
				projectId: otherProject.id,
				resourceType: 'workflow',
				resourceId: 'wf-theirs',
			});
			const [entry] = await activity.findFeed({
				projectIds: [otherProject.id],
				allowedCategories: ['workflow', 'credential'],
				limit: 1,
			});

			// Scoped to the user's own project, so the other project's entry is out of reach.
			expect(await service.expand({ id: entry.id, user, projectId: project.id })).toBeNull();
			// A pruned id answers identically, so the tool cannot probe for existence.
			expect(
				await service.expand({ id: entry.id + 5_000, user, projectId: project.id }),
			).toBeNull();
		});
	});

	function shownIds(block: string): number[] {
		return [...block.matchAll(/^\[(\d+)\]/gm)].map((match) => Number(match[1]));
	}

	describe('deltas', () => {
		it('shows an entry that sits behind the high-water mark and was never shown', async () => {
			for (const name of ['Committed late', 'Also late', 'Seen already']) {
				await record({
					category: 'workflow',
					action: 'saved',
					projectId: project.id,
					resourceType: 'workflow',
					resourceId: `wf-${name}`,
					resourceName: name,
				});
			}
			const [newest] = await activity.findFeed({
				projectIds: [project.id],
				allowedCategories: ['workflow', 'credential'],
				limit: 1,
			});

			const delta = await service.buildBlock({
				user,
				projectId: project.id,
				cursor: {
					activityMark: newest.id,
					activityFloor: 0,
					activityCategories: ['workflow', 'credential'],
					activitySeen: [newest.id],
					runsThrough: new Date().toISOString(),
				},
			});

			expect(delta?.block).toContain('Committed late');
			expect(delta?.block).toContain('Also late');
			// The one the mark accounted for is not repeated.
			expect(delta?.block).not.toContain('Seen already');
		});

		it('does not re-offer the entries a full window already cut', async () => {
			for (let i = 1; i <= 90; i++) {
				await record({
					category: 'workflow',
					action: 'created',
					projectId: project.id,
					resourceType: 'workflow',
					resourceId: `wf-${i}`,
					resourceName: `Workflow ${i}`,
				});
			}

			const opening = await service.buildBlock({ user, projectId: project.id, cursor: null });
			expect(shownIds(opening?.block ?? '')).toHaveLength(40);
			expect(opening?.block).toContain('and more than these');

			const next = await service.buildBlock({
				user,
				projectId: project.id,
				cursor: opening?.cursor ?? null,
			});

			expect(next).toBeNull();
		});

		it('still recovers a late commit that lands above the cut', async () => {
			for (let i = 1; i <= 45; i++) {
				await record({
					category: 'workflow',
					action: 'created',
					projectId: project.id,
					resourceType: 'workflow',
					resourceId: `wf-${i}`,
					resourceName: `Workflow ${i}`,
				});
			}
			const seeded = await activity.findFeed({
				projectIds: [project.id],
				allowedCategories: ['workflow', 'credential'],
				limit: 50,
			});
			const straggler = seeded[5];

			const delta = await service.buildBlock({
				user,
				projectId: project.id,
				cursor: {
					activityMark: seeded[0].id,
					activityFloor: seeded[10].id,
					activityCategories: ['workflow', 'credential'],
					activitySeen: seeded
						.slice(0, 10)
						.map((row) => row.id)
						.filter((id) => id !== straggler.id),
					runsThrough: new Date().toISOString(),
				},
			});

			expect(shownIds(delta?.block ?? '')).toEqual([straggler.id]);
			expect(delta?.block).toContain(straggler.resourceName);
		});

		it('leaves the inventory out of a delta and says it is an addition', async () => {
			await createWorkflow({ name: 'Lead enrichment' }, project);
			await record({
				category: 'workflow',
				action: 'created',
				projectId: project.id,
				resourceType: 'workflow',
				resourceId: 'wf-1',
				resourceName: 'Lead enrichment',
			});

			const first = await service.buildBlock({
				user,
				projectId: project.id,
				cursor: null,
			});
			await record({
				category: 'credential',
				action: 'created',
				projectId: project.id,
				resourceType: 'credential',
				resourceId: 'cred-1',
				resourceName: 'Slack account',
				data: { credentialType: 'slackApi' },
			});

			const delta = await service.buildBlock({
				user,
				projectId: project.id,
				cursor: first!.cursor,
			});

			expect(delta?.block).toContain('Slack account');
			expect(delta?.block).toContain('since the list earlier in this conversation');
			expect(delta?.block).not.toContain('Workflows that already exist here');
		});

		it('builds nothing when nothing has happened since the last block', async () => {
			await createWorkflow({ name: 'Lead enrichment' }, project);

			const first = await service.buildBlock({
				user,
				projectId: project.id,
				cursor: null,
			});

			expect(
				await service.buildBlock({
					user,
					projectId: project.id,
					cursor: first!.cursor,
				}),
			).toBeNull();
		});
	});

	/** An evaluation suite is machine-paced and would bury everything a person did. */
	/**
	 * Thread access proves the thread is the caller's own, not that they may still read the project
	 * it is bound to, so the scope is re-checked against the real permission tables every turn.
	 */
	it('builds nothing when the bound project is one the user cannot read', async () => {
		await createWorkflow({ name: 'Theirs' }, otherProject);

		const built = await service.buildBlock({
			user,
			projectId: otherProject.id,
			cursor: null,
		});

		expect(built).toBeNull();
	});

	it('leaves evaluation runs out of the block', async () => {
		const workflow = await createWorkflow({ name: 'Lead enrichment' }, project);
		await createExecution({ status: 'error', mode: 'evaluation', stoppedAt: recently() }, workflow);

		const built = await service.buildBlock({
			user,
			projectId: project.id,
			cursor: null,
		});

		expect(built?.block).not.toContain('ran ');
	});

	it("expands an entry with the rest of that resource's history", async () => {
		for (const action of ['created', 'saved']) {
			await record({
				category: 'workflow',
				action,
				projectId: project.id,
				resourceType: 'workflow',
				resourceId: 'wf-1',
				resourceName: 'Lead enrichment',
			});
		}
		const [newest] = await activity.findFeed({
			projectIds: [project.id],
			allowedCategories: ['workflow', 'credential'],
			limit: 1,
		});

		const expansion = await service.expand({
			id: newest.id,
			user,
			projectId: project.id,
		});

		expect(expansion?.entry.action).toBe('saved');
		expect(expansion?.resourceHistory.map((other) => other.action)).toEqual(['created']);
		expect(expansion?.liveRecordHint).toBe('workflows(action="get", workflowId="wf-1")');
	});

	it('reads nothing when the conversation is bound to no project', async () => {
		await createWorkflow({ name: 'Mine' }, project);
		await record({
			category: 'workflow',
			action: 'saved',
			projectId: project.id,
			resourceType: 'workflow',
			resourceId: 'wf-1',
		});

		expect(await service.buildBlock({ user, cursor: null })).toBeNull();
	});

	it('carries a refilled entry whose id was reused from one already shown', async () => {
		for (const name of ['First', 'Second', 'Third']) {
			await record({
				category: 'workflow',
				action: 'saved',
				projectId: project.id,
				resourceType: 'workflow',
				resourceId: `wf-${name}`,
				resourceName: name,
			});
		}

		const opening = await service.buildBlock({
			user,
			projectId: project.id,
			cursor: null,
			now: recently(),
		});
		expect(opening?.block).toContain('Third');
		expect(opening!.cursor.activityFloor).toBe(0);
		expect(opening!.cursor.activitySeen.length).toBe(3);

		await testDb.truncate(['ActivityEvent']);
		await record({
			category: 'workflow',
			action: 'saved',
			projectId: project.id,
			resourceType: 'workflow',
			resourceId: 'wf-after',
			resourceName: 'Written after the sweep',
		});

		const next = await service.buildBlock({
			user,
			projectId: project.id,
			cursor: opening!.cursor,
		});

		expect(next?.block).toContain('Written after the sweep');
	});

	it('still carries what changed after the feed was emptied and refilled', async () => {
		await record({
			category: 'workflow',
			action: 'saved',
			projectId: project.id,
			resourceType: 'workflow',
			resourceId: 'wf-before',
			resourceName: 'Before the sweep',
		});

		const first = await service.buildBlock({
			user,
			projectId: project.id,
			cursor: null,
			now: recently(),
		});
		expect(first?.block).toContain('Before the sweep');
		const carried = first!.cursor;
		expect(carried.activityMark).toBeGreaterThan(0);

		await testDb.truncate(['ActivityEvent']);
		await record({
			category: 'workflow',
			action: 'saved',
			projectId: project.id,
			resourceType: 'workflow',
			resourceId: 'wf-after',
			resourceName: 'After the sweep',
		});

		const second = await service.buildBlock({
			user,
			projectId: project.id,
			cursor: carried,
		});

		expect(second?.block).toContain('After the sweep');
		const newest = await activity.findNewestEntry({
			projectIds: [project.id],
			allowedCategories: ['workflow', 'credential'],
		});
		expect(second?.cursor.activityMark).toBe(newest?.id);
	});
});
