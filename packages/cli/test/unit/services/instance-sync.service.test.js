'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const instance_sync_service_1 = require('@/services/instance-sync.service');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const mockHttpClient = {
	post: jest.fn(),
	get: jest.fn(),
	put: jest.fn(),
	delete: jest.fn(),
	defaults: {
		timeout: 30000,
		headers: {},
	},
};
jest.mock('axios', () => ({
	create: jest.fn(() => mockHttpClient),
}));
const mockLogger = {
	info: jest.fn(),
	debug: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};
const mockMigrationSecurityService = {
	generateAuthToken: jest.fn(),
	validateAuthToken: jest.fn(),
	encryptTransferData: jest.fn(),
	decryptTransferData: jest.fn(),
	validateInstanceIdentity: jest.fn(),
};
const mockUser = {
	id: 'user-1',
	email: 'test@example.com',
	firstName: 'Test',
	lastName: 'User',
	role: 'global:admin',
};
describe('InstanceSyncService', () => {
	let instanceSyncService;
	beforeEach(() => {
		jest.clearAllMocks();
		instanceSyncService = new instance_sync_service_1.InstanceSyncService(
			mockLogger,
			mockMigrationSecurityService,
		);
	});
	describe('transferToInstance', () => {
		const mockTransferRequest = {
			targetInstanceUrl: 'https://target.example.com',
			targetAuthToken: 'secure-token-123',
			exportData: {
				metadata: {
					id: 'export-123',
					version: '1.0.0',
					createdAt: new Date(),
					source: {
						instanceUrl: 'https://source.example.com',
						n8nVersion: '1.0.0',
					},
				},
				workflows: [
					{
						id: 'workflow-1',
						name: 'Test Workflow',
						nodes: [],
					},
				],
				credentials: [
					{
						id: 'credential-1',
						name: 'Test Credential',
						type: 'httpAuth',
					},
				],
			},
			conflictResolution: 'skip',
			createMissingProjects: true,
			options: {
				validateBeforeTransfer: true,
				encryptTransferData: true,
				retryAttempts: 3,
			},
		};
		const mockTransferResponse = {
			transferId: 'transfer-456',
			status: 'completed',
			targetInstanceUrl: 'https://target.example.com',
			transferredAt: new Date(),
			summary: {
				totalTransferred: 2,
				totalSkipped: 0,
				totalErrors: 0,
				workflows: { transferred: 1, skipped: 0, errors: 0 },
				credentials: { transferred: 1, skipped: 0, errors: 0 },
				users: { transferred: 0, skipped: 0, errors: 0 },
				settings: { transferred: 0, skipped: 0, errors: 0 },
				projects: { transferred: 0, skipped: 0, errors: 0 },
			},
			duration: 1500,
		};
		beforeEach(() => {
			mockMigrationSecurityService.generateAuthToken.mockReturnValue('auth-token-456');
			mockMigrationSecurityService.validateInstanceIdentity.mockResolvedValue(true);
			mockMigrationSecurityService.encryptTransferData.mockResolvedValue({
				encryptedData: 'encrypted-data',
				encryptionKey: 'encryption-key',
			});
		});
		it('should successfully transfer data to target instance', async () => {
			mockHttpClient.get.mockResolvedValueOnce({
				status: 200,
				data: { status: 'healthy', version: '1.0.0' },
			});
			mockHttpClient.post.mockResolvedValueOnce({
				status: 200,
				data: {
					importId: 'import-789',
					status: 'completed',
					summary: mockTransferResponse.summary,
				},
			});
			const result = await instanceSyncService.transferToInstance(mockUser, mockTransferRequest);
			expect(result).toMatchObject({
				transferId: expect.any(String),
				status: 'completed',
				targetInstanceUrl: 'https://target.example.com',
				transferredAt: expect.any(Date),
				summary: mockTransferResponse.summary,
				duration: expect.any(Number),
			});
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Starting cross-instance transfer',
				expect.objectContaining({
					transferId: expect.any(String),
					userId: mockUser.id,
					targetUrl: 'https://target.example.com:443',
				}),
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Cross-instance transfer completed',
				expect.objectContaining({
					transferId: expect.any(String),
					duration: expect.any(Number),
				}),
			);
		});
		it('should validate target instance before transfer', async () => {
			mockHttpClient.get.mockResolvedValueOnce({
				status: 200,
				data: { status: 'healthy', version: '1.0.0' },
			});
			mockHttpClient.post.mockResolvedValueOnce({
				status: 200,
				data: { importId: 'import-789', status: 'completed', summary: {} },
			});
			await instanceSyncService.transferToInstance(mockUser, mockTransferRequest);
			expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/health', expect.any(Object));
			expect(mockMigrationSecurityService.validateInstanceIdentity).toHaveBeenCalledWith(
				'https://target.example.com',
				expect.any(Object),
			);
		});
		it('should handle target instance validation failure', async () => {
			mockHttpClient.get.mockRejectedValueOnce({
				code: 'ECONNREFUSED',
				message: 'Connection refused',
			});
			await expect(
				instanceSyncService.transferToInstance(mockUser, mockTransferRequest),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Cross-instance transfer failed',
				expect.objectContaining({
					error: expect.stringContaining('Target instance validation failed'),
					targetUrl: 'https://target.example.com:443',
				}),
			);
		});
		it('should encrypt transfer data when requested', async () => {
			const encryptedRequest = {
				...mockTransferRequest,
				options: { ...mockTransferRequest.options, encryptTransferData: true },
			};
			mockHttpClient.get.mockResolvedValueOnce({
				status: 200,
				data: { status: 'healthy' },
			});
			mockHttpClient.post.mockResolvedValueOnce({
				status: 200,
				data: { importId: 'import-789', status: 'completed', summary: {} },
			});
			await instanceSyncService.transferToInstance(mockUser, encryptedRequest);
			expect(mockMigrationSecurityService.encryptTransferData).toHaveBeenCalledWith(
				encryptedRequest.exportData,
				expect.any(String),
			);
			expect(mockHttpClient.post).toHaveBeenCalledWith(
				'/api/v1/migration/import',
				expect.objectContaining({
					encryptedData: 'encrypted-data',
					encryptionKey: 'encryption-key',
				}),
				expect.any(Object),
			);
		});
		it('should retry failed transfers based on retryAttempts option', async () => {
			mockHttpClient.get.mockResolvedValue({
				status: 200,
				data: { status: 'healthy' },
			});
			mockHttpClient.post
				.mockRejectedValueOnce(new Error('Network timeout'))
				.mockRejectedValueOnce(new Error('Service unavailable'))
				.mockResolvedValueOnce({
					status: 200,
					data: { importId: 'import-789', status: 'completed', summary: {} },
				});
			const result = await instanceSyncService.transferToInstance(mockUser, mockTransferRequest);
			expect(result.status).toBe('completed');
			expect(mockHttpClient.post).toHaveBeenCalledTimes(3);
			expect(mockLogger.warn).toHaveBeenCalledTimes(2);
		});
		it('should handle transfer timeout gracefully', async () => {
			mockHttpClient.get.mockResolvedValueOnce({
				status: 200,
				data: { status: 'healthy' },
			});
			mockHttpClient.post.mockRejectedValue({
				code: 'ECONNABORTED',
				message: 'Request timeout',
			});
			await expect(
				instanceSyncService.transferToInstance(mockUser, mockTransferRequest),
			).rejects.toThrow(internal_server_error_1.InternalServerError);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Cross-instance transfer failed',
				expect.objectContaining({
					error: expect.stringContaining('Transfer operation failed after 3 attempts'),
					transferId: expect.any(String),
				}),
			);
		});
		it('should validate transfer request parameters', async () => {
			const invalidRequest = {
				...mockTransferRequest,
				targetInstanceUrl: 'invalid-url',
			};
			await expect(
				instanceSyncService.transferToInstance(mockUser, invalidRequest),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
		it('should handle different conflict resolution strategies', async () => {
			const renameRequest = {
				...mockTransferRequest,
				conflictResolution: 'rename',
			};
			mockHttpClient.get.mockResolvedValueOnce({
				status: 200,
				data: { status: 'healthy' },
			});
			mockHttpClient.post.mockResolvedValueOnce({
				status: 200,
				data: { importId: 'import-789', status: 'completed', summary: {} },
			});
			await instanceSyncService.transferToInstance(mockUser, renameRequest);
			expect(mockHttpClient.post).toHaveBeenCalledWith(
				'/api/v1/migration/import',
				expect.objectContaining({
					conflictResolution: 'rename',
				}),
				expect.any(Object),
			);
		});
		it('should include proper authentication headers', async () => {
			mockHttpClient.get.mockResolvedValueOnce({
				status: 200,
				data: { status: 'healthy' },
			});
			mockHttpClient.post.mockResolvedValueOnce({
				status: 200,
				data: { importId: 'import-789', status: 'completed', summary: {} },
			});
			await instanceSyncService.transferToInstance(mockUser, mockTransferRequest);
			const expectedHeaders = {
				'Content-Type': 'application/json',
				'X-N8N-Instance-Transfer': 'true',
				'X-Transfer-ID': expect.any(String),
				Authorization: 'Bearer secure-token-123',
			};
			expect(mockHttpClient.post).toHaveBeenCalledWith(
				'/api/v1/migration/import',
				expect.any(Object),
				expect.objectContaining({
					headers: expect.objectContaining(expectedHeaders),
				}),
			);
		});
	});
	describe('receiveFromInstance', () => {
		const mockIncomingData = {
			metadata: {
				id: 'export-123',
				transferId: 'transfer-456',
				sourceInstanceUrl: 'https://source.example.com',
			},
			workflows: [],
			credentials: [],
		};
		it('should validate incoming authentication token', async () => {
			mockMigrationSecurityService.validateAuthToken.mockResolvedValue(true);
			mockMigrationSecurityService.decryptTransferData.mockResolvedValue(mockIncomingData);
			const result = await instanceSyncService.receiveFromInstance(
				mockUser,
				'valid-token',
				mockIncomingData,
			);
			expect(mockMigrationSecurityService.validateAuthToken).toHaveBeenCalledWith('valid-token');
			expect(result).toMatchObject({
				status: 'received',
				transferId: expect.any(String),
			});
		});
		it('should reject invalid authentication tokens', async () => {
			mockMigrationSecurityService.validateAuthToken.mockResolvedValue(false);
			await expect(
				instanceSyncService.receiveFromInstance(mockUser, 'invalid-token', mockIncomingData),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Invalid authentication token for incoming transfer',
				expect.objectContaining({
					userId: mockUser.id,
				}),
			);
		});
		it('should decrypt incoming encrypted data', async () => {
			const encryptedData = {
				encryptedData: 'encrypted-payload',
				encryptionKey: 'decryption-key',
				metadata: mockIncomingData.metadata,
			};
			mockMigrationSecurityService.validateAuthToken.mockResolvedValue(true);
			mockMigrationSecurityService.decryptTransferData.mockResolvedValue(mockIncomingData);
			await instanceSyncService.receiveFromInstance(mockUser, 'valid-token', encryptedData);
			expect(mockMigrationSecurityService.decryptTransferData).toHaveBeenCalledWith(
				'encrypted-payload',
				'decryption-key',
			);
		});
		it('should log incoming transfer details', async () => {
			mockMigrationSecurityService.validateAuthToken.mockResolvedValue(true);
			mockMigrationSecurityService.decryptTransferData.mockResolvedValue(mockIncomingData);
			await instanceSyncService.receiveFromInstance(mockUser, 'valid-token', mockIncomingData);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Received cross-instance transfer',
				expect.objectContaining({
					userId: mockUser.id,
					sourceUrl: 'https://source.example.com:443',
					transferId: 'transfer-456',
				}),
			);
		});
	});
	describe('validateConnection', () => {
		it('should validate connection to target instance', async () => {
			mockHttpClient.get.mockResolvedValueOnce({
				status: 200,
				data: {
					status: 'healthy',
					version: '1.0.0',
					instanceId: 'target-instance-123',
				},
			});
			const result = await instanceSyncService.validateConnection(
				'https://target.example.com',
				'auth-token-123',
			);
			expect(result).toMatchObject({
				isValid: true,
				targetInstanceInfo: {
					status: 'healthy',
					version: '1.0.0',
					instanceId: 'target-instance-123',
				},
				latency: expect.any(Number),
			});
			expect(mockHttpClient.get).toHaveBeenCalledWith(
				'/api/v1/health',
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer auth-token-123',
					}),
				}),
			);
		});
		it('should handle connection validation failures', async () => {
			mockHttpClient.get.mockRejectedValueOnce({
				code: 'ENOTFOUND',
				message: 'DNS resolution failed',
			});
			const result = await instanceSyncService.validateConnection(
				'https://invalid.example.com',
				'auth-token-123',
			);
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('DNS resolution failed');
		});
		it('should measure connection latency', async () => {
			const startTime = Date.now();
			mockHttpClient.get.mockImplementation(() => {
				return new Promise((resolve) => {
					setTimeout(() => {
						resolve({
							status: 200,
							data: { status: 'healthy' },
						});
					}, 100);
				});
			});
			const result = await instanceSyncService.validateConnection(
				'https://target.example.com',
				'auth-token-123',
			);
			expect(result.latency).toBeGreaterThanOrEqual(90);
			expect(result.latency).toBeLessThan(200);
		});
	});
	describe('error handling and logging', () => {
		it('should format duration correctly', async () => {
			const mockTransferRequest = {
				targetInstanceUrl: 'https://target.example.com',
				targetAuthToken: 'secure-token-123',
				exportData: { metadata: {}, workflows: [], credentials: [] },
				conflictResolution: 'skip',
			};
			mockHttpClient.get.mockResolvedValueOnce({
				status: 200,
				data: { status: 'healthy' },
			});
			mockHttpClient.post.mockResolvedValueOnce({
				status: 200,
				data: { importId: 'import-789', status: 'completed', summary: {} },
			});
			await instanceSyncService.transferToInstance(mockUser, mockTransferRequest);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Cross-instance transfer completed',
				expect.objectContaining({
					duration: expect.any(Number),
					formattedDuration: expect.stringMatching(/\d+(\.\d+)?(ms|s|m|h)/),
				}),
			);
		});
		it('should sanitize URLs in logs', async () => {
			const requestWithCredentials = {
				...mockTransferRequest,
				targetInstanceUrl: 'https://user:password@target.example.com:8080/path',
			};
			mockHttpClient.get.mockRejectedValueOnce(new Error('Connection failed'));
			await expect(
				instanceSyncService.transferToInstance(mockUser, requestWithCredentials),
			).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Cross-instance transfer failed',
				expect.objectContaining({
					targetUrl: 'https://target.example.com:8080',
				}),
			);
		});
		it('should provide detailed error context', async () => {
			mockHttpClient.get.mockResolvedValueOnce({
				status: 200,
				data: { status: 'healthy' },
			});
			const networkError = {
				code: 'ECONNRESET',
				message: 'Connection was reset',
				response: {
					status: 500,
					data: { error: 'Internal server error' },
				},
			};
			mockHttpClient.post.mockRejectedValue(networkError);
			await expect(
				instanceSyncService.transferToInstance(mockUser, mockTransferRequest),
			).rejects.toThrow(internal_server_error_1.InternalServerError);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Cross-instance transfer failed',
				expect.objectContaining({
					error: expect.stringContaining('Transfer operation failed after 3 attempts'),
					transferId: expect.any(String),
					userId: mockUser.id,
					targetUrl: 'https://target.example.com:443',
					attempts: 3,
					lastError: 'Connection was reset',
				}),
			);
		});
	});
});
//# sourceMappingURL=instance-sync.service.test.js.map
