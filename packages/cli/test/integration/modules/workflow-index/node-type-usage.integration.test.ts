import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import { LicenseState } from '@n8n/backend-common';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';

import { WorkflowDependencyQueryService } from '@/modules/workflow-index/workflow-dependency-query.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createMember, createOwner } from '../../shared/db/users';
import { LicenseMocker } from '../../shared/license';

const ANTHROPIC = '@n8n/n8n-nodes-langchain.lmChatAnthropic';
const SLACK = 'n8n-nodes-base.slack';

/**
 * The repository tests pass role slugs in directly. This one goes through the service, so the
 * scopes-to-roles step runs for real — if `workflow:read` ever stopped mapping to the roles the
 * scope subquery matches on, the aggregate would silently return nothing and only this would catch it.
 */
describe('WorkflowDependencyQueryService.getNodeTypeUsage', () => {
	let service: WorkflowDependencyQueryService;
	let workflowService: WorkflowService;

	beforeAll(async () => {
		await testDb.init();
		service = Container.get(WorkflowDependencyQueryService);
		workflowService = Container.get(WorkflowService);
		// `WorkflowService.getMany` reads the license to decide on the resolvable-credentials flag,
		// and throws without a provider set.
		new LicenseMocker().mockLicenseState(Container.get(LicenseState));
	});

	beforeEach(async () => {
		await testDb.truncate([
			'WorkflowDependency',
			'SharedWorkflow',
			'WorkflowEntity',
			'ProjectRelation',
			'Project',
			'User',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const seedWorkflow = async (project: Project, nodeTypes: string[], name?: string) =>
		await createWorkflow(
			{
				...(name ? { name } : {}),
				nodes: nodeTypes.map((type, index) => ({
					id: `node-${index}-${type}`,
					name: `${type}-${index}`,
					parameters: {},
					position: [0, 0] as [number, number],
					type,
					typeVersion: 1,
				})),
			},
			project,
		);

	it('resolves real roles and returns the histogram for the projects a member belongs to', async () => {
		const member = await createMember();
		const theirs = await createTeamProject('theirs');
		await linkUserToProject(member, theirs, 'project:editor');
		const someoneElses = await createTeamProject('someone-elses');

		await seedWorkflow(theirs, [ANTHROPIC]);
		await seedWorkflow(theirs, [ANTHROPIC, SLACK]);
		await seedWorkflow(someoneElses, [SLACK]);

		const result = await service.getNodeTypeUsage(member);

		expect(result.workflowsInScope).toBe(2);
		expect(result.nodeTypes).toEqual([
			{ nodeType: ANTHROPIC, workflowCount: 2 },
			{ nodeType: SLACK, workflowCount: 1 },
		]);
		expect(result.workflows).toBeUndefined();
	});

	it('names the workflows using a type, with the denominator', async () => {
		const member = await createMember();
		const project = await createTeamProject('project');
		await linkUserToProject(member, project, 'project:editor');

		await seedWorkflow(project, [ANTHROPIC], 'uses anthropic');
		await seedWorkflow(project, [SLACK], 'uses slack');

		const result = await service.getNodeTypeUsage(member, { nodeType: ANTHROPIC });

		expect(result.workflowsInScope).toBe(2);
		expect(result.workflows?.map((workflow) => workflow.name)).toEqual(['uses anthropic']);
		expect(result.nodeTypes).toBeUndefined();
		expect(result.truncated).toBeUndefined();
	});

	it('reports truncation when more workflows use the type than the limit allows', async () => {
		const member = await createMember();
		const project = await createTeamProject('project');
		await linkUserToProject(member, project, 'project:editor');

		await seedWorkflow(project, [SLACK]);
		await seedWorkflow(project, [SLACK]);
		await seedWorkflow(project, [SLACK]);

		const result = await service.getNodeTypeUsage(member, { nodeType: SLACK, limit: 2 });

		expect(result.workflows).toHaveLength(2);
		expect(result.truncated).toBe(true);
	});

	// The `nodeTypes` filter on `list` resolves through `applyNodeTypesFilter`, which had no test
	// anywhere before this. Asserting the adapter forwards the option proves nothing about whether
	// the listing actually narrows, so assert the returned set.
	describe('nodeTypes filter on the workflow listing', () => {
		it('returns only workflows containing one of the given node types', async () => {
			const member = await createMember();
			const project = await createTeamProject('project');
			await linkUserToProject(member, project, 'project:editor');

			await seedWorkflow(project, [ANTHROPIC], 'has anthropic');
			await seedWorkflow(project, [ANTHROPIC, SLACK], 'has both');
			await seedWorkflow(project, [SLACK], 'has slack');

			const { workflows, count } = await workflowService.getMany(member, {
				filter: { nodeTypes: [ANTHROPIC] },
			});

			expect(count).toBe(2);
			expect(workflows.map((workflow) => workflow.name).sort()).toEqual([
				'has anthropic',
				'has both',
			]);
		});

		it('matches a workflow that holds any one of several requested types', async () => {
			const member = await createMember();
			const project = await createTeamProject('project');
			await linkUserToProject(member, project, 'project:editor');

			await seedWorkflow(project, [ANTHROPIC], 'anthropic only');
			await seedWorkflow(project, [SLACK], 'slack only');
			await seedWorkflow(project, ['n8n-nodes-base.noOp'], 'neither');

			const { count } = await workflowService.getMany(member, {
				filter: { nodeTypes: [ANTHROPIC, SLACK] },
			});

			expect(count).toBe(2);
		});

		it('cannot reach a workflow the user has no access to', async () => {
			const member = await createMember();
			const theirs = await createTeamProject('theirs');
			await linkUserToProject(member, theirs, 'project:editor');
			const someoneElses = await createTeamProject('someone-elses');

			await seedWorkflow(theirs, [ANTHROPIC], 'mine');
			await seedWorkflow(someoneElses, [ANTHROPIC], 'not mine');

			const { workflows, count } = await workflowService.getMany(member, {
				filter: { nodeTypes: [ANTHROPIC] },
			});

			expect(count).toBe(1);
			expect(workflows.map((workflow) => workflow.name)).toEqual(['mine']);
		});
	});

	it('narrows to one project when asked', async () => {
		const owner = await createOwner();
		const first = await createTeamProject('first');
		const second = await createTeamProject('second');

		await seedWorkflow(first, [ANTHROPIC]);
		await seedWorkflow(second, [SLACK]);

		const everything = await service.getNodeTypeUsage(owner);
		const narrowed = await service.getNodeTypeUsage(owner, { projectId: first.id });

		expect(everything.workflowsInScope).toBe(2);
		expect(narrowed.workflowsInScope).toBe(1);
		expect(narrowed.nodeTypes).toEqual([{ nodeType: ANTHROPIC, workflowCount: 1 }]);
	});
});
