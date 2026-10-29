import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	shareWorkflowWithProjects,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { generateNanoId, WorkflowRepository, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { WorkflowIndexService } from '@/modules/workflow-index/workflow-index.service';
import { createAdmin, createMember } from '@test-integration/db/users';

import { SubWorkflowDiscoveryService } from '../sub-workflow-discovery.service';

let discovery: SubWorkflowDiscoveryService;
let index: WorkflowIndexService;
let user: User;
let project: Project;

beforeAll(async () => {
	await testModules.loadModules(['instance-ai']);
	await testDb.init();
	discovery = Container.get(SubWorkflowDiscoveryService);
	index = Container.get(WorkflowIndexService);
});

beforeEach(async () => {
	user = await createMember();
	project = await createTeamProject(undefined, user);
});

afterAll(async () => {
	await testDb.terminate();
});

function node(type: string, parameters: INode['parameters'], extra: Partial<INode> = {}): INode {
	return {
		id: randomUUID(),
		name: randomUUID(),
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters,
		...extra,
	};
}

const call = (workflowId: string, extra: Partial<INode> = {}) =>
	node(
		'n8n-nodes-base.executeWorkflow',
		{ workflowId: { __rl: true, mode: 'id', value: workflowId } },
		extra,
	);

async function publish(nodes: INode[], owner = project, id = generateNanoId()) {
	const workflow = await createActiveWorkflow({ id, name: `Workflow ${id}`, nodes }, owner);
	await index.updateIndexForPublished(workflow, workflow.activeVersionId!, nodes);
	return workflow;
}

const ids = (result: Awaited<ReturnType<SubWorkflowDiscoveryService['discover']>>) =>
	result.subWorkflows.map(({ id }) => id).sort();

describe('SubWorkflowDiscoveryService', () => {
	it('includes nested sub-workflows, not only direct ones', async () => {
		const grandchild = await publish([]);
		const child = await publish([call(grandchild.id)]);
		const root = await publish([call(child.id)]);

		const result = await discovery.discover(user, project.id, [root.id]);

		expect(result).toEqual({
			subWorkflows: [
				{ id: child.id, name: child.name, published: true },
				{ id: grandchild.id, name: grandchild.name, published: true },
			],
			excluded: { inaccessible: 0, otherProject: 0 },
		});
	});

	it('reports a shared sub-workflow once and stops at cycles', async () => {
		const rootId = generateNanoId();
		const firstId = generateNanoId();
		const shared = await publish([call(firstId), call(rootId)]);
		await publish([call(shared.id)], project, firstId);
		const second = await publish([call(shared.id)]);
		const root = await publish([call(firstId), call(second.id), call(rootId)], project, rootId);

		const result = await discovery.discover(user, project.id, [root.id]);

		expect(ids(result)).toEqual([firstId, second.id, shared.id].sort());
	});

	it('does not list a selected workflow as a sub-workflow of another selected workflow', async () => {
		const child = await publish([]);
		const root = await publish([call(child.id)]);

		const result = await discovery.discover(user, project.id, [root.id, child.id]);

		expect(result.subWorkflows).toEqual([]);
	});

	it('follows Workflow Tool and Workflow Retriever references', async () => {
		const tool = await publish([]);
		const retriever = await publish([]);
		const root = await publish([
			node('@n8n/n8n-nodes-langchain.toolWorkflow', {
				source: 'database',
				workflowId: { __rl: true, mode: 'list', value: tool.id },
			}),
			node('@n8n/n8n-nodes-langchain.retrieverWorkflow', {
				source: 'database',
				workflowId: retriever.id,
			}),
		]);

		const result = await discovery.discover(user, project.id, [root.id]);

		expect(ids(result)).toEqual([tool.id, retriever.id].sort());
	});

	it('ignores references that resolve only at runtime', async () => {
		const root = await publish([
			node('n8n-nodes-base.executeWorkflow', {
				workflowId: { __rl: true, mode: 'id', value: '={{ $json.workflowId }}' },
			}),
			node('n8n-nodes-base.executeWorkflow', { source: 'parameter', workflowJson: '{}' }),
		]);

		const result = await discovery.discover(user, project.id, [root.id]);

		expect(result).toEqual({ subWorkflows: [], excluded: { inaccessible: 0, otherProject: 0 } });
	});

	it('follows references in disabled nodes', async () => {
		const child = await publish([]);
		const root = await publish([call(child.id, { disabled: true })]);

		const result = await discovery.discover(user, project.id, [root.id]);

		expect(ids(result)).toEqual([child.id]);
	});

	it('follows published content and ignores unpublished draft changes', async () => {
		const publishedChild = await publish([]);
		const draftChild = await publish([]);
		const root = await publish([call(publishedChild.id)]);
		const draftNodes = [call(draftChild.id)];
		await Container.get(WorkflowRepository).update(root.id, { nodes: draftNodes });
		await index.updateIndexForDraft({ ...root, nodes: draftNodes });

		const result = await discovery.discover(user, project.id, [root.id]);

		expect(ids(result)).toEqual([publishedChild.id]);
	});

	it('lists unpublished and archived sub-workflows without following their references', async () => {
		const hidden = await publish([]);
		const unpublished = await createWorkflow({ nodes: [call(hidden.id)] }, project);
		await index.updateIndexForDraft(unpublished);
		const archived = await publish([call(hidden.id)]);
		await Container.get(WorkflowRepository).update(archived.id, {
			isArchived: true,
			activeVersionId: null,
		});
		const root = await publish([call(unpublished.id), call(archived.id)]);

		const result = await discovery.discover(user, project.id, [root.id]);

		expect(result.subWorkflows).toEqual(
			expect.arrayContaining([
				{ id: unpublished.id, name: unpublished.name, published: false },
				{ id: archived.id, name: archived.name, published: false },
			]),
		);
		expect(ids(result)).not.toContain(hidden.id);
	});

	it('stops at inaccessible workflows and reports only their count', async () => {
		const otherProject = await createTeamProject();
		const behind = await publish([], otherProject);
		const inaccessible = await publish([call(behind.id)], otherProject);
		const root = await publish([call(inaccessible.id), call(generateNanoId())]);

		const result = await discovery.discover(user, project.id, [root.id]);

		expect(result).toEqual({
			subWorkflows: [],
			excluded: { inaccessible: 2, otherProject: 0 },
		});
	});

	it('stops at accessible workflows from another project', async () => {
		const accessibleProject = await createTeamProject(undefined, user);
		const behind = await publish([], accessibleProject);
		const elsewhere = await publish([call(behind.id)], accessibleProject);
		const sharedIn = await publish([], await createTeamProject());
		await shareWorkflowWithProjects(sharedIn, [{ project }]);
		const root = await publish([call(elsewhere.id), call(sharedIn.id)]);

		const result = await discovery.discover(user, project.id, [root.id]);

		expect(result).toEqual({
			subWorkflows: [],
			excluded: { inaccessible: 0, otherProject: 2 },
		});
	});

	it('treats a sub-workflow without edit access as inaccessible', async () => {
		const viewedProject = await createTeamProject();
		await linkUserToProject(user, viewedProject, 'project:viewer');
		const child = await publish([], viewedProject);
		const root = await publish([call(child.id)]);

		const result = await discovery.discover(user, project.id, [root.id]);

		expect(result).toEqual({
			subWorkflows: [],
			excluded: { inaccessible: 1, otherProject: 0 },
		});
	});

	it('uses global access for instance admins', async () => {
		const admin = await createAdmin();
		const child = await publish([]);
		const root = await publish([call(child.id)]);

		const result = await discovery.discover(admin, project.id, [root.id]);

		expect(ids(result)).toEqual([child.id]);
	});
});
