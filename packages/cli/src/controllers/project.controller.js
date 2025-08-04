'use strict';
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
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __param =
	(this && this.__param) ||
	function (paramIndex, decorator) {
		return function (target, key) {
			decorator(target, key, paramIndex);
		};
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ProjectController = void 0;
const api_types_1 = require('@n8n/api-types');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const permissions_1 = require('@n8n/permissions');
const typeorm_1 = require('@n8n/typeorm');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const event_service_1 = require('@/events/event.service');
const project_service_ee_1 = require('@/services/project.service.ee');
const email_1 = require('@/user-management/email');
let ProjectController = class ProjectController {
	constructor(projectsService, projectRepository, eventService, userManagementMailer) {
		this.projectsService = projectsService;
		this.projectRepository = projectRepository;
		this.eventService = eventService;
		this.userManagementMailer = userManagementMailer;
	}
	async getAllProjects(req) {
		return await this.projectsService.getAccessibleProjects(req.user);
	}
	async getProjectCounts() {
		return await this.projectsService.getProjectCounts();
	}
	async createProject(req, _res, payload) {
		try {
			const project = await this.projectsService.createTeamProject(req.user, payload);
			this.eventService.emit('team-project-created', {
				userId: req.user.id,
				role: req.user.role,
			});
			return {
				...project,
				role: 'project:admin',
				scopes: [
					...(0, permissions_1.combineScopes)({
						global: (0, permissions_1.getRoleScopes)(req.user.role),
						project: (0, permissions_1.getRoleScopes)('project:admin'),
					}),
				],
			};
		} catch (e) {
			if (e instanceof project_service_ee_1.TeamProjectOverQuotaError) {
				throw new bad_request_error_1.BadRequestError(e.message);
			}
			throw e;
		}
	}
	async getMyProjects(req, _res) {
		const relations = await this.projectsService.getProjectRelationsForUser(req.user);
		const otherTeamProject = (0, permissions_1.hasGlobalScope)(req.user, 'project:read')
			? await this.projectRepository.findBy({
					type: 'team',
					id: (0, typeorm_1.Not)((0, typeorm_1.In)(relations.map((pr) => pr.projectId))),
				})
			: [];
		const results = [];
		for (const pr of relations) {
			const result = Object.assign(this.projectRepository.create(pr.project), {
				role: pr.role,
				scopes: [],
			});
			if (result.scopes) {
				result.scopes.push(
					...(0, permissions_1.combineScopes)({
						global: (0, permissions_1.getRoleScopes)(req.user.role),
						project: (0, permissions_1.getRoleScopes)(pr.role),
					}),
				);
			}
			results.push(result);
		}
		for (const project of otherTeamProject) {
			const result = Object.assign(this.projectRepository.create(project), {
				role: req.user.role,
				scopes: [],
			});
			if (result.scopes) {
				result.scopes.push(
					...(0, permissions_1.combineScopes)({
						global: (0, permissions_1.getRoleScopes)(req.user.role),
					}),
				);
			}
			results.push(result);
		}
		for (const result of results) {
			if (result.scopes) {
				result.scopes = [...new Set(result.scopes)].sort();
			}
		}
		return results;
	}
	async getPersonalProject(req) {
		const project = await this.projectsService.getPersonalProject(req.user);
		if (!project) {
			throw new not_found_error_1.NotFoundError('Could not find a personal project for this user');
		}
		const scopes = [
			...(0, permissions_1.combineScopes)({
				global: (0, permissions_1.getRoleScopes)(req.user.role),
				project: (0, permissions_1.getRoleScopes)('project:personalOwner'),
			}),
		];
		return {
			...project,
			scopes,
		};
	}
	async getProject(req, _res, projectId) {
		const [{ id, name, icon, type, description }, relations] = await Promise.all([
			this.projectsService.getProject(projectId),
			this.projectsService.getProjectRelations(projectId),
		]);
		const myRelation = relations.find((r) => r.userId === req.user.id);
		return {
			id,
			name,
			icon,
			type,
			description,
			relations: relations.map((r) => ({
				id: r.user.id,
				email: r.user.email,
				firstName: r.user.firstName,
				lastName: r.user.lastName,
				role: r.role,
			})),
			scopes: [
				...(0, permissions_1.combineScopes)({
					global: (0, permissions_1.getRoleScopes)(req.user.role),
					...(myRelation ? { project: (0, permissions_1.getRoleScopes)(myRelation.role) } : {}),
				}),
			],
		};
	}
	async updateProject(req, _res, payload, projectId) {
		const { name, icon, relations, description } = payload;
		if (name || icon || description) {
			await this.projectsService.updateProject(projectId, { name, icon, description });
		}
		if (relations) {
			try {
				const { project, newRelations } = await this.projectsService.syncProjectRelations(
					projectId,
					relations,
				);
				await this.userManagementMailer.notifyProjectShared({
					sharer: req.user,
					newSharees: newRelations,
					project: { id: project.id, name: project.name },
				});
			} catch (e) {
				if (e instanceof project_service_ee_1.UnlicensedProjectRoleError) {
					throw new bad_request_error_1.BadRequestError(e.message);
				}
				throw e;
			}
			this.eventService.emit('team-project-updated', {
				userId: req.user.id,
				role: req.user.role,
				members: relations,
				projectId,
			});
		}
	}
	async deleteProject(req, _res, query, projectId) {
		await this.projectsService.deleteProject(req.user, projectId, {
			migrateToProject: query.transferId,
		});
		this.eventService.emit('team-project-deleted', {
			userId: req.user.id,
			role: req.user.role,
			projectId,
			removalType: query.transferId !== undefined ? 'transfer' : 'delete',
			targetProjectId: query.transferId,
		});
	}
};
exports.ProjectController = ProjectController;
__decorate(
	[
		(0, decorators_1.Get)('/'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'getAllProjects',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/count'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'getProjectCounts',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/'),
		(0, decorators_1.GlobalScope)('project:create'),
		(0, decorators_1.Licensed)('feat:projectRole:admin'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.CreateProjectDto]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'createProject',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/my-projects'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'getMyProjects',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/personal'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'getPersonalProject',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:projectId'),
		(0, decorators_1.ProjectScope)('project:read'),
		__param(2, (0, decorators_1.Param)('projectId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'getProject',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/:projectId'),
		(0, decorators_1.ProjectScope)('project:update'),
		__param(2, decorators_1.Body),
		__param(3, (0, decorators_1.Param)('projectId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.UpdateProjectDto, String]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'updateProject',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/:projectId'),
		(0, decorators_1.ProjectScope)('project:delete'),
		__param(2, decorators_1.Query),
		__param(3, (0, decorators_1.Param)('projectId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.DeleteProjectDto, String]),
		__metadata('design:returntype', Promise),
	],
	ProjectController.prototype,
	'deleteProject',
	null,
);
exports.ProjectController = ProjectController = __decorate(
	[
		(0, decorators_1.RestController)('/projects'),
		__metadata('design:paramtypes', [
			project_service_ee_1.ProjectService,
			db_1.ProjectRepository,
			event_service_1.EventService,
			email_1.UserManagementMailer,
		]),
	],
	ProjectController,
);
//# sourceMappingURL=project.controller.js.map
