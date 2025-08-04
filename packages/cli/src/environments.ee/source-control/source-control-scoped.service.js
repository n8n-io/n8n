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
Object.defineProperty(exports, '__esModule', { value: true });
exports.SourceControlScopedService = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const permissions_1 = require('@n8n/permissions');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const source_control_context_1 = require('./types/source-control-context');
let SourceControlScopedService = class SourceControlScopedService {
	constructor(projectRepository, workflowRepository) {
		this.projectRepository = projectRepository;
		this.workflowRepository = workflowRepository;
	}
	async ensureIsAllowedToPush(req) {
		if ((0, permissions_1.hasGlobalScope)(req.user, 'sourceControl:push')) {
			return;
		}
		const ctx = new source_control_context_1.SourceControlContext(req.user);
		const projectsWithAdminAccess = await this.getAdminProjectsFromContext(ctx);
		if (projectsWithAdminAccess?.length === 0) {
			throw new forbidden_error_1.ForbiddenError('You are not allowed to push changes');
		}
	}
	async getAdminProjectsFromContext(context) {
		if (context.hasAccessToAllProjects()) {
			return await this.projectRepository.find({
				relations: {
					projectRelations: {
						user: true,
					},
				},
			});
		}
		return await this.projectRepository.find({
			relations: {
				projectRelations: {
					user: true,
				},
			},
			select: {
				id: true,
				name: true,
				type: true,
			},
			where: this.getAdminProjectsByContextFilter(context),
		});
	}
	async getWorkflowsInAdminProjectsFromContext(context, id) {
		if (context.hasAccessToAllProjects()) {
			return;
		}
		const where = this.getWorkflowsInAdminProjectsFromContextFilter(context);
		if (id) {
			where.id = id;
		}
		return await this.workflowRepository.find({
			select: {
				id: true,
			},
			where,
		});
	}
	getAdminProjectsByContextFilter(context) {
		if (context.hasAccessToAllProjects()) {
			return;
		}
		return {
			type: 'team',
			projectRelations: {
				role: 'project:admin',
				userId: context.user.id,
			},
		};
	}
	getFoldersInAdminProjectsFromContextFilter(context) {
		if (context.hasAccessToAllProjects()) {
			return {};
		}
		return {
			homeProject: this.getAdminProjectsByContextFilter(context),
		};
	}
	getWorkflowsInAdminProjectsFromContextFilter(context) {
		if (context.hasAccessToAllProjects()) {
			return {};
		}
		return {
			shared: {
				role: 'workflow:owner',
				project: this.getAdminProjectsByContextFilter(context),
			},
		};
	}
	getCredentialsInAdminProjectsFromContextFilter(context) {
		if (context.hasAccessToAllProjects()) {
			return {};
		}
		return {
			shared: {
				role: 'credential:owner',
				project: this.getAdminProjectsByContextFilter(context),
			},
		};
	}
	getWorkflowTagMappingInAdminProjectsFromContextFilter(context) {
		if (context.hasAccessToAllProjects()) {
			return {};
		}
		return {
			workflows: this.getWorkflowsInAdminProjectsFromContextFilter(context),
		};
	}
};
exports.SourceControlScopedService = SourceControlScopedService;
exports.SourceControlScopedService = SourceControlScopedService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [db_1.ProjectRepository, db_1.WorkflowRepository]),
	],
	SourceControlScopedService,
);
//# sourceMappingURL=source-control-scoped.service.js.map
