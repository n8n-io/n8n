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
exports.InstanceSyncService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const uuid_1 = require('uuid');
const config_1 = __importDefault(require('@/config'));
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const event_service_1 = require('@/events/event.service');
const migration_service_1 = require('./migration.service');
let InstanceSyncService = class InstanceSyncService {
	constructor(logger, migrationService, eventService) {
		this.logger = logger;
		this.migrationService = migrationService;
		this.eventService = eventService;
		this.transferOperations = new Map();
		this.instanceCache = new Map();
		this.maxRetries = 3;
		this.timeoutMs = 30000;
	}
	async transferToInstance(user, request) {
		const transferId = (0, uuid_1.v4)();
		const operation = {
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
			operation.status = 'authenticating';
			operation.progress = 10;
			await this.validateTargetInstance(request.targetInstanceUrl, {
				apiKey: request.targetApiKey,
				authToken: request.targetAuthToken,
				username: request.targetUsername,
				password: request.targetPassword,
			});
			operation.status = 'exporting';
			operation.progress = 30;
			const exportRequest = {
				includeWorkflows: request.includeWorkflows,
				includeCredentials: request.includeCredentials,
				includeUsers: request.includeUsers,
				includeSettings: request.includeSettings,
				includeCredentialData: request.includeCredentialData,
				projectIds: request.projectIds,
			};
			const exportResult = await this.migrationService.exportInstance(user, exportRequest);
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
			throw new internal_server_error_1.InternalServerError(`Transfer failed: ${operation.error}`);
		}
	}
	async getTransferStatus(user, transferId) {
		const operation = this.transferOperations.get(transferId);
		if (!operation) {
			throw new bad_request_error_1.BadRequestError('Transfer operation not found');
		}
		if (operation.userId !== user.id && user.role !== 'global:owner') {
			throw new bad_request_error_1.BadRequestError('Access denied to this transfer operation');
		}
		return operation;
	}
	async validateTargetInstance(instanceUrl, credentials) {
		try {
			this.logger.debug('Validating target instance', {
				url: this.sanitizeUrl(instanceUrl),
			});
			const cached = this.instanceCache.get(instanceUrl);
			if (cached && Date.now() - cached.lastChecked.getTime() < 5 * 60 * 1000) {
				return cached;
			}
			const headers = this.prepareAuthHeaders(credentials);
			const healthResponse = await this.makeRequest(instanceUrl, '/healthz', 'GET', headers);
			if (!healthResponse.ok) {
				throw new Error(`Target instance health check failed: ${healthResponse.status}`);
			}
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
			const migrationResponse = await this.makeRequest(
				instanceUrl,
				'/rest/migration/validate',
				'POST',
				headers,
				{
					exportData: null,
				},
			);
			const supportsMigration = migrationResponse.ok || migrationResponse.status === 400;
			if (!supportsMigration) {
				throw new Error('Target instance does not support migration API');
			}
			const remoteInfo = {
				instanceId: instanceInfo.instanceId || (0, uuid_1.v4)(),
				version: instanceInfo.version || 'unknown',
				healthy: true,
				features: instanceInfo.features || [],
				lastChecked: new Date(),
			};
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
			throw new bad_request_error_1.BadRequestError(
				`Target instance validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}
	async uploadToTargetInstance(instanceUrl, credentials, exportId, request) {
		try {
			this.logger.debug('Uploading data to target instance', {
				url: this.sanitizeUrl(instanceUrl),
				exportId,
			});
			const exportData = await this.getExportData(exportId);
			const importRequest = {
				exportData,
				conflictResolution: request.conflictResolution || 'skip',
				createMissingProjects: request.createMissingProjects || false,
			};
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
	async monitorTargetImport(instanceUrl, credentials, importId) {
		const maxAttempts = 60;
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
	prepareAuthHeaders(credentials) {
		const headers = {};
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
		headers['X-N8N-SOURCE-INSTANCE'] =
			config_1.default.getEnv('deployment.instanceId') || 'unknown';
		headers['X-N8N-MIGRATION-REQUEST'] = 'true';
		return headers;
	}
	async makeRequest(baseUrl, path, method, headers, body) {
		const url = new URL(path, baseUrl);
		const options = {
			method,
			headers,
			signal: AbortSignal.timeout(this.timeoutMs),
		};
		if (body && (method === 'POST' || method === 'PUT')) {
			options.body = JSON.stringify(body);
		}
		let lastError;
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
					await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
				}
			}
		}
		throw lastError;
	}
	async getExportData(exportId) {
		try {
			this.logger.debug('Loading export data for transfer', { exportId });
			const exportData = await this.migrationService.getExportData(exportId);
			if (!exportData) {
				throw new Error('Export data not found');
			}
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
	sanitizeUrl(url) {
		try {
			const parsed = new URL(url);
			return `${parsed.protocol}//${parsed.hostname}:${parsed.port || '443'}`;
		} catch {
			return '[invalid-url]';
		}
	}
	async listTransfers(user) {
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
	async cancelTransfer(user, transferId) {
		const operation = this.transferOperations.get(transferId);
		if (!operation) {
			throw new bad_request_error_1.BadRequestError('Transfer operation not found');
		}
		if (operation.userId !== user.id && user.role !== 'global:owner') {
			throw new bad_request_error_1.BadRequestError('Access denied to this transfer operation');
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
		this.eventService.emit('cross-instance-transfer-cancelled', {
			transferId,
			userId: user.id,
			cancelledAt: operation.completedAt,
		});
		return {
			success: true,
			message: 'Transfer cancelled successfully',
		};
	}
	async retryTransfer(user, transferId) {
		const operation = this.transferOperations.get(transferId);
		if (!operation) {
			throw new bad_request_error_1.BadRequestError('Transfer operation not found');
		}
		if (operation.userId !== user.id && user.role !== 'global:owner') {
			throw new bad_request_error_1.BadRequestError('Access denied to this transfer operation');
		}
		if (operation.status !== 'failed') {
			throw new bad_request_error_1.BadRequestError('Only failed transfers can be retried');
		}
		const retryRequest = {
			targetInstanceUrl: operation.targetInstanceUrl,
			includeWorkflows: true,
			includeCredentials: true,
			includeUsers: false,
			includeSettings: false,
		};
		throw new bad_request_error_1.BadRequestError(
			'Transfer retry not yet implemented - create a new transfer instead',
		);
	}
	formatDuration(milliseconds) {
		if (milliseconds < 1000) return `${milliseconds}ms`;
		if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
		if (milliseconds < 3600000) return `${(milliseconds / 60000).toFixed(1)}m`;
		return `${(milliseconds / 3600000).toFixed(1)}h`;
	}
	async withRetry(operation, operationName, context = {}, maxRetries = 3, baseDelay = 1000) {
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
					...context,
				});
				if (attempt < maxRetries) {
					const delay = baseDelay * Math.pow(2, attempt - 1);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}
		throw lastError;
	}
	createTransferContext(transferId, user, request) {
		return {
			transferId,
			userId: user.id,
			userRole: user.role,
			targetUrl: this.sanitizeUrl(request.targetInstanceUrl),
			timestamp: new Date().toISOString(),
			instanceId: config_1.default.getEnv('deployment.instanceId') || 'unknown',
			n8nVersion: process.env.N8N_VERSION || 'unknown',
			request: {
				includeWorkflows: request.includeWorkflows,
				includeCredentials: request.includeCredentials,
				includeUsers: request.includeUsers,
				includeSettings: request.includeSettings,
				conflictResolution: request.conflictResolution,
			},
		};
	}
};
exports.InstanceSyncService = InstanceSyncService;
exports.InstanceSyncService = InstanceSyncService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			migration_service_1.MigrationService,
			event_service_1.EventService,
		]),
	],
	InstanceSyncService,
);
//# sourceMappingURL=instance-sync.service.js.map
