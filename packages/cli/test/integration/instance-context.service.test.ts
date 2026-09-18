import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ActivityEventRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import type { InstanceContextScope } from '@/modules/instance-ai/instance-context.service';
import { InstanceContextService } from '@/modules/instance-ai/instance-context.service';
import type {
	InstanceContextCursor,
	InstanceContextResult,
} from '@/modules/instance-ai/instance-context.service';

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

	/** Reads an injected result's block, asserting the state on the way through. */
	function blockOf(result: InstanceContextResult): string {
		expect(result.state).toBe('injected');
		if (result.state !== 'injected') throw new Error('expected an injected block');
		return result.block;
	}

	/** The bracketed entry ids a block rendered, newest first — the ids every tool takes. */
	function shownIds(block: string): number[] {
		return [...block.matchAll(/^\[(\d+)\]/gm)].map((match) => Number(match[1]));
	}

	function cursorOf(result: InstanceContextResult): InstanceContextCursor {
		expect(result.state).toBe('injected');
		if (result.state !== 'injected') throw new Error('expected an injected block');
		return result.cursor;
	}

	beforeAll(async () => {
		await testDb.init();
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
			enabled: true,
			user,
			scope: bound(project.id),
			cursor: null,
		});

		expect(blockOf(built)).toContain('Workflows that already exist here: 1');
		expect(blockOf(built)).toContain(
			'"Lead enrichment" (workflow:' + workflow.id + ') [published]',
		);
		expect(blockOf(built)).toContain('ran 1×, 1 failed');
		expect(blockOf(built)).toContain('+1 slack');
	});

	it('builds nothing with the reader disabled', async () => {
		await createWorkflow({ name: 'Lead enrichment' }, project);

		expect(
			await service.buildBlock({ enabled: false, user, scope: bound(project.id), cursor: null }),
		).toMatchObject({ state: 'absent', reason: 'disabled' });
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
				enabled: true,
				user,
				scope: bound(project.id),
				cursor: null,
			});

			expect(blockOf(built)).toContain('Ours');
			expect(blockOf(built)).not.toContain('Their secret plan');
			expect(blockOf(built)).not.toContain('Their deleted workflow');
			expect(blockOf(built)).toContain('Workflows that already exist here: 1');
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
			expect(await service.expand({ id: entry.id, user, scope: bound(project.id) })).toBeNull();
			// A pruned id answers identically, so the tool cannot probe for existence.
			expect(
				await service.expand({ id: entry.id + 5_000, user, scope: bound(project.id) }),
			).toBeNull();
		});
	});

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
				enabled: true,
				user,
				scope: bound(project.id),
				cursor: {
					activityMark: newest.id,
					activityFloor: 0,
					activityCategories: ['workflow', 'credential'],
					activitySeen: [newest.id],
					runsThrough: new Date().toISOString(),
				},
			});

			expect(blockOf(delta)).toContain('Committed late');
			expect(blockOf(delta)).toContain('Also late');
			// The one the mark accounted for is not repeated.
			expect(blockOf(delta)).not.toContain('Seen already');
		});

		// Later turns must not report entries removed by the opening window limit.
		it('does not re-offer the entries a full window already cut', async () => {
			const backlog = 90;
			for (let i = 1; i <= backlog; i++) {
				await record({
					category: 'workflow',
					action: 'created',
					projectId: project.id,
					resourceType: 'workflow',
					resourceId: `wf-${i}`,
					resourceName: `Workflow ${i}`,
				});
			}

			const opening = await service.buildBlock({
				enabled: true,
				user,
				scope: bound(project.id),
				cursor: null,
			});
			// The window's worth, newest first, and it says there is more behind it.
			expect(shownIds(blockOf(opening))).toHaveLength(40);
			expect(blockOf(opening)).toContain('and more than these');

			const next = await service.buildBlock({
				enabled: true,
				user,
				scope: bound(project.id),
				cursor: cursorOf(opening),
			});

			// Nothing happened in between, so there is nothing to add — not the next forty down.
			expect(next).toMatchObject({ state: 'absent', reason: 'empty' });
		});

		// Omit one real row from the cursor. Explicit IDs behave differently across database drivers.
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
			// Newest first, so index 0 is the high-water mark.
			const seeded = await activity.findFeed({
				projectIds: [project.id],
				allowedCategories: ['workflow', 'credential'],
				limit: 50,
			});
			const straggler = seeded[5];
			const floor = seeded[10];

			const delta = await service.buildBlock({
				enabled: true,
				user,
				scope: bound(project.id),
				cursor: {
					activityMark: seeded[0].id,
					activityFloor: floor.id,
					activityCategories: ['workflow', 'credential'],
					// Every row above the floor is accounted for except the straggler.
					activitySeen: seeded
						.slice(0, 10)
						.map((row) => row.id)
						.filter((id) => id !== straggler.id),
					runsThrough: new Date().toISOString(),
				},
			});

			// Only the straggler: the rows below the floor were cut and must not come back.
			expect(shownIds(blockOf(delta))).toEqual([straggler.id]);
			expect(blockOf(delta)).toContain(straggler.resourceName);
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
				enabled: true,
				user,
				scope: bound(project.id),
				cursor: null,
			});
			const firstCursor = cursorOf(first);
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
				enabled: true,
				user,
				scope: bound(project.id),
				cursor: firstCursor,
			});

			expect(blockOf(delta)).toContain('Slack account');
			expect(blockOf(delta)).toContain('since the list earlier in this conversation');
			expect(blockOf(delta)).not.toContain('Workflows that already exist here');
		});

		it('builds nothing when nothing has happened since the last block', async () => {
			await createWorkflow({ name: 'Lead enrichment' }, project);

			const opening = await service.buildBlock({
				enabled: true,
				user,
				scope: bound(project.id),
				cursor: null,
			});

			expect(
				await service.buildBlock({
					enabled: true,
					user,
					scope: bound(project.id),
					cursor: cursorOf(opening),
				}),
			).toMatchObject({ state: 'absent', reason: 'empty' });
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
			enabled: true,
			user,
			scope: bound(otherProject.id),
			cursor: null,
		});

		// An unreadable project must give the same result as an empty project.
		expect(built).toMatchObject({ state: 'absent', reason: 'empty' });
	});

	it('leaves evaluation runs out of the block', async () => {
		const workflow = await createWorkflow({ name: 'Lead enrichment' }, project);
		await createExecution({ status: 'error', mode: 'evaluation', stoppedAt: recently() }, workflow);

		const built = await service.buildBlock({
			enabled: true,
			user,
			scope: bound(project.id),
			cursor: null,
		});

		expect(blockOf(built)).not.toContain('ran ');
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
			await service.buildBlock({
				enabled: true,
				user,
				scope: { surface: 'conversation' },
				cursor: null,
			}),
		).toMatchObject({ state: 'absent', reason: 'empty' });
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
			executionGranted: true,
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

			const built = await service.buildBlock({ enabled: true, user, scope: mcp(), cursor: null });

			expect(blockOf(built)).toContain('Workflows that already exist here: 1');
			expect(blockOf(built)).toContain('Visible');
			expect(blockOf(built)).not.toContain('Withheld');
		});

		it('leaves a withheld workflow out of the run counts', async () => {
			const withheld = await createWorkflow({ name: 'Nightly sync' }, project);
			await createExecution({ status: 'error', stoppedAt: recently() }, withheld);

			const built = await service.buildBlock({ enabled: true, user, scope: mcp(), cursor: null });

			expect(built).toMatchObject({ state: 'absent', reason: 'empty' });
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
				await expect(
					service.buildBlock({ enabled: true, user, scope: mcp(), cursor: null }),
				).rejects.toThrow('db is down');

				await expect(
					service.buildBlock({ enabled: true, user, scope: bound(project.id), cursor: null }),
				).resolves.toMatchObject({ state: 'absent', reason: 'failed' });
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

		/**
		 * A deleted workflow keeps its deletion and loses the rest: the setting that withheld it
		 * is gone with the row, so releasing its earlier history would undo that setting after
		 * the fact.
		 */
		it('keeps only the deletion for a workflow that no longer exists', async () => {
			for (const action of ['created', 'saved', 'deleted']) {
				await record({
					category: 'workflow',
					action,
					projectId: project.id,
					resourceType: 'workflow',
					resourceId: 'wf-long-gone',
					resourceName: 'Nightly sync',
				});
			}

			const viaMcp = await service.list({ user, scope: mcp(), limit: 20 });
			expect(viaMcp.map((entry) => entry.action)).toEqual(['deleted']);

			// The conversation surface has no per-workflow visibility rule, so it sees them all.
			const viaChat = await service.list({ user, scope: bound(project.id), limit: 20 });
			expect(viaChat).toHaveLength(3);
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
			const [entry] = await activity.findFeed({
				projectIds: [project.id],
				allowedCategories: ['workflow', 'credential'],
				limit: 1,
			});

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
			const [entry] = await activity.findFeed({
				projectIds: [project.id],
				allowedCategories: ['workflow', 'credential'],
				limit: 1,
			});

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

	/**
	 * The MCP surface reads without a conversation to bind to, and under the per-workflow
	 * visibility rule the rest of that surface already enforces. Both are read from real rows:
	 * `availableInMCP` lives inside the workflow `settings` JSON column, and a mocked repository
	 * would report the filter working whatever that column actually holds.
	 */
	describe('the MCP surface', () => {
		const mcp = (credentialGranted = true, executionGranted = true): InstanceContextScope => ({
			surface: 'mcp',
			credentialGranted,
			executionGranted,
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
			const [entry] = await activity.findFeed({
				projectIds: [project.id],
				allowedCategories: ['workflow', 'credential'],
				limit: 1,
			});

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
			const [entry] = await activity.findFeed({
				projectIds: [project.id],
				allowedCategories: ['workflow', 'credential'],
				limit: 1,
			});

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

	it('does not repeat stored activity after the seen-id limit is reached', async () => {
		let cursor: InstanceContextCursor | null = null;
		for (let batch = 0; batch < 7; batch++) {
			for (let index = 0; index < 30; index++) {
				await record({
					category: 'workflow',
					action: 'saved',
					projectId: project.id,
					resourceName: `Batch ${batch}`,
				});
			}
			const built = await service.buildBlock({
				enabled: true,
				user,
				scope: bound(project.id),
				cursor,
			});
			expect(blockOf(built).match(/^\[\d+\]/gm)).toHaveLength(30);
			cursor = cursorOf(built);
		}
		for (let turn = 0; turn < 2; turn++) {
			expect(
				await service.buildBlock({ enabled: true, user, scope: bound(project.id), cursor }),
			).toMatchObject({ state: 'absent', reason: 'empty' });
		}
	});
});
