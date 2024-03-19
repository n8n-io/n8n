import { Project } from '@/databases/entities/Project';
import { ProjectRelation } from '@/databases/entities/ProjectRelation';
import type { ProjectRole } from '@/databases/entities/ProjectRelation';
import type { User } from '@/databases/entities/User';
import { SharedCredentials } from '@/databases/entities/SharedCredentials';
import { SharedWorkflow } from '@/databases/entities/SharedWorkflow';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';
import type { FindOptionsWhere, EntityManager } from '@n8n/typeorm';
import Container, { Service } from 'typedi';
import { type Scope } from '@n8n/permissions';
import { In, Not } from '@n8n/typeorm';
import { RoleService } from './role.service';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { SharedWorkflowRepository } from '@/databases/repositories/sharedWorkflow.repository';
import { rightDiff } from '@/utils';
import { ConflictError } from '@/errors/response-errors/conflict.error';

@Service()
export class ProjectService {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly roleService: RoleService,
	) {}

	private get workflowService() {
		return import('@/workflows/workflow.service').then(({ WorkflowService }) =>
			Container.get(WorkflowService),
		);
	}

	private get credentialsService() {
		return import('@/credentials/credentials.service').then(({ CredentialsService }) =>
			Container.get(CredentialsService),
		);
	}

	private get activeWorkflowRunner() {
		return import('@/ActiveWorkflowRunner').then(({ ActiveWorkflowRunner }) =>
			Container.get(ActiveWorkflowRunner),
		);
	}

	async deleteProject(user: User, projectId: string) {
		const workflowService = await this.workflowService;
		const credentialsService = await this.credentialsService;
		const activeWorkflowRunner = await this.activeWorkflowRunner;

		const project = await this.getProjectWithScope(user, projectId, 'project:delete');

		if (!project) {
			throw new NotFoundError(`Could not find project with ID: ${projectId}`);
		}

		// 0. check if this is a team project
		if (project.type !== 'team') {
			throw new ForbiddenError(
				`Can't delete project. Project with ID "${projectId}" is not a team project.`,
			);
		}

		// 1. disable all workflows

		// NOTE: This is supposed to happen outside the transaction.
		// We'd otherwise need to pass the em through to a lot of functions even ending up in core.
		// See: https://github.com/n8n-io/n8n/pull/8904#discussion_r1530150510
		const ownedSharedWorkflowsOutsideOfTransaction = await this.sharedWorkflowRepository.find({
			where: { projectId: project.id, role: 'workflow:owner' },
			relations: { workflow: true },
		});

		for (const sharedWorkflow of ownedSharedWorkflowsOutsideOfTransaction) {
			await activeWorkflowRunner.remove(sharedWorkflow.workflow.id);
		}

		await this.projectRelationRepository.manager.transaction(async (em) => {
			// 2. delete workflows owned by this project
			const ownedSharedWorkflows = await em.find(SharedWorkflow, {
				where: { projectId: project.id, role: 'workflow:owner' },
				relations: { workflow: true },
			});

			// Make sure that no new workflows were created in the meanwhile.
			const diff1 = rightDiff(
				[ownedSharedWorkflowsOutsideOfTransaction, (sw) => sw.projectId + sw.workflowId],
				[ownedSharedWorkflows, (sw) => sw.projectId + sw.workflowId],
			);
			const diff2 = rightDiff(
				[ownedSharedWorkflows, (sw) => sw.projectId + sw.workflowId],
				[ownedSharedWorkflowsOutsideOfTransaction, (sw) => sw.projectId + sw.workflowId],
			);
			if (diff1.length !== 0 || diff2.length !== 0) {
				throw new ConflictError(
					'New Workflows have been created during the deletion process. Please try again.',
				);
			}

			for (const sharedWorkflow of ownedSharedWorkflows) {
				await workflowService.deleteInactiveWorkflow(user, sharedWorkflow.workflow, em);
			}

			// 3. delete credentials owned by this project
			const ownedCredentials = await em.find(SharedCredentials, {
				where: { projectId: project.id, role: 'credential:owner' },
				relations: { credentials: true },
			});

			for (const credential of ownedCredentials) {
				await credentialsService.delete(credential.credentials, em);
			}

			// 4. delete shared credentials into this project
			// Cascading deletes take care of this.

			// 5. delete shared workflows into this project
			// Cascading deletes take care of this.

			// 6. delete project
			await em.remove(project);

			// 7. delete project relations
			// Cascading deletes take care of this.
		});
	}

	/**
	 * Find all the projects where a workflow is accessible,
	 * along with the roles of a user in those projects.
	 */
	async findProjectsWorkflowIsIn(workflowId: string) {
		return await this.sharedWorkflowRepository.findProjectIds(workflowId);
	}

	async getAccessibleProjects(user: User): Promise<Project[]> {
		// This user is probably an admin, show them everything
		if (user.hasGlobalScope('project:read')) {
			return await this.projectRepository.find();
		}
		return await this.projectRepository.getAccessibleProjects(user.id);
	}

	async getPersonalProjectOwners(projectIds: string[]): Promise<ProjectRelation[]> {
		return await this.projectRelationRepository.getPersonalProjectOwners(projectIds);
	}

	async guaranteeProjectNames(projects: Project[]): Promise<Array<Project & { name: string }>> {
		const projectOwnerRelations = await this.getPersonalProjectOwners(projects.map((p) => p.id));

		return projects.map((p) => {
			if (p.name) {
				return p;
			}
			const pr = projectOwnerRelations.find((r) => r.projectId === p.id);
			let name = `Unclaimed Personal Project (${p.id})`;
			if (pr && !pr.user.isPending) {
				name = `${pr.user.firstName} ${pr.user.lastName}`;
			} else if (pr) {
				name = pr.user.email;
			}
			return this.projectRepository.create({
				...p,
				name,
			});
		}) as Array<Project & { name: string }>;
	}

	async createTeamProject(name: string, adminUser: User): Promise<Project> {
		const project = await this.projectRepository.save(
			this.projectRepository.create({
				name,
				type: 'team',
			}),
		);

		// Link admin
		await this.addUser(project.id, adminUser.id, 'project:admin');

		return project;
	}

	async updateProject(name: string, projectId: string): Promise<Project> {
		const result = await this.projectRepository.update(
			{
				id: projectId,
				type: 'team',
			},
			{
				name,
			},
		);

		if (!result.affected) {
			throw new ForbiddenError('Project not found');
		}
		return await this.projectRepository.findOneByOrFail({ id: projectId });
	}

	async getPersonalProject(user: User): Promise<Project | null> {
		return await this.projectRepository.getPersonalProjectForUser(user.id);
	}

	async getProjectRelationsForUser(user: User): Promise<ProjectRelation[]> {
		return await this.projectRelationRepository.find({
			where: { userId: user.id },
			relations: ['project'],
		});
	}

	async syncProjectRelations(
		projectId: string,
		relations: Array<{ userId: string; role: ProjectRole }>,
	) {
		const project = await this.projectRepository.findOneOrFail({
			where: { id: projectId, type: Not('personal') },
		});
		await this.projectRelationRepository.manager.transaction(async (em) => {
			await this.pruneRelations(em, project);
			await this.addManyRelations(em, project, relations);
		});
	}

	async pruneRelations(em: EntityManager, project: Project) {
		await em.delete(ProjectRelation, { projectId: project.id });
	}

	async addManyRelations(
		em: EntityManager,
		project: Project,
		relations: Array<{ userId: string; role: ProjectRole }>,
	) {
		await em.insert(
			ProjectRelation,
			relations.map((v) =>
				this.projectRelationRepository.create({
					projectId: project.id,
					userId: v.userId,
					role: v.role,
				}),
			),
		);
	}

	async getProjectWithScope(
		user: User,
		projectId: string,
		scope: Scope,
		entityManager?: EntityManager,
	) {
		const em = entityManager ?? this.projectRepository.manager;
		let where: FindOptionsWhere<Project> = {
			id: projectId,
		};

		if (!user.hasGlobalScope([scope], { mode: 'allOf' })) {
			const projectRoles = this.roleService.rolesWithScope('project', scope);

			where = {
				...where,
				projectRelations: {
					role: In(projectRoles),
					userId: user.id,
				},
			};
		}

		return await em.findOne(Project, {
			where,
		});
	}

	async addUser(projectId: string, userId: string, role: ProjectRole) {
		return await this.projectRelationRepository.save({
			projectId,
			userId,
			role,
		});
	}

	async getProject(projectId: string): Promise<Project> {
		return await this.projectRepository.findOneOrFail({
			where: {
				id: projectId,
			},
		});
	}

	async getProjectRelations(projectId: string): Promise<ProjectRelation[]> {
		return await this.projectRelationRepository.find({
			where: { projectId },
			relations: { user: true },
		});
	}
}
