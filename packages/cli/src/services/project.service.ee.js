'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ProjectService =
	exports.UnlicensedProjectRoleError =
	exports.TeamProjectOverQuotaError =
		void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const permissions_1 = require('@n8n/permissions');
const typeorm_1 = require('@n8n/typeorm');
const n8n_workflow_1 = require('n8n-workflow');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const cache_service_1 = require('./cache/cache.service');
const role_service_1 = require('./role.service');
class TeamProjectOverQuotaError extends n8n_workflow_1.UserError {
	constructor(limit) {
		super(
			`Attempted to create a new project but quota is already exhausted. You may have a maximum of ${limit} team projects.`,
		);
	}
}
exports.TeamProjectOverQuotaError = TeamProjectOverQuotaError;
class UnlicensedProjectRoleError extends n8n_workflow_1.UserError {
	constructor(role) {
		super(`Your instance is not licensed to use role "${role}".`);
	}
}
exports.UnlicensedProjectRoleError = UnlicensedProjectRoleError;
class ProjectNotFoundError extends not_found_error_1.NotFoundError {
	constructor(projectId) {
		super(`Could not find project with ID: ${projectId}`);
	}
	static isDefinedAndNotNull(value, projectId) {
		if (value === undefined || value === null) {
			throw new ProjectNotFoundError(projectId);
		}
	}
}
let ProjectService = class ProjectService {
	constructor(
		sharedWorkflowRepository,
		projectRepository,
		projectRelationRepository,
		roleService,
		sharedCredentialsRepository,
		cacheService,
		licenseState,
		databaseConfig,
	) {
		this.sharedWorkflowRepository = sharedWorkflowRepository;
		this.projectRepository = projectRepository;
		this.projectRelationRepository = projectRelationRepository;
		this.roleService = roleService;
		this.sharedCredentialsRepository = sharedCredentialsRepository;
		this.cacheService = cacheService;
		this.licenseState = licenseState;
		this.databaseConfig = databaseConfig;
	}
	get workflowService() {
		return Promise.resolve()
			.then(() => __importStar(require('@/workflows/workflow.service')))
			.then(({ WorkflowService }) => di_1.Container.get(WorkflowService));
	}
	get credentialsService() {
		return Promise.resolve()
			.then(() => __importStar(require('@/credentials/credentials.service')))
			.then(({ CredentialsService }) => di_1.Container.get(CredentialsService));
	}
	get folderService() {
		return Promise.resolve()
			.then(() => __importStar(require('@/services/folder.service')))
			.then(({ FolderService }) => di_1.Container.get(FolderService));
	}
	async deleteProject(user, projectId, { migrateToProject } = {}) {
		const workflowService = await this.workflowService;
		const credentialsService = await this.credentialsService;
		if (projectId === migrateToProject) {
			throw new bad_request_error_1.BadRequestError(
				'Request to delete a project failed because the project to delete and the project to migrate to are the same project',
			);
		}
		const project = await this.getProjectWithScope(user, projectId, ['project:delete']);
		ProjectNotFoundError.isDefinedAndNotNull(project, projectId);
		let targetProject = null;
		if (migrateToProject) {
			targetProject = await this.getProjectWithScope(user, migrateToProject, [
				'credential:create',
				'workflow:create',
			]);
			if (!targetProject) {
				throw new not_found_error_1.NotFoundError(
					`Could not find project to migrate to. ID: ${targetProject}. You may lack permissions to create workflow and credentials in the target project.`,
				);
			}
		}
		if (project.type !== 'team') {
			throw new forbidden_error_1.ForbiddenError(
				`Can't delete project. Project with ID "${projectId}" is not a team project.`,
			);
		}
		const ownedSharedWorkflows = await this.sharedWorkflowRepository.find({
			where: { projectId: project.id, role: 'workflow:owner' },
		});
		if (targetProject) {
			await this.sharedWorkflowRepository.makeOwner(
				ownedSharedWorkflows.map((sw) => sw.workflowId),
				targetProject.id,
			);
		} else {
			for (const sharedWorkflow of ownedSharedWorkflows) {
				await workflowService.delete(user, sharedWorkflow.workflowId, true);
			}
		}
		const ownedCredentials = await this.sharedCredentialsRepository.find({
			where: { projectId: project.id, role: 'credential:owner' },
			relations: { credentials: true },
		});
		if (targetProject) {
			await this.sharedCredentialsRepository.makeOwner(
				ownedCredentials.map((sc) => sc.credentialsId),
				targetProject.id,
			);
		} else {
			for (const sharedCredential of ownedCredentials) {
				await credentialsService.delete(user, sharedCredential.credentials.id);
			}
		}
		if (targetProject) {
			const folderService = await this.folderService;
			await folderService.transferAllFoldersToProject(project.id, targetProject.id);
		}
		await this.projectRepository.remove(project);
	}
	async findProjectsWorkflowIsIn(workflowId) {
		return await this.sharedWorkflowRepository.findProjectIds(workflowId);
	}
	async getAccessibleProjects(user) {
		if ((0, permissions_1.hasGlobalScope)(user, 'project:read')) {
			return await this.projectRepository.find();
		}
		return await this.projectRepository.getAccessibleProjects(user.id);
	}
	async getPersonalProjectOwners(projectIds) {
		return await this.projectRelationRepository.getPersonalProjectOwners(projectIds);
	}
	async createTeamProjectWithEntityManager(adminUser, data, trx) {
		const limit = this.licenseState.getMaxTeamProjects();
		if (limit !== constants_1.UNLIMITED_LICENSE_QUOTA) {
			const teamProjectCount = await trx.count(db_1.Project, { where: { type: 'team' } });
			if (teamProjectCount >= limit) {
				throw new TeamProjectOverQuotaError(limit);
			}
		}
		const project = await trx.save(
			db_1.Project,
			this.projectRepository.create({ ...data, type: 'team' }),
		);
		await this.addUser(project.id, { userId: adminUser.id, role: 'project:admin' }, trx);
		return project;
	}
	async createTeamProject(adminUser, data) {
		if (this.databaseConfig.isLegacySqlite) {
			return await this.createTeamProjectWithEntityManager(
				adminUser,
				data,
				this.projectRepository.manager,
			);
		} else {
			return await this.projectRepository.manager.transaction('SERIALIZABLE', async (trx) => {
				return await this.createTeamProjectWithEntityManager(adminUser, data, trx);
			});
		}
	}
	async updateProject(projectId, { name, icon, description }) {
		const result = await this.projectRepository.update(
			{ id: projectId, type: 'team' },
			{ name, icon, description },
		);
		if (!result.affected) {
			throw new ProjectNotFoundError(projectId);
		}
	}
	async getPersonalProject(user) {
		return await this.projectRepository.getPersonalProjectForUser(user.id);
	}
	async getProjectRelationsForUser(user) {
		return await this.projectRelationRepository.find({
			where: { userId: user.id },
			relations: ['project'],
		});
	}
	async syncProjectRelations(projectId, relations) {
		const project = await this.getTeamProjectWithRelations(projectId);
		this.checkRolesLicensed(project, relations);
		await this.projectRelationRepository.manager.transaction(async (em) => {
			await this.pruneRelations(em, project);
			await this.addManyRelations(em, project, relations);
		});
		const newRelations = relations.filter(
			(relation) => !project.projectRelations.some((r) => r.userId === relation.userId),
		);
		await this.clearCredentialCanUseExternalSecretsCache(projectId);
		return { project, newRelations };
	}
	async addUsersToProject(projectId, relations) {
		const project = await this.getTeamProjectWithRelations(projectId);
		this.checkRolesLicensed(project, relations);
		if (project.type === 'personal') {
			throw new forbidden_error_1.ForbiddenError("Can't add users to personal projects.");
		}
		if (relations.some((r) => r.role === 'project:personalOwner')) {
			throw new forbidden_error_1.ForbiddenError("Can't add a personalOwner to a team project.");
		}
		await this.projectRelationRepository.save(
			relations.map((relation) => ({ projectId, ...relation })),
		);
	}
	async getTeamProjectWithRelations(projectId) {
		const project = await this.projectRepository.findOne({
			where: { id: projectId, type: 'team' },
			relations: { projectRelations: true },
		});
		ProjectNotFoundError.isDefinedAndNotNull(project, projectId);
		return project;
	}
	checkRolesLicensed(project, relations) {
		for (const { role, userId } of relations) {
			const existing = project.projectRelations.find((pr) => pr.userId === userId);
			if (existing?.role !== role && !this.roleService.isRoleLicensed(role)) {
				throw new UnlicensedProjectRoleError(role);
			}
		}
	}
	isUserProjectOwner(project, userId) {
		return project.projectRelations.some(
			(pr) => pr.userId === userId && pr.role === 'project:personalOwner',
		);
	}
	async deleteUserFromProject(projectId, userId) {
		const project = await this.getTeamProjectWithRelations(projectId);
		if (this.isUserProjectOwner(project, userId)) {
			throw new forbidden_error_1.ForbiddenError(
				'Project owner cannot be removed from the project',
			);
		}
		await this.projectRelationRepository.delete({ projectId: project.id, userId });
	}
	async changeUserRoleInProject(projectId, userId, role) {
		if (role === 'project:personalOwner') {
			throw new forbidden_error_1.ForbiddenError(
				'Personal owner cannot be added to a team project.',
			);
		}
		const project = await this.getTeamProjectWithRelations(projectId);
		ProjectNotFoundError.isDefinedAndNotNull(project, projectId);
		const projectUserExists = project.projectRelations.some((r) => r.userId === userId);
		if (!projectUserExists) {
			throw new ProjectNotFoundError(projectId);
		}
		await this.projectRelationRepository.update({ projectId, userId }, { role });
	}
	async clearCredentialCanUseExternalSecretsCache(projectId) {
		const shares = await this.sharedCredentialsRepository.find({
			where: {
				projectId,
				role: 'credential:owner',
			},
			select: ['credentialsId'],
		});
		if (shares.length) {
			await this.cacheService.deleteMany(
				shares.map((share) => `credential-can-use-secrets:${share.credentialsId}`),
			);
		}
	}
	async pruneRelations(em, project) {
		await em.delete(db_1.ProjectRelation, { projectId: project.id });
	}
	async addManyRelations(em, project, relations) {
		await em.insert(
			db_1.ProjectRelation,
			relations.map((v) =>
				this.projectRelationRepository.create({
					projectId: project.id,
					userId: v.userId,
					role: v.role,
				}),
			),
		);
	}
	async getProjectWithScope(user, projectId, scopes, entityManager) {
		const em = entityManager ?? this.projectRepository.manager;
		let where = {
			id: projectId,
		};
		if (!(0, permissions_1.hasGlobalScope)(user, scopes, { mode: 'allOf' })) {
			const projectRoles = (0, permissions_1.rolesWithScope)('project', scopes);
			where = {
				...where,
				projectRelations: {
					role: (0, typeorm_1.In)(projectRoles),
					userId: user.id,
				},
			};
		}
		return await em.findOne(db_1.Project, {
			where,
		});
	}
	async addUser(projectId, { userId, role }, trx) {
		trx = trx ?? this.projectRelationRepository.manager;
		return await trx.save(db_1.ProjectRelation, {
			projectId,
			userId,
			role,
		});
	}
	async getProject(projectId) {
		return await this.projectRepository.findOneOrFail({
			where: {
				id: projectId,
			},
		});
	}
	async getProjectRelations(projectId) {
		return await this.projectRelationRepository.find({
			where: { projectId },
			relations: { user: true },
		});
	}
	async getUserOwnedOrAdminProjects(userId) {
		return await this.projectRepository.find({
			where: {
				projectRelations: {
					userId,
					role: (0, typeorm_1.In)(['project:personalOwner', 'project:admin']),
				},
			},
		});
	}
	async getProjectCounts() {
		return await this.projectRepository.getProjectCounts();
	}
};
exports.ProjectService = ProjectService;
exports.ProjectService = ProjectService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			db_1.SharedWorkflowRepository,
			db_1.ProjectRepository,
			db_1.ProjectRelationRepository,
			role_service_1.RoleService,
			db_1.SharedCredentialsRepository,
			cache_service_1.CacheService,
			backend_common_1.LicenseState,
			config_1.DatabaseConfig,
		]),
	],
	ProjectService,
);
//# sourceMappingURL=project.service.ee.js.map
