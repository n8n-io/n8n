import {
	InstanceMigrationExportRequestDto,
	InstanceMigrationExportResponseDto,
	InstanceMigrationImportRequestDto,
	InstanceMigrationImportResponseDto,
	InstanceMigrationStatusDto,
	InstanceMigrationValidationDto,
	CrossInstanceTransferRequestDto,
	CrossInstanceTransferResponseDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { RestController, Post, Get, Body, Param, GlobalScope, Licensed } from '@n8n/decorators';
import { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { EventService } from '@/events/event.service';
import { MigrationService } from '@/services/migration.service';
import { InstanceSyncService } from '@/services/instance-sync.service';

@RestController('/migration')
export class MigrationController {
	constructor(
		private readonly logger: Logger,
		private readonly migrationService: MigrationService,
		private readonly instanceSyncService: InstanceSyncService,
		private readonly eventService: EventService,
	) {}

	@Post('/export')
	@GlobalScope('instance:admin')
	@Licensed('feat:advancedPermissions')
	async exportInstance(
		req: AuthenticatedRequest,
		_: Response,
		@Body request: InstanceMigrationExportRequestDto,
	): Promise<InstanceMigrationExportResponseDto> {
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
				throw new BadRequestError('At least one resource type must be selected for export');
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

			if (error instanceof BadRequestError || error instanceof InternalServerError) {
				throw error;
			}

			throw new InternalServerError('Export operation failed');
		}
	}

	@Post('/import')
	@GlobalScope('instance:admin')
	@Licensed('feat:advancedPermissions')
	async importInstance(
		req: AuthenticatedRequest,
		_: Response,
		@Body request: InstanceMigrationImportRequestDto,
	): Promise<InstanceMigrationImportResponseDto> {
		try {
			this.logger.info('Instance import endpoint called', {
				requesterId: req.user.id,
				userRole: req.user.role,
				sourceExportId: request.exportId,
				conflictResolution: request.conflictResolution,
				createMissingProjects: request.createMissingProjects,
			});

			if (!request.exportId && !request.exportData) {
				throw new BadRequestError('Either exportId or exportData must be provided');
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

			if (error instanceof BadRequestError || error instanceof InternalServerError) {
				throw error;
			}

			throw new InternalServerError('Import operation failed');
		}
	}

	@Post('/transfer')
	@GlobalScope('instance:admin')
	@Licensed('feat:advancedPermissions')
	async directInstanceTransfer(
		req: AuthenticatedRequest,
		_: Response,
		@Body request: CrossInstanceTransferRequestDto,
	): Promise<CrossInstanceTransferResponseDto> {
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
				throw new BadRequestError('Target instance URL is required');
			}

			if (
				!request.targetApiKey &&
				!request.targetAuthToken &&
				!(request.targetUsername && request.targetPassword)
			) {
				throw new BadRequestError(
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

			if (error instanceof BadRequestError || error instanceof InternalServerError) {
				throw error;
			}

			throw new InternalServerError('Cross-instance transfer failed');
		}
	}

	@Get('/status/:operationId')
	@GlobalScope('instance:admin')
	async getOperationStatus(
		req: AuthenticatedRequest,
		_: Response,
		@Param('operationId') operationId: string,
	): Promise<InstanceMigrationStatusDto> {
		try {
			this.logger.debug('Migration status requested', {
				requesterId: req.user.id,
				operationId,
			});

			if (!operationId || typeof operationId !== 'string') {
				throw new BadRequestError('Valid operation ID is required');
			}

			return await this.migrationService.getOperationStatus(req.user, operationId);
		} catch (error) {
			this.logger.error('Migration status check failed', {
				requesterId: req.user?.id,
				operationId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			if (error instanceof BadRequestError || error instanceof InternalServerError) {
				throw error;
			}

			throw new InternalServerError('Failed to get operation status');
		}
	}

	@Post('/validate')
	@GlobalScope('instance:admin')
	async validateMigration(
		req: AuthenticatedRequest,
		_: Response,
		@Body request: { exportData?: any; targetInstanceUrl?: string },
	): Promise<InstanceMigrationValidationDto> {
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
				throw new BadRequestError(
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

			if (error instanceof BadRequestError || error instanceof InternalServerError) {
				throw error;
			}

			throw new InternalServerError('Migration validation failed');
		}
	}

	@Post('/validate/comprehensive')
	@GlobalScope('instance:admin')
	async validateMigrationComprehensive(
		req: AuthenticatedRequest,
		_: Response,
		@Body
		request: {
			exportId?: string;
			exportData?: any;
			targetInstanceUrl?: string;
			includeCompatibilityCheck?: boolean;
			includeConflictAnalysis?: boolean;
			includeResourceValidation?: boolean;
		},
	): Promise<any> {
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
				throw new BadRequestError('Either exportId or exportData is required');
			}

			const result = await this.migrationService.validateMigrationComprehensive(req.user, request);

			this.eventService.emit('comprehensive-migration-validation-performed', {
				requesterId: req.user.id,
				validationPassed: result.isValid,
				warningCount: result.warnings?.length || 0,
				errorCount: result.errors?.length || 0,
				compatibilityCheck: request.includeCompatibilityCheck,
				conflictAnalysis: request.includeConflictAnalysis,
				resourceValidation: request.includeResourceValidation,
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

			if (error instanceof BadRequestError || error instanceof InternalServerError) {
				throw error;
			}

			throw new InternalServerError('Comprehensive migration validation failed');
		}
	}

	@Post('/verify')
	@GlobalScope('instance:admin')
	async verifyMigrationIntegrity(
		req: AuthenticatedRequest,
		_: Response,
		@Body request: { exportId?: string; exportData?: any },
	): Promise<any> {
		try {
			this.logger.info('Migration integrity verification endpoint called', {
				requesterId: req.user.id,
				userRole: req.user.role,
				hasExportId: !!request.exportId,
				hasExportData: !!request.exportData,
			});

			if (!request.exportId && !request.exportData) {
				throw new BadRequestError('Either exportId or exportData is required for verification');
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

			if (error instanceof BadRequestError || error instanceof InternalServerError) {
				throw error;
			}

			throw new InternalServerError('Migration integrity verification failed');
		}
	}

	@Get('/compatibility/:exportId')
	@GlobalScope('instance:admin')
	async checkMigrationCompatibility(
		req: AuthenticatedRequest,
		_: Response,
		@Param('exportId') exportId: string,
	): Promise<any> {
		try {
			this.logger.info('Migration compatibility check endpoint called', {
				requesterId: req.user.id,
				userRole: req.user.role,
				exportId,
			});

			if (!exportId || typeof exportId !== 'string') {
				throw new BadRequestError('Valid export ID is required');
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

			if (error instanceof BadRequestError || error instanceof InternalServerError) {
				throw error;
			}

			throw new InternalServerError('Migration compatibility check failed');
		}
	}

	@Get('/exports')
	@GlobalScope('instance:admin')
	async listExports(req: AuthenticatedRequest): Promise<{
		exports: Array<{
			id: string;
			createdAt: Date;
			createdBy: string;
			size: number;
			status: string;
			summary: {
				workflows: number;
				credentials: number;
				users: number;
				settings: number;
			};
		}>;
		total: number;
	}> {
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

			if (error instanceof BadRequestError || error instanceof InternalServerError) {
				throw error;
			}

			throw new InternalServerError('Failed to list exports');
		}
	}

	@Post('/exports/:exportId/download')
	@GlobalScope('instance:admin')
	async downloadExport(
		req: AuthenticatedRequest,
		res: Response,
		@Param('exportId') exportId: string,
	): Promise<void> {
		try {
			this.logger.info('Export download endpoint called', {
				requesterId: req.user.id,
				userRole: req.user.role,
				exportId,
			});

			if (!exportId || typeof exportId !== 'string') {
				throw new BadRequestError('Valid export ID is required');
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

			if (error instanceof BadRequestError || error instanceof InternalServerError) {
				throw error;
			}

			throw new InternalServerError('Export download failed');
		}
	}

	// Utility methods
	private sanitizeUrl(url: string): string {
		try {
			const parsed = new URL(url);
			return `${parsed.protocol}//${parsed.hostname}:${parsed.port || (parsed.protocol === 'https:' ? '443' : '80')}`;
		} catch {
			return '[invalid-url]';
		}
	}
}
