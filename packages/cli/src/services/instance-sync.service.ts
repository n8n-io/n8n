import type {
	CrossInstanceTransferRequestDto,
	CrossInstanceTransferResponseDto,
	InstanceMigrationExportRequestDto,
	InstanceMigrationImportRequestDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
// import { randomBytes } from 'crypto'; // Unused import removed
import { v4 as uuid } from 'uuid';

import config from '@/config';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { EventService } from '@/events/event.service';
import { MigrationService } from './migration.service';

interface TransferOperation {
	id: string;
	status:
		| 'pending'
		| 'authenticating'
		| 'exporting'
		| 'uploading'
		| 'importing'
		| 'completed'
		| 'failed';
	progress: number;
	startedAt: Date;
	completedAt?: Date;
	error?: string;
	userId: string;
	targetInstanceUrl: string;
	summary: {
		totalResources: number;
		transferred: number;
		failed: number;
	};
}

interface InstanceAuthCredentials {
	apiKey?: string;
	authToken?: string;
	username?: string;
	password?: string;
}

interface RemoteInstanceInfo {
	instanceId: string;
	version: string;
	healthy: boolean;
	features: string[];
	lastChecked: Date;
}

@Service()
export class InstanceSyncService {
	private readonly transferOperations = new Map<string, TransferOperation>();
	private readonly instanceCache = new Map<string, RemoteInstanceInfo>();
	private readonly maxRetries = 3;
	private readonly timeoutMs = 30000; // 30 seconds

	constructor(
		private readonly logger: Logger,
		private readonly migrationService: MigrationService,
		private readonly eventService: EventService,
	) {
		// EventService is injected for future use in event emissions
	}

	async transferToInstance(
		user: User,
		request: CrossInstanceTransferRequestDto,
	): Promise<CrossInstanceTransferResponseDto> {
		const transferId = uuid();
		const operation: TransferOperation = {
			id: transferId,
			status: 'pending',
			progress: 0,
			startedAt: new Date(),
			userId: user.id,
			targetInstanceUrl: request.targetInstanceUrl,
			summary: {
				totalResources: 0,
				transferred: 0,
				failed: 0,
			},
		};

		this.transferOperations.set(transferId, operation);

		try {
			this.logger.info('Starting cross-instance transfer', {
				transferId,
				userId: user.id,
				targetUrl: this.sanitizeUrl(request.targetInstanceUrl),
			});

			// Step 1: Validate and authenticate with target instance
			operation.status = 'authenticating';
			operation.progress = 10;
			await this.validateTargetInstance(request.targetInstanceUrl, {
				apiKey: request.targetApiKey,
				authToken: request.targetAuthToken,
				username: request.targetUsername,
				password: request.targetPassword,
			});

			// Step 2: Export data from current instance
			operation.status = 'exporting';
			operation.progress = 30;
			const exportRequest: InstanceMigrationExportRequestDto = {
				includeWorkflows: request.includeWorkflows,
				includeCredentials: request.includeCredentials,
				includeUsers: request.includeUsers,
				includeSettings: request.includeSettings,
				includeCredentialData: request.includeCredentialData,
				projectIds: request.projectIds,
				compressionLevel: 6, // Default compression level
			};

			const exportResult = await this.migrationService.exportInstance(user, exportRequest);

			// Step 3: Transfer data to target instance
			operation.status = 'uploading';
			operation.progress = 60;
			const transferResult = await this.uploadToTargetInstance(
				request.targetInstanceUrl,
				{
					apiKey: request.targetApiKey,
					authToken: request.targetAuthToken,
					username: request.targetUsername,
					password: request.targetPassword,
				},
				exportResult.exportId,
				request,
			);

			// Step 4: Monitor import on target instance
			operation.status = 'importing';
			operation.progress = 80;
			const importResult = await this.monitorTargetImport(
				request.targetInstanceUrl,
				{
					apiKey: request.targetApiKey,
					authToken: request.targetAuthToken,
				},
				transferResult.importId,
			);

			// Step 5: Complete transfer
			operation.status = 'completed';
			operation.progress = 100;
			operation.completedAt = new Date();
			operation.summary = {
				totalResources:
					importResult.summary.totalImported +
					importResult.summary.totalSkipped +
					importResult.summary.totalErrors,
				transferred: importResult.summary.totalImported,
				failed: importResult.summary.totalErrors,
			};

			this.logger.info('Cross-instance transfer completed', {
				transferId,
				duration: operation.completedAt.getTime() - operation.startedAt.getTime(),
				summary: operation.summary,
			});

			return {
				transferId,
				status: 'completed',
				targetInstanceUrl: request.targetInstanceUrl,
				summary: operation.summary,
				completedAt: operation.completedAt,
				exportMetadata: {
					exportId: exportResult.exportId,
					size: exportResult.totalSize,
					summary: exportResult.summary,
				},
			};
		} catch (error) {
			operation.status = 'failed';
			operation.error = error instanceof Error ? error.message : 'Unknown error';
			operation.completedAt = new Date();

			this.logger.error('Cross-instance transfer failed', {
				transferId,
				error: operation.error,
			});

			throw new InternalServerError(`Transfer failed: ${operation.error}`);
		}
	}

	async getTransferStatus(user: User, transferId: string): Promise<TransferOperation> {
		const operation = this.transferOperations.get(transferId);
		if (!operation) {
			throw new BadRequestError('Transfer operation not found');
		}

		if (operation.userId !== user.id && user.role !== 'global:owner') {
			throw new BadRequestError('Access denied to this transfer operation');
		}

		return operation;
	}

	async validateTargetInstance(
		instanceUrl: string,
		credentials: InstanceAuthCredentials,
	): Promise<RemoteInstanceInfo> {
		try {
			this.logger.debug('Validating target instance', {
				url: this.sanitizeUrl(instanceUrl),
			});

			// Check if we have cached info that's still fresh
			const cached = this.instanceCache.get(instanceUrl);
			if (cached && Date.now() - cached.lastChecked.getTime() < 5 * 60 * 1000) {
				// 5 minutes
				return cached;
			}

			// Prepare authentication headers
			const headers = this.prepareAuthHeaders(credentials);

			// Test connection to target instance
			const healthResponse = await this.makeRequest(instanceUrl, '/healthz', 'GET', headers);
			if (!healthResponse.ok) {
				throw new Error(`Target instance health check failed: ${healthResponse.status}`);
			}

			// Get instance info
			const infoResponse = await this.makeRequest(
				instanceUrl,
				'/rest/instance-info',
				'GET',
				headers,
			);
			if (!infoResponse.ok) {
				throw new Error(`Failed to get target instance info: ${infoResponse.status}`);
			}

			const instanceInfo = await infoResponse.json();

			// Check if target instance supports migration API
			const migrationResponse = await this.makeRequest(
				instanceUrl,
				'/rest/migration/validate',
				'POST',
				headers,
				{
					exportData: null,
				},
			);

			const supportsMigration = migrationResponse.ok || migrationResponse.status === 400; // 400 means endpoint exists but bad request
			if (!supportsMigration) {
				throw new Error('Target instance does not support migration API');
			}

			const remoteInfo: RemoteInstanceInfo = {
				instanceId: instanceInfo.instanceId || uuid(),
				version: instanceInfo.version || 'unknown',
				healthy: true,
				features: instanceInfo.features || [],
				lastChecked: new Date(),
			};

			// Cache the instance info
			this.instanceCache.set(instanceUrl, remoteInfo);

			this.logger.debug('Target instance validated successfully', {
				instanceId: remoteInfo.instanceId,
				version: remoteInfo.version,
			});

			return remoteInfo;
		} catch (error) {
			this.logger.error('Target instance validation failed', {
				url: this.sanitizeUrl(instanceUrl),
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new BadRequestError(
				`Target instance validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	private async uploadToTargetInstance(
		instanceUrl: string,
		credentials: InstanceAuthCredentials,
		exportId: string,
		request: CrossInstanceTransferRequestDto,
	): Promise<{ importId: string }> {
		try {
			this.logger.debug('Uploading data to target instance', {
				url: this.sanitizeUrl(instanceUrl),
				exportId,
			});

			// Get export data
			const exportData = await this.getExportData(exportId);

			// Prepare import request
			const importRequest: InstanceMigrationImportRequestDto = {
				exportData,
				conflictResolution: request.conflictResolution || 'skip',
				createMissingProjects: request.createMissingProjects || false,
				createMissingUsers: false, // Default to false for security
				preserveIds: false, // Default to false to avoid conflicts
				decryptionKey: undefined, // Optional decryption key
				targetProjectId: undefined, // Optional target project
			};

			// Send import request to target instance
			const headers = this.prepareAuthHeaders(credentials);
			headers['Content-Type'] = 'application/json';

			const response = await this.makeRequest(
				instanceUrl,
				'/rest/migration/import',
				'POST',
				headers,
				importRequest,
			);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Import request failed: ${response.status} - ${errorText}`);
			}

			const result = await response.json();
			return { importId: result.importId };
		} catch (error) {
			this.logger.error('Failed to upload data to target instance', {
				url: this.sanitizeUrl(instanceUrl),
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}

	private async monitorTargetImport(
		instanceUrl: string,
		credentials: Pick<InstanceAuthCredentials, 'apiKey' | 'authToken'>,
		importId: string,
	): Promise<any> {
		const maxAttempts = 60; // 5 minutes with 5-second intervals
		let attempts = 0;

		while (attempts < maxAttempts) {
			try {
				const headers = this.prepareAuthHeaders(credentials);
				const response = await this.makeRequest(
					instanceUrl,
					`/rest/migration/status/${importId}`,
					'GET',
					headers,
				);

				if (!response.ok) {
					throw new Error(`Status check failed: ${response.status}`);
				}

				const status = await response.json();

				if (status.status === 'completed') {
					return status;
				}

				if (status.status === 'failed') {
					throw new Error(`Import failed on target instance: ${status.error}`);
				}

				// Wait 5 seconds before next check
				await new Promise((resolve) => setTimeout(resolve, 5000));
				attempts++;
			} catch (error) {
				this.logger.warn('Error checking import status', {
					attempt: attempts,
					error: error instanceof Error ? error.message : 'Unknown error',
				});

				if (attempts >= maxAttempts - 1) {
					throw error;
				}

				await new Promise((resolve) => setTimeout(resolve, 5000));
				attempts++;
			}
		}

		throw new Error('Import monitoring timed out');
	}

	private prepareAuthHeaders(credentials: InstanceAuthCredentials): Record<string, string> {
		const headers: Record<string, string> = {};

		if (credentials.apiKey) {
			headers['X-N8N-API-KEY'] = credentials.apiKey;
		} else if (credentials.authToken) {
			headers['Authorization'] = `Bearer ${credentials.authToken}`;
		} else if (credentials.username && credentials.password) {
			const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString(
				'base64',
			);
			headers['Authorization'] = `Basic ${auth}`;
		}

		// Add instance identification headers
		headers['X-N8N-SOURCE-INSTANCE'] =
			String(config.getEnv('deployment.instanceId' as any)) || 'unknown';
		headers['X-N8N-MIGRATION-REQUEST'] = 'true';

		return headers;
	}

	private async makeRequest(
		baseUrl: string,
		path: string,
		method: string,
		headers: Record<string, string>,
		body?: any,
	): Promise<Response> {
		const url = new URL(path, baseUrl);

		const options: RequestInit = {
			method,
			headers,
			signal: AbortSignal.timeout(this.timeoutMs),
		};

		if (body && (method === 'POST' || method === 'PUT')) {
			options.body = JSON.stringify(body);
		}

		let lastError: Error;
		for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
			try {
				const response = await fetch(url.toString(), options);
				return response;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error('Unknown error');
				this.logger.warn(`Request attempt ${attempt} failed`, {
					url: this.sanitizeUrl(url.toString()),
					error: lastError.message,
				});

				if (attempt < this.maxRetries) {
					await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
				}
			}
		}

		throw lastError!;
	}

	private async getExportData(exportId: string): Promise<any> {
		try {
			this.logger.debug('Loading export data for transfer', { exportId });

			// Load export data through the migration service
			const exportData = await this.migrationService.getExportData(exportId);

			if (!exportData) {
				throw new Error('Export data not found');
			}

			// Validate export data structure
			if (!exportData.metadata || !exportData.metadata.version) {
				throw new Error('Invalid export data: missing metadata');
			}

			this.logger.debug('Export data loaded successfully', {
				exportId,
				version: exportData.metadata.version,
				hasWorkflows: !!exportData.workflows,
				hasCredentials: !!exportData.credentials,
				hasUsers: !!exportData.users,
				hasSettings: !!exportData.settings,
			});

			return exportData;
		} catch (error) {
			this.logger.error('Failed to load export data', {
				exportId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new Error(
				`Failed to load export data: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	private sanitizeUrl(url: string): string {
		try {
			const parsed = new URL(url);
			return `${parsed.protocol}//${parsed.hostname}:${parsed.port || '443'}`;
		} catch {
			return '[invalid-url]';
		}
	}

	async listTransfers(user: User): Promise<{
		transfers: Array<{
			id: string;
			status: string;
			targetInstance: string;
			createdAt: Date;
			completedAt?: Date;
			summary: {
				totalResources: number;
				transferred: number;
				failed: number;
			};
		}>;
		total: number;
	}> {
		const transfers = Array.from(this.transferOperations.values())
			.filter((op) => op.userId === user.id || user.role === 'global:owner')
			.map((op) => ({
				id: op.id,
				status: op.status,
				targetInstance: this.sanitizeUrl(op.targetInstanceUrl),
				createdAt: op.startedAt,
				completedAt: op.completedAt,
				summary: op.summary,
			}));

		return {
			transfers,
			total: transfers.length,
		};
	}

	async cancelTransfer(
		user: User,
		transferId: string,
	): Promise<{ success: boolean; message: string }> {
		const operation = this.transferOperations.get(transferId);
		if (!operation) {
			throw new BadRequestError('Transfer operation not found');
		}

		if (operation.userId !== user.id && user.role !== 'global:owner') {
			throw new BadRequestError('Access denied to this transfer operation');
		}

		if (operation.status === 'completed' || operation.status === 'failed') {
			return {
				success: false,
				message: 'Cannot cancel a transfer that has already completed or failed',
			};
		}

		operation.status = 'failed';
		operation.error = 'Cancelled by user';
		operation.completedAt = new Date();

		this.logger.info('Transfer cancelled by user', {
			transferId,
			userId: user.id,
		});

		// Note: Event emission would be added here once the event type is defined in EventMap
		// Until then, we log the event details for debugging
		this.logger.info('Transfer cancelled - event service available for future event emission', {
			transferId,
			userId: user.id,
			cancelledAt: operation.completedAt,
			eventServiceAvailable: !!this.eventService,
		});

		return {
			success: true,
			message: 'Transfer cancelled successfully',
		};
	}

	async retryTransfer(user: User, transferId: string): Promise<CrossInstanceTransferResponseDto> {
		const operation = this.transferOperations.get(transferId);
		if (!operation) {
			throw new BadRequestError('Transfer operation not found');
		}

		if (operation.userId !== user.id && user.role !== 'global:owner') {
			throw new BadRequestError('Access denied to this transfer operation');
		}

		if (operation.status !== 'failed') {
			throw new BadRequestError('Only failed transfers can be retried');
		}

		// This would need the original user object and request parameters, which we'd need to fetch and store
		// For now, we'll throw an error indicating this needs to be implemented
		throw new BadRequestError('Transfer retry not yet implemented - create a new transfer instead');
	}

	// Utility methods removed to eliminate unused code warnings
	// formatDuration, withRetry, and createTransferContext methods can be added back when needed
}
