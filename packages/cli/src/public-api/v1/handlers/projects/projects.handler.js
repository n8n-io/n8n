'use strict';
const api_types_1 = require('@n8n/api-types');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const project_controller_1 = require('@/controllers/project.controller');
const response_error_1 = require('@/errors/response-errors/abstract/response.error');
const project_service_ee_1 = require('@/services/project.service.ee');
const global_middleware_1 = require('../../shared/middlewares/global.middleware');
const pagination_service_1 = require('../../shared/services/pagination.service');
module.exports = {
	createProject: [
		(0, global_middleware_1.isLicensed)('feat:projectRole:admin'),
		(0, global_middleware_1.apiKeyHasScopeWithGlobalScopeFallback)({ scope: 'project:create' }),
		async (req, res) => {
			const payload = api_types_1.CreateProjectDto.safeParse(req.body);
			if (payload.error) {
				return res.status(400).json(payload.error.errors[0]);
			}
			const project = await di_1.Container.get(
				project_controller_1.ProjectController,
			).createProject(req, res, payload.data);
			return res.status(201).json(project);
		},
	],
	updateProject: [
		(0, global_middleware_1.isLicensed)('feat:projectRole:admin'),
		(0, global_middleware_1.apiKeyHasScopeWithGlobalScopeFallback)({ scope: 'project:update' }),
		async (req, res) => {
			const payload = api_types_1.UpdateProjectDto.safeParse(req.body);
			if (payload.error) {
				return res.status(400).json(payload.error.errors[0]);
			}
			await di_1.Container.get(project_controller_1.ProjectController).updateProject(
				req,
				res,
				payload.data,
				req.params.projectId,
			);
			return res.status(204).send();
		},
	],
	deleteProject: [
		(0, global_middleware_1.isLicensed)('feat:projectRole:admin'),
		(0, global_middleware_1.apiKeyHasScopeWithGlobalScopeFallback)({ scope: 'project:delete' }),
		async (req, res) => {
			const query = api_types_1.DeleteProjectDto.safeParse(req.query);
			if (query.error) {
				return res.status(400).json(query.error.errors[0]);
			}
			await di_1.Container.get(project_controller_1.ProjectController).deleteProject(
				req,
				res,
				query.data,
				req.params.projectId,
			);
			return res.status(204).send();
		},
	],
	getProjects: [
		(0, global_middleware_1.isLicensed)('feat:projectRole:admin'),
		(0, global_middleware_1.apiKeyHasScopeWithGlobalScopeFallback)({ scope: 'project:list' }),
		global_middleware_1.validCursor,
		async (req, res) => {
			const { offset = 0, limit = 100 } = req.query;
			const [projects, count] = await di_1.Container.get(db_1.ProjectRepository).findAndCount({
				skip: offset,
				take: limit,
			});
			return res.json({
				data: projects,
				nextCursor: (0, pagination_service_1.encodeNextCursor)({
					offset,
					limit,
					numberOfTotalRecords: count,
				}),
			});
		},
	],
	addUsersToProject: [
		(0, global_middleware_1.isLicensed)('feat:projectRole:admin'),
		(0, global_middleware_1.apiKeyHasScopeWithGlobalScopeFallback)({ scope: 'project:update' }),
		async (req, res) => {
			const payload = api_types_1.AddUsersToProjectDto.safeParse(req.body);
			if (payload.error) {
				return res.status(400).json(payload.error.errors[0]);
			}
			try {
				await di_1.Container.get(project_service_ee_1.ProjectService).addUsersToProject(
					req.params.projectId,
					payload.data.relations,
				);
			} catch (error) {
				if (error instanceof response_error_1.ResponseError) {
					return res.status(error.httpStatusCode).send({ message: error.message });
				}
				throw error;
			}
			return res.status(201).send();
		},
	],
	changeUserRoleInProject: [
		(0, global_middleware_1.isLicensed)('feat:projectRole:admin'),
		(0, global_middleware_1.apiKeyHasScopeWithGlobalScopeFallback)({ scope: 'project:update' }),
		async (req, res) => {
			const payload = api_types_1.ChangeUserRoleInProject.safeParse(req.body);
			if (payload.error) {
				return res.status(400).json(payload.error.errors[0]);
			}
			const { projectId, userId } = req.params;
			const { role } = payload.data;
			try {
				await di_1.Container.get(project_service_ee_1.ProjectService).changeUserRoleInProject(
					projectId,
					userId,
					role,
				);
			} catch (error) {
				if (error instanceof response_error_1.ResponseError) {
					return res.status(error.httpStatusCode).send({ message: error.message });
				}
				throw error;
			}
			return res.status(204).send();
		},
	],
	deleteUserFromProject: [
		(0, global_middleware_1.isLicensed)('feat:projectRole:admin'),
		(0, global_middleware_1.apiKeyHasScopeWithGlobalScopeFallback)({ scope: 'project:update' }),
		async (req, res) => {
			const { projectId, userId } = req.params;
			try {
				await di_1.Container.get(project_service_ee_1.ProjectService).deleteUserFromProject(
					projectId,
					userId,
				);
			} catch (error) {
				if (error instanceof response_error_1.ResponseError) {
					return res.status(error.httpStatusCode).send({ message: error.message });
				}
				throw error;
			}
			return res.status(204).send();
		},
	],
};
//# sourceMappingURL=projects.handler.js.map
