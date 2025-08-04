'use strict';
const api_types_1 = require('@n8n/api-types');
const di_1 = require('@n8n/di');
const source_control_helper_ee_1 = require('@/environments.ee/source-control/source-control-helper.ee');
const source_control_preferences_service_ee_1 = require('@/environments.ee/source-control/source-control-preferences.service.ee');
const source_control_service_ee_1 = require('@/environments.ee/source-control/source-control.service.ee');
const event_service_1 = require('@/events/event.service');
const global_middleware_1 = require('../../shared/middlewares/global.middleware');
module.exports = {
	pull: [
		(0, global_middleware_1.apiKeyHasScopeWithGlobalScopeFallback)({
			apiKeyScope: 'sourceControl:pull',
			globalScope: 'sourceControl:manage',
		}),
		async (req, res) => {
			const sourceControlPreferencesService = di_1.Container.get(
				source_control_preferences_service_ee_1.SourceControlPreferencesService,
			);
			if (!(0, source_control_helper_ee_1.isSourceControlLicensed)()) {
				return res
					.status(401)
					.json({ status: 'Error', message: 'Source Control feature is not licensed' });
			}
			if (!sourceControlPreferencesService.isSourceControlConnected()) {
				return res
					.status(400)
					.json({ status: 'Error', message: 'Source Control is not connected to a repository' });
			}
			try {
				const payload = api_types_1.PullWorkFolderRequestDto.parse(req.body);
				const sourceControlService = di_1.Container.get(
					source_control_service_ee_1.SourceControlService,
				);
				const result = await sourceControlService.pullWorkfolder(req.user, payload);
				if (result.statusCode === 200) {
					di_1.Container.get(event_service_1.EventService).emit('source-control-user-pulled-api', {
						...(0, source_control_helper_ee_1.getTrackingInformationFromPullResult)(
							req.user.id,
							result.statusResult,
						),
						forced: payload.force ?? false,
					});
					return res.status(200).send(result.statusResult);
				} else {
					return res.status(409).send(result.statusResult);
				}
			} catch (error) {
				return res.status(400).send(error.message);
			}
		},
	],
	getCommitHistory: [
		(0, global_middleware_1.apiKeyHasScopeWithGlobalScopeFallback)({
			apiKeyScope: 'sourceControl:pull',
			globalScope: 'sourceControl:manage',
		}),
		async (req, res) => {
			const sourceControlPreferencesService = di_1.Container.get(
				source_control_preferences_service_ee_1.SourceControlPreferencesService,
			);
			if (!(0, source_control_helper_ee_1.isSourceControlLicensed)()) {
				return res
					.status(401)
					.json({ status: 'Error', message: 'Source Control feature is not licensed' });
			}
			if (!sourceControlPreferencesService.isSourceControlConnected()) {
				return res
					.status(400)
					.json({ status: 'Error', message: 'Source Control is not connected to a repository' });
			}
			try {
				const sourceControlService = di_1.Container.get(
					source_control_service_ee_1.SourceControlService,
				);
				const query = req.query;
				const limit = parseInt(query.limit || '10');
				const offset = parseInt(query.offset || '0');
				const commits = await sourceControlService.getCommitHistory({ limit, offset });
				return res.status(200).json({ commits });
			} catch (error) {
				return res.status(400).json({
					status: 'Error',
					message: error.message,
				});
			}
		},
	],
	getRepositoryStatus: [
		(0, global_middleware_1.apiKeyHasScopeWithGlobalScopeFallback)({
			apiKeyScope: 'sourceControl:pull',
			globalScope: 'sourceControl:manage',
		}),
		async (req, res) => {
			const sourceControlPreferencesService = di_1.Container.get(
				source_control_preferences_service_ee_1.SourceControlPreferencesService,
			);
			if (!(0, source_control_helper_ee_1.isSourceControlLicensed)()) {
				return res
					.status(401)
					.json({ status: 'Error', message: 'Source Control feature is not licensed' });
			}
			if (!sourceControlPreferencesService.isSourceControlConnected()) {
				return res
					.status(400)
					.json({ status: 'Error', message: 'Source Control is not connected to a repository' });
			}
			try {
				const sourceControlService = di_1.Container.get(
					source_control_service_ee_1.SourceControlService,
				);
				const status = await sourceControlService.getStatus(req.user, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				});
				return res.status(200).json(status);
			} catch (error) {
				return res.status(400).json({
					status: 'Error',
					message: error.message,
				});
			}
		},
	],
	syncCheck: [
		(0, global_middleware_1.apiKeyHasScopeWithGlobalScopeFallback)({
			apiKeyScope: 'sourceControl:pull',
			globalScope: 'sourceControl:manage',
		}),
		async (_req, res) => {
			const sourceControlPreferencesService = di_1.Container.get(
				source_control_preferences_service_ee_1.SourceControlPreferencesService,
			);
			if (!(0, source_control_helper_ee_1.isSourceControlLicensed)()) {
				return res
					.status(401)
					.json({ status: 'Error', message: 'Source Control feature is not licensed' });
			}
			if (!sourceControlPreferencesService.isSourceControlConnected()) {
				return res
					.status(400)
					.json({ status: 'Error', message: 'Source Control is not connected to a repository' });
			}
			try {
				const sourceControlService = di_1.Container.get(
					source_control_service_ee_1.SourceControlService,
				);
				const syncStatus = await sourceControlService.getBranches();
				return res.status(200).json(syncStatus);
			} catch (error) {
				return res.status(400).json({
					status: 'Error',
					message: error.message,
				});
			}
		},
	],
	setBranch: [
		(0, global_middleware_1.apiKeyHasScopeWithGlobalScopeFallback)({
			apiKeyScope: 'sourceControl:pull',
			globalScope: 'sourceControl:manage',
		}),
		async (req, res) => {
			const sourceControlPreferencesService = di_1.Container.get(
				source_control_preferences_service_ee_1.SourceControlPreferencesService,
			);
			if (!(0, source_control_helper_ee_1.isSourceControlLicensed)()) {
				return res
					.status(401)
					.json({ status: 'Error', message: 'Source Control feature is not licensed' });
			}
			if (!sourceControlPreferencesService.isSourceControlConnected()) {
				return res
					.status(400)
					.json({ status: 'Error', message: 'Source Control is not connected to a repository' });
			}
			try {
				const sourceControlService = di_1.Container.get(
					source_control_service_ee_1.SourceControlService,
				);
				const branchName = req.body.branch;
				if (!branchName) {
					return res.status(400).json({
						status: 'Error',
						message: 'Branch name is required',
					});
				}
				await sourceControlService.setBranch(branchName);
				return res.status(200).json({ status: 'success', branch: branchName });
			} catch (error) {
				return res.status(400).json({
					status: 'Error',
					message: error.message,
				});
			}
		},
	],
};
//# sourceMappingURL=source-control.handler.js.map
