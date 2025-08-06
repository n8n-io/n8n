import type {
	InstanceMigrationExportRequestDto,
	InstanceMigrationExportResponseDto,
	InstanceMigrationImportRequestDto,
	InstanceMigrationImportResponseDto,
	InstanceMigrationStatusDto,
	InstanceMigrationValidationDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import {
	WorkflowRepository,
	CredentialsRepository,
	SharedWorkflowRepository,
	SharedCredentialsRepository,
	ProjectRepository,
	UserRepository,
	SettingsRepository,
	TagRepository,
	VariablesRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { mkdir, writeFile, readFile, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

import config from '@/config';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { MigrationSecurityService } from './migration-security.service';
import { EventService } from '@/events/event.service';

interface ExportMetadata {
	id: string;
	version: string;
	createdAt: Date;
	createdBy: {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
	};
	source: {
		instanceUrl: string;
		instanceId: string;
		n8nVersion: string;
	};
	summary: {
		workflows: number;
		credentials: number;
		users: number;
		settings: number;
		projects: number;
		tags: number;
		variables: number;
	};
	options: InstanceMigrationExportRequestDto;
}

interface MigrationOperation {
	id: string;
	type: 'export' | 'import';
	status: 'pending' | 'running' | 'completed' | 'failed';
	progress: number;
	startedAt: Date;
	completedAt?: Date;
	error?: string;
	userId: string;
	metadata: any;
}

@Service()
export class MigrationService {
	private readonly exportDir: string;
	private readonly operations = new Map<string, MigrationOperation>();

	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly userRepository: UserRepository,
		private readonly settingsRepository: SettingsRepository,
		private readonly tagRepository: TagRepository,
		private readonly variablesRepository: VariablesRepository,
		private readonly eventService: EventService,
		private readonly migrationSecurityService: MigrationSecurityService,
	) {
		this.exportDir = join(config.getEnv('userManagement.jwtSecret'), 'exports');
		this.ensureExportDirectory();
	}

	async exportInstance(
		user: User,
		request: InstanceMigrationExportRequestDto,
	): Promise<InstanceMigrationExportResponseDto> {
		const exportId = uuid();
		const operation: MigrationOperation = {
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

			const exportData: any = {
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
						instanceUrl: config.getEnv('editorBaseUrl') || 'unknown',
						instanceId: config.getEnv('deployment.instanceId') || uuid(),
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
				} as ExportMetadata,
			};

			// Export workflows
			if (request.includeWorkflows) {
				operation.progress = 20;
				exportData.workflows = await this.exportWorkflows(request.projectIds);
				exportData.metadata.summary.workflows = exportData.workflows.length;
				this.logger.debug('Exported workflows', { count: exportData.workflows.length });
			}

			// Export credentials
			if (request.includeCredentials) {
				operation.progress = 40;
				exportData.credentials = await this.exportCredentials(
					request.projectIds,
					request.includeCredentialData,
				);
				exportData.metadata.summary.credentials = exportData.credentials.length;
				this.logger.debug('Exported credentials', { count: exportData.credentials.length });
			}

			// Export users
			if (request.includeUsers) {
				operation.progress = 60;
				exportData.users = await this.exportUsers();
				exportData.metadata.summary.users = exportData.users.length;
				this.logger.debug('Exported users', { count: exportData.users.length });
			}

			// Export settings
			if (request.includeSettings) {
				operation.progress = 80;
				exportData.settings = await this.exportSettings();
				exportData.metadata.summary.settings = exportData.settings.length;
				this.logger.debug('Exported settings', { count: exportData.settings.length });
			}

			// Export projects
			if (request.projectIds?.length) {
				exportData.projects = await this.exportProjects(request.projectIds);
				exportData.metadata.summary.projects = exportData.projects.length;
			} else if (request.includeWorkflows || request.includeCredentials) {
				exportData.projects = await this.exportAllProjects();
				exportData.metadata.summary.projects = exportData.projects.length;
			}

			// Export tags and variables
			if (request.includeWorkflows) {
				exportData.tags = await this.exportTags();
				exportData.variables = await this.exportVariables();
				exportData.metadata.summary.tags = exportData.tags.length;
				exportData.metadata.summary.variables = exportData.variables.length;
			}

			// Save export to file
			operation.progress = 90;
			const filePath = await this.saveExportData(exportId, exportData);
			const fileStats = await stat(filePath);

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

			// Emit export failed event
			this.eventService.emit('migration-export-failed', {
				exportId,
				userId: user.id,
				failedAt: operation.completedAt,
				error: operation.error,
				progress: operation.progress,
			});

			// Cleanup any partial files
			try {
				const partialFilePath = join(this.exportDir, `${exportId}.json.gz`);
				if (existsSync(partialFilePath)) {
					await unlink(partialFilePath);
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

			// Determine if this is a user error or system error
			if (error instanceof BadRequestError) {
				throw error; // Re-throw user errors as-is
			}

			throw new InternalServerError(`Export failed: ${operation.error}`);
		}
	}

	async importInstance(
		user: User,
		request: InstanceMigrationImportRequestDto,
	): Promise<InstanceMigrationImportResponseDto> {
		const importId = uuid();
		const operation: MigrationOperation = {
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

			// Load export data
			let exportData: any;
			if (request.exportId) {
				exportData = await this.loadExportData(request.exportId);
			} else if (request.exportData) {
				exportData = request.exportData;
			} else {
				throw new BadRequestError('Either exportId or exportData must be provided');
			}

			// Validate export data
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

			// Import projects first
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

			// Import workflows
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

			// Import credentials
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

			// Import users
			if (exportData.users) {
				operation.progress = 80;
				const userResults = await this.importUsers(exportData.users, request.conflictResolution);
				summary.users = userResults;
				summary.totalImported += userResults.imported;
				summary.totalSkipped += userResults.skipped;
				summary.totalErrors += userResults.errors;
			}

			// Import settings
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

			throw new InternalServerError(`Import failed: ${operation.error}`);
		}
	}

	async getOperationStatus(user: User, operationId: string): Promise<InstanceMigrationStatusDto> {
		const operation = this.operations.get(operationId);
		if (!operation) {
			throw new NotFoundError('Operation not found');
		}

		if (operation.userId !== user.id && user.role !== 'global:owner') {
			throw new BadRequestError('Access denied to this operation');
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

	async validateMigration(
		user: User,
		request: { exportData?: any; targetInstanceUrl?: string },
	): Promise<InstanceMigrationValidationDto> {
		const validation: InstanceMigrationValidationDto = {
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

				// Check version compatibility
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

				// Check for potential conflicts
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
				// Validate target instance connectivity (basic check)
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

	async listExports(user: User) {
		// For now, return operations from memory
		// In production, this should be stored in database
		const exports = Array.from(this.operations.values())
			.filter(
				(op) => op.type === 'export' && (op.userId === user.id || user.role === 'global:owner'),
			)
			.map((op) => ({
				id: op.id,
				createdAt: op.startedAt,
				createdBy: op.userId,
				size: 0, // Would need to be calculated from file
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

	async downloadExport(user: User, exportId: string, res: Response): Promise<void> {
		const operation = this.operations.get(exportId);
		if (!operation || operation.type !== 'export') {
			throw new NotFoundError('Export not found');
		}

		if (operation.userId !== user.id && user.role !== 'global:owner') {
			throw new BadRequestError('Access denied to this export');
		}

		const filePath = join(this.exportDir, `${exportId}.json.gz`);
		if (!existsSync(filePath)) {
			throw new NotFoundError('Export file not found');
		}

		res.setHeader('Content-Type', 'application/gzip');
		res.setHeader('Content-Disposition', `attachment; filename="n8n-export-${exportId}.json.gz"`);

		const readStream = createReadStream(filePath);
		await pipeline(readStream, res);
	}

	async getExportData(exportId: string): Promise<any> {
		this.logger.debug('Getting export data', { exportId });

		const operation = this.operations.get(exportId);
		if (!operation || operation.type !== 'export') {
			throw new NotFoundError('Export not found');
		}

		if (operation.status !== 'completed') {
			throw new BadRequestError('Export is not completed yet');
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

	async validateMigrationComprehensive(
		user: User,
		request: {
			exportId?: string;
			exportData?: any;
			targetInstanceUrl?: string;
			includeCompatibilityCheck?: boolean;
			includeConflictAnalysis?: boolean;
			includeResourceValidation?: boolean;
		},
	): Promise<{
		isValid: boolean;
		errors: Array<{ code: string; message: string; details?: any }>;
		warnings: Array<{ code: string; message: string; details?: any }>;
		recommendations: Array<{ code: string; message: string; details?: any }>;
		compatibilityCheck?: {
			version: 'compatible' | 'warning' | 'incompatible';
			database: 'compatible' | 'warning' | 'incompatible';
			features: 'compatible' | 'warning' | 'incompatible';
			nodeTypes: 'compatible' | 'warning' | 'incompatible';
		};
		conflictAnalysis?: {
			totalConflicts: number;
			workflowConflicts: number;
			credentialConflicts: number;
			userConflicts: number;
			settingConflicts: number;
			conflicts: Array<{ type: string; name: string; id: string; severity: string }>;
		};
		resourceValidation?: {
			workflows: { valid: number; invalid: number; issues: string[] };
			credentials: { valid: number; invalid: number; issues: string[] };
			users: { valid: number; invalid: number; issues: string[] };
			settings: { valid: number; invalid: number; issues: string[] };
		};
	}> {
		const validation = {
			isValid: true,
			errors: [] as Array<{ code: string; message: string; details?: any }>,
			warnings: [] as Array<{ code: string; message: string; details?: any }>,
			recommendations: [] as Array<{ code: string; message: string; details?: any }>,
		};

		try {
			// Load export data
			let exportData: any;
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

			// Basic data validation
			await this.validateExportData(exportData);

			// Compatibility check
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

			// Conflict analysis
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

			// Resource validation
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

			// Target instance validation
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

			// Add general recommendations
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

	async verifyMigrationIntegrity(
		user: User,
		request: { exportId?: string; exportData?: any },
	): Promise<{
		isValid: boolean;
		issues: Array<{ severity: string; code: string; message: string; details?: any }>;
		integrityConcerns: Array<{ type: string; description: string; impact: string }>;
		dataConsistency: {
			workflows: { total: number; consistent: number; inconsistent: number };
			credentials: { total: number; consistent: number; inconsistent: number };
			relationships: { total: number; valid: number; broken: number };
		};
	}> {
		const verification = {
			isValid: true,
			issues: [] as Array<{ severity: string; code: string; message: string; details?: any }>,
			integrityConcerns: [] as Array<{ type: string; description: string; impact: string }>,
			dataConsistency: {
				workflows: { total: 0, consistent: 0, inconsistent: 0 },
				credentials: { total: 0, consistent: 0, inconsistent: 0 },
				relationships: { total: 0, valid: 0, broken: 0 },
			},
		};

		try {
			// Load export data
			let exportData: any;
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

			// Verify metadata integrity
			if (!exportData.metadata || !exportData.metadata.version || !exportData.metadata.id) {
				verification.issues.push({
					severity: 'error',
					code: 'MISSING_METADATA',
					message: 'Export metadata is missing or incomplete',
				});
				verification.isValid = false;
			}

			// Verify workflow integrity
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

			// Verify credential integrity
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

			// Verify relationship integrity
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

			// Check for data corruption indicators
			const corruptionCheck = await this.checkDataCorruption(exportData);
			if (corruptionCheck.hasCorruption) {
				verification.integrityConcerns.push({
					type: 'data_corruption',
					description: 'Potential data corruption detected in export',
					impact: 'Import may fail or produce unexpected results',
				});
				verification.isValid = false;
			}

			// Check for missing dependencies
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

	async checkMigrationCompatibility(
		user: User,
		exportId: string,
	): Promise<{
		compatibilityScore: number;
		issues: Array<{ severity: string; category: string; message: string; details?: any }>;
		recommendations: Array<{ action: string; description: string; priority: string }>;
		versionCheck: {
			exportVersion: string;
			currentVersion: string;
			compatible: boolean;
			requiresUpgrade: boolean;
		};
		featureCompatibility: {
			supportedFeatures: string[];
			unsupportedFeatures: string[];
			deprecatedFeatures: string[];
		};
	}> {
		const compatibility = {
			compatibilityScore: 100,
			issues: [] as Array<{ severity: string; category: string; message: string; details?: any }>,
			recommendations: [] as Array<{ action: string; description: string; priority: string }>,
			versionCheck: {
				exportVersion: 'unknown',
				currentVersion: process.env.N8N_VERSION || 'unknown',
				compatible: true,
				requiresUpgrade: false,
			},
			featureCompatibility: {
				supportedFeatures: [] as string[],
				unsupportedFeatures: [] as string[],
				deprecatedFeatures: [] as string[],
			},
		};

		try {
			const exportData = await this.loadExportData(exportId);

			// Version compatibility check
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

			// Feature compatibility check
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

			// Node type compatibility check
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

			// Generate recommendations
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

	// Private helper methods

	private async ensureExportDirectory(): Promise<void> {
		try {
			await mkdir(this.exportDir, { recursive: true });
		} catch (error) {
			this.logger.warn('Could not create export directory', { error });
		}
	}

	private async exportWorkflows(projectIds?: string[]) {
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
			// Remove sensitive data but keep structure for migration
			nodes: workflow.nodes?.map((node: any) => ({
				...node,
				// Keep node structure but sanitize credentials in credentials field
				credentials: node.credentials ? {} : undefined,
			})),
		}));
	}

	private async exportCredentials(projectIds?: string[], includeData = false) {
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
			// Only include encrypted data if explicitly requested
			data: includeData ? credential.data : undefined,
		}));
	}

	private async exportUsers() {
		return await this.userRepository.find({
			select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt'],
		});
	}

	private async exportSettings() {
		return await this.settingsRepository.find();
	}

	private async exportProjects(projectIds?: string[]) {
		const query = this.projectRepository.createQueryBuilder('project');

		if (projectIds?.length) {
			query.where('project.id IN (:...projectIds)', { projectIds });
		}

		return await query.getMany();
	}

	private async exportAllProjects() {
		return await this.projectRepository.find();
	}

	private async exportTags() {
		return await this.tagRepository.find();
	}

	private async exportVariables() {
		return await this.variablesRepository.find({
			select: ['id', 'key', 'type', 'value'], // Be careful with sensitive variables
		});
	}

	private async saveExportData(exportId: string, data: any): Promise<string> {
		const filePath = join(this.exportDir, `${exportId}.json.gz`);
		const jsonData = JSON.stringify(data, null, 2);

		// Compress the data
		const compressed = createGzip();
		const chunks: Buffer[] = [];

		compressed.on('data', (chunk) => chunks.push(chunk));
		compressed.on('end', async () => {
			await writeFile(filePath, Buffer.concat(chunks));
		});

		compressed.write(jsonData);
		compressed.end();

		return filePath;
	}

	private async loadExportData(exportId: string): Promise<any> {
		const filePath = join(this.exportDir, `${exportId}.json.gz`);
		if (!existsSync(filePath)) {
			throw new NotFoundError('Export file not found');
		}

		const compressed = await readFile(filePath);
		const decompressed = createGunzip();

		return new Promise((resolve, reject) => {
			const chunks: Buffer[] = [];
			decompressed.on('data', (chunk) => chunks.push(chunk));
			decompressed.on('end', () => {
				try {
					const jsonData = Buffer.concat(chunks).toString();
					resolve(JSON.parse(jsonData));
				} catch (error) {
					reject(new InternalServerError('Failed to parse export data'));
				}
			});
			decompressed.on('error', reject);
			decompressed.write(compressed);
			decompressed.end();
		});
	}

	private async validateExportData(exportData: any): Promise<void> {
		if (!exportData.metadata || !exportData.metadata.version) {
			throw new BadRequestError('Invalid export data: missing metadata');
		}

		if (!exportData.metadata.id || !exportData.metadata.createdAt) {
			throw new BadRequestError('Invalid export data: missing required metadata fields');
		}

		// Add more validation as needed
	}

	private async checkImportConflicts(exportData: any) {
		const conflicts: Array<{ type: string; name: string; id: string }> = [];

		// Check workflow conflicts
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

		// Check credential conflicts
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

	private async importProjects(projects: any[], createMissing = false) {
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
						id: uuid(), // Generate new ID
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

	private async importWorkflows(workflows: any[], conflictResolution: string) {
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
					id: uuid(), // Generate new ID
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

	private async importCredentials(credentials: any[], conflictResolution: string) {
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
					id: uuid(), // Generate new ID
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

	private async importUsers(users: any[], conflictResolution: string) {
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

				// Don't import passwords - users will need to reset
				await this.userRepository.save({
					...user,
					id: uuid(), // Generate new ID
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

	private async importSettings(settings: any[], conflictResolution: string) {
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

	// Utility methods for enhanced error handling and logging

	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	private formatDuration(milliseconds: number): string {
		if (milliseconds < 1000) return `${milliseconds}ms`;
		if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
		if (milliseconds < 3600000) return `${(milliseconds / 60000).toFixed(1)}m`;
		return `${(milliseconds / 3600000).toFixed(1)}h`;
	}

	private async withRetry<T>(
		operation: () => Promise<T>,
		operationName: string,
		maxRetries = 3,
		baseDelay = 1000,
	): Promise<T> {
		let lastError: Error;

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
					const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		throw lastError!;
	}

	private async validateResourceAccess(
		user: User,
		resourceType: string,
		resourceIds?: string[],
	): Promise<void> {
		if (user.role === 'global:owner') {
			return; // Global owners have access to everything
		}

		// Add resource-specific validation logic here
		// This would check if user has access to specific projects, workflows, etc.
		if (resourceIds && resourceIds.length > 0) {
			this.logger.debug(`Validating user access to ${resourceType}`, {
				userId: user.id,
				resourceType,
				resourceCount: resourceIds.length,
			});

			// In a real implementation, you would check user permissions
			// against the specific resources they're trying to export/import
		}
	}

	private createOperationContext(
		user: User,
		operationType: string,
		additionalContext: any = {},
	): any {
		return {
			userId: user.id,
			userRole: user.role,
			userEmail: user.email,
			operationType,
			timestamp: new Date().toISOString(),
			instanceId: config.getEnv('deployment.instanceId') || 'unknown',
			n8nVersion: process.env.N8N_VERSION || 'unknown',
			...additionalContext,
		};
	}

	// Enhanced validation helper methods

	private async performCompatibilityCheck(exportData: any): Promise<{
		version: 'compatible' | 'warning' | 'incompatible';
		database: 'compatible' | 'warning' | 'incompatible';
		features: 'compatible' | 'warning' | 'incompatible';
		nodeTypes: 'compatible' | 'warning' | 'incompatible';
	}> {
		const compatibility = {
			version: 'compatible' as const,
			database: 'compatible' as const,
			features: 'compatible' as const,
			nodeTypes: 'compatible' as const,
		};

		// Check version compatibility
		const exportVersion = exportData.metadata?.source?.n8nVersion;
		const currentVersion = process.env.N8N_VERSION;
		if (exportVersion && currentVersion) {
			if (exportVersion !== currentVersion) {
				compatibility.version = 'warning';
				// In a real implementation, you'd check version compatibility matrix
				const exportMajor = parseInt(exportVersion.split('.')[0] || '0');
				const currentMajor = parseInt(currentVersion.split('.')[0] || '0');
				if (Math.abs(exportMajor - currentMajor) > 1) {
					compatibility.version = 'incompatible';
				}
			}
		}

		// Check database compatibility (simplified)
		// In a real implementation, you'd check database schema versions
		compatibility.database = 'compatible';

		// Check feature compatibility
		if (exportData.workflows) {
			const hasAdvancedFeatures = exportData.workflows.some((workflow: any) =>
				workflow.nodes?.some((node: any) => node.type?.includes('advanced')),
			);
			if (hasAdvancedFeatures) {
				compatibility.features = 'warning';
			}
		}

		// Check node type compatibility
		if (exportData.workflows) {
			const nodeTypes = new Set<string>();
			exportData.workflows.forEach((workflow: any) => {
				workflow.nodes?.forEach((node: any) => {
					if (node.type) nodeTypes.add(node.type);
				});
			});

			// In a real implementation, you'd check against available node types
			const unavailableTypes = Array.from(nodeTypes).filter((type) => type.includes('deprecated'));
			if (unavailableTypes.length > 0) {
				compatibility.nodeTypes = 'warning';
			}
		}

		return compatibility;
	}

	private async performConflictAnalysis(exportData: any): Promise<{
		totalConflicts: number;
		workflowConflicts: number;
		credentialConflicts: number;
		userConflicts: number;
		settingConflicts: number;
		conflicts: Array<{ type: string; name: string; id: string; severity: string }>;
	}> {
		const analysis = {
			totalConflicts: 0,
			workflowConflicts: 0,
			credentialConflicts: 0,
			userConflicts: 0,
			settingConflicts: 0,
			conflicts: [] as Array<{ type: string; name: string; id: string; severity: string }>,
		};

		// Check workflow conflicts
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

		// Check credential conflicts
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

		// Check user conflicts
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

		// Check setting conflicts
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

	private async performResourceValidation(exportData: any): Promise<{
		workflows: { valid: number; invalid: number; issues: string[] };
		credentials: { valid: number; invalid: number; issues: string[] };
		users: { valid: number; invalid: number; issues: string[] };
		settings: { valid: number; invalid: number; issues: string[] };
	}> {
		const validation = {
			workflows: { valid: 0, invalid: 0, issues: [] as string[] },
			credentials: { valid: 0, invalid: 0, issues: [] as string[] },
			users: { valid: 0, invalid: 0, issues: [] as string[] },
			settings: { valid: 0, invalid: 0, issues: [] as string[] },
		};

		// Validate workflows
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

		// Validate credentials
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

		// Validate users
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

		// Validate settings
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

	private async verifyWorkflowIntegrity(
		workflows: any[],
	): Promise<{ total: number; consistent: number; inconsistent: number }> {
		const integrity = { total: workflows.length, consistent: 0, inconsistent: 0 };

		for (const workflow of workflows) {
			let isConsistent = true;

			// Check required fields
			if (!workflow.id || !workflow.name || !workflow.nodes) {
				isConsistent = false;
			}

			// Check node structure
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

	private async verifyCredentialIntegrity(
		credentials: any[],
	): Promise<{ total: number; consistent: number; inconsistent: number }> {
		const integrity = { total: credentials.length, consistent: 0, inconsistent: 0 };

		for (const credential of credentials) {
			let isConsistent = true;

			// Check required fields
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

	private async verifyRelationshipIntegrity(
		workflows: any[],
		credentials: any[],
	): Promise<{ total: number; valid: number; broken: number }> {
		const relationships = { total: 0, valid: 0, broken: 0 };
		const credentialIds = new Set(credentials.map((c) => c.id));

		for (const workflow of workflows) {
			if (workflow.nodes && Array.isArray(workflow.nodes)) {
				for (const node of workflow.nodes) {
					if (node.credentials) {
						relationships.total++;
						// Check if referenced credential exists
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

	private async checkDataCorruption(exportData: any): Promise<{ hasCorruption: boolean }> {
		// Basic corruption checks
		try {
			// Check if JSON structure is valid (already parsed at this point)
			if (typeof exportData !== 'object' || exportData === null) {
				return { hasCorruption: true };
			}

			// Check metadata structure
			if (
				exportData.metadata &&
				(!exportData.metadata.id || !exportData.metadata.version || !exportData.metadata.createdAt)
			) {
				return { hasCorruption: true };
			}

			// Check for obviously corrupted data (null values where they shouldn't be)
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

	private async checkMissingDependencies(exportData: any): Promise<{ hasMissing: boolean }> {
		// Check for missing dependencies
		// This is a simplified implementation
		let hasMissing = false;

		if (exportData.workflows) {
			for (const workflow of exportData.workflows) {
				if (workflow.nodes && Array.isArray(workflow.nodes)) {
					for (const node of workflow.nodes) {
						// Check if node type exists (simplified check)
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

	private async checkVersionCompatibility(exportVersion: string): Promise<{
		compatible: boolean;
		requiresUpgrade: boolean;
	}> {
		const currentVersion = process.env.N8N_VERSION || '1.0.0';

		// Simple version comparison (in production, use a proper semver library)
		const exportParts = exportVersion.split('.').map(Number);
		const currentParts = currentVersion.split('.').map(Number);

		const exportMajor = exportParts[0] || 0;
		const currentMajor = currentParts[0] || 0;

		// Compatible if same major version or current is newer
		const compatible = currentMajor >= exportMajor;
		const requiresUpgrade = exportMajor > currentMajor;

		return { compatible, requiresUpgrade };
	}

	private async checkFeatureCompatibility(exportData: any): Promise<{
		supportedFeatures: string[];
		unsupportedFeatures: string[];
		deprecatedFeatures: string[];
	}> {
		const features = {
			supportedFeatures: [] as string[],
			unsupportedFeatures: [] as string[],
			deprecatedFeatures: [] as string[],
		};

		// Extract features from export data
		const extractedFeatures = new Set<string>();

		if (exportData.workflows) {
			extractedFeatures.add('workflows');
			// Check for advanced workflow features
			if (exportData.workflows.some((w: any) => w.settings?.executionOrder === 'v1')) {
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

		// Categorize features (simplified)
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

	private async checkNodeTypeCompatibility(workflows: any[]): Promise<{
		compatibleNodes: string[];
		incompatibleNodes: string[];
		deprecatedNodes: string[];
	}> {
		const nodeTypes = {
			compatibleNodes: [] as string[],
			incompatibleNodes: [] as string[],
			deprecatedNodes: [] as string[],
		};

		const allNodeTypes = new Set<string>();

		// Extract all node types from workflows
		for (const workflow of workflows) {
			if (workflow.nodes && Array.isArray(workflow.nodes)) {
				for (const node of workflow.nodes) {
					if (node.type) {
						allNodeTypes.add(node.type);
					}
				}
			}
		}

		// Categorize node types (simplified)
		const deprecatedNodeTypes = ['n8n-nodes-base.oldNode', 'n8n-nodes-base.deprecatedNode'];

		for (const nodeType of allNodeTypes) {
			if (deprecatedNodeTypes.includes(nodeType)) {
				nodeTypes.deprecatedNodes.push(nodeType);
			} else if (nodeType.startsWith('n8n-nodes-base.')) {
				nodeTypes.compatibleNodes.push(nodeType);
			} else {
				// Custom or unknown node types
				nodeTypes.incompatibleNodes.push(nodeType);
			}
		}

		return nodeTypes;
	}
}
