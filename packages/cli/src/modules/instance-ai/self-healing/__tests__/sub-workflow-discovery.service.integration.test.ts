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

type PublishOptions = { owner?: Project; id?: string; name?: string };

async function publish(
	nodes: INode[],
	{ owner = project, id = generateNanoId(), name = `Workflow ${id}` }: PublishOptions = {},
) {
	const workflow = await createActiveWorkflow({ id, name, nodes }, owner);
	await index.updateIndexForPublished(workflow, workflow.activeVersionId!, nodes);
	return workflow;
}

async function discover(rootId: string, actor = user) {
	const result = await discovery.discover(actor, project.id, [rootId]);
	return result[rootId];
}

const ids = ({ subWorkflows }: { subWorkflows: Array<{ id: string }> }) =>
	subWorkflows.map(({ id }) => id).sort();

describe('SubWorkflowDiscoveryService', () => {
	it('includes nested sub-workflows, nearest first', async () => {
		const grandchild = await publish([], { name: 'A grandchild' });
		const child = await publish([call(grandchild.id)], { name: 'B child' });
		const root = await publish([call(child.id)]);

		expect(await discover(root.id)).toEqual({
			subWorkflows: [
				{ id: child.id, name: child.name, otherProject: false },
				{ id: grandchild.id, name: grandchild.name, otherProject: false },
			],
			inaccessible: 0,
		});
	});

	it('reports a shared sub-workflow once and stops at cycles', async () => {
		const rootId = generateNanoId();
		const firstId = generateNanoId();
		const shared = await publish([call(firstId), call(rootId)]);
		await publish([call(shared.id)], { id: firstId });
		const second = await publish([call(shared.id)]);
		const root = await publish([call(firstId), call(second.id), call(rootId)], { id: rootId });

		expect(ids(await discover(root.id))).toEqual([firstId, second.id, shared.id].sort());
	});

	it('returns the sub-workflows of each selected workflow separately', async () => {
		const shared = await publish([]);
		const onlyFirst = await publish([]);
		const second = await publish([call(shared.id)]);
		const first = await publish([call(shared.id), call(onlyFirst.id), call(second.id)]);
		const missing = generateNanoId();

		const result = await discovery.discover(user, project.id, [first.id, second.id, missing]);

		expect(Object.keys(result).sort()).toEqual([first.id, second.id, missing].sort());
		expect(ids(result[first.id])).toEqual([shared.id, onlyFirst.id, second.id].sort());
		expect(ids(result[second.id])).toEqual([shared.id]);
		expect(result[missing]).toEqual({ subWorkflows: [], inaccessible: 0 });
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

		expect(ids(await discover(root.id))).toEqual([tool.id, retriever.id].sort());
	});

	it('ignores references that resolve only at runtime', async () => {
		const root = await publish([
			node('n8n-nodes-base.executeWorkflow', {
				workflowId: { __rl: true, mode: 'id', value: '={{ $json.workflowId }}' },
			}),
			node('n8n-nodes-base.executeWorkflow', { source: 'parameter', workflowJson: '{}' }),
		]);

		expect(await discover(root.id)).toEqual({ subWorkflows: [], inaccessible: 0 });
	});

	it('follows references in disabled nodes', async () => {
		const child = await publish([]);
		const root = await publish([call(child.id, { disabled: true })]);

		expect(ids(await discover(root.id))).toEqual([child.id]);
	});

	it('follows published content and ignores unpublished draft changes', async () => {
		const publishedChild = await publish([]);
		const draftChild = await publish([]);
		const root = await publish([call(publishedChild.id)]);
		const draftNodes = [call(draftChild.id)];
		await Container.get(WorkflowRepository).update(root.id, { nodes: draftNodes });
		await index.updateIndexForDraft({ ...root, nodes: draftNodes });

		expect(ids(await discover(root.id))).toEqual([publishedChild.id]);
	});

	it('skips unpublished and archived sub-workflows and their references', async () => {
		const hidden = await publish([]);
		const unpublished = await createWorkflow({ nodes: [call(hidden.id)] }, project);
		await index.updateIndexForDraft(unpublished);
		const archived = await publish([call(hidden.id)]);
		await Container.get(WorkflowRepository).update(archived.id, {
			isArchived: true,
			activeVersionId: null,
		});
		const root = await publish([call(unpublished.id), call(archived.id)]);

		expect(await discover(root.id)).toEqual({ subWorkflows: [], inaccessible: 0 });
	});

	it('does not follow a selected workflow that is not published', async () => {
		const child = await publish([]);
		const unpublished = await createWorkflow({ nodes: [call(child.id)] }, project);
		await index.updateIndexForDraft(unpublished);

		expect(await discover(unpublished.id)).toEqual({ subWorkflows: [], inaccessible: 0 });
	});

	it('stops at inaccessible workflows and reports only their count', async () => {
		const otherProject = await createTeamProject();
		const behind = await publish([], { owner: otherProject });
		const inaccessible = await publish([call(behind.id)], { owner: otherProject });
		const root = await publish([call(inaccessible.id), call(generateNanoId())]);

		expect(await discover(root.id)).toEqual({ subWorkflows: [], inaccessible: 2 });
	});

	it('names accessible workflows from another project without following them', async () => {
		const accessibleProject = await createTeamProject(undefined, user);
		const behind = await publish([], { owner: accessibleProject });
		const elsewhere = await publish([call(behind.id)], { owner: accessibleProject });
		const sharedIn = await publish([], { owner: await createTeamProject() });
		await shareWorkflowWithProjects(sharedIn, [{ project }]);
		const root = await publish([call(elsewhere.id), call(sharedIn.id)]);

		const result = await discover(root.id);

		expect(result.inaccessible).toBe(0);
		expect(result.subWorkflows).toEqual(
			expect.arrayContaining([
				{ id: elsewhere.id, name: elsewhere.name, otherProject: true },
				{ id: sharedIn.id, name: sharedIn.name, otherProject: true },
			]),
		);
		expect(ids(result)).toEqual([elsewhere.id, sharedIn.id].sort());
	});

	it('treats a sub-workflow without edit access as inaccessible', async () => {
		const viewedProject = await createTeamProject();
		await linkUserToProject(user, viewedProject, 'project:viewer');
		const child = await publish([], { owner: viewedProject });
		const root = await publish([call(child.id)]);

		expect(await discover(root.id)).toEqual({ subWorkflows: [], inaccessible: 1 });
	});

	it('uses global access for instance admins', async () => {
		const admin = await createAdmin();
		const child = await publish([]);
		const root = await publish([call(child.id)]);

		expect(ids(await discover(root.id, admin))).toEqual([child.id]);
	});
});
