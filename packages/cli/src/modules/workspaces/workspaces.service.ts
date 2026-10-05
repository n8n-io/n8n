import type {
	CreateProjectDto,
	CreateWorkspaceDto,
	UpdateWorkspaceAccessDto,
	WorkspaceListItem,
} from '@n8n/api-types';
import type { Project, ProjectRelation, User } from '@n8n/db';
import { ProjectRelationRepository, ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';

import { ProjectHierarchyService } from '@/services/project-hierarchy.service';
import { ProjectService } from '@/services/project.service.ee';
import { UserService } from '@/services/user.service';

type Workspace = Project & { type: 'workspace' | 'personalWorkspace' };

function isWorkspace(project: Project | null): project is Workspace {
	return project?.type === 'workspace' || project?.type === 'personalWorkspace';
}

/**
 * PROTOTYPE (workspaces)
 *
 * Instance admins can reach every workspace through their global role, so for
 * them "joining" only adds the workspace to their sidebar. Everyone else sees
 * every workspace. They can join a public workspace as a viewer, and must
 * request access to a private one.
 */
@Service()
export class WorkspacesService {
	constructor(
		private readonly projectRepository: ProjectRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly projectService: ProjectService,
		private readonly userService: UserService,
		private readonly projectHierarchyService: ProjectHierarchyService,
	) {}

	private isInstanceAdmin(user: User) {
		return hasGlobalScope(user, 'project:read');
	}

	private joinedIds(user: User) {
		return user.settings?.joinedWorkspaceIds ?? [];
	}

	private canCreateProjectIn(user: User, workspace: Workspace, relation?: ProjectRelation) {
		if (workspace.type === 'personalWorkspace') return workspace.creatorId === user.id;
		if (hasGlobalScope(user, 'project:create')) return true;
		return relation?.role.scopes.some((scope) => scope.slug === 'project:update') ?? false;
	}

	async list(user: User): Promise<WorkspaceListItem[]> {
		const isAdmin = this.isInstanceAdmin(user);
		const joinedIds = this.joinedIds(user);

		const relations = await this.projectRelationRepository.findAllByUser(user.id);
		const relationByProjectId = new Map(relations.map((r) => [r.projectId, r]));

		const personal = (await this.projectHierarchyService.arePersonalSpacesEnabled())
			? await this.projectRepository.findPersonalWorkspaceForUser(user.id)
			: null;
		const workspaces: Workspace[] = [
			...(personal && isWorkspace(personal) ? [personal] : []),
			...(await this.projectRepository.findAllWorkspaces()).filter(isWorkspace),
		];
		const workspaceIds = workspaces.map((w) => w.id);
		const [children, memberCounts, adminNames] = await Promise.all([
			this.projectRepository.findChildProjects(workspaceIds),
			this.projectRelationRepository.countByProjectIds(workspaceIds),
			this.projectRelationRepository.findAdminNamesByProjectIds(workspaceIds),
		]);

		return workspaces.map((workspace) => {
			const relation = relationByProjectId.get(workspace.id);
			const childProjects = children.filter((c) => c.parentId === workspace.id);
			// Roles that come from the workspace cascade do not count as belonging to a project.
			const reachesAProject = childProjects.some((c) => {
				const childRelation = relationByProjectId.get(c.id);
				return childRelation !== undefined && childRelation.inheritedFromId === null;
			});
			const isPersonal = workspace.type === 'personalWorkspace';
			const belongs = relation !== undefined || reachesAProject;
			const joined = isPersonal || (isAdmin ? joinedIds.includes(workspace.id) : belongs);
			const isPublic = isPersonal || workspace.isPublic;

			return {
				id: workspace.id,
				name: workspace.name,
				icon: workspace.icon,
				description: workspace.description,
				type: workspace.type,
				joined,
				isMember: relation !== undefined,
				role: relation?.role.slug ?? null,
				projectCount: childProjects.length,
				memberCount: memberCounts.get(workspace.id) ?? 0,
				isPublic,
				cascadeMembers: workspace.cascadeMembers,
				adminNames: adminNames.get(workspace.id) ?? [],
				canJoin: !isPersonal && !joined && (isAdmin || isPublic),
				// Members who joined a public workspace themselves are viewers.
				canLeave:
					!isPersonal &&
					joined &&
					(isAdmin || (relation?.role.slug === 'project:viewer' && !reachesAProject)),
				canRequestAccess: !isAdmin && !isPersonal && !joined && !isPublic,
				canCreateProject: this.canCreateProjectIn(user, workspace, relation),
			};
		});
	}

	private async findRelation(user: User, projectId: string) {
		const relations = await this.projectRelationRepository.findAllByUser(user.id);
		return relations.find((r) => r.projectId === projectId);
	}

	private async getWorkspaceOrFail(workspaceId: string): Promise<Workspace> {
		const workspace = await this.projectRepository.findOneBy({ id: workspaceId });
		if (!isWorkspace(workspace)) throw new NotFoundError(`Workspace ${workspaceId} not found`);
		return workspace;
	}

	async join(user: User, workspaceId: string) {
		const workspace = await this.getWorkspaceOrFail(workspaceId);
		if (workspace.type === 'personalWorkspace') {
			throw new BadRequestError('A personal workspace cannot be joined.');
		}
		if (this.isInstanceAdmin(user)) {
			const joined = new Set([...this.joinedIds(user), workspace.id]);
			await this.userService.updateSettings(user.id, { joinedWorkspaceIds: [...joined] });
			return;
		}
		if (!workspace.isPublic) {
			throw new ForbiddenError('This workspace is private. Request access from its admins.');
		}
		if (await this.findRelation(user, workspace.id)) return;
		await this.projectRelationRepository.insert({
			projectId: workspace.id,
			userId: user.id,
			role: { slug: 'project:viewer' },
		});
		await this.projectHierarchyService.syncCascadedMembers(workspace.id);
	}

	async leave(user: User, workspaceId: string) {
		await this.getWorkspaceOrFail(workspaceId);
		if (this.isInstanceAdmin(user)) {
			const joined = this.joinedIds(user).filter((id) => id !== workspaceId);
			await this.userService.updateSettings(user.id, { joinedWorkspaceIds: joined });
			return;
		}
		const relation = await this.findRelation(user, workspaceId);
		if (relation?.role.slug !== 'project:viewer') {
			throw new ForbiddenError('Ask an admin of this workspace to remove you.');
		}
		await this.projectRelationRepository.delete({ projectId: workspaceId, userId: user.id });
		await this.projectHierarchyService.syncCascadedMembers(workspaceId);
	}

	async updateAccess(workspaceId: string, dto: UpdateWorkspaceAccessDto) {
		const workspace = await this.getWorkspaceOrFail(workspaceId);
		if (workspace.type !== 'workspace') {
			throw new BadRequestError('Only shared workspaces have access options.');
		}
		await this.projectRepository.setWorkspaceAccess(workspace.id, dto);
		if (dto.cascadeMembers !== undefined) {
			await this.projectHierarchyService.syncCascadedMembers(workspace.id);
		}
	}

	async create(user: User, dto: CreateWorkspaceDto) {
		const workspace = await this.projectRepository.save(
			this.projectRepository.create({
				type: 'workspace',
				name: dto.name,
				icon: dto.icon ?? { type: 'icon', value: 'box' },
				description: dto.description ?? null,
				creatorId: user.id,
			}),
		);
		await this.projectRelationRepository.insert({
			projectId: workspace.id,
			userId: user.id,
			role: { slug: 'project:admin' },
		});
		if (this.isInstanceAdmin(user)) await this.join(user, workspace.id);
		return workspace;
	}

	async createProject(user: User, workspaceId: string, dto: CreateProjectDto) {
		const workspace = await this.getWorkspaceOrFail(workspaceId);
		const relation = await this.findRelation(user, workspace.id);
		if (!this.canCreateProjectIn(user, workspace, relation)) {
			throw new ForbiddenError('You cannot create projects in this workspace.');
		}
		if (!dto.name.trim()) throw new BadRequestError('A project needs a name.');
		await this.projectHierarchyService.assertCanCreateIn(workspace.id);

		const project = await this.projectService.createTeamProject(user, dto);
		await this.projectRepository.setParent([project.id], workspace.id);
		await this.projectHierarchyService.syncCascadedMembers(workspace.id);

		return {
			...project,
			parentId: workspace.id,
			role: 'project:admin',
			scopes: await this.projectService.getProjectScopesForUser(user, project.id),
		};
	}
}
