import Container from 'typedi';
import type { DeepPartial } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';

import { User } from '@db/entities/User';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import type { SharedWorkflow, WorkflowSharingRole } from '@db/entities/SharedWorkflow';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { Project } from '@/databases/entities/Project';

export async function createManyWorkflows(
	amount: number,
	attributes: Partial<WorkflowEntity> = {},
	user?: User,
) {
	const workflowRequests = [...Array(amount)].map(
		async (_) => await createWorkflow(attributes, user),
	);
	return await Promise.all(workflowRequests);
}

export function newWorkflow(attributes: Partial<WorkflowEntity> = {}): WorkflowEntity {
	const { active, name, nodes, connections, versionId } = attributes;

	const workflowEntity = Container.get(WorkflowRepository).create({
		active: active ?? false,
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
		...attributes,
	});

	return workflowEntity;
}

/**
 * Store a workflow in the DB (without a trigger) and optionally assign it to a user.
 * @param attributes workflow attributes
 * @param user user to assign the workflow to
 */
export async function createWorkflow(
	attributes: Partial<WorkflowEntity> = {},
	userOrProject?: User | Project,
) {
	const workflow = await Container.get(WorkflowRepository).save(newWorkflow(attributes));

	if (userOrProject instanceof User) {
		const user = userOrProject;
		const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(user.id);
		await Container.get(SharedWorkflowRepository).save(
			Container.get(SharedWorkflowRepository).create({
				project,
				workflow,
				role: 'workflow:owner',
			}),
		);
	}

	if (userOrProject instanceof Project) {
		const project = userOrProject;
		await Container.get(SharedWorkflowRepository).save(
			Container.get(SharedWorkflowRepository).create({
				project,
				workflow,
				role: 'workflow:owner',
			}),
		);
	}

	return workflow;
}

export async function shareWorkflowWithUsers(workflow: WorkflowEntity, users: User[]) {
	const sharedWorkflows: Array<DeepPartial<SharedWorkflow>> = await Promise.all(
		users.map(async (user) => {
			const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
				user.id,
			);
			return {
				projectId: project.id,
				workflowId: workflow.id,
				role: 'workflow:editor',
			};
		}),
	);
	return await Container.get(SharedWorkflowRepository).save(sharedWorkflows);
}

export async function shareWorkflowWithProjects(
	workflow: WorkflowEntity,
	projectsWithRole: Array<{ project: Project; role?: WorkflowSharingRole }>,
) {
	const newSharedWorkflow = await Promise.all(
		projectsWithRole.map(async ({ project, role }) => {
			return Container.get(SharedWorkflowRepository).create({
				workflowId: workflow.id,
				role: role ?? 'workflow:editor',
				projectId: project.id,
			});
		}),
	);

	return await Container.get(SharedWorkflowRepository).save(newSharedWorkflow);
}

export async function getWorkflowSharing(workflow: WorkflowEntity) {
	return await Container.get(SharedWorkflowRepository).findBy({
		workflowId: workflow.id,
	});
}

/**
 * Store a workflow in the DB (with a trigger) and optionally assign it to a user.
 * @param user user to assign the workflow to
 */
export async function createWorkflowWithTrigger(
	attributes: Partial<WorkflowEntity> = {},
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
			connections: { Cron: { main: [[{ node: 'Set', type: 'main', index: 0 }]] } },
			...attributes,
		},
		user,
	);

	return workflow;
}

export async function getAllWorkflows() {
	return await Container.get(WorkflowRepository).find();
}

export async function getAllSharedWorkflows() {
	return await Container.get(SharedWorkflowRepository).find();
}

export const getWorkflowById = async (id: string) =>
	await Container.get(WorkflowRepository).findOneBy({ id });
