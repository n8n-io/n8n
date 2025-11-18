import { Logger } from '@n8n/backend-common';
import {
	UserRepository,
	RoleRepository,
	ProjectRepository,
	ProjectRelationRepository,
	generateNanoId,
} from '@n8n/db';
import { Post, RestController } from '@n8n/decorators';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { AuthError } from '@/errors/response-errors/auth.error';
import { PasswordUtility } from '@/services/password.utility';
import { AuthlessRequest } from '@/requests';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

/**
 * 外部认证控制器 - 用于后台管理系统的单点登录 (SSO)
 */
@RestController('/external-auth')
export class ExternalAuthController {
	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly roleRepository: RoleRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly authService: AuthService,
		private readonly passwordUtility: PasswordUtility,
	) {}

	/**
	 * 外部系统登录接口 - 通过 userId 查找用户并签发 JWT Cookie
	 */
	@Post('/login', { skipAuth: true })
	async externalLogin(req: AuthlessRequest, res: Response) {
		// 1. 获取请求参数：用户标识符和认证密钥
		const payload = req.body as { userIdentifier?: string; authSecret?: string };
		const { userIdentifier, authSecret } = payload;

		// 2. 验证认证密钥
		const expectedSecret = process.env.N8N_EXTERNAL_AUTH_SECRET || 'n8n-secret-key-2025';
		if (authSecret !== expectedSecret) {
			throw new AuthError('Invalid auth secret');
		}

		// 3. 检查用户标识符是否存在
		if (!userIdentifier) {
			throw new BadRequestError('userIdentifier is required');
		}

		// 4. 格式化邮箱地址（如果不包含@则添加@n8n.local后缀）
		const emailIdentifier = userIdentifier?.includes('@')
			? userIdentifier
			: `${userIdentifier}@n8n.local`;

		// 5. 从数据库中查找用户
		const user = await this.userRepository.findOne({
			where: { email: emailIdentifier },
			relations: ['role'],
		});

		// 6. 验证用户是否存在
		if (!user) {
			throw new AuthError('User not found. Please create the user first.');
		}

		// 7. 验证用户是否已激活（是否设置了密码）
		if (!user.password) {
			throw new AuthError('User is not activated');
		}

		// 8. 签发 JWT Token
		const token = this.authService.issueJWT(user, false, req.browserId);

		// 9. 根据环境配置 Cookie 选项
		const isProduction = process.env.NODE_ENV === 'production';
		const cookieOptions = isProduction
			? 'HttpOnly; SameSite=None; Secure; Max-Age=604800; Path=/'
			: 'HttpOnly; SameSite=Lax; Max-Age=604800; Path=/';

		// 10. 设置认证 Cookie
		res.setHeader('Set-Cookie', `n8n-auth=${token}; ${cookieOptions}`);

		// 11. 返回登录成功响应
		res.status(200).json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
			},
		});
	}

	/**
	 * 创建外部用户接口 - 在 n8n 中创建用户及其 Personal Project
	 */
	@Post('/create-user', { skipAuth: true })
	async createExternalUser(req: AuthlessRequest, _res: Response) {
		// 1. 获取请求参数：用户ID、姓名和认证密钥
		const payload = req.body as {
			userId?: string;
			firstName?: string;
			lastName?: string;
			authSecret?: string;
		};
		const { userId, firstName, lastName, authSecret } = payload;

		// 2. 验证认证密钥
		const expectedSecret = process.env.N8N_EXTERNAL_AUTH_SECRET || 'n8n-secret-key-2025';
		if (authSecret !== expectedSecret) {
			throw new AuthError('Invalid auth secret');
		}

		// 3. 检查 userId 是否存在
		if (!userId) {
			throw new BadRequestError('userId is required');
		}

		// 4. 格式化邮箱地址（如果不包含@则添加@n8n.local后缀）
		const emailAddress = userId?.includes('@') ? userId : `${userId}@n8n.local`;

		// 5. 检查用户是否已存在
		const existingUser = await this.userRepository.findOne({
			where: { email: emailAddress },
		});

		// 6. 如果用户已存在，直接返回成功
		if (existingUser) {
			return {
				success: true,
				message: 'User already exists',
				user: {
					id: existingUser.id,
					email: existingUser.email,
					userId: userId,
				},
			};
		}

		// 7. 创建新用户对象
		const newUser = this.userRepository.create({
			email: emailAddress,
			firstName: firstName || 'User',
			lastName: lastName || userId?.substring(0, 8) || 'ID',
			password: await this.hashDummyPassword(),
		});

		// 8. 获取全局成员角色
		const memberRole = await this.roleRepository.findOne({
			where: { slug: 'global:member' },
		});

		// 9. 为用户分配成员角色
		if (memberRole) {
			newUser.role = memberRole;
		}

		// 10. 保存用户到数据库
		const savedUser = await this.userRepository.save(newUser);

		// 11. 生成个人项目ID和名称
		const projectId = generateNanoId();
		const projectName = savedUser.createPersonalProjectName();

		// 12. 创建个人项目
		const personalProject = this.projectRepository.create({
			id: projectId,
			type: 'personal',
			name: projectName,
		});

		// 13. 保存个人项目到数据库
		await this.projectRepository.save(personalProject);

		// 14. 创建项目关联关系（用户作为项目所有者）
		const projectRelation = this.projectRelationRepository.create({
			projectId: projectId,
			userId: savedUser.id,
			role: { slug: PROJECT_OWNER_ROLE_SLUG },
		});

		// 15. 保存项目关联关系
		await this.projectRelationRepository.save(projectRelation);

		// 16. 返回创建成功响应
		return {
			success: true,
			message: 'User created successfully',
			user: {
				id: savedUser.id,
				email: savedUser.email,
				firstName: savedUser.firstName,
				lastName: savedUser.lastName,
			},
		};
	}

	private async hashDummyPassword(): Promise<string> {
		const crypto = await import('crypto');
		const randomPassword = crypto.randomBytes(32).toString('hex');
		return await this.passwordUtility.hash(randomPassword);
	}

	/**
	 * 删除外部用户接口 - 同步删除 n8n 中的用户
	 */
	@Post('/delete-user', { skipAuth: true })
	async deleteExternalUser(req: AuthlessRequest, _res: Response) {
		// 1. 获取请求参数：用户ID和认证密钥
		const payload = req.body as { userId?: string; authSecret?: string };
		const { userId, authSecret } = payload;

		// 2. 验证认证密钥
		const expectedSecret = process.env.N8N_EXTERNAL_AUTH_SECRET || 'n8n-secret-key-2025';
		if (authSecret !== expectedSecret) {
			throw new AuthError('Invalid auth secret');
		}

		// 3. 检查 userId 是否存在
		if (!userId) {
			throw new BadRequestError('userId is required');
		}

		// 4. 格式化邮箱地址（如果不包含@则添加@n8n.local后缀）
		const emailAddress = userId?.includes('@') ? userId : `${userId}@n8n.local`;

		// 5. 从数据库中查找用户
		const user = await this.userRepository.findOne({
			where: { email: emailAddress },
		});

		// 6. 如果用户不存在，直接返回成功（幂等性）
		if (!user) {
			return {
				success: true,
				message: 'User not found (already deleted or never existed)',
			};
		}

		// 7. 删除用户（会级联删除相关数据）
		await this.userRepository.remove(user);

		// 8. 返回删除成功响应
		return {
			success: true,
			message: 'User deleted successfully',
		};
	}

	/**
	 * 获取用户权限接口 - 查询用户的全局角色和项目角色
	 *
	 * 权限类型说明：
	 * 1. 全局角色 (Global Role):
	 *    - global:owner  : 实例拥有者，拥有最高权限
	 *    - global:admin  : 全局管理员，可以管理用户和全局设置
	 *    - global:member : 普通成员，基础权限
	 *
	 * 2. 项目角色 (Project Role):
	 *    - project:owner  : 项目所有者（仅用于个人项目）
	 *    - project:admin  : 项目管理员，可以管理项目设置、成员、工作流、凭证
	 *    - project:editor : 项目编辑者，可以创建、编辑、删除工作流和凭证
	 *    - project:viewer : 项目查看者，只读访问工作流和凭证
	 *
	 * 注意：凭证(Credential)和工作流(Workflow)的权限是通过项目(Project)来管理的
	 */
	@Post('/get-permissions', { skipAuth: true })
	async getPermissions(req: AuthlessRequest, _res: Response) {
		// 1. 获取请求参数：用户ID和认证密钥
		const payload = req.body as { userId?: string; authSecret?: string };
		const { userId, authSecret } = payload;

		// 2. 验证认证密钥
		const expectedSecret = process.env.N8N_EXTERNAL_AUTH_SECRET || 'n8n-secret-key-2025';
		if (authSecret !== expectedSecret) {
			throw new AuthError('Invalid auth secret');
		}

		// 3. 检查 userId 是否存在
		if (!userId) {
			throw new BadRequestError('userId is required');
		}

		// 4. 格式化邮箱地址
		const emailAddress = userId?.includes('@') ? userId : `${userId}@n8n.local`;

		// 5. 查找用户及其全局角色
		const user = await this.userRepository.findOne({
			where: { email: emailAddress },
			relations: ['role'],
		});

		if (!user) {
			throw new NotFoundError('User not found');
		}

		// 6. 查找用户的项目关系
		const projectRelations = await this.projectRelationRepository.find({
			where: { userId: user.id },
			relations: ['project', 'role'],
		});

		// 7. 构建项目权限列表
		const projects = projectRelations.map((pr) => ({
			projectId: pr.projectId,
			projectName: pr.project.name,
			projectType: pr.project.type,
			role: pr.role.slug,
		}));

		// 8. 返回权限信息
		return {
			success: true,
			user: {
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				globalRole: user.role.slug,
			},
			permissions: {
				globalRole: user.role.slug,
				projects,
			},
		};
	}

	/**
	 * 设置用户权限接口 - 更新用户的全局角色和项目角色
	 *
	 * 支持的操作：
	 * 1. 修改用户的全局角色
	 * 2. 修改用户在指定项目中的角色
	 *
	 * 限制：
	 * - 不能修改个人项目(personal)中的 project:owner 角色
	 * - 全局角色必须是有效的全局角色之一
	 * - 项目角色必须是有效的项目角色之一（不能设置为 project:owner）
	 */
	@Post('/set-permissions', { skipAuth: true })
	async setPermissions(req: AuthlessRequest, _res: Response) {
		// 1. 获取请求参数
		const payload = req.body as {
			userId?: string;
			authSecret?: string;
			globalRole?: string;
			projectPermissions?: Array<{ projectId: string; role: string }>;
		};
		const { userId, authSecret, globalRole, projectPermissions } = payload;

		// 2. 验证认证密钥
		const expectedSecret = process.env.N8N_EXTERNAL_AUTH_SECRET || 'n8n-secret-key-2025';
		if (authSecret !== expectedSecret) {
			throw new AuthError('Invalid auth secret');
		}

		// 3. 检查 userId 是否存在
		if (!userId) {
			throw new BadRequestError('userId is required');
		}

		// 4. 格式化邮箱地址
		const emailAddress = userId?.includes('@') ? userId : `${userId}@n8n.local`;

		// 5. 查找用户
		const user = await this.userRepository.findOne({
			where: { email: emailAddress },
			relations: ['role'],
		});

		if (!user) {
			throw new NotFoundError('User not found');
		}

		// 6. 验证并更新全局角色
		if (globalRole) {
			// 验证全局角色是否有效
			const validGlobalRoles = ['global:owner', 'global:admin', 'global:member'];
			if (!validGlobalRoles.includes(globalRole)) {
				throw new BadRequestError(
					`Invalid global role: ${globalRole}. Must be one of: ${validGlobalRoles.join(', ')}`,
				);
			}

			// 检查角色是否存在于数据库
			const role = await this.roleRepository.findOne({
				where: { slug: globalRole },
			});

			if (!role) {
				throw new BadRequestError(`Role not found: ${globalRole}`);
			}

			// 更新用户的全局角色
			await this.userRepository.update({ id: user.id }, { role: { slug: globalRole } });

			this.logger.info(`Updated global role for user ${user.email} to ${globalRole}`);
		}

		// 7. 验证并更新项目角色
		if (projectPermissions && Array.isArray(projectPermissions)) {
			// 验证有效的项目角色（排除 project:owner，它只能用于个人项目）
			const validProjectRoles = ['project:admin', 'project:editor', 'project:viewer'];

			for (const permission of projectPermissions) {
				const { projectId, role } = permission;

				if (!projectId || !role) {
					throw new BadRequestError('Each project permission must have projectId and role');
				}

				// 验证角色是否有效
				if (!validProjectRoles.includes(role)) {
					throw new BadRequestError(
						`Invalid project role: ${role}. Must be one of: ${validProjectRoles.join(', ')}`,
					);
				}

				// 检查项目是否存在
				const project = await this.projectRepository.findOne({
					where: { id: projectId },
				});

				if (!project) {
					throw new BadRequestError(`Project not found: ${projectId}`);
				}

				// 不允许修改个人项目的权限（个人项目的 owner 关系是固定的）
				if (project.type === 'personal') {
					throw new BadRequestError(`Cannot modify permissions for personal project: ${projectId}`);
				}

				// 检查用户是否已经在该项目中
				const existingRelation = await this.projectRelationRepository.findOne({
					where: { projectId, userId: user.id },
				});

				if (!existingRelation) {
					throw new BadRequestError(`User is not a member of project: ${projectId}`);
				}

				// 检查角色是否存在于数据库
				const projectRole = await this.roleRepository.findOne({
					where: { slug: role },
				});

				if (!projectRole) {
					throw new BadRequestError(`Role not found: ${role}`);
				}

				// 更新项目角色
				await this.projectRelationRepository.update(
					{ projectId, userId: user.id },
					{ role: { slug: role } },
				);

				this.logger.info(
					`Updated project role for user ${user.email} in project ${projectId} to ${role}`,
				);
			}
		}

		// 8. 返回成功响应
		return {
			success: true,
			message: 'Permissions updated successfully',
		};
	}
}
