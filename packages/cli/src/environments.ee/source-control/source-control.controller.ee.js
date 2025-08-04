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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.SourceControlController = void 0;
const api_types_1 = require('@n8n/api-types');
const decorators_1 = require('@n8n/decorators');
const express_1 = __importDefault(require('express'));
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const event_service_1 = require('@/events/event.service');
const constants_1 = require('./constants');
const source_control_enabled_middleware_ee_1 = require('./middleware/source-control-enabled-middleware.ee');
const source_control_helper_ee_1 = require('./source-control-helper.ee');
const source_control_preferences_service_ee_1 = require('./source-control-preferences.service.ee');
const source_control_scoped_service_1 = require('./source-control-scoped.service');
const source_control_service_ee_1 = require('./source-control.service.ee');
const source_control_get_status_1 = require('./types/source-control-get-status');
let SourceControlController = class SourceControlController {
	constructor(
		sourceControlService,
		sourceControlPreferencesService,
		sourceControlScopedService,
		eventService,
	) {
		this.sourceControlService = sourceControlService;
		this.sourceControlPreferencesService = sourceControlPreferencesService;
		this.sourceControlScopedService = sourceControlScopedService;
		this.eventService = eventService;
	}
	async getPreferences() {
		const publicKey = await this.sourceControlPreferencesService.getPublicKey();
		return { ...this.sourceControlPreferencesService.getPreferences(), publicKey };
	}
	async setPreferences(req) {
		if (
			req.body.branchReadOnly === undefined &&
			this.sourceControlPreferencesService.isSourceControlConnected()
		) {
			throw new bad_request_error_1.BadRequestError(
				'Cannot change preferences while connected to a source control provider. Please disconnect first.',
			);
		}
		try {
			const sanitizedPreferences = {
				...req.body,
				initRepo: req.body.initRepo ?? true,
				connected: undefined,
				publicKey: undefined,
			};
			await this.sourceControlPreferencesService.validateSourceControlPreferences(
				sanitizedPreferences,
			);
			const updatedPreferences =
				await this.sourceControlPreferencesService.setPreferences(sanitizedPreferences);
			if (sanitizedPreferences.initRepo === true) {
				try {
					await this.sourceControlService.initializeRepository(
						{
							...updatedPreferences,
							branchName:
								updatedPreferences.branchName === ''
									? constants_1.SOURCE_CONTROL_DEFAULT_BRANCH
									: updatedPreferences.branchName,
							initRepo: true,
						},
						req.user,
					);
					if (this.sourceControlPreferencesService.getPreferences().branchName !== '') {
						await this.sourceControlPreferencesService.setPreferences({
							connected: true,
						});
					}
				} catch (error) {
					await this.sourceControlService.disconnect({ keepKeyPair: true });
					throw error;
				}
			}
			await this.sourceControlService.init();
			const resultingPreferences = this.sourceControlPreferencesService.getPreferences();
			this.eventService.emit('source-control-settings-updated', {
				branchName: resultingPreferences.branchName,
				connected: resultingPreferences.connected,
				readOnlyInstance: resultingPreferences.branchReadOnly,
				repoType: (0, source_control_helper_ee_1.getRepoType)(resultingPreferences.repositoryUrl),
			});
			return resultingPreferences;
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(error.message);
		}
	}
	async updatePreferences(req) {
		try {
			const sanitizedPreferences = {
				...req.body,
				initRepo: false,
				connected: undefined,
				publicKey: undefined,
				repositoryUrl: undefined,
			};
			const currentPreferences = this.sourceControlPreferencesService.getPreferences();
			await this.sourceControlPreferencesService.validateSourceControlPreferences(
				sanitizedPreferences,
			);
			if (
				sanitizedPreferences.branchName &&
				sanitizedPreferences.branchName !== currentPreferences.branchName
			) {
				await this.sourceControlService.setBranch(sanitizedPreferences.branchName);
			}
			if (sanitizedPreferences.branchColor ?? sanitizedPreferences.branchReadOnly !== undefined) {
				await this.sourceControlPreferencesService.setPreferences(
					{
						branchColor: sanitizedPreferences.branchColor,
						branchReadOnly: sanitizedPreferences.branchReadOnly,
					},
					true,
				);
			}
			await this.sourceControlService.init();
			const resultingPreferences = this.sourceControlPreferencesService.getPreferences();
			this.eventService.emit('source-control-settings-updated', {
				branchName: resultingPreferences.branchName,
				connected: resultingPreferences.connected,
				readOnlyInstance: resultingPreferences.branchReadOnly,
				repoType: (0, source_control_helper_ee_1.getRepoType)(resultingPreferences.repositoryUrl),
			});
			return resultingPreferences;
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(error.message);
		}
	}
	async disconnect(req) {
		try {
			return await this.sourceControlService.disconnect(req.body);
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(error.message);
		}
	}
	async getBranches() {
		try {
			return await this.sourceControlService.getBranches();
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(error.message);
		}
	}
	async pushWorkfolder(req, res, payload) {
		await this.sourceControlScopedService.ensureIsAllowedToPush(req);
		try {
			await this.sourceControlService.setGitUserDetails(
				`${req.user.firstName} ${req.user.lastName}`,
				req.user.email,
			);
			const result = await this.sourceControlService.pushWorkfolder(req.user, payload);
			res.statusCode = result.statusCode;
			return result.statusResult;
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(error.message);
		}
	}
	async pullWorkfolder(req, res, payload) {
		try {
			const result = await this.sourceControlService.pullWorkfolder(req.user, payload);
			res.statusCode = result.statusCode;
			return result.statusResult;
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(error.message);
		}
	}
	async resetWorkfolder() {
		try {
			return await this.sourceControlService.resetWorkfolder();
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(error.message);
		}
	}
	async getStatus(req) {
		try {
			const result = await this.sourceControlService.getStatus(
				req.user,
				new source_control_get_status_1.SourceControlGetStatus(req.query),
			);
			return result;
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(error.message);
		}
	}
	async status(req) {
		try {
			return await this.sourceControlService.getStatus(
				req.user,
				new source_control_get_status_1.SourceControlGetStatus(req.query),
			);
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(error.message);
		}
	}
	async generateKeyPair(req) {
		try {
			const keyPairType = req.body.keyGeneratorType;
			const result = await this.sourceControlPreferencesService.generateAndSaveKeyPair(keyPairType);
			const publicKey = await this.sourceControlPreferencesService.getPublicKey();
			return { ...result, publicKey };
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(error.message);
		}
	}
	async getFileContent(req) {
		try {
			const { type, id } = req.params;
			const content = await this.sourceControlService.getRemoteFileEntity({
				user: req.user,
				type,
				id,
			});
			return { content, type };
		} catch (error) {
			if (error instanceof forbidden_error_1.ForbiddenError) {
				throw error;
			}
			throw new bad_request_error_1.BadRequestError(error.message);
		}
	}
	async pullChanges(req, res) {
		try {
			const result = await this.sourceControlService.pullWorkfolder(req.user, {
				force: false,
			});
			this.eventService.emit('workflow-created', {
				userId: req.user.id,
				timestamp: new Date().toISOString(),
			});
			res.statusCode = result.statusCode;
			return {
				success: result.statusCode < 300,
				message: 'Pull operation completed',
				changes: Array.isArray(result.statusResult) ? result.statusResult : undefined,
			};
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(`Pull operation failed: ${error.message}`);
		}
	}
	async getRepositoryStatus(req) {
		try {
			const preferences = this.sourceControlPreferencesService.getPreferences();
			const branches = await this.sourceControlService.getBranches();
			const status = await this.sourceControlService.getStatus(req.user, {
				direction: 'push',
				preferLocalVersion: true,
				verbose: false,
			});
			const hasChanges = Array.isArray(status) && status.length > 0;
			return {
				connected: preferences.connected,
				branch: branches.currentBranch,
				branches: branches.branches,
				hasChanges,
				repositoryUrl: preferences.repositoryUrl,
			};
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(
				`Repository status check failed: ${error.message}`,
			);
		}
	}
	async setBranch(req) {
		try {
			const { branch, createIfNotExists = false } = req.body;
			if (!branch || typeof branch !== 'string') {
				throw new bad_request_error_1.BadRequestError(
					'Branch name is required and must be a string',
				);
			}
			const branchInfo = await this.sourceControlService.getBranches();
			if (!branchInfo.branches.includes(branch) && !createIfNotExists) {
				throw new bad_request_error_1.BadRequestError(
					`Branch '${branch}' does not exist. Set createIfNotExists to true to create it.`,
				);
			}
			const result = await this.sourceControlService.setBranch(branch);
			this.eventService.emit('workflow-created', {
				userId: req.user.id,
				fromBranch: branchInfo.currentBranch,
				toBranch: branch,
				timestamp: new Date().toISOString(),
			});
			return {
				success: true,
				currentBranch: result.currentBranch,
				branches: result.branches,
			};
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(`Branch switch failed: ${error.message}`);
		}
	}
	async getCommitHistory(req) {
		try {
			const limit = parseInt(req.query.limit || '10', 10);
			const offset = parseInt(req.query.offset || '0', 10);
			const commits = await this.sourceControlService.getCommitHistory({ limit, offset });
			return { commits };
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(
				`Commit history retrieval failed: ${error.message}`,
			);
		}
	}
	async syncCheck(req) {
		try {
			const status = await this.sourceControlService.getStatus(req.user, {
				direction: 'push',
				preferLocalVersion: true,
				verbose: false,
			});
			const statusArray = Array.isArray(status) ? status : [];
			const conflicts = statusArray.filter((file) => file.conflict).map((file) => file.name);
			return {
				inSync: statusArray.length === 0,
				behind: 0,
				ahead: statusArray.length,
				conflicts,
			};
		} catch (error) {
			throw new bad_request_error_1.BadRequestError(`Sync check failed: ${error.message}`);
		}
	}
};
exports.SourceControlController = SourceControlController;
__decorate(
	[
		(0, decorators_1.Get)('/preferences', {
			middlewares: [source_control_enabled_middleware_ee_1.sourceControlLicensedMiddleware],
			skipAuth: true,
		}),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'getPreferences',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/preferences', {
			middlewares: [source_control_enabled_middleware_ee_1.sourceControlLicensedMiddleware],
		}),
		(0, decorators_1.GlobalScope)('sourceControl:manage'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'setPreferences',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/preferences', {
			middlewares: [source_control_enabled_middleware_ee_1.sourceControlLicensedMiddleware],
		}),
		(0, decorators_1.GlobalScope)('sourceControl:manage'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'updatePreferences',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/disconnect', {
			middlewares: [source_control_enabled_middleware_ee_1.sourceControlLicensedMiddleware],
		}),
		(0, decorators_1.GlobalScope)('sourceControl:manage'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'disconnect',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/get-branches', {
			middlewares: [source_control_enabled_middleware_ee_1.sourceControlLicensedMiddleware],
		}),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'getBranches',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/push-workfolder', {
			middlewares: [
				source_control_enabled_middleware_ee_1.sourceControlLicensedAndEnabledMiddleware,
			],
		}),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.PushWorkFolderRequestDto]),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'pushWorkfolder',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/pull-workfolder', {
			middlewares: [
				source_control_enabled_middleware_ee_1.sourceControlLicensedAndEnabledMiddleware,
			],
		}),
		(0, decorators_1.GlobalScope)('sourceControl:pull'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.PullWorkFolderRequestDto]),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'pullWorkfolder',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/reset-workfolder', {
			middlewares: [
				source_control_enabled_middleware_ee_1.sourceControlLicensedAndEnabledMiddleware,
			],
		}),
		(0, decorators_1.GlobalScope)('sourceControl:manage'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'resetWorkfolder',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/get-status', {
			middlewares: [
				source_control_enabled_middleware_ee_1.sourceControlLicensedAndEnabledMiddleware,
			],
		}),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'getStatus',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/status', {
			middlewares: [source_control_enabled_middleware_ee_1.sourceControlLicensedMiddleware],
		}),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'status',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/generate-key-pair', {
			middlewares: [source_control_enabled_middleware_ee_1.sourceControlLicensedMiddleware],
		}),
		(0, decorators_1.GlobalScope)('sourceControl:manage'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'generateKeyPair',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/remote-content/:type/:id', {
			middlewares: [
				source_control_enabled_middleware_ee_1.sourceControlLicensedAndEnabledMiddleware,
			],
		}),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'getFileContent',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/pull', {
			middlewares: [
				source_control_enabled_middleware_ee_1.sourceControlLicensedAndEnabledMiddleware,
			],
		}),
		(0, decorators_1.GlobalScope)('sourceControl:pull'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'pullChanges',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/repository-status', {
			middlewares: [
				source_control_enabled_middleware_ee_1.sourceControlLicensedAndEnabledMiddleware,
			],
		}),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'getRepositoryStatus',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/set-branch', {
			middlewares: [
				source_control_enabled_middleware_ee_1.sourceControlLicensedAndEnabledMiddleware,
			],
		}),
		(0, decorators_1.GlobalScope)('sourceControl:manage'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'setBranch',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/commit-history', {
			middlewares: [
				source_control_enabled_middleware_ee_1.sourceControlLicensedAndEnabledMiddleware,
			],
		}),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'getCommitHistory',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/sync-check', {
			middlewares: [
				source_control_enabled_middleware_ee_1.sourceControlLicensedAndEnabledMiddleware,
			],
		}),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	SourceControlController.prototype,
	'syncCheck',
	null,
);
exports.SourceControlController = SourceControlController = __decorate(
	[
		(0, decorators_1.RestController)('/source-control'),
		__metadata('design:paramtypes', [
			source_control_service_ee_1.SourceControlService,
			source_control_preferences_service_ee_1.SourceControlPreferencesService,
			source_control_scoped_service_1.SourceControlScopedService,
			event_service_1.EventService,
		]),
	],
	SourceControlController,
);
//# sourceMappingURL=source-control.controller.ee.js.map
