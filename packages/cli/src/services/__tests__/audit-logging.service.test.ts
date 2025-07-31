import {
	AuditEvent,
	type AuditEventType,
	type AuditEventCategory,
	type AuditEventSeverity,
} from '@n8n/db';
import { Repository } from '@n8n/typeorm';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Request } from 'express';
import type { IDataObject } from 'n8n-workflow';

import { Logger } from '@/logger';
import { AuditLoggingService, type IAuditEventData } from '../audit-logging.service';

describe('AuditLoggingService', () => {
	let auditLoggingService: AuditLoggingService;
	let mockRepository: jest.Mocked<Repository<AuditEvent>>;
	let mockLogger: jest.Mocked<Logger>;

	const mockRequest = mock<Request>({
		method: 'GET',
		path: '/api/test',
		ip: '127.0.0.1',
		headers: { 'user-agent': 'test-agent' },
		query: { test: 'value' },
		params: { id: '123' },
		sessionID: 'session-123',
	});

	const mockAuditEventData: IAuditEventData = {
		eventType: 'api_call',
		category: 'data_access',
		severity: 'medium',
		description: 'Test audit event',
		userId: 'user-123',
		projectId: 'project-123',
		ipAddress: '127.0.0.1',
		userAgent: 'test-agent',
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockRepository = mock<Repository<AuditEvent>>();
		mockLogger = mock<Logger>();

		// Mock Container.get calls
		Container.get = jest.fn().mockImplementation((token) => {
			if (token === Logger) return mockLogger;
			if (token === 'DataSource') {
				return { getRepository: () => mockRepository };
			}
			return {};
		});

		auditLoggingService = new AuditLoggingService();
	});

	describe('logEvent', () => {
		it('should successfully log an audit event', async () => {
			const mockAuditEvent = {
				id: 'event-123',
				...mockAuditEventData,
				createdAt: new Date(),
			} as AuditEvent;

			mockRepository.create.mockReturnValue(mockAuditEvent);
			mockRepository.save.mockResolvedValue(mockAuditEvent);

			const result = await auditLoggingService.logEvent(mockAuditEventData);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'api_call',
					category: 'data_access',
					severity: 'medium',
					description: 'Test audit event',
					userId: 'user-123',
					projectId: 'project-123',
				}),
			);
			expect(mockRepository.save).toHaveBeenCalledWith(mockAuditEvent);
			expect(result).toEqual(mockAuditEvent);
		});

		it('should set default severity to medium if not provided', async () => {
			const eventDataWithoutSeverity = { ...mockAuditEventData };
			delete eventDataWithoutSeverity.severity;

			const mockAuditEvent = {
				id: 'event-123',
				...eventDataWithoutSeverity,
				severity: 'medium',
			} as AuditEvent;

			mockRepository.create.mockReturnValue(mockAuditEvent);
			mockRepository.save.mockResolvedValue(mockAuditEvent);

			await auditLoggingService.logEvent(eventDataWithoutSeverity);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					severity: 'medium',
				}),
			);
		});

		it('should set archive date based on retention category', async () => {
			const eventDataWithExtendedRetention = {
				...mockAuditEventData,
				retentionCategory: 'extended' as const,
			};

			const mockAuditEvent = {
				id: 'event-123',
				...eventDataWithExtendedRetention,
			} as AuditEvent;

			mockRepository.create.mockReturnValue(mockAuditEvent);
			mockRepository.save.mockResolvedValue(mockAuditEvent);

			await auditLoggingService.logEvent(eventDataWithExtendedRetention);

			const createCall = mockRepository.create.mock.calls[0][0];
			expect(createCall.retentionCategory).toBe('extended');
		});

		it('should log high-severity events as warnings', async () => {
			const highSeverityEvent = {
				...mockAuditEventData,
				severity: 'critical' as AuditEventSeverity,
			};

			const mockAuditEvent = {
				id: 'event-123',
				...highSeverityEvent,
			} as AuditEvent;

			mockRepository.create.mockReturnValue(mockAuditEvent);
			mockRepository.save.mockResolvedValue(mockAuditEvent);

			await auditLoggingService.logEvent(highSeverityEvent);

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'High-severity audit event: Test audit event',
				expect.objectContaining({
					eventId: 'event-123',
					eventType: 'api_call',
					severity: 'critical',
				}),
			);
		});

		it('should handle errors gracefully', async () => {
			const error = new Error('Database error');
			mockRepository.create.mockImplementation(() => {
				throw error;
			});

			await expect(auditLoggingService.logEvent(mockAuditEventData)).rejects.toThrow(
				'Audit logging failed: Database error',
			);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to log audit event',
				expect.objectContaining({
					error: 'Database error',
					eventData: mockAuditEventData,
				}),
			);
		});
	});

	describe('logApiCall', () => {
		it('should log API call with correct parameters', async () => {
			const mockAuditEvent = {
				id: 'event-123',
				eventType: 'api_call',
				description: 'API GET /api/test - Status 200',
			} as AuditEvent;

			mockRepository.create.mockReturnValue(mockAuditEvent);
			mockRepository.save.mockResolvedValue(mockAuditEvent);

			const result = await auditLoggingService.logApiCall(
				mockRequest,
				200,
				150,
				'user-123',
				'project-123',
			);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'api_call',
					category: 'data_access',
					severity: 'low',
					description: 'API GET /api/test - Status 200',
					userId: 'user-123',
					projectId: 'project-123',
					ipAddress: '127.0.0.1',
					userAgent: 'test-agent',
					httpMethod: 'GET',
					endpoint: '/api/test',
					statusCode: 200,
					responseTimeMs: 150,
					sessionId: 'session-123',
					metadata: expect.objectContaining({
						query: { test: 'value' },
						params: { id: '123' },
					}),
				}),
			);
			expect(result).toEqual(mockAuditEvent);
		});

		it('should determine severity based on status code', async () => {
			const mockAuditEvent = { id: 'event-123' } as AuditEvent;
			mockRepository.create.mockReturnValue(mockAuditEvent);
			mockRepository.save.mockResolvedValue(mockAuditEvent);

			// Test different status codes
			await auditLoggingService.logApiCall(mockRequest, 500, 100);
			expect(mockRepository.create).toHaveBeenLastCalledWith(
				expect.objectContaining({ severity: 'high' }),
			);

			await auditLoggingService.logApiCall(mockRequest, 400, 100);
			expect(mockRepository.create).toHaveBeenLastCalledWith(
				expect.objectContaining({ severity: 'medium' }),
			);

			await auditLoggingService.logApiCall(mockRequest, 200, 100);
			expect(mockRepository.create).toHaveBeenLastCalledWith(
				expect.objectContaining({ severity: 'low' }),
			);
		});

		it('should extract IP address from X-Forwarded-For header', async () => {
			const requestWithProxy = {
				...mockRequest,
				get: jest.fn((header) => {
					if (header === 'X-Forwarded-For') return '192.168.1.1, 10.0.0.1';
					if (header === 'User-Agent') return 'test-agent';
					return undefined;
				}),
			} as any;

			const mockAuditEvent = { id: 'event-123' } as AuditEvent;
			mockRepository.create.mockReturnValue(mockAuditEvent);
			mockRepository.save.mockResolvedValue(mockAuditEvent);

			await auditLoggingService.logApiCall(requestWithProxy, 200, 100);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					ipAddress: '192.168.1.1',
				}),
			);
		});

		it('should sanitize sensitive headers', async () => {
			const requestWithSensitiveHeaders = {
				...mockRequest,
				headers: {
					authorization: 'Bearer secret-token',
					cookie: 'session=secret',
					'x-api-key': 'api-key-123',
					'content-type': 'application/json',
				},
			} as any;

			const mockAuditEvent = { id: 'event-123' } as AuditEvent;
			mockRepository.create.mockReturnValue(mockAuditEvent);
			mockRepository.save.mockResolvedValue(mockAuditEvent);

			await auditLoggingService.logApiCall(requestWithSensitiveHeaders, 200, 100);

			const createCall = mockRepository.create.mock.calls[0][0];
			const metadata = createCall.metadata as IDataObject;
			const sanitizedHeaders = metadata.headers as Record<string, any>;

			expect(sanitizedHeaders.authorization).toBe('[REDACTED]');
			expect(sanitizedHeaders.cookie).toBe('[REDACTED]');
			expect(sanitizedHeaders['x-api-key']).toBe('[REDACTED]');
			expect(sanitizedHeaders['content-type']).toBe('application/json');
		});
	});

	describe('logWorkflowExecution', () => {
		it('should log successful workflow execution', async () => {
			const mockAuditEvent = { id: 'event-123' } as AuditEvent;
			mockRepository.create.mockReturnValue(mockAuditEvent);
			mockRepository.save.mockResolvedValue(mockAuditEvent);

			const result = await auditLoggingService.logWorkflowExecution(
				'workflow-123',
				'user-123',
				'project-123',
				'execution-123',
				true,
			);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'workflow_executed',
					category: 'workflow_management',
					severity: 'low',
					description: 'Workflow execution completed: workflow-123',
					userId: 'user-123',
					projectId: 'project-123',
					resourceId: 'workflow-123',
					resourceType: 'workflow',
					metadata: {
						executionId: 'execution-123',
						success: true,
					},
					retentionCategory: 'standard',
				}),
			);
			expect(result).toEqual(mockAuditEvent);
		});

		it('should log failed workflow execution with higher severity', async () => {
			const mockAuditEvent = { id: 'event-123' } as AuditEvent;
			mockRepository.create.mockReturnValue(mockAuditEvent);
			mockRepository.save.mockResolvedValue(mockAuditEvent);

			await auditLoggingService.logWorkflowExecution(
				'workflow-123',
				'user-123',
				'project-123',
				'execution-123',
				false,
				'Execution failed due to timeout',
			);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					severity: 'medium',
					description: 'Workflow execution failed: workflow-123',
					errorMessage: 'Execution failed due to timeout',
					retentionCategory: 'extended',
				}),
			);
		});
	});

	describe('logAuthentication', () => {
		it('should log successful login with low severity', async () => {
			const mockAuditEvent = { id: 'event-123' } as AuditEvent;
			mockRepository.create.mockReturnValue(mockAuditEvent);
			mockRepository.save.mockResolvedValue(mockAuditEvent);

			const result = await auditLoggingService.logAuthentication(
				'user_login',
				'user-123',
				'127.0.0.1',
				'Mozilla/5.0',
				true,
			);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'user_login',
					category: 'authentication',
					severity: 'low',
					description: 'User login successful',
					userId: 'user-123',
					ipAddress: '127.0.0.1',
					userAgent: 'Mozilla/5.0',
					requiresReview: false,
					retentionCategory: 'standard',
					tags: ['authentication', 'success'],
				}),
			);
			expect(result).toEqual(mockAuditEvent);
		});

		it('should log failed login with high severity and review requirement', async () => {
			const mockAuditEvent = { id: 'event-123' } as AuditEvent;
			mockRepository.create.mockReturnValue(mockAuditEvent);
			mockRepository.save.mockResolvedValue(mockAuditEvent);

			await auditLoggingService.logAuthentication(
				'user_login',
				'user-123',
				'127.0.0.1',
				'Mozilla/5.0',
				false,
				'Invalid credentials',
			);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					severity: 'high',
					description: 'User login failed',
					errorMessage: 'Invalid credentials',
					requiresReview: true,
					retentionCategory: 'extended',
					tags: ['authentication', 'failure', 'security'],
				}),
			);
		});
	});

	describe('logDataModification', () => {
		it('should log data modification with before/after states', async () => {
			const beforeState = { name: 'Old Name', status: 'active' };
			const afterState = { name: 'New Name', status: 'inactive' };

			const mockAuditEvent = { id: 'event-123' } as AuditEvent;
			mockRepository.create.mockReturnValue(mockAuditEvent);
			mockRepository.save.mockResolvedValue(mockAuditEvent);

			const result = await auditLoggingService.logDataModification(
				'workflow_updated',
				'workflow',
				'workflow-123',
				'user-123',
				'project-123',
				beforeState,
				afterState,
				'Updated workflow configuration',
			);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'workflow_updated',
					category: 'data_modification',
					severity: 'medium',
					description: 'Updated workflow configuration',
					userId: 'user-123',
					projectId: 'project-123',
					resourceId: 'workflow-123',
					resourceType: 'workflow',
					beforeState,
					afterState,
					retentionCategory: 'extended',
					tags: ['data_modification', 'workflow'],
				}),
			);
			expect(result).toEqual(mockAuditEvent);
		});
	});

	describe('getAuditEvents', () => {
		it('should retrieve audit events with filtering and pagination', async () => {
			const mockEvents = [
				{ id: 'event-1', eventType: 'api_call' },
				{ id: 'event-2', eventType: 'workflow_created' },
			] as AuditEvent[];

			const mockQueryBuilder = {
				andWhere: jest.fn().mockReturnThis(),
				getCount: jest.fn().mockResolvedValue(2),
				orderBy: jest.fn().mockReturnThis(),
				limit: jest.fn().mockReturnThis(),
				offset: jest.fn().mockReturnThis(),
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue(mockEvents),
			};

			mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

			const options = {
				startDate: new Date('2023-01-01'),
				endDate: new Date('2023-12-31'),
				eventTypes: ['api_call', 'workflow_created'] as AuditEventType[],
				userId: 'user-123',
				limit: 10,
				offset: 0,
			};

			const result = await auditLoggingService.getAuditEvents(options);

			expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('audit_event');
			expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
				'audit_event.createdAt >= :startDate',
				{ startDate: options.startDate },
			);
			expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('audit_event.createdAt <= :endDate', {
				endDate: options.endDate,
			});
			expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
				'audit_event.eventType IN (:...eventTypes)',
				{ eventTypes: options.eventTypes },
			);
			expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('audit_event.userId = :userId', {
				userId: options.userId,
			});
			expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
			expect(mockQueryBuilder.offset).toHaveBeenCalledWith(0);

			expect(result).toEqual({
				events: mockEvents,
				total: 2,
			});
		});

		it('should handle empty results', async () => {
			const mockQueryBuilder = {
				andWhere: jest.fn().mockReturnThis(),
				getCount: jest.fn().mockResolvedValue(0),
				orderBy: jest.fn().mockReturnThis(),
				limit: jest.fn().mockReturnThis(),
				offset: jest.fn().mockReturnThis(),
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([]),
			};

			mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

			const result = await auditLoggingService.getAuditEvents({ limit: 10 });

			expect(result).toEqual({
				events: [],
				total: 0,
			});
		});
	});

	describe('markAsReviewed', () => {
		it('should update audit event as reviewed', async () => {
			const eventId = 'event-123';
			const reviewedBy = 'admin-123';
			const reviewNotes = 'Reviewed and approved';

			mockRepository.update.mockResolvedValue({ affected: 1 } as any);

			await auditLoggingService.markAsReviewed(eventId, reviewedBy, reviewNotes);

			expect(mockRepository.update).toHaveBeenCalledWith(eventId, {
				reviewedBy,
				reviewedAt: expect.any(Date),
				reviewNotes,
			});
		});
	});

	describe('cleanupArchivedEvents', () => {
		it('should delete archived events and return count', async () => {
			const mockQueryBuilder = {
				delete: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ affected: 5 }),
			};

			mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

			const result = await auditLoggingService.cleanupArchivedEvents();

			expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
			expect(mockQueryBuilder.delete).toHaveBeenCalled();
			expect(mockQueryBuilder.where).toHaveBeenCalledWith('archiveAt < :now', {
				now: expect.any(Date),
			});
			expect(mockQueryBuilder.execute).toHaveBeenCalled();
			expect(result).toBe(5);

			expect(mockLogger.info).toHaveBeenCalledWith('Cleaned up 5 archived audit events');
		});

		it('should return 0 when no events are deleted', async () => {
			const mockQueryBuilder = {
				delete: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ affected: 0 }),
			};

			mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

			const result = await auditLoggingService.cleanupArchivedEvents();

			expect(result).toBe(0);
			expect(mockLogger.info).not.toHaveBeenCalled();
		});
	});

	describe('getStatistics', () => {
		it('should return comprehensive audit statistics', async () => {
			const startDate = new Date('2023-01-01');
			const endDate = new Date('2023-12-31');

			const mockQueryBuilder = {
				createQueryBuilder: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				getCount: jest.fn().mockResolvedValue(100),
				select: jest.fn().mockReturnThis(),
				addSelect: jest.fn().mockReturnThis(),
				groupBy: jest.fn().mockReturnThis(),
				getRawMany: jest
					.fn()
					.mockResolvedValueOnce([
						{ eventType: 'api_call', count: '60' },
						{ eventType: 'workflow_created', count: '25' },
						{ eventType: 'user_login', count: '15' },
					])
					.mockResolvedValueOnce([
						{ category: 'data_access', count: '70' },
						{ category: 'workflow_management', count: '20' },
						{ category: 'authentication', count: '10' },
					])
					.mockResolvedValueOnce([
						{ severity: 'low', count: '50' },
						{ severity: 'medium', count: '35' },
						{ severity: 'high', count: '15' },
					]),
			};

			// Mock separate query for high-risk events
			const mockHighRiskQueryBuilder = {
				andWhere: jest.fn().mockReturnThis(),
				getCount: jest.fn().mockResolvedValue(15),
			};

			mockRepository.createQueryBuilder
				.mockReturnValueOnce(mockQueryBuilder as any)
				.mockReturnValueOnce(mockQueryBuilder as any)
				.mockReturnValueOnce(mockQueryBuilder as any)
				.mockReturnValueOnce(mockQueryBuilder as any)
				.mockReturnValueOnce(mockHighRiskQueryBuilder as any);

			const result = await auditLoggingService.getStatistics(startDate, endDate);

			expect(result).toEqual({
				totalEvents: 100,
				eventsByType: {
					api_call: 60,
					workflow_created: 25,
					user_login: 15,
				},
				eventsByCategory: {
					data_access: 70,
					workflow_management: 20,
					authentication: 10,
				},
				eventsBySeverity: {
					low: 50,
					medium: 35,
					high: 15,
				},
				highRiskEvents: 15,
			});
		});
	});
});
