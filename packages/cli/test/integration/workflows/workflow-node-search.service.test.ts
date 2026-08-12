import { createWorkflow, getPersonalProject, testDb } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { STICKY_NODE_TYPE } from 'n8n-workflow';

import { WorkflowNodeSearchService } from '@/workflows/workflow-node-search.service';

import { createMember, createOwner } from '../shared/db/users';

const node = (name: string, overrides: Record<string, unknown> = {}) => ({
	id: `id-${name}`,
	name,
	type: 'n8n-nodes-base.noOp',
	typeVersion: 1,
	position: [0, 0] as [number, number],
	parameters: {},
	...overrides,
});

describe('WorkflowNodeSearchService', () => {
	let service: WorkflowNodeSearchService;

	beforeAll(async () => {
		await testDb.init();
		service = Container.get(WorkflowNodeSearchService);
	});

	beforeEach(async () => {
		await testDb.truncate([
			'SharedWorkflow',
			'ProjectRelation',
			'WorkflowEntity',
			'Project',
			'User',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('returns node hits enriched with the owning project name', async () => {
		// ARRANGE
		const member = await createMember();
		const project = await getPersonalProject(member);
		await createWorkflow({ name: 'Alerting', nodes: [node('Send Slack Alert')] }, member);

		// ACT
		const results = await service.search(member, 'slack');

		// ASSERT
		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({
			workflowName: 'Alerting',
			nodeName: 'Send Slack Alert',
			nodeType: 'n8n-nodes-base.noOp',
			projectName: project.name,
			isArchived: false,
			disabled: false,
			isSticky: false,
		});
		// Guards the `select: { ownedBy: true }` relation silently dropping out.
		expect(results[0].projectName).not.toBe('');
	});

	// Parity with in-editor cmd+k, which also matches on node type.
	it('matches on node type even when the node was renamed', async () => {
		// ARRANGE
		const member = await createMember();
		await createWorkflow(
			{ name: 'CRM', nodes: [node('Notify team', { type: 'n8n-nodes-base.slack' })] },
			member,
		);

		// ACT
		const results = await service.search(member, 'slack');

		// ASSERT
		expect(results).toHaveLength(1);
		expect(results[0].nodeType).toBe('n8n-nodes-base.slack');
	});

	it('excludes workflows the user cannot read', async () => {
		// ARRANGE
		const owner = await createOwner();
		const member = await createMember();
		await createWorkflow({ name: 'Private', nodes: [node('Send Slack Alert')] }, owner);

		// ACT & ASSERT
		expect(await service.search(member, 'slack')).toEqual([]);
		expect(await service.search(owner, 'slack')).toHaveLength(1);
	});

	// "every workflow the user can read" includes other people's workflows for
	// users holding the global workflow:read scope.
	it('searches across other users workflows for a global-scope user', async () => {
		// ARRANGE
		const owner = await createOwner();
		const member = await createMember();
		await createWorkflow({ name: 'Members own', nodes: [node('Send Slack Alert')] }, member);

		// ACT
		const results = await service.search(owner, 'slack');

		// ASSERT
		expect(results).toHaveLength(1);
		expect(results[0].workflowName).toBe('Members own');
	});

	// The per-user rate limit cannot bound load on a shared database: 20 users
	// each staying within their own limit measured 66x list-query degradation
	// before the process-wide cap existed. See test/performance/node-search.perf.ts.
	it('sheds load once the concurrency cap and its queue are full', async () => {
		// ARRANGE
		const member = await createMember();
		await createWorkflow({ name: 'Alerting', nodes: [node('Send Slack Alert')] }, member);

		// ACT — fire more than (max concurrent + max queued) at once. The guard is
		// evaluated synchronously before the limiter awaits, so this is deterministic.
		const outcomes = await Promise.allSettled(
			Array.from({ length: 10 }, async () => await service.search(member, 'slack')),
		);

		// ASSERT
		const rejected = outcomes.filter((o) => o.status === 'rejected');
		const fulfilled = outcomes.filter((o) => o.status === 'fulfilled');
		expect(rejected.length).toBeGreaterThan(0);
		expect(fulfilled.length).toBeGreaterThan(0);
		expect(rejected[0].reason).toMatchObject({ httpStatusCode: 429 });

		// The cap must not wedge the service: later calls succeed normally.
		expect(await service.search(member, 'slack')).toHaveLength(1);
	});

	it('matches parameter values and returns a sticky preview around the match', async () => {
		// ARRANGE
		const member = await createMember();
		const content = `${'x'.repeat(100)} findme ${'y'.repeat(100)}`;
		await createWorkflow(
			{
				name: 'Notes',
				nodes: [node('Note', { type: STICKY_NODE_TYPE, parameters: { content } })],
			},
			member,
		);

		// ACT
		const results = await service.search(member, 'findme');

		// ASSERT
		expect(results).toHaveLength(1);
		expect(results[0].isSticky).toBe(true);
		expect(results[0].stickyPreview).toContain('findme');
		expect(results[0].stickyPreview!.length).toBeLessThanOrEqual(200);
	});
});
