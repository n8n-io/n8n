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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.MigrationService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const fs_1 = require('fs');
const promises_1 = require('fs/promises');
const path_1 = require('path');
const uuid_1 = require('uuid');
const zlib_1 = require('zlib');
const promises_2 = require('stream/promises');
const config_1 = __importDefault(require('@/config'));
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const migration_security_service_1 = require('./migration-security.service');
const event_service_1 = require('@/events/event.service');
let MigrationService = class MigrationService {
	constructor(
		logger,
		workflowRepository,
		credentialsRepository,
		sharedWorkflowRepository,
		sharedCredentialsRepository,
		projectRepository,
		userRepository,
		settingsRepository,
		tagRepository,
		variablesRepository,
		eventService,
		migrationSecurityService,
	) {
		this.logger = logger;
		this.workflowRepository = workflowRepository;
		this.credentialsRepository = credentialsRepository;
		this.sharedWorkflowRepository = sharedWorkflowRepository;
		this.sharedCredentialsRepository = sharedCredentialsRepository;
		this.projectRepository = projectRepository;
		this.userRepository = userRepository;
		this.settingsRepository = settingsRepository;
		this.tagRepository = tagRepository;
		this.variablesRepository = variablesRepository;
		this.eventService = eventService;
		this.migrationSecurityService = migrationSecurityService;
		this.operations = new Map();
		this.exportDir = (0, path_1.join)(
			config_1.default.getEnv('userManagement.jwtSecret'),
			'exports',
		);
		this.ensureExportDirectory();
	}
	async exportInstance(user, request) {
		const exportId = (0, uuid_1.v4)();
		const operation = {
			id: exportId,
			type: 'export',
			status: 'pending',
			progress: 0,
			startedAt: new Date(),
			userId: user.id,
			metadata: request,
		};
		this.operations.set(exportId, operation);
		try {
			operation.status = 'running';
			this.logger.info('Starting instance export', { exportId, userId: user.id });
			const exportData = {
				metadata: {
					id: exportId,
					version: '1.0.0',
					createdAt: new Date(),
					createdBy: {
						id: user.id,
						email: user.email,
						firstName: user.firstName,
						lastName: user.lastName,
					},
					source: {
						instanceUrl: config_1.default.getEnv('editorBaseUrl') || 'unknown',
						instanceId: config_1.default.getEnv('deployment.instanceId') || (0, uuid_1.v4)(),
						n8nVersion: process.env.N8N_VERSION || 'unknown',
					},
					summary: {
						workflows: 0,
						credentials: 0,
						users: 0,
						settings: 0,
						projects: 0,
						tags: 0,
						variables: 0,
					},
					options: request,
				},
			};
			if (request.includeWorkflows) {
				operation.progress = 20;
				exportData.workflows = await this.exportWorkflows(request.projectIds);
				exportData.metadata.summary.workflows = exportData.workflows.length;
				this.logger.debug('Exported workflows', { count: exportData.workflows.length });
			}
			if (request.includeCredentials) {
				operation.progress = 40;
				exportData.credentials = await this.exportCredentials(
					request.projectIds,
					request.includeCredentialData,
				);
				exportData.metadata.summary.credentials = exportData.credentials.length;
				this.logger.debug('Exported credentials', { count: exportData.credentials.length });
			}
			if (request.includeUsers) {
				operation.progress = 60;
				exportData.users = await this.exportUsers();
				exportData.metadata.summary.users = exportData.users.length;
				this.logger.debug('Exported users', { count: exportData.users.length });
			}
			if (request.includeSettings) {
				operation.progress = 80;
				exportData.settings = await this.exportSettings();
				exportData.metadata.summary.settings = exportData.settings.length;
				this.logger.debug('Exported settings', { count: exportData.settings.length });
			}
			if (request.projectIds?.length) {
				exportData.projects = await this.exportProjects(request.projectIds);
				exportData.metadata.summary.projects = exportData.projects.length;
			} else if (request.includeWorkflows || request.includeCredentials) {
				exportData.projects = await this.exportAllProjects();
				exportData.metadata.summary.projects = exportData.projects.length;
			}
			if (request.includeWorkflows) {
				exportData.tags = await this.exportTags();
				exportData.variables = await this.exportVariables();
				exportData.metadata.summary.tags = exportData.tags.length;
				exportData.metadata.summary.variables = exportData.variables.length;
			}
			operation.progress = 90;
			const filePath = await this.saveExportData(exportId, exportData);
			const fileStats = await (0, promises_1.stat)(filePath);
			operation.status = 'completed';
			operation.progress = 100;
			operation.completedAt = new Date();
			this.logger.info('Instance export completed', {
				exportId,
				size: fileStats.size,
				duration: operation.completedAt.getTime() - operation.startedAt.getTime(),
			});
			return {
				exportId,
				status: 'completed',
				filePath,
				totalSize: fileStats.size,
				createdAt: operation.startedAt,
				summary: exportData.metadata.summary,
			};
		} catch (error) {
			operation.status = 'failed';
			operation.error = error instanceof Error ? error.message : 'Unknown error';
			operation.completedAt = new Date();
			const errorContext = {
				exportId,
				userId: user.id,
				userRole: user.role,
				error: operation.error,
				stack: error instanceof Error ? error.stack : undefined,
				duration: operation.completedAt.getTime() - operation.startedAt.getTime(),
				progress: operation.progress,
				request: {
					includeWorkflows: request.includeWorkflows,
					includeCredentials: request.includeCredentials,
					includeUsers: request.includeUsers,
					includeSettings: request.includeSettings,
					projectIds: request.projectIds,
				},
			};
			this.logger.error('Instance export failed', errorContext);
			this.eventService.emit('migration-export-failed', {
				exportId,
				userId: user.id,
				failedAt: operation.completedAt,
				error: operation.error,
				progress: operation.progress,
			});
			try {
				const partialFilePath = (0, path_1.join)(this.exportDir, `${exportId}.json.gz`);
				if ((0, fs_1.existsSync)(partialFilePath)) {
					await (0, promises_1.unlink)(partialFilePath);
					this.logger.debug('Cleaned up partial export file', {
						exportId,
						filePath: partialFilePath,
					});
				}
			} catch (cleanupError) {
				this.logger.warn('Failed to cleanup partial export file', {
					exportId,
					cleanupError: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
				});
			}
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(`Export failed: ${operation.error}`);
		}
	}
	async importInstance(user, request) {
		const importId = (0, uuid_1.v4)();
		const operation = {
			id: importId,
			type: 'import',
			status: 'pending',
			progress: 0,
			startedAt: new Date(),
			userId: user.id,
			metadata: request,
		};
		this.operations.set(importId, operation);
		try {
			operation.status = 'running';
			this.logger.info('Starting instance import', { importId, userId: user.id });
			let exportData;
			if (request.exportId) {
				exportData = await this.loadExportData(request.exportId);
			} else if (request.exportData) {
				exportData = request.exportData;
			} else {
				throw new bad_request_error_1.BadRequestError(
					'Either exportId or exportData must be provided',
				);
			}
			operation.progress = 10;
			await this.validateExportData(exportData);
			const summary = {
				totalImported: 0,
				totalSkipped: 0,
				totalErrors: 0,
				workflows: { imported: 0, skipped: 0, errors: 0 },
				credentials: { imported: 0, skipped: 0, errors: 0 },
				users: { imported: 0, skipped: 0, errors: 0 },
				settings: { imported: 0, skipped: 0, errors: 0 },
				projects: { imported: 0, skipped: 0, errors: 0 },
			};
			if (exportData.projects) {
				operation.progress = 20;
				const projectResults = await this.importProjects(
					exportData.projects,
					request.createMissingProjects,
				);
				summary.projects = projectResults;
				summary.totalImported += projectResults.imported;
				summary.totalSkipped += projectResults.skipped;
				summary.totalErrors += projectResults.errors;
			}
			if (exportData.workflows) {
				operation.progress = 40;
				const workflowResults = await this.importWorkflows(
					exportData.workflows,
					request.conflictResolution,
				);
				summary.workflows = workflowResults;
				summary.totalImported += workflowResults.imported;
				summary.totalSkipped += workflowResults.skipped;
				summary.totalErrors += workflowResults.errors;
			}
			if (exportData.credentials) {
				operation.progress = 60;
				const credentialResults = await this.importCredentials(
					exportData.credentials,
					request.conflictResolution,
				);
				summary.credentials = credentialResults;
				summary.totalImported += credentialResults.imported;
				summary.totalSkipped += credentialResults.skipped;
				summary.totalErrors += credentialResults.errors;
			}
			if (exportData.users) {
				operation.progress = 80;
				const userResults = await this.importUsers(exportData.users, request.conflictResolution);
				summary.users = userResults;
				summary.totalImported += userResults.imported;
				summary.totalSkipped += userResults.skipped;
				summary.totalErrors += userResults.errors;
			}
			if (exportData.settings) {
				operation.progress = 90;
				const settingResults = await this.importSettings(
					exportData.settings,
					request.conflictResolution,
				);
				summary.settings = settingResults;
				summary.totalImported += settingResults.imported;
				summary.totalSkipped += settingResults.skipped;
				summary.totalErrors += settingResults.errors;
			}
			operation.status = 'completed';
			operation.progress = 100;
			operation.completedAt = new Date();
			this.logger.info('Instance import completed', {
				importId,
				summary,
				duration: operation.completedAt.getTime() - operation.startedAt.getTime(),
			});
			return {
				importId,
				status: 'completed',
				summary,
				completedAt: operation.completedAt,
				sourceMetadata: exportData.metadata,
			};
		} catch (error) {
			operation.status = 'failed';
			operation.error = error instanceof Error ? error.message : 'Unknown error';
			operation.completedAt = new Date();
			this.logger.error('Instance import failed', {
				importId,
				error: operation.error,
			});
			throw new internal_server_error_1.InternalServerError(`Import failed: ${operation.error}`);
		}
	}
	async getOperationStatus(user, operationId) {
		const operation = this.operations.get(operationId);
		if (!operation) {
			throw new not_found_error_1.NotFoundError('Operation not found');
		}
		if (operation.userId !== user.id && user.role !== 'global:owner') {
			throw new bad_request_error_1.BadRequestError('Access denied to this operation');
		}
		return {
			id: operation.id,
			type: operation.type,
			status: operation.status,
			progress: operation.progress,
			startedAt: operation.startedAt,
			completedAt: operation.completedAt,
			error: operation.error,
		};
	}
	async validateMigration(user, request) {
		const validation = {
			isValid: true,
			errors: [],
			warnings: [],
			recommendations: [],
			compatibility: {
				version: 'compatible',
				database: 'compatible',
				features: 'compatible',
			},
		};
		try {
			if (request.exportData) {
				await this.validateExportData(request.exportData);
				const exportVersion = request.exportData.metadata?.source?.n8nVersion;
				const currentVersion = process.env.N8N_VERSION;
				if (exportVersion && currentVersion && exportVersion !== currentVersion) {
					validation.warnings.push({
						code: 'VERSION_MISMATCH',
						message: `Export was created with n8n version ${exportVersion}, current version is ${currentVersion}`,
						details: { exportVersion, currentVersion },
					});
					validation.compatibility.version = 'warning';
				}
				const conflicts = await this.checkImportConflicts(request.exportData);
				if (conflicts.length > 0) {
					validation.warnings.push(
						...conflicts.map((conflict) => ({
							code: 'RESOURCE_CONFLICT',
							message: `${conflict.type} "${conflict.name}" already exists`,
							details: conflict,
						})),
					);
				}
			}
			if (request.targetInstanceUrl) {
				try {
					const url = new URL(request.targetInstanceUrl);
					validation.recommendations.push({
						code: 'TARGET_VALIDATION',
						message: `Ensure target instance ${url.hostname} is accessible and properly configured`,
					});
				} catch (error) {
					validation.errors.push({
						code: 'INVALID_TARGET_URL',
						message: 'Target instance URL is not valid',
						details: { url: request.targetInstanceUrl },
					});
					validation.isValid = false;
				}
			}
		} catch (error) {
			validation.isValid = false;
			validation.errors.push({
				code: 'VALIDATION_ERROR',
				message: error instanceof Error ? error.message : 'Validation failed',
			});
		}
		return validation;
	}
	async listExports(user) {
		const exports = Array.from(this.operations.values())
			.filter(
				(op) => op.type === 'export' && (op.userId === user.id || user.role === 'global:owner'),
			)
			.map((op) => ({
				id: op.id,
				createdAt: op.startedAt,
				createdBy: op.userId,
				size: 0,
				status: op.status,
				summary: {
					workflows: 0,
					credentials: 0,
					users: 0,
					settings: 0,
				},
			}));
		return {
			exports,
			total: exports.length,
		};
	}
	async downloadExport(user, exportId, res) {
		const operation = this.operations.get(exportId);
		if (!operation || operation.type !== 'export') {
			throw new not_found_error_1.NotFoundError('Export not found');
		}
		if (operation.userId !== user.id && user.role !== 'global:owner') {
			throw new bad_request_error_1.BadRequestError('Access denied to this export');
		}
		const filePath = (0, path_1.join)(this.exportDir, `${exportId}.json.gz`);
		if (!(0, fs_1.existsSync)(filePath)) {
			throw new not_found_error_1.NotFoundError('Export file not found');
		}
		res.setHeader('Content-Type', 'application/gzip');
		res.setHeader('Content-Disposition', `attachment; filename="n8n-export-${exportId}.json.gz"`);
		const readStream = (0, fs_1.createReadStream)(filePath);
		await (0, promises_2.pipeline)(readStream, res);
	}
	async getExportData(exportId) {
		this.logger.debug('Getting export data', { exportId });
		const operation = this.operations.get(exportId);
		if (!operation || operation.type !== 'export') {
			throw new not_found_error_1.NotFoundError('Export not found');
		}
		if (operation.status !== 'completed') {
			throw new bad_request_error_1.BadRequestError('Export is not completed yet');
		}
		try {
			return await this.loadExportData(exportId);
		} catch (error) {
			this.logger.error('Failed to get export data', {
				exportId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	async validateMigrationComprehensive(user, request) {
		const validation = {
			isValid: true,
			errors: [],
			warnings: [],
			recommendations: [],
		};
		try {
			let exportData;
			if (request.exportId) {
				exportData = await this.loadExportData(request.exportId);
			} else if (request.exportData) {
				exportData = request.exportData;
			} else {
				validation.errors.push({
					code: 'MISSING_DATA',
					message: 'Either exportId or exportData is required',
				});
				validation.isValid = false;
				return validation;
			}
			await this.validateExportData(exportData);
			if (request.includeCompatibilityCheck !== false) {
				const compatibilityCheck = await this.performCompatibilityCheck(exportData);
				validation.compatibilityCheck = compatibilityCheck;
				if (compatibilityCheck.version === 'incompatible') {
					validation.errors.push({
						code: 'VERSION_INCOMPATIBLE',
						message: 'Export version is incompatible with current instance',
						details: { exportVersion: exportData.metadata?.source?.n8nVersion },
					});
					validation.isValid = false;
				}
			}
			if (request.includeConflictAnalysis !== false) {
				const conflictAnalysis = await this.performConflictAnalysis(exportData);
				validation.conflictAnalysis = conflictAnalysis;
				if (conflictAnalysis.totalConflicts > 0) {
					validation.warnings.push({
						code: 'RESOURCE_CONFLICTS',
						message: `Found ${conflictAnalysis.totalConflicts} resource conflicts`,
						details: conflictAnalysis,
					});
				}
			}
			if (request.includeResourceValidation !== false) {
				const resourceValidation = await this.performResourceValidation(exportData);
				validation.resourceValidation = resourceValidation;
				const totalInvalid =
					resourceValidation.workflows.invalid +
					resourceValidation.credentials.invalid +
					resourceValidation.users.invalid +
					resourceValidation.settings.invalid;
				if (totalInvalid > 0) {
					validation.warnings.push({
						code: 'INVALID_RESOURCES',
						message: `Found ${totalInvalid} invalid resources that may cause import issues`,
						details: resourceValidation,
					});
				}
			}
			if (request.targetInstanceUrl) {
				try {
					const url = new URL(request.targetInstanceUrl);
					validation.recommendations.push({
						code: 'TARGET_VALIDATION',
						message: `Ensure target instance ${url.hostname} is accessible and properly configured`,
					});
				} catch (error) {
					validation.errors.push({
						code: 'INVALID_TARGET_URL',
						message: 'Target instance URL is not valid',
						details: { url: request.targetInstanceUrl },
					});
					validation.isValid = false;
				}
			}
			validation.recommendations.push(
				{
					code: 'BACKUP_RECOMMENDATION',
					message: 'Create a backup of the target instance before importing',
				},
				{
					code: 'TEST_RECOMMENDATION',
					message: 'Test the migration in a staging environment first',
				},
			);
			return validation;
		} catch (error) {
			validation.isValid = false;
			validation.errors.push({
				code: 'VALIDATION_ERROR',
				message: error instanceof Error ? error.message : 'Validation failed',
			});
			return validation;
		}
	}
	async verifyMigrationIntegrity(user, request) {
		const verification = {
			isValid: true,
			issues: [],
			integrityConcerns: [],
			dataConsistency: {
				workflows: { total: 0, consistent: 0, inconsistent: 0 },
				credentials: { total: 0, consistent: 0, inconsistent: 0 },
				relationships: { total: 0, valid: 0, broken: 0 },
			},
		};
		try {
			let exportData;
			if (request.exportId) {
				exportData = await this.loadExportData(request.exportId);
			} else if (request.exportData) {
				exportData = request.exportData;
			} else {
				verification.issues.push({
					severity: 'error',
					code: 'MISSING_DATA',
					message: 'Either exportId or exportData is required',
				});
				verification.isValid = false;
				return verification;
			}
			if (!exportData.metadata || !exportData.metadata.version || !exportData.metadata.id) {
				verification.issues.push({
					severity: 'error',
					code: 'MISSING_METADATA',
					message: 'Export metadata is missing or incomplete',
				});
				verification.isValid = false;
			}
			if (exportData.workflows) {
				const workflowIntegrity = await this.verifyWorkflowIntegrity(exportData.workflows);
				verification.dataConsistency.workflows = workflowIntegrity;
				if (workflowIntegrity.inconsistent > 0) {
					verification.issues.push({
						severity: 'warning',
						code: 'WORKFLOW_INTEGRITY',
						message: `${workflowIntegrity.inconsistent} workflows have integrity issues`,
						details: workflowIntegrity,
					});
				}
			}
			if (exportData.credentials) {
				const credentialIntegrity = await this.verifyCredentialIntegrity(exportData.credentials);
				verification.dataConsistency.credentials = credentialIntegrity;
				if (credentialIntegrity.inconsistent > 0) {
					verification.issues.push({
						severity: 'warning',
						code: 'CREDENTIAL_INTEGRITY',
						message: `${credentialIntegrity.inconsistent} credentials have integrity issues`,
						details: credentialIntegrity,
					});
				}
			}
			if (exportData.workflows && exportData.credentials) {
				const relationshipIntegrity = await this.verifyRelationshipIntegrity(
					exportData.workflows,
					exportData.credentials,
				);
				verification.dataConsistency.relationships = relationshipIntegrity;
				if (relationshipIntegrity.broken > 0) {
					verification.issues.push({
						severity: 'error',
						code: 'BROKEN_RELATIONSHIPS',
						message: `${relationshipIntegrity.broken} broken relationships detected`,
						details: relationshipIntegrity,
					});
					verification.isValid = false;
				}
			}
			const corruptionCheck = await this.checkDataCorruption(exportData);
			if (corruptionCheck.hasCorruption) {
				verification.integrityConcerns.push({
					type: 'data_corruption',
					description: 'Potential data corruption detected in export',
					impact: 'Import may fail or produce unexpected results',
				});
				verification.isValid = false;
			}
			const dependencyCheck = await this.checkMissingDependencies(exportData);
			if (dependencyCheck.hasMissing) {
				verification.integrityConcerns.push({
					type: 'missing_dependencies',
					description: 'Required dependencies are missing from export',
					impact: 'Some features may not work correctly after import',
				});
			}
			return verification;
		} catch (error) {
			verification.isValid = false;
			verification.issues.push({
				severity: 'error',
				code: 'VERIFICATION_ERROR',
				message: error instanceof Error ? error.message : 'Integrity verification failed',
			});
			return verification;
		}
	}
	async checkMigrationCompatibility(user, exportId) {
		const compatibility = {
			compatibilityScore: 100,
			issues: [],
			recommendations: [],
			versionCheck: {
				exportVersion: 'unknown',
				currentVersion: process.env.N8N_VERSION || 'unknown',
				compatible: true,
				requiresUpgrade: false,
			},
			featureCompatibility: {
				supportedFeatures: [],
				unsupportedFeatures: [],
				deprecatedFeatures: [],
			},
		};
		try {
			const exportData = await this.loadExportData(exportId);
			const exportVersion = exportData.metadata?.source?.n8nVersion;
			if (exportVersion) {
				compatibility.versionCheck.exportVersion = exportVersion;
				const versionCompatibility = await this.checkVersionCompatibility(exportVersion);
				compatibility.versionCheck = { ...compatibility.versionCheck, ...versionCompatibility };
				if (!versionCompatibility.compatible) {
					compatibility.compatibilityScore -= 30;
					compatibility.issues.push({
						severity: 'error',
						category: 'version',
						message: `Export version ${exportVersion} is not compatible with current version ${compatibility.versionCheck.currentVersion}`,
					});
				}
			}
			const featureCheck = await this.checkFeatureCompatibility(exportData);
			compatibility.featureCompatibility = featureCheck;
			if (featureCheck.unsupportedFeatures.length > 0) {
				compatibility.compatibilityScore -= featureCheck.unsupportedFeatures.length * 10;
				compatibility.issues.push({
					severity: 'warning',
					category: 'features',
					message: `${featureCheck.unsupportedFeatures.length} unsupported features detected`,
					details: { unsupportedFeatures: featureCheck.unsupportedFeatures },
				});
			}
			if (exportData.workflows) {
				const nodeCompatibility = await this.checkNodeTypeCompatibility(exportData.workflows);
				if (nodeCompatibility.incompatibleNodes.length > 0) {
					compatibility.compatibilityScore -= nodeCompatibility.incompatibleNodes.length * 5;
					compatibility.issues.push({
						severity: 'warning',
						category: 'nodes',
						message: `${nodeCompatibility.incompatibleNodes.length} incompatible node types found`,
						details: { incompatibleNodes: nodeCompatibility.incompatibleNodes },
					});
				}
			}
			if (compatibility.compatibilityScore < 100) {
				compatibility.recommendations.push({
					action: 'review_issues',
					description: 'Review all compatibility issues before proceeding with migration',
					priority: 'high',
				});
			}
			if (compatibility.versionCheck.requiresUpgrade) {
				compatibility.recommendations.push({
					action: 'upgrade_instance',
					description: `Upgrade target instance to version ${exportVersion} or later`,
					priority: 'critical',
				});
			}
			if (compatibility.featureCompatibility.unsupportedFeatures.length > 0) {
				compatibility.recommendations.push({
					action: 'enable_features',
					description: 'Enable required features on target instance',
					priority: 'medium',
				});
			}
			return compatibility;
		} catch (error) {
			compatibility.compatibilityScore = 0;
			compatibility.issues.push({
				severity: 'error',
				category: 'system',
				message: error instanceof Error ? error.message : 'Compatibility check failed',
			});
			return compatibility;
		}
	}
	async ensureExportDirectory() {
		try {
			await (0, promises_1.mkdir)(this.exportDir, { recursive: true });
		} catch (error) {
			this.logger.warn('Could not create export directory', { error });
		}
	}
	async exportWorkflows(projectIds) {
		const query = this.workflowRepository
			.createQueryBuilder('workflow')
			.leftJoinAndSelect('workflow.shared', 'shared')
			.leftJoinAndSelect('shared.project', 'project')
			.leftJoinAndSelect('workflow.tags', 'tags');
		if (projectIds?.length) {
			query.where('shared.projectId IN (:...projectIds)', { projectIds });
		}
		const workflows = await query.getMany();
		return workflows.map((workflow) => ({
			...workflow,
			nodes: workflow.nodes?.map((node) => ({
				...node,
				credentials: node.credentials ? {} : undefined,
			})),
		}));
	}
	async exportCredentials(projectIds, includeData = false) {
		const query = this.credentialsRepository
			.createQueryBuilder('credentials')
			.leftJoinAndSelect('credentials.shared', 'shared')
			.leftJoinAndSelect('shared.project', 'project');
		if (projectIds?.length) {
			query.where('shared.projectId IN (:...projectIds)', { projectIds });
		}
		const credentials = await query.getMany();
		return credentials.map((credential) => ({
			...credential,
			data: includeData ? credential.data : undefined,
		}));
	}
	async exportUsers() {
		return await this.userRepository.find({
			select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt'],
		});
	}
	async exportSettings() {
		return await this.settingsRepository.find();
	}
	async exportProjects(projectIds) {
		const query = this.projectRepository.createQueryBuilder('project');
		if (projectIds?.length) {
			query.where('project.id IN (:...projectIds)', { projectIds });
		}
		return await query.getMany();
	}
	async exportAllProjects() {
		return await this.projectRepository.find();
	}
	async exportTags() {
		return await this.tagRepository.find();
	}
	async exportVariables() {
		return await this.variablesRepository.find({
			select: ['id', 'key', 'type', 'value'],
		});
	}
	async saveExportData(exportId, data) {
		const filePath = (0, path_1.join)(this.exportDir, `${exportId}.json.gz`);
		const jsonData = JSON.stringify(data, null, 2);
		const compressed = (0, zlib_1.createGzip)();
		const chunks = [];
		compressed.on('data', (chunk) => chunks.push(chunk));
		compressed.on('end', async () => {
			await (0, promises_1.writeFile)(filePath, Buffer.concat(chunks));
		});
		compressed.write(jsonData);
		compressed.end();
		return filePath;
	}
	async loadExportData(exportId) {
		const filePath = (0, path_1.join)(this.exportDir, `${exportId}.json.gz`);
		if (!(0, fs_1.existsSync)(filePath)) {
			throw new not_found_error_1.NotFoundError('Export file not found');
		}
		const compressed = await (0, promises_1.readFile)(filePath);
		const decompressed = (0, zlib_1.createGunzip)();
		return new Promise((resolve, reject) => {
			const chunks = [];
			decompressed.on('data', (chunk) => chunks.push(chunk));
			decompressed.on('end', () => {
				try {
					const jsonData = Buffer.concat(chunks).toString();
					resolve(JSON.parse(jsonData));
				} catch (error) {
					reject(new internal_server_error_1.InternalServerError('Failed to parse export data'));
				}
			});
			decompressed.on('error', reject);
			decompressed.write(compressed);
			decompressed.end();
		});
	}
	async validateExportData(exportData) {
		if (!exportData.metadata || !exportData.metadata.version) {
			throw new bad_request_error_1.BadRequestError('Invalid export data: missing metadata');
		}
		if (!exportData.metadata.id || !exportData.metadata.createdAt) {
			throw new bad_request_error_1.BadRequestError(
				'Invalid export data: missing required metadata fields',
			);
		}
	}
	async checkImportConflicts(exportData) {
		const conflicts = [];
		if (exportData.workflows) {
			for (const workflow of exportData.workflows) {
				const existing = await this.workflowRepository.findOne({
					where: { name: workflow.name },
				});
				if (existing) {
					conflicts.push({ type: 'workflow', name: workflow.name, id: workflow.id });
				}
			}
		}
		if (exportData.credentials) {
			for (const credential of exportData.credentials) {
				const existing = await this.credentialsRepository.findOne({
					where: { name: credential.name },
				});
				if (existing) {
					conflicts.push({ type: 'credential', name: credential.name, id: credential.id });
				}
			}
		}
		return conflicts;
	}
	async importProjects(projects, createMissing = false) {
		const results = { imported: 0, skipped: 0, errors: 0 };
		for (const project of projects) {
			try {
				const existing = await this.projectRepository.findOne({
					where: { name: project.name },
				});
				if (existing) {
					results.skipped++;
					continue;
				}
				if (createMissing) {
					await this.projectRepository.save({
						...project,
						id: (0, uuid_1.v4)(),
					});
					results.imported++;
				} else {
					results.skipped++;
				}
			} catch (error) {
				results.errors++;
				this.logger.error('Error importing project', {
					projectName: project.name,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}
		return results;
	}
	async importWorkflows(workflows, conflictResolution) {
		const results = { imported: 0, skipped: 0, errors: 0 };
		for (const workflow of workflows) {
			try {
				const existing = await this.workflowRepository.findOne({
					where: { name: workflow.name },
				});
				if (existing && conflictResolution === 'skip') {
					results.skipped++;
					continue;
				}
				if (existing && conflictResolution === 'rename') {
					workflow.name = `${workflow.name} (imported)`;
				}
				await this.workflowRepository.save({
					...workflow,
					id: (0, uuid_1.v4)(),
				});
				results.imported++;
			} catch (error) {
				results.errors++;
				this.logger.error('Error importing workflow', {
					workflowName: workflow.name,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}
		return results;
	}
	async importCredentials(credentials, conflictResolution) {
		const results = { imported: 0, skipped: 0, errors: 0 };
		for (const credential of credentials) {
			try {
				const existing = await this.credentialsRepository.findOne({
					where: { name: credential.name },
				});
				if (existing && conflictResolution === 'skip') {
					results.skipped++;
					continue;
				}
				if (existing && conflictResolution === 'rename') {
					credential.name = `${credential.name} (imported)`;
				}
				await this.credentialsRepository.save({
					...credential,
					id: (0, uuid_1.v4)(),
				});
				results.imported++;
			} catch (error) {
				results.errors++;
				this.logger.error('Error importing credential', {
					credentialName: credential.name,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}
		return results;
	}
	async importUsers(users, conflictResolution) {
		const results = { imported: 0, skipped: 0, errors: 0 };
		for (const user of users) {
			try {
				const existing = await this.userRepository.findOne({
					where: { email: user.email },
				});
				if (existing) {
					results.skipped++;
					continue;
				}
				await this.userRepository.save({
					...user,
					id: (0, uuid_1.v4)(),
					password: undefined,
				});
				results.imported++;
			} catch (error) {
				results.errors++;
				this.logger.error('Error importing user', {
					userEmail: user.email,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}
		return results;
	}
	async importSettings(settings, conflictResolution) {
		const results = { imported: 0, skipped: 0, errors: 0 };
		for (const setting of settings) {
			try {
				const existing = await this.settingsRepository.findOne({
					where: { key: setting.key },
				});
				if (existing && conflictResolution === 'skip') {
					results.skipped++;
					continue;
				}
				await this.settingsRepository.save(setting);
				results.imported++;
			} catch (error) {
				results.errors++;
				this.logger.error('Error importing setting', {
					settingKey: setting.key,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}
		return results;
	}
	formatBytes(bytes) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
	formatDuration(milliseconds) {
		if (milliseconds < 1000) return `${milliseconds}ms`;
		if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
		if (milliseconds < 3600000) return `${(milliseconds / 60000).toFixed(1)}m`;
		return `${(milliseconds / 3600000).toFixed(1)}h`;
	}
	async withRetry(operation, operationName, maxRetries = 3, baseDelay = 1000) {
		let lastError;
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError = error instanceof Error ? error : new Error('Unknown error');
				this.logger.warn(`${operationName} failed, attempt ${attempt}/${maxRetries}`, {
					error: lastError.message,
					attempt,
					maxRetries,
				});
				if (attempt < maxRetries) {
					const delay = baseDelay * Math.pow(2, attempt - 1);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}
		throw lastError;
	}
	async validateResourceAccess(user, resourceType, resourceIds) {
		if (user.role === 'global:owner') {
			return;
		}
		if (resourceIds && resourceIds.length > 0) {
			this.logger.debug(`Validating user access to ${resourceType}`, {
				userId: user.id,
				resourceType,
				resourceCount: resourceIds.length,
			});
		}
	}
	createOperationContext(user, operationType, additionalContext = {}) {
		return {
			userId: user.id,
			userRole: user.role,
			userEmail: user.email,
			operationType,
			timestamp: new Date().toISOString(),
			instanceId: config_1.default.getEnv('deployment.instanceId') || 'unknown',
			n8nVersion: process.env.N8N_VERSION || 'unknown',
			...additionalContext,
		};
	}
	async performCompatibilityCheck(exportData) {
		const compatibility = {
			version: 'compatible',
			database: 'compatible',
			features: 'compatible',
			nodeTypes: 'compatible',
		};
		const exportVersion = exportData.metadata?.source?.n8nVersion;
		const currentVersion = process.env.N8N_VERSION;
		if (exportVersion && currentVersion) {
			if (exportVersion !== currentVersion) {
				compatibility.version = 'warning';
				const exportMajor = parseInt(exportVersion.split('.')[0] || '0');
				const currentMajor = parseInt(currentVersion.split('.')[0] || '0');
				if (Math.abs(exportMajor - currentMajor) > 1) {
					compatibility.version = 'incompatible';
				}
			}
		}
		compatibility.database = 'compatible';
		if (exportData.workflows) {
			const hasAdvancedFeatures = exportData.workflows.some((workflow) =>
				workflow.nodes?.some((node) => node.type?.includes('advanced')),
			);
			if (hasAdvancedFeatures) {
				compatibility.features = 'warning';
			}
		}
		if (exportData.workflows) {
			const nodeTypes = new Set();
			exportData.workflows.forEach((workflow) => {
				workflow.nodes?.forEach((node) => {
					if (node.type) nodeTypes.add(node.type);
				});
			});
			const unavailableTypes = Array.from(nodeTypes).filter((type) => type.includes('deprecated'));
			if (unavailableTypes.length > 0) {
				compatibility.nodeTypes = 'warning';
			}
		}
		return compatibility;
	}
	async performConflictAnalysis(exportData) {
		const analysis = {
			totalConflicts: 0,
			workflowConflicts: 0,
			credentialConflicts: 0,
			userConflicts: 0,
			settingConflicts: 0,
			conflicts: [],
		};
		if (exportData.workflows) {
			for (const workflow of exportData.workflows) {
				const existing = await this.workflowRepository.findOne({
					where: { name: workflow.name },
				});
				if (existing) {
					analysis.workflowConflicts++;
					analysis.conflicts.push({
						type: 'workflow',
						name: workflow.name,
						id: workflow.id,
						severity: 'medium',
					});
				}
			}
		}
		if (exportData.credentials) {
			for (const credential of exportData.credentials) {
				const existing = await this.credentialsRepository.findOne({
					where: { name: credential.name },
				});
				if (existing) {
					analysis.credentialConflicts++;
					analysis.conflicts.push({
						type: 'credential',
						name: credential.name,
						id: credential.id,
						severity: 'high',
					});
				}
			}
		}
		if (exportData.users) {
			for (const user of exportData.users) {
				const existing = await this.userRepository.findOne({
					where: { email: user.email },
				});
				if (existing) {
					analysis.userConflicts++;
					analysis.conflicts.push({
						type: 'user',
						name: user.email,
						id: user.id,
						severity: 'low',
					});
				}
			}
		}
		if (exportData.settings) {
			for (const setting of exportData.settings) {
				const existing = await this.settingsRepository.findOne({
					where: { key: setting.key },
				});
				if (existing) {
					analysis.settingConflicts++;
					analysis.conflicts.push({
						type: 'setting',
						name: setting.key,
						id: setting.key,
						severity: 'medium',
					});
				}
			}
		}
		analysis.totalConflicts = analysis.conflicts.length;
		return analysis;
	}
	async performResourceValidation(exportData) {
		const validation = {
			workflows: { valid: 0, invalid: 0, issues: [] },
			credentials: { valid: 0, invalid: 0, issues: [] },
			users: { valid: 0, invalid: 0, issues: [] },
			settings: { valid: 0, invalid: 0, issues: [] },
		};
		if (exportData.workflows) {
			for (const workflow of exportData.workflows) {
				if (!workflow.name || !workflow.nodes || !Array.isArray(workflow.nodes)) {
					validation.workflows.invalid++;
					validation.workflows.issues.push(
						`Workflow ${workflow.id || 'unknown'} is missing required fields`,
					);
				} else {
					validation.workflows.valid++;
				}
			}
		}
		if (exportData.credentials) {
			for (const credential of exportData.credentials) {
				if (!credential.name || !credential.type) {
					validation.credentials.invalid++;
					validation.credentials.issues.push(
						`Credential ${credential.id || 'unknown'} is missing required fields`,
					);
				} else {
					validation.credentials.valid++;
				}
			}
		}
		if (exportData.users) {
			for (const user of exportData.users) {
				if (!user.email || !user.role) {
					validation.users.invalid++;
					validation.users.issues.push(`User ${user.id || 'unknown'} is missing required fields`);
				} else {
					validation.users.valid++;
				}
			}
		}
		if (exportData.settings) {
			for (const setting of exportData.settings) {
				if (!setting.key) {
					validation.settings.invalid++;
					validation.settings.issues.push(
						`Setting ${setting.id || 'unknown'} is missing required key`,
					);
				} else {
					validation.settings.valid++;
				}
			}
		}
		return validation;
	}
	async verifyWorkflowIntegrity(workflows) {
		const integrity = { total: workflows.length, consistent: 0, inconsistent: 0 };
		for (const workflow of workflows) {
			let isConsistent = true;
			if (!workflow.id || !workflow.name || !workflow.nodes) {
				isConsistent = false;
			}
			if (workflow.nodes && Array.isArray(workflow.nodes)) {
				for (const node of workflow.nodes) {
					if (!node.id || !node.type || !node.position) {
						isConsistent = false;
						break;
					}
				}
			} else {
				isConsistent = false;
			}
			if (isConsistent) {
				integrity.consistent++;
			} else {
				integrity.inconsistent++;
			}
		}
		return integrity;
	}
	async verifyCredentialIntegrity(credentials) {
		const integrity = { total: credentials.length, consistent: 0, inconsistent: 0 };
		for (const credential of credentials) {
			let isConsistent = true;
			if (!credential.id || !credential.name || !credential.type) {
				isConsistent = false;
			}
			if (isConsistent) {
				integrity.consistent++;
			} else {
				integrity.inconsistent++;
			}
		}
		return integrity;
	}
	async verifyRelationshipIntegrity(workflows, credentials) {
		const relationships = { total: 0, valid: 0, broken: 0 };
		const credentialIds = new Set(credentials.map((c) => c.id));
		for (const workflow of workflows) {
			if (workflow.nodes && Array.isArray(workflow.nodes)) {
				for (const node of workflow.nodes) {
					if (node.credentials) {
						relationships.total++;
						const credentialExists = Object.keys(node.credentials).every((key) =>
							credentialIds.has(node.credentials[key].id),
						);
						if (credentialExists) {
							relationships.valid++;
						} else {
							relationships.broken++;
						}
					}
				}
			}
		}
		return relationships;
	}
	async checkDataCorruption(exportData) {
		try {
			if (typeof exportData !== 'object' || exportData === null) {
				return { hasCorruption: true };
			}
			if (
				exportData.metadata &&
				(!exportData.metadata.id || !exportData.metadata.version || !exportData.metadata.createdAt)
			) {
				return { hasCorruption: true };
			}
			if (exportData.workflows) {
				for (const workflow of exportData.workflows) {
					if (
						workflow.nodes === null ||
						(Array.isArray(workflow.nodes) && workflow.nodes.includes(null))
					) {
						return { hasCorruption: true };
					}
				}
			}
			return { hasCorruption: false };
		} catch (error) {
			return { hasCorruption: true };
		}
	}
	async checkMissingDependencies(exportData) {
		let hasMissing = false;
		if (exportData.workflows) {
			for (const workflow of exportData.workflows) {
				if (workflow.nodes && Array.isArray(workflow.nodes)) {
					for (const node of workflow.nodes) {
						if (node.type && node.type.includes('missing')) {
							hasMissing = true;
							break;
						}
					}
				}
				if (hasMissing) break;
			}
		}
		return { hasMissing };
	}
	async checkVersionCompatibility(exportVersion) {
		const currentVersion = process.env.N8N_VERSION || '1.0.0';
		const exportParts = exportVersion.split('.').map(Number);
		const currentParts = currentVersion.split('.').map(Number);
		const exportMajor = exportParts[0] || 0;
		const currentMajor = currentParts[0] || 0;
		const compatible = currentMajor >= exportMajor;
		const requiresUpgrade = exportMajor > currentMajor;
		return { compatible, requiresUpgrade };
	}
	async checkFeatureCompatibility(exportData) {
		const features = {
			supportedFeatures: [],
			unsupportedFeatures: [],
			deprecatedFeatures: [],
		};
		const extractedFeatures = new Set();
		if (exportData.workflows) {
			extractedFeatures.add('workflows');
			if (exportData.workflows.some((w) => w.settings?.executionOrder === 'v1')) {
				extractedFeatures.add('execution_order_v1');
			}
		}
		if (exportData.credentials) {
			extractedFeatures.add('credentials');
		}
		if (exportData.users) {
			extractedFeatures.add('user_management');
		}
		if (exportData.settings) {
			extractedFeatures.add('instance_settings');
		}
		const allFeatures = ['workflows', 'credentials', 'user_management', 'instance_settings'];
		const deprecatedFeatureList = ['execution_order_v1'];
		for (const feature of extractedFeatures) {
			if (allFeatures.includes(feature)) {
				features.supportedFeatures.push(feature);
			} else if (deprecatedFeatureList.includes(feature)) {
				features.deprecatedFeatures.push(feature);
			} else {
				features.unsupportedFeatures.push(feature);
			}
		}
		return features;
	}
	async checkNodeTypeCompatibility(workflows) {
		const nodeTypes = {
			compatibleNodes: [],
			incompatibleNodes: [],
			deprecatedNodes: [],
		};
		const allNodeTypes = new Set();
		for (const workflow of workflows) {
			if (workflow.nodes && Array.isArray(workflow.nodes)) {
				for (const node of workflow.nodes) {
					if (node.type) {
						allNodeTypes.add(node.type);
					}
				}
			}
		}
		const deprecatedNodeTypes = ['n8n-nodes-base.oldNode', 'n8n-nodes-base.deprecatedNode'];
		for (const nodeType of allNodeTypes) {
			if (deprecatedNodeTypes.includes(nodeType)) {
				nodeTypes.deprecatedNodes.push(nodeType);
			} else if (nodeType.startsWith('n8n-nodes-base.')) {
				nodeTypes.compatibleNodes.push(nodeType);
			} else {
				nodeTypes.incompatibleNodes.push(nodeType);
			}
		}
		return nodeTypes;
	}
};
exports.MigrationService = MigrationService;
exports.MigrationService = MigrationService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			db_1.WorkflowRepository,
			db_1.CredentialsRepository,
			db_1.SharedWorkflowRepository,
			db_1.SharedCredentialsRepository,
			db_1.ProjectRepository,
			db_1.UserRepository,
			db_1.SettingsRepository,
			db_1.TagRepository,
			db_1.VariablesRepository,
			event_service_1.EventService,
			migration_security_service_1.MigrationSecurityService,
		]),
	],
	MigrationService,
);
//# sourceMappingURL=migration.service.js.map
