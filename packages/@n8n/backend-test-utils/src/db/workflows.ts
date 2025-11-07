import type { IWorkflowDb } from '@n8n/db';
import { Project, User, ProjectRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { IWorkflowBase } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

export function newWorkflow(attributes: Partial<IWorkflowDb> = {}): IWorkflowDb {
	const { active, isArchived, name, nodes, connections, versionId, settings } = attributes;

	const workflowEntity = Container.get(WorkflowRepository).create({
		active: active ?? false,
		isArchived: isArchived ?? false,
		name: name ?? 'test workflow',
		nodes: nodes ?? [
			{
				id: 'uuid-1234',
				name: 'Schedule Trigger',
				parameters: {},
				position: [-20, 260],
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1,
			},
		],
		connections: connections ?? {},
		versionId: versionId ?? uuid(),
		settings: settings ?? {},
		...attributes,
	});

	return workflowEntity;
}

/**
 * Store a workflow in the DB (without a trigger) and optionally assign it to a project.
 * @param attributes workflow attributes
 * @param userOrProject user or project to assign the workflow to
 */
export async function createWorkflow(
	attributes: Partial<IWorkflowDb> = {},
	userOrProject?: User | Project,
) {
	let projectId: string | undefined;

	if (userOrProject instanceof User) {
		const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			userOrProject.id,
		);
		projectId = project.id;
	} else if (userOrProject instanceof Project) {
		projectId = userOrProject.id;
	}

	// Set projectId directly on the workflow
	const workflowData = {
		...newWorkflow(attributes),
		...(projectId && { projectId }),
	};

	const workflow = await Container.get(WorkflowRepository).save(workflowData);

	return workflow;
}

export async function createManyWorkflows(
	amount: number,
	attributes: Partial<IWorkflowDb> = {},
	user?: User,
) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const workflowRequests = [...Array(amount)].map(
		async (_) => await createWorkflow(attributes, user),
	);
	return await Promise.all(workflowRequests);
}

/**
 * @deprecated In the new architecture, workflows belong to a single project.
 * To share access, add users to the project via projectRelations instead.
 */
export async function shareWorkflowWithUsers(_workflow: IWorkflowBase, _users: User[]) {
	// Note: This function is deprecated in the new architecture.
	// Workflows now belong directly to a project via projectId.
	// To grant access, use ProjectRepository to add users to the project's projectRelations.
	console.warn(
		'shareWorkflowWithUsers is deprecated. Use ProjectRepository to manage project members instead.',
	);
	return [];
}

/**
 * @deprecated In the new architecture, a workflow can only belong to one project.
 * Use createWorkflow with the target project instead.
 */
export async function shareWorkflowWithProjects(
	_workflow: IWorkflowBase,
	_projectsWithRole: Array<{ project: Project }>,
) {
	// Note: This function is deprecated in the new architecture.
	// A workflow can only belong to one project via the projectId field.
	console.warn(
		'shareWorkflowWithProjects is deprecated. A workflow belongs to only one project in the new architecture.',
	);
	return [];
}

/**
 * Get the project that owns this workflow and its members.
 */
export async function getWorkflowSharing(workflow: IWorkflowBase) {
	const fullWorkflow = await Container.get(WorkflowRepository).findOne({
		where: { id: workflow.id },
		relations: { project: { projectRelations: true } },
	});
	return fullWorkflow?.project ? [fullWorkflow.project] : [];
}

/**
 * Store a workflow in the DB (with a trigger) and optionally assign it to a user.
 * @param user user to assign the workflow to
 */
export async function createWorkflowWithTrigger(
	attributes: Partial<IWorkflowDb> = {},
	user?: User,
) {
	const workflow = await createWorkflow(
		{
			nodes: [
				{
					id: 'uuid-1',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
				{
					id: 'uuid-2',
					parameters: { triggerTimes: { item: [{ mode: 'everyMinute' }] } },
					name: 'Cron',
					type: 'n8n-nodes-base.cron',
					typeVersion: 1,
					position: [500, 300],
				},
				{
					id: 'uuid-3',
					parameters: { options: {} },
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [780, 300],
				},
			],
			connections: {
				Cron: { main: [[{ node: 'Set', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
			...attributes,
		},
		user,
	);

	return workflow;
}

export async function getAllWorkflows() {
	return await Container.get(WorkflowRepository).find();
}

/**
 * @deprecated Use getAllWorkflows() instead. In the new architecture,
 * all workflows are directly associated with projects via projectId.
 */
export async function getAllSharedWorkflows() {
	console.warn('getAllSharedWorkflows is deprecated. Use getAllWorkflows() instead.');
	return await Container.get(WorkflowRepository).find({
		relations: { project: true },
	});
}

export const getWorkflowById = async (id: string) =>
	await Container.get(WorkflowRepository).findOneBy({ id });
