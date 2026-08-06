import {
	createTeamProject,
	createWorkflowHistory,
	createWorkflowWithHistory,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import {
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
	type Project,
	type WorkflowEntity,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { IConnections, INode, IWorkflowGroup } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

type PublicationMode = 'legacy' | 'mapping';

type WorkflowFixture = {
	workflow: WorkflowEntity;
	publishedVersionId: string;
	publishedNodes: INode[];
	publishedConnections: IConnections;
	publishedNodeGroups: IWorkflowGroup[];
};

const makeNode = (name: string): INode => ({
	id: uuid(),
	name,
	type: 'n8n-nodes-base.noOp',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

async function createFixture(
	project: Project,
	name = `Workflow ${uuid()}`,
): Promise<WorkflowFixture> {
	const draftNode = makeNode('Draft node');
	const workflow = await createWorkflowWithHistory(
		{
			name,
			nodes: [draftNode],
			connections: { [draftNode.name]: { main: [[]] } },
			nodeGroups: [{ id: uuid(), name: 'Draft group', nodeIds: [draftNode.id] }],
			pinData: { [draftNode.name]: [{ json: { source: 'editor' } }] },
		},
		project,
	);
	const publishedVersionId = uuid();
	const publishedNodes = [makeNode('Published node')];
	const publishedConnections = {
		[publishedNodes[0].name]: { main: [[]] },
	} satisfies IConnections;
	const publishedNodeGroups = [
		{
			id: uuid(),
			name: 'Published group',
			nodeIds: [publishedNodes[0].id],
		},
	];
	await createWorkflowHistory(workflow, project, undefined, {
		versionId: publishedVersionId,
		nodes: publishedNodes,
		connections: publishedConnections,
		nodeGroups: publishedNodeGroups,
	});

	return {
		workflow,
		publishedVersionId,
		publishedNodes,
		publishedConnections,
		publishedNodeGroups,
	};
}

async function publish(mode: PublicationMode, fixture: WorkflowFixture): Promise<void> {
	if (mode === 'legacy') {
		await setActiveVersion(fixture.workflow.id, fixture.publishedVersionId);
		return;
	}

	await Container.get(WorkflowPublishedVersionRepository).setPublishedVersion(
		fixture.workflow.id,
		fixture.publishedVersionId,
	);
}

async function loadPublishedWorkflow(
	mode: PublicationMode,
	projectId: string,
	reference: { workflowId?: string; workflowName: string },
) {
	return mode === 'legacy'
		? await Container.get(WorkflowRepository).findPublishedWorkflowForAgentTool(
				projectId,
				reference,
			)
		: await Container.get(WorkflowPublishedVersionRepository).findPublishedWorkflowForAgentTool(
				projectId,
				reference,
			);
}

async function loadFingerprints(mode: PublicationMode, projectId: string, workflowIds: string[]) {
	return mode === 'legacy'
		? await Container.get(WorkflowRepository).findPublishedVersionFingerprintsForAgentTools(
				projectId,
				workflowIds,
			)
		: await Container.get(
				WorkflowPublishedVersionRepository,
			).findPublishedVersionFingerprintsForAgentTools(projectId, workflowIds);
}

describe.each<PublicationMode>(['legacy', 'mapping'])(
	'agent workflow tool publication reads (%s)',
	(mode) => {
		beforeAll(async () => {
			await testDb.init();
		});

		beforeEach(async () => {
			await testDb.truncate([
				'WorkflowPublishedVersion',
				'WorkflowDependency',
				'SharedWorkflow',
				'WorkflowEntity',
				'WorkflowHistory',
				'Project',
			]);
		});

		afterAll(async () => {
			await testDb.terminate();
		});

		it('returns only published execution data without hydrating draft body fields', async () => {
			const project = await createTeamProject();
			const fixture = await createFixture(project, 'Accessible workflow');
			await publish(mode, fixture);

			const result = await loadPublishedWorkflow(mode, project.id, {
				workflowName: fixture.workflow.name,
			});

			expect(result).toMatchObject({
				id: fixture.workflow.id,
				name: fixture.workflow.name,
				versionId: fixture.publishedVersionId,
				nodes: fixture.publishedNodes,
				connections: fixture.publishedConnections,
				nodeGroups: fixture.publishedNodeGroups,
			});
			expect(result).not.toHaveProperty('pinData');
			expect(result).not.toHaveProperty('activeVersion');
			expect(result).not.toHaveProperty('workflow');
			expect(result).not.toHaveProperty('publishedVersion');
		});

		it('excludes a workflow shared only with another project', async () => {
			const [requestedProject, otherProject] = await Promise.all([
				createTeamProject(),
				createTeamProject(),
			]);
			const fixture = await createFixture(otherProject);
			await publish(mode, fixture);

			await expect(
				loadPublishedWorkflow(mode, requestedProject.id, {
					workflowId: fixture.workflow.id,
					workflowName: fixture.workflow.name,
				}),
			).resolves.toBeNull();
		});

		it('excludes an archived workflow', async () => {
			const project = await createTeamProject();
			const fixture = await createFixture(project);
			await publish(mode, fixture);
			await Container.get(WorkflowRepository).update(fixture.workflow.id, { isArchived: true });

			await expect(
				loadPublishedWorkflow(mode, project.id, {
					workflowId: fixture.workflow.id,
					workflowName: fixture.workflow.name,
				}),
			).resolves.toBeNull();
		});

		it('excludes an unpublished workflow', async () => {
			const project = await createTeamProject();
			const fixture = await createFixture(project);

			await expect(
				loadPublishedWorkflow(mode, project.id, {
					workflowId: fixture.workflow.id,
					workflowName: fixture.workflow.name,
				}),
			).resolves.toBeNull();
		});

		it('does not fall back to a conflicting name when workflowId is supplied', async () => {
			const project = await createTeamProject();
			const conflicting = await createFixture(project, 'Conflicting workflow');
			await publish(mode, conflicting);

			await expect(
				loadPublishedWorkflow(mode, project.id, {
					workflowId: uuid(),
					workflowName: conflicting.workflow.name,
				}),
			).resolves.toBeNull();
		});

		it('omits inaccessible, archived, and unpublished fingerprint rows', async () => {
			const [project, otherProject] = await Promise.all([createTeamProject(), createTeamProject()]);
			const [accessible, inaccessible, archived, unpublished] = await Promise.all([
				createFixture(project),
				createFixture(otherProject),
				createFixture(project),
				createFixture(project),
			]);
			await Promise.all([
				publish(mode, accessible),
				publish(mode, inaccessible),
				publish(mode, archived),
			]);
			await Container.get(WorkflowRepository).update(archived.workflow.id, { isArchived: true });

			const result = await loadFingerprints(mode, project.id, [
				accessible.workflow.id,
				inaccessible.workflow.id,
				archived.workflow.id,
				unpublished.workflow.id,
			]);

			expect(result).toEqual([
				{
					workflowId: accessible.workflow.id,
					versionId: accessible.publishedVersionId,
				},
			]);
		});
	},
);
