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
exports.MigrationController = void 0;
const api_types_1 = require('@n8n/api-types');
const backend_common_1 = require('@n8n/backend-common');
const decorators_1 = require('@n8n/decorators');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const event_service_1 = require('@/events/event.service');
const migration_service_1 = require('@/services/migration.service');
const instance_sync_service_1 = require('@/services/instance-sync.service');
let MigrationController = class MigrationController {
	constructor(logger, migrationService, instanceSyncService, eventService) {
		this.logger = logger;
		this.migrationService = migrationService;
		this.instanceSyncService = instanceSyncService;
		this.eventService = eventService;
	}
	async exportInstance(req, _, request) {
		try {
			this.logger.info('Instance export endpoint called', {
				requesterId: req.user.id,
				userRole: req.user.role,
				includeWorkflows: request.includeWorkflows,
				includeCredentials: request.includeCredentials,
				includeSettings: request.includeSettings,
				includeUsers: request.includeUsers,
				projectIds: request.projectIds?.length,
			});
			if (!request.includeWorkflows && !request.includeCredentials && !request.includeSettings) {
				throw new bad_request_error_1.BadRequestError(
					'At least one resource type must be selected for export',
				);
			}
			const result = await this.migrationService.exportInstance(req.user, request);
			this.eventService.emit('instance-export-requested', {
				requesterId: req.user.id,
				exportId: result.exportId,
				includeWorkflows: request.includeWorkflows,
				includeCredentials: request.includeCredentials,
				includeSettings: request.includeSettings,
				includeUsers: request.includeUsers,
				totalSize: result.totalSize,
			});
			this.logger.info('Instance export endpoint completed', {
				requesterId: req.user.id,
				exportId: result.exportId,
				status: result.status,
				fileSize: result.totalSize,
			});
			return result;
		} catch (error) {
			const errorContext = {
				requesterId: req.user?.id,
				userRole: req.user?.role,
				request: {
					includeWorkflows: request.includeWorkflows,
					includeCredentials: request.includeCredentials,
					includeSettings: request.includeSettings,
					includeUsers: request.includeUsers,
					projectIds: request.projectIds,
				},
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			};
			this.logger.error('Instance export endpoint failed', errorContext);
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof internal_server_error_1.InternalServerError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError('Export operation failed');
		}
	}
	async importInstance(req, _, request) {
		try {
			this.logger.info('Instance import endpoint called', {
				requesterId: req.user.id,
				userRole: req.user.role,
				sourceExportId: request.exportId,
				conflictResolution: request.conflictResolution,
				createMissingProjects: request.createMissingProjects,
			});
			if (!request.exportId && !request.exportData) {
				throw new bad_request_error_1.BadRequestError(
					'Either exportId or exportData must be provided',
				);
			}
			const result = await this.migrationService.importInstance(req.user, request);
			this.eventService.emit('instance-import-requested', {
				requesterId: req.user.id,
				importId: result.importId,
				sourceExportId: request.exportId,
				conflictResolution: request.conflictResolution,
				totalImported: result.summary.totalImported,
				totalSkipped: result.summary.totalSkipped,
				totalErrors: result.summary.totalErrors,
			});
			this.logger.info('Instance import endpoint completed', {
				requesterId: req.user.id,
				importId: result.importId,
				status: result.status,
				summary: result.summary,
			});
			return result;
		} catch (error) {
			const errorContext = {
				requesterId: req.user?.id,
				userRole: req.user?.role,
				request: {
					exportId: request.exportId,
					conflictResolution: request.conflictResolution,
					createMissingProjects: request.createMissingProjects,
				},
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			};
			this.logger.error('Instance import endpoint failed', errorContext);
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof internal_server_error_1.InternalServerError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError('Import operation failed');
		}
	}
	async directInstanceTransfer(req, _, request) {
		try {
			this.logger.info('Direct instance transfer endpoint called', {
				requesterId: req.user.id,
				userRole: req.user.role,
				targetInstanceUrl: this.sanitizeUrl(request.targetInstanceUrl),
				includeWorkflows: request.includeWorkflows,
				includeCredentials: request.includeCredentials,
				includeSettings: request.includeSettings,
				conflictResolution: request.conflictResolution,
			});
			if (!request.targetInstanceUrl) {
				throw new bad_request_error_1.BadRequestError('Target instance URL is required');
			}
			if (
				!request.targetApiKey &&
				!request.targetAuthToken &&
				!(request.targetUsername && request.targetPassword)
			) {
				throw new bad_request_error_1.BadRequestError(
					'Target instance authentication is required (apiKey, authToken, or username/password)',
				);
			}
			const result = await this.instanceSyncService.transferToInstance(req.user, request);
			this.eventService.emit('cross-instance-transfer-initiated', {
				requesterId: req.user.id,
				transferId: result.transferId,
				targetInstanceUrl: this.sanitizeUrl(request.targetInstanceUrl),
				totalResources: result.summary.totalResources,
				status: result.status,
			});
			this.logger.info('Direct instance transfer endpoint completed', {
				requesterId: req.user.id,
				transferId: result.transferId,
				status: result.status,
				targetUrl: this.sanitizeUrl(request.targetInstanceUrl),
				summary: result.summary,
			});
			return result;
		} catch (error) {
			const errorContext = {
				requesterId: req.user?.id,
				userRole: req.user?.role,
				targetUrl: this.sanitizeUrl(request.targetInstanceUrl),
				request: {
					includeWorkflows: request.includeWorkflows,
					includeCredentials: request.includeCredentials,
					includeSettings: request.includeSettings,
					includeUsers: request.includeUsers,
					conflictResolution: request.conflictResolution,
				},
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			};
			this.logger.error('Direct instance transfer endpoint failed', errorContext);
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof internal_server_error_1.InternalServerError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError('Cross-instance transfer failed');
		}
	}
	async getOperationStatus(req, _, operationId) {
		try {
			this.logger.debug('Migration status requested', {
				requesterId: req.user.id,
				operationId,
			});
			if (!operationId || typeof operationId !== 'string') {
				throw new bad_request_error_1.BadRequestError('Valid operation ID is required');
			}
			return await this.migrationService.getOperationStatus(req.user, operationId);
		} catch (error) {
			this.logger.error('Migration status check failed', {
				requesterId: req.user?.id,
				operationId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof internal_server_error_1.InternalServerError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError('Failed to get operation status');
		}
	}
	async validateMigration(req, _, request) {
		try {
			this.logger.info('Migration validation endpoint called', {
				requesterId: req.user.id,
				userRole: req.user.role,
				hasExportData: !!request.exportData,
				hasTargetInstance: !!request.targetInstanceUrl,
				targetUrl: request.targetInstanceUrl
					? this.sanitizeUrl(request.targetInstanceUrl)
					: undefined,
			});
			if (!request.exportData && !request.targetInstanceUrl) {
				throw new bad_request_error_1.BadRequestError(
					'Either export data or target instance URL is required for validation',
				);
			}
			const result = await this.migrationService.validateMigration(req.user, request);
			this.eventService.emit('migration-validation-performed', {
				requesterId: req.user.id,
				validationPassed: result.isValid,
				warningCount: result.warnings.length,
				errorCount: result.errors.length,
			});
			this.logger.info('Migration validation endpoint completed', {
				requesterId: req.user.id,
				validationPassed: result.isValid,
				warningCount: result.warnings.length,
				errorCount: result.errors.length,
			});
			return result;
		} catch (error) {
			const errorContext = {
				requesterId: req.user?.id,
				userRole: req.user?.role,
				hasExportData: !!request.exportData,
				hasTargetInstance: !!request.targetInstanceUrl,
				targetUrl: request.targetInstanceUrl
					? this.sanitizeUrl(request.targetInstanceUrl)
					: undefined,
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			};
			this.logger.error('Migration validation endpoint failed', errorContext);
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof internal_server_error_1.InternalServerError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError('Migration validation failed');
		}
	}
	async validateMigrationComprehensive(req, _, request) {
		try {
			this.logger.info('Comprehensive migration validation endpoint called', {
				requesterId: req.user.id,
				userRole: req.user.role,
				hasExportId: !!request.exportId,
				hasExportData: !!request.exportData,
				hasTargetInstance: !!request.targetInstanceUrl,
				includeCompatibilityCheck: request.includeCompatibilityCheck,
				includeConflictAnalysis: request.includeConflictAnalysis,
				includeResourceValidation: request.includeResourceValidation,
				targetUrl: request.targetInstanceUrl
					? this.sanitizeUrl(request.targetInstanceUrl)
					: undefined,
			});
			if (!request.exportId && !request.exportData) {
				throw new bad_request_error_1.BadRequestError('Either exportId or exportData is required');
			}
			const result = await this.migrationService.validateMigrationComprehensive(req.user, request);
			this.eventService.emit('comprehensive-migration-validation-performed', {
				requesterId: req.user.id,
				validationPassed: result.isValid,
				warningCount: result.warnings?.length || 0,
				errorCount: result.errors?.length || 0,
				compatibilityCheck: request.includeCompatibilityCheck ?? false,
				conflictAnalysis: request.includeConflictAnalysis ?? false,
				resourceValidation: request.includeResourceValidation ?? false,
			});
			this.logger.info('Comprehensive migration validation endpoint completed', {
				requesterId: req.user.id,
				validationPassed: result.isValid,
				warningCount: result.warnings?.length || 0,
				errorCount: result.errors?.length || 0,
			});
			return result;
		} catch (error) {
			const errorContext = {
				requesterId: req.user?.id,
				userRole: req.user?.role,
				hasExportId: !!request.exportId,
				hasExportData: !!request.exportData,
				hasTargetInstance: !!request.targetInstanceUrl,
				targetUrl: request.targetInstanceUrl
					? this.sanitizeUrl(request.targetInstanceUrl)
					: undefined,
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			};
			this.logger.error('Comprehensive migration validation endpoint failed', errorContext);
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof internal_server_error_1.InternalServerError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				'Comprehensive migration validation failed',
			);
		}
	}
	async verifyMigrationIntegrity(req, _, request) {
		try {
			this.logger.info('Migration integrity verification endpoint called', {
				requesterId: req.user.id,
				userRole: req.user.role,
				hasExportId: !!request.exportId,
				hasExportData: !!request.exportData,
			});
			if (!request.exportId && !request.exportData) {
				throw new bad_request_error_1.BadRequestError(
					'Either exportId or exportData is required for verification',
				);
			}
			const result = await this.migrationService.verifyMigrationIntegrity(req.user, request);
			this.eventService.emit('migration-integrity-verified', {
				requesterId: req.user.id,
				verificationPassed: result.isValid,
				issueCount: result.issues?.length || 0,
				integrityConcerns: result.integrityConcerns?.length || 0,
			});
			this.logger.info('Migration integrity verification endpoint completed', {
				requesterId: req.user.id,
				verificationPassed: result.isValid,
				issueCount: result.issues?.length || 0,
			});
			return result;
		} catch (error) {
			const errorContext = {
				requesterId: req.user?.id,
				userRole: req.user?.role,
				hasExportId: !!request.exportId,
				hasExportData: !!request.exportData,
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			};
			this.logger.error('Migration integrity verification endpoint failed', errorContext);
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof internal_server_error_1.InternalServerError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				'Migration integrity verification failed',
			);
		}
	}
	async checkMigrationCompatibility(req, _, exportId) {
		try {
			this.logger.info('Migration compatibility check endpoint called', {
				requesterId: req.user.id,
				userRole: req.user.role,
				exportId,
			});
			if (!exportId || typeof exportId !== 'string') {
				throw new bad_request_error_1.BadRequestError('Valid export ID is required');
			}
			const result = await this.migrationService.checkMigrationCompatibility(req.user, exportId);
			this.eventService.emit('migration-compatibility-checked', {
				requesterId: req.user.id,
				exportId,
				compatibilityScore: result.compatibilityScore || 0,
				hasIssues: result.issues?.length > 0,
			});
			this.logger.info('Migration compatibility check endpoint completed', {
				requesterId: req.user.id,
				exportId,
				compatibilityScore: result.compatibilityScore || 0,
				issueCount: result.issues?.length || 0,
			});
			return result;
		} catch (error) {
			const errorContext = {
				requesterId: req.user?.id,
				userRole: req.user?.role,
				exportId,
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			};
			this.logger.error('Migration compatibility check endpoint failed', errorContext);
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof internal_server_error_1.InternalServerError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError('Migration compatibility check failed');
		}
	}
	async listExports(req) {
		try {
			this.logger.debug('Export list endpoint called', {
				requesterId: req.user.id,
				userRole: req.user.role,
			});
			const result = await this.migrationService.listExports(req.user);
			this.logger.debug('Export list endpoint completed', {
				requesterId: req.user.id,
				total: result.total,
			});
			return result;
		} catch (error) {
			this.logger.error('Export list endpoint failed', {
				requesterId: req.user?.id,
				userRole: req.user?.role,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof internal_server_error_1.InternalServerError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError('Failed to list exports');
		}
	}
	async downloadExport(req, res, exportId) {
		try {
			this.logger.info('Export download endpoint called', {
				requesterId: req.user.id,
				userRole: req.user.role,
				exportId,
			});
			if (!exportId || typeof exportId !== 'string') {
				throw new bad_request_error_1.BadRequestError('Valid export ID is required');
			}
			await this.migrationService.downloadExport(req.user, exportId, res);
			this.logger.info('Export download endpoint completed', {
				requesterId: req.user.id,
				exportId,
			});
		} catch (error) {
			const errorContext = {
				requesterId: req.user?.id,
				userRole: req.user?.role,
				exportId,
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			};
			this.logger.error('Export download endpoint failed', errorContext);
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof internal_server_error_1.InternalServerError
			) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError('Export download failed');
		}
	}
	sanitizeUrl(url) {
		try {
			const parsed = new URL(url);
			return `${parsed.protocol}//${parsed.hostname}:${parsed.port || (parsed.protocol === 'https:' ? '443' : '80')}`;
		} catch {
			return '[invalid-url]';
		}
	}
};
exports.MigrationController = MigrationController;
__decorate(
	[
		(0, decorators_1.Post)('/export'),
		(0, decorators_1.GlobalScope)('instance:admin'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [
			Object,
			Object,
			api_types_1.InstanceMigrationExportRequestDto,
		]),
		__metadata('design:returntype', Promise),
	],
	MigrationController.prototype,
	'exportInstance',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/import'),
		(0, decorators_1.GlobalScope)('instance:admin'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [
			Object,
			Object,
			api_types_1.InstanceMigrationImportRequestDto,
		]),
		__metadata('design:returntype', Promise),
	],
	MigrationController.prototype,
	'importInstance',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/transfer'),
		(0, decorators_1.GlobalScope)('instance:admin'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.CrossInstanceTransferRequestDto]),
		__metadata('design:returntype', Promise),
	],
	MigrationController.prototype,
	'directInstanceTransfer',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/status/:operationId'),
		(0, decorators_1.GlobalScope)('instance:admin'),
		__param(2, (0, decorators_1.Param)('operationId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	MigrationController.prototype,
	'getOperationStatus',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/validate'),
		(0, decorators_1.GlobalScope)('instance:admin'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	MigrationController.prototype,
	'validateMigration',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/validate/comprehensive'),
		(0, decorators_1.GlobalScope)('instance:admin'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	MigrationController.prototype,
	'validateMigrationComprehensive',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/verify'),
		(0, decorators_1.GlobalScope)('instance:admin'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	MigrationController.prototype,
	'verifyMigrationIntegrity',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/compatibility/:exportId'),
		(0, decorators_1.GlobalScope)('instance:admin'),
		__param(2, (0, decorators_1.Param)('exportId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	MigrationController.prototype,
	'checkMigrationCompatibility',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/exports'),
		(0, decorators_1.GlobalScope)('instance:admin'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	MigrationController.prototype,
	'listExports',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/exports/:exportId/download'),
		(0, decorators_1.GlobalScope)('instance:admin'),
		__param(2, (0, decorators_1.Param)('exportId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	MigrationController.prototype,
	'downloadExport',
	null,
);
exports.MigrationController = MigrationController = __decorate(
	[
		(0, decorators_1.RestController)('/migration'),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			migration_service_1.MigrationService,
			instance_sync_service_1.InstanceSyncService,
			event_service_1.EventService,
		]),
	],
	MigrationController,
);
//# sourceMappingURL=migration.controller.js.map
