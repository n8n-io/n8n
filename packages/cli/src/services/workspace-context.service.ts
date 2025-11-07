import { Service } from '@n8n/di';
import { Project, ProjectRepository, ProjectRelationRepository, User } from '@n8n/db';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

/**
 * 工作空间未找到错误
 *
 * 当指定的工作空间不存在或不是有效的工作空间类型时抛出此错误
 */
export class WorkspaceNotFoundError extends NotFoundError {
	constructor(workspaceId: string) {
		super(`Workspace not found: ${workspaceId}`);
	}
}

/**
 * 工作空间上下文服务
 *
 * 负责管理工作空间上下文信息，提供工作空间级别的查询和验证操作。
 * 工作空间在系统中对应 type='team' 的 Project 实体。
 */
@Service()
export class WorkspaceContextService {
	constructor(
		private readonly projectRepository: ProjectRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
	) {}

	/**
	 * 通过项目ID获取工作空间
	 *
	 * 验证指定的项目是否为有效的工作空间（type='team'），
	 * 如果不是工作空间类型则抛出错误。
	 *
	 * @param projectId - 项目ID
	 * @returns 工作空间项目实体
	 * @throws {WorkspaceNotFoundError} 当项目不存在或不是工作空间类型时
	 */
	async getWorkspaceByProjectId(projectId: string): Promise<Project> {
		const project = await this.projectRepository.findOne({
			where: { id: projectId },
		});

		if (!project) {
			throw new WorkspaceNotFoundError(projectId);
		}

		// 验证是否为工作空间类型（team）
		if (project.type !== 'team') {
			throw new WorkspaceNotFoundError(projectId);
		}

		return project;
	}

	/**
	 * 获取用户所在的所有工作空间
	 *
	 * 通过用户的项目关系查询所有 type='team' 的项目。
	 *
	 * @param userId - 用户ID
	 * @returns 用户所在的工作空间列表
	 */
	async getUserWorkspaces(userId: string): Promise<Project[]> {
		// 查询用户的所有项目关系
		const projectRelations = await this.projectRelationRepository.find({
			where: { userId },
			relations: ['project'],
		});

		// 过滤出工作空间类型（team）的项目
		const workspaces = projectRelations
			.map((relation) => relation.project)
			.filter((project) => project.type === 'team');

		return workspaces;
	}

	/**
	 * 检查用户是否在指定工作空间中
	 *
	 * 验证用户是否为指定工作空间的成员。
	 *
	 * @param userId - 用户ID
	 * @param workspaceId - 工作空间ID（项目ID）
	 * @returns 如果用户在工作空间中返回 true，否则返回 false
	 */
	async isUserInWorkspace(userId: string, workspaceId: string): Promise<boolean> {
		// 首先验证是否为有效的工作空间
		try {
			await this.getWorkspaceByProjectId(workspaceId);
		} catch {
			return false;
		}

		// 查询用户在该工作空间的关系
		const relation = await this.projectRelationRepository.findOne({
			where: {
				userId,
				projectId: workspaceId,
			},
		});

		return relation !== null;
	}

	/**
	 * 获取工作空间的所有成员
	 *
	 * 通过项目关系查询工作空间的所有用户成员。
	 *
	 * @param workspaceId - 工作空间ID（项目ID）
	 * @returns 工作空间成员用户列表
	 * @throws {WorkspaceNotFoundError} 当工作空间不存在时
	 */
	async getWorkspaceMembers(workspaceId: string): Promise<User[]> {
		// 验证工作空间存在
		await this.getWorkspaceByProjectId(workspaceId);

		// 查询工作空间的所有成员关系
		const relations = await this.projectRelationRepository.find({
			where: { projectId: workspaceId },
			relations: ['user', 'user.role'],
		});

		// 提取用户列表
		return relations.map((relation) => relation.user);
	}
}
