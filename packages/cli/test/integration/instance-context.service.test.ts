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

import type { InstanceContextScope } from '@/modules/instance-ai/instance-context.service';
import { InstanceContextService } from '@/modules/instance-ai/instance-context.service';
import { createExecution } from '@test-integration/db/executions';
import { createMember } from '@test-integration/db/users';

/** Instance AI: bound to the thread's own project. */
const bound = (projectId: string): InstanceContextScope => ({ surface: 'conversation', projectId });

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
			scope: bound(project.id),
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
			expect(await service.buildBlock({ user, scope: bound(project.id), cursor: null })).toBeNull();
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
				scope: bound(project.id),
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
			const [entry] = await activity.findFeed({ projectIds: [otherProject.id], limit: 1 });

			// Scoped to the user's own project, so the other project's entry is out of reach.
			expect(await service.expand({ id: entry.id, user, scope: bound(project.id) })).toBeNull();
			// A pruned id answers identically, so the tool cannot probe for existence.
			expect(
				await service.expand({ id: entry.id + 5_000, user, scope: bound(project.id) }),
			).toBeNull();
		});
	});

	describe('deltas', () => {
		/**
		 * The correctness property behind the delta cursor. Ids are allocated outside the
		 * surrounding transaction on Postgres, so a lower id can commit after a higher one has
		 * already been shown. The reader therefore re-reads a band below its mark and drops what it
		 * has already shown, rather than asking for "everything above the highest id seen" — which
		 * would skip the straggler for good, and deletions are written by whichever request happens
		 * to be committing.
		 *
		 * The mark below stands for that state: an entry sitting under it that no block has shown.
		 */
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
			const [newest] = await activity.findFeed({ projectIds: [project.id], limit: 1 });

			const delta = await service.buildBlock({
				user,
				scope: bound(project.id),
				cursor: {
					activityMark: newest.id,
					activitySeen: [newest.id],
					runsThrough: new Date().toISOString(),
				},
			});

			expect(delta?.block).toContain('Committed late');
			expect(delta?.block).toContain('Also late');
			// The one the mark accounted for is not repeated.
			expect(delta?.block).not.toContain('Seen already');
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
				scope: bound(project.id),
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
				scope: bound(project.id),
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
				scope: bound(project.id),
				cursor: null,
			});

			expect(
				await service.buildBlock({
					user,
					scope: bound(project.id),
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
			scope: bound(otherProject.id),
			cursor: null,
		});

		expect(built).toBeNull();
	});

	it('leaves evaluation runs out of the block', async () => {
		const workflow = await createWorkflow({ name: 'Lead enrichment' }, project);
		await createExecution({ status: 'error', mode: 'evaluation', stoppedAt: recently() }, workflow);

		const built = await service.buildBlock({
			user,
			scope: bound(project.id),
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
		const [newest] = await activity.findFeed({ projectIds: [project.id], limit: 1 });

		const expansion = await service.expand({ id: newest.id, user, scope: bound(project.id) });

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

		expect(
			await service.buildBlock({ user, scope: { surface: 'conversation' }, cursor: null }),
		).toBeNull();
	});

	/**
	 * The MCP surface reads without a conversation to bind to, and under the per-workflow
	 * visibility rule the rest of that surface already enforces. Both are read from real rows:
	 * `availableInMCP` lives inside the workflow `settings` JSON column, and a mocked repository
	 * would report the filter working whatever that column actually holds.
	 */
	describe('the MCP surface', () => {
		const mcp = (credentialGranted = true): InstanceContextScope => ({
			surface: 'mcp',
			credentialGranted,
		});

		it('reads the projects the caller can open and not the ones they cannot', async () => {
			const mine = await createWorkflow(
				{ name: 'Mine', settings: { availableInMCP: true } },
				project,
			);
			const theirs = await createWorkflow(
				{ name: 'Theirs', settings: { availableInMCP: true } },
				otherProject,
			);
			await record({
				category: 'workflow',
				action: 'saved',
				projectId: project.id,
				resourceType: 'workflow',
				resourceId: mine.id,
				resourceName: mine.name,
			});
			await record({
				category: 'workflow',
				action: 'saved',
				projectId: otherProject.id,
				resourceType: 'workflow',
				resourceId: theirs.id,
				resourceName: theirs.name,
			});

			const entries = await service.list({ user, scope: mcp(), limit: 20 });

			expect(entries.map((entry) => entry.resourceId)).toEqual([mine.id]);
		});

		it('does not report a workflow the instance withholds from MCP', async () => {
			const visible = await createWorkflow(
				{ name: 'Visible', settings: { availableInMCP: true } },
				project,
			);
			// Withheld is the default: no `availableInMCP` at all reads as not available.
			const withheld = await createWorkflow({ name: 'Withheld' }, project);

			for (const workflow of [visible, withheld]) {
				await record({
					category: 'workflow',
					action: 'saved',
					projectId: project.id,
					resourceType: 'workflow',
					resourceId: workflow.id,
					resourceName: workflow.name,
				});
			}

			const entries = await service.list({ user, scope: mcp(), limit: 20 });

			expect(entries.map((entry) => entry.resourceId)).toEqual([visible.id]);
		});

		/**
		 * The inventory and run legs are aggregates. Filtering their rows after the query would
		 * leave a total that still counts what the caller cannot see, so the filter has to be in
		 * the SQL — which only a real database can prove.
		 */
		it('counts only visible workflows in the opening block, not just lists them', async () => {
			const visible = await createWorkflow(
				{ name: 'Visible', settings: { availableInMCP: true } },
				project,
			);
			await createWorkflow({ name: 'Withheld one' }, project);
			await createWorkflow({ name: 'Withheld two' }, project);
			await createExecution({ status: 'error', stoppedAt: recently() }, visible);

			const built = await service.buildBlock({ user, scope: mcp(), cursor: null });

			expect(built?.block).toContain('Workflows that already exist here: 1');
			expect(built?.block).toContain('Visible');
			expect(built?.block).not.toContain('Withheld');
		});

		it('leaves a withheld workflow out of the run counts', async () => {
			const withheld = await createWorkflow({ name: 'Nightly sync' }, project);
			await createExecution({ status: 'error', stoppedAt: recently() }, withheld);

			const built = await service.buildBlock({ user, scope: mcp(), cursor: null });

			expect(built?.block ?? '').not.toContain('Nightly sync');
		});

		/**
		 * A chat turn has no error channel so it degrades to no block, but an MCP caller reads an
		 * empty answer as "nothing exists here yet" — the two must not look the same.
		 */
		it('throws on a failed read instead of answering as though the instance were empty', async () => {
			const spy = vi
				.spyOn(activity, 'findFeed')
				.mockRejectedValueOnce(new Error('db is down'))
				.mockRejectedValueOnce(new Error('db is down'));

			try {
				await expect(service.buildBlock({ user, scope: mcp(), cursor: null })).rejects.toThrow(
					'db is down',
				);

				await expect(
					service.buildBlock({ user, scope: bound(project.id), cursor: null }),
				).resolves.toBeNull();
			} finally {
				spy.mockRestore();
			}
		});

		/**
		 * Every other MCP read refuses an archived workflow before it looks at the setting, so the
		 * feed must not be the one door that reports its history.
		 */
		it('treats an archived workflow as withheld even when it is marked available', async () => {
			const archived = await createWorkflow(
				{ name: 'Archived', isArchived: true, settings: { availableInMCP: true } },
				project,
			);
			await record({
				category: 'workflow',
				action: 'saved',
				projectId: project.id,
				resourceType: 'workflow',
				resourceId: archived.id,
				resourceName: archived.name,
			});

			expect(await service.list({ user, scope: mcp(), limit: 20 })).toEqual([]);
		});

		/** A deleted workflow cannot be withheld from anything, and the deletion is the point. */
		it('still reports the deletion of a workflow that no longer exists', async () => {
			await record({
				category: 'workflow',
				action: 'deleted',
				projectId: project.id,
				resourceType: 'workflow',
				resourceId: 'wf-long-gone',
				resourceName: 'Nightly sync',
			});

			const entries = await service.list({ user, scope: mcp(), limit: 20 });

			expect(entries.map((entry) => entry.action)).toEqual(['deleted']);
		});

		it('answers a withheld id exactly as it answers a pruned one', async () => {
			const withheld = await createWorkflow({ name: 'Withheld' }, project);
			await record({
				category: 'workflow',
				action: 'saved',
				projectId: project.id,
				resourceType: 'workflow',
				resourceId: withheld.id,
				resourceName: withheld.name,
			});
			const [entry] = await activity.findFeed({ projectIds: [project.id], limit: 1 });

			expect(await service.expand({ id: entry.id, user, scope: mcp() })).toBeNull();
			expect(await service.expand({ id: entry.id + 5_000, user, scope: mcp() })).toBeNull();
		});

		/** The two surfaces do not share tool names, so the hint must be named for its caller. */
		it('names the live record in MCP tool vocabulary, not Instance AI vocabulary', async () => {
			const workflow = await createWorkflow(
				{ name: 'Lead enrichment', settings: { availableInMCP: true } },
				project,
			);
			await record({
				category: 'workflow',
				action: 'saved',
				projectId: project.id,
				resourceType: 'workflow',
				resourceId: workflow.id,
				resourceName: workflow.name,
			});
			const [entry] = await activity.findFeed({ projectIds: [project.id], limit: 1 });

			const viaMcp = await service.expand({ id: entry.id, user, scope: mcp() });
			const viaChat = await service.expand({ id: entry.id, user, scope: bound(project.id) });

			expect(viaMcp?.liveRecordHint).toBe(`get_workflow_details(workflowId="${workflow.id}")`);
			expect(viaChat?.liveRecordHint).toBe(`workflows(action="get", workflowId="${workflow.id}")`);
		});

		it('reads no credential history for a caller without the credential grant', async () => {
			await record({
				category: 'credential',
				action: 'created',
				projectId: project.id,
				resourceType: 'credential',
				resourceId: 'cred-1',
				resourceName: 'Slack account',
			});

			expect(await service.list({ user, scope: mcp(false), limit: 20 })).toEqual([]);
			expect(await service.list({ user, scope: mcp(), limit: 20 })).toHaveLength(1);
		});
	});
});
