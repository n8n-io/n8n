import {
	SecurityEvent,
	type SecurityEventType,
	type SecurityEventSeverity,
	type ThreatLevel,
} from '@n8n/db';
import { Repository } from '@n8n/typeorm';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Request } from 'express';

import { Logger } from '@/logger';
import { EventService } from '@/events/event.service';
import { AuditLoggingService } from '../audit-logging.service';
import { SecurityMonitoringService, type ISecurityEventData } from '../security-monitoring.service';

describe('SecurityMonitoringService', () => {
	let securityMonitoringService: SecurityMonitoringService;
	let mockRepository: jest.Mocked<Repository<SecurityEvent>>;
	let mockLogger: jest.Mocked<Logger>;
	let mockEventService: jest.Mocked<EventService>;
	let mockAuditLoggingService: jest.Mocked<AuditLoggingService>;

	const mockRequest = {
		method: 'POST',
		path: '/api/sensitive',
		ip: '192.168.1.100',
		headers: { 'user-agent': 'suspicious-client/1.0' },
		query: { test: 'value' },
		params: { id: '123' },
		get: jest.fn((header) => {
			if (header === 'User-Agent') return 'suspicious-client/1.0';
			if (header === 'X-Forwarded-For') return '192.168.1.100';
			return undefined;
		}),
	} as unknown as Request;

	const mockSecurityEventData: ISecurityEventData = {
		eventType: 'suspicious_activity',
		severity: 'high',
		threatLevel: 'high',
		title: 'Suspicious Activity Detected',
		description: 'Test security event',
		userId: 'user-123',
		ipAddress: '192.168.1.100',
		riskScore: 85,
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockRepository = mock<Repository<SecurityEvent>>();
		mockLogger = mock<Logger>();
		mockEventService = mock<EventService>();
		mockAuditLoggingService = mock<AuditLoggingService>();

		// Mock Container.get calls
		Container.get = jest.fn().mockImplementation((token) => {
			if (token === Logger) return mockLogger;
			if (token === EventService) return mockEventService;
			if (token === AuditLoggingService) return mockAuditLoggingService;
			if (token === 'DataSource') {
				return { getRepository: () => mockRepository };
			}
			return {};
		});

		// Mock process.env for tests
		process.env.N8N_COMPLIANCE_REPORTS_PATH = '/tmp/test-reports';

		securityMonitoringService = new SecurityMonitoringService();
	});

	afterEach(() => {
		delete process.env.N8N_COMPLIANCE_REPORTS_PATH;
	});

	describe('reportSecurityEvent', () => {
		it('should successfully report a security event', async () => {
			const mockSecurityEvent = {
				id: 'security-event-123',
				...mockSecurityEventData,
				createdAt: new Date(),
			} as SecurityEvent;

			mockRepository.create.mockReturnValue(mockSecurityEvent);
			mockRepository.save.mockResolvedValue(mockSecurityEvent);

			const result = await securityMonitoringService.reportSecurityEvent(mockSecurityEventData);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'suspicious_activity',
					severity: 'high',
					status: 'open',
					threatLevel: 'high',
					title: 'Suspicious Activity Detected',
					description: 'Test security event',
					userId: 'user-123',
					ipAddress: '192.168.1.100',
					requiresEscalation: false,
					eventCount: 1,
					riskScore: 85,
				}),
			);
			expect(mockRepository.save).toHaveBeenCalledWith(mockSecurityEvent);
			expect(result).toEqual(mockSecurityEvent);
		});

		it('should emit security event for real-time processing', async () => {
			const mockSecurityEvent = {
				id: 'security-event-123',
				...mockSecurityEventData,
			} as SecurityEvent;

			mockRepository.create.mockReturnValue(mockSecurityEvent);
			mockRepository.save.mockResolvedValue(mockSecurityEvent);

			await securityMonitoringService.reportSecurityEvent(mockSecurityEventData);

			expect(mockEventService.emit).toHaveBeenCalledWith('security-event', {
				event: mockSecurityEvent,
				timestamp: expect.any(Date),
			});
		});

		it('should emit critical alert for severe threats', async () => {
			const criticalEvent = {
				...mockSecurityEventData,
				severity: 'critical' as SecurityEventSeverity,
				threatLevel: 'severe' as ThreatLevel,
			};

			const mockSecurityEvent = {
				id: 'security-event-123',
				...criticalEvent,
			} as SecurityEvent;

			mockRepository.create.mockReturnValue(mockSecurityEvent);
			mockRepository.save.mockResolvedValue(mockSecurityEvent);

			await securityMonitoringService.reportSecurityEvent(criticalEvent);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Critical security event detected',
				expect.objectContaining({
					eventId: 'security-event-123',
					eventType: 'suspicious_activity',
					severity: 'critical',
					threatLevel: 'severe',
				}),
			);

			expect(mockEventService.emit).toHaveBeenCalledWith('critical-security-alert', {
				event: mockSecurityEvent,
				timestamp: expect.any(Date),
			});
		});

		it('should execute automatic actions', async () => {
			const eventWithActions = {
				...mockSecurityEventData,
				automaticActions: ['alert_admin', 'rate_limit'],
			};

			const mockSecurityEvent = {
				id: 'security-event-123',
				...eventWithActions,
			} as SecurityEvent;

			mockRepository.create.mockReturnValue(mockSecurityEvent);
			mockRepository.save.mockResolvedValue(mockSecurityEvent);

			await securityMonitoringService.reportSecurityEvent(eventWithActions);

			expect(mockEventService.emit).toHaveBeenCalledWith('admin-alert', {
				event: mockSecurityEvent,
			});
			expect(mockEventService.emit).toHaveBeenCalledWith('rate-limit', {
				ip: '192.168.1.100',
				event: mockSecurityEvent,
			});
		});

		it('should handle errors gracefully', async () => {
			const error = new Error('Database error');
			mockRepository.create.mockImplementation(() => {
				throw error;
			});

			await expect(
				securityMonitoringService.reportSecurityEvent(mockSecurityEventData),
			).rejects.toThrow('Security event reporting failed: Database error');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to report security event',
				expect.objectContaining({
					error: 'Database error',
					eventData: mockSecurityEventData,
				}),
			);
		});
	});

	describe('reportFailedLogin', () => {
		it('should report failed login as single event when under threshold', async () => {
			// Mock no recent failures
			mockRepository.find.mockResolvedValue([]);

			const mockSecurityEvent = {
				id: 'security-event-123',
				eventType: 'failed_login_attempt',
			} as SecurityEvent;

			mockRepository.create.mockReturnValue(mockSecurityEvent);
			mockRepository.save.mockResolvedValue(mockSecurityEvent);

			const result = await securityMonitoringService.reportFailedLogin(
				'192.168.1.100',
				'Mozilla/5.0',
				'user-123',
				{ loginAttempt: 'first' },
			);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'failed_login_attempt',
					severity: 'medium',
					threatLevel: 'moderate',
					title: 'Failed Login Attempt',
					description: 'Failed login attempt from 192.168.1.100',
					userId: 'user-123',
					ipAddress: '192.168.1.100',
					userAgent: 'Mozilla/5.0',
					eventCount: 1,
					riskScore: 35,
					requiresEscalation: false,
				}),
			);
			expect(result).toEqual(mockSecurityEvent);
		});

		it('should detect brute force pattern and escalate', async () => {
			// Mock 5 recent failures to trigger brute force detection
			const recentFailures = Array(5)
				.fill({})
				.map((_, i) => ({
					id: `failure-${i}`,
					eventType: 'failed_login_attempt',
					ipAddress: '192.168.1.100',
					createdAt: new Date(Date.now() - i * 60000), // Recent failures
				})) as SecurityEvent[];

			mockRepository.find.mockResolvedValue(recentFailures);

			const mockSecurityEvent = {
				id: 'security-event-123',
				eventType: 'brute_force_attack',
			} as SecurityEvent;

			mockRepository.create.mockReturnValue(mockSecurityEvent);
			mockRepository.save.mockResolvedValue(mockSecurityEvent);

			const result = await securityMonitoringService.reportFailedLogin(
				'192.168.1.100',
				'Mozilla/5.0',
				'user-123',
			);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'brute_force_attack',
					severity: 'high',
					threatLevel: 'high',
					title: 'Brute Force Attack Detected',
					description: 'Brute force attack detected from 192.168.1.100 - 6 failed attempts',
					eventCount: 6,
					riskScore: 85,
					automaticActions: ['rate_limit', 'alert_admin'],
					requiresEscalation: true,
				}),
			);
			expect(result).toEqual(mockSecurityEvent);
		});
	});

	describe('reportSuspiciousApiActivity', () => {
		it('should report suspicious API activity with calculated risk scores', async () => {
			const mockSecurityEvent = {
				id: 'security-event-123',
				eventType: 'suspicious_activity',
			} as SecurityEvent;

			mockRepository.create.mockReturnValue(mockSecurityEvent);
			mockRepository.save.mockResolvedValue(mockSecurityEvent);

			const result = await securityMonitoringService.reportSuspiciousApiActivity(
				mockRequest,
				'Multiple injection attempts detected',
				75,
				'user-123',
			);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'suspicious_activity',
					severity: 'high',
					threatLevel: 'high',
					title: 'Suspicious API Activity Detected',
					description: 'Suspicious API activity: Multiple injection attempts detected',
					userId: 'user-123',
					ipAddress: '192.168.1.100',
					userAgent: 'suspicious-client/1.0',
					sessionId: 'session-456',
					httpMethod: 'POST',
					endpoint: '/api/sensitive',
					riskScore: 75,
					automaticActions: ['alert_admin', 'increase_monitoring'],
					requiresEscalation: false,
				}),
			);
			expect(result).toEqual(mockSecurityEvent);
		});

		it('should require escalation for high-risk activities', async () => {
			const mockSecurityEvent = {
				id: 'security-event-123',
				eventType: 'suspicious_activity',
			} as SecurityEvent;

			mockRepository.create.mockReturnValue(mockSecurityEvent);
			mockRepository.save.mockResolvedValue(mockSecurityEvent);

			await securityMonitoringService.reportSuspiciousApiActivity(
				mockRequest,
				'Critical vulnerability exploitation attempt',
				95,
				'user-123',
			);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					severity: 'critical',
					threatLevel: 'severe',
					riskScore: 95,
					requiresEscalation: true,
				}),
			);
		});
	});

	describe('reportDataBreachAttempt', () => {
		it('should report data breach attempt with critical severity', async () => {
			const mockSecurityEvent = {
				id: 'security-event-123',
				eventType: 'data_breach_attempt',
			} as SecurityEvent;

			mockRepository.create.mockReturnValue(mockSecurityEvent);
			mockRepository.save.mockResolvedValue(mockSecurityEvent);

			const result = await securityMonitoringService.reportDataBreachAttempt(
				'data_breach_attempt',
				'database',
				'user_table',
				'user-123',
				'192.168.1.100',
				{ attemptedAccess: 'sensitive_data' },
			);

			expect(mockRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'data_breach_attempt',
					severity: 'critical',
					threatLevel: 'severe',
					title: 'Potential Data Breach Detected',
					description: 'Unauthorized access attempt to database: user_table',
					userId: 'user-123',
					ipAddress: '192.168.1.100',
					riskScore: 95,
					automaticActions: ['immediate_alert', 'block_ip', 'escalate'],
					requiresEscalation: true,
				}),
			);
			expect(result).toEqual(mockSecurityEvent);
		});
	});

	describe('getSecurityEvents', () => {
		it('should retrieve security events with filtering', async () => {
			const mockEvents = [
				{ id: 'event-1', eventType: 'failed_login_attempt' },
				{ id: 'event-2', eventType: 'suspicious_activity' },
			] as SecurityEvent[];

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
				eventTypes: ['failed_login_attempt', 'suspicious_activity'] as SecurityEventType[],
				severities: ['high', 'critical'] as SecurityEventSeverity[],
				ipAddress: '192.168.1.100',
				limit: 10,
				offset: 0,
			};

			const result = await securityMonitoringService.getSecurityEvents(options);

			expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('security_event');
			expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
				'security_event.eventType IN (:...eventTypes)',
				{ eventTypes: options.eventTypes },
			);
			expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
				'security_event.severity IN (:...severities)',
				{ severities: options.severities },
			);
			expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
				'security_event.ipAddress = :ipAddress',
				{ ipAddress: options.ipAddress },
			);

			expect(result).toEqual({
				events: mockEvents,
				total: 2,
			});
		});
	});

	describe('acknowledgeEvent', () => {
		it('should acknowledge security event and calculate response time', async () => {
			const eventId = 'security-event-123';
			const acknowledgedBy = 'admin-123';
			const notes = 'Investigated and confirmed false positive';

			const mockEvent = {
				id: eventId,
				createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
			} as SecurityEvent;

			mockRepository.findOne.mockResolvedValue(mockEvent);
			mockRepository.update.mockResolvedValue({ affected: 1 } as any);

			await securityMonitoringService.acknowledgeEvent(eventId, acknowledgedBy, notes);

			expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: eventId } });
			expect(mockRepository.update).toHaveBeenCalledWith(eventId, {
				status: 'acknowledged',
				acknowledgedBy,
				acknowledgedAt: expect.any(Date),
				timeToAcknowledgeMinutes: 30,
				resolutionNotes: notes,
			});

			expect(mockAuditLoggingService.logEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'security_event',
					category: 'security',
					description: `Security event acknowledged: ${eventId}`,
					userId: acknowledgedBy,
					resourceId: eventId,
					resourceType: 'security_event',
					metadata: expect.objectContaining({
						action: 'acknowledge',
						timeToAcknowledgeMinutes: 30,
						notes,
					}),
				}),
			);
		});

		it('should throw error if event not found', async () => {
			mockRepository.findOne.mockResolvedValue(null);

			await expect(
				securityMonitoringService.acknowledgeEvent('nonexistent', 'admin-123'),
			).rejects.toThrow('Security event not found');
		});
	});

	describe('resolveEvent', () => {
		it('should resolve security event and log the action', async () => {
			const eventId = 'security-event-123';
			const resolvedBy = 'admin-123';
			const resolutionNotes = 'Resolved after implementing additional security measures';

			const mockEvent = {
				id: eventId,
				createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
			} as SecurityEvent;

			mockRepository.findOne.mockResolvedValue(mockEvent);
			mockRepository.update.mockResolvedValue({ affected: 1 } as any);

			await securityMonitoringService.resolveEvent(eventId, resolvedBy, resolutionNotes);

			expect(mockRepository.update).toHaveBeenCalledWith(eventId, {
				status: 'resolved',
				resolved: true,
				resolvedAt: expect.any(Date),
				timeToResolveMinutes: 60,
				resolutionNotes,
			});

			expect(mockAuditLoggingService.logEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'security_event',
					category: 'security',
					description: `Security event resolved: ${eventId}`,
					userId: resolvedBy,
					metadata: expect.objectContaining({
						action: 'resolve',
						timeToResolveMinutes: 60,
						resolutionNotes,
					}),
				}),
			);
		});
	});

	describe('getSecurityMetrics', () => {
		it('should return comprehensive security metrics', async () => {
			const startDate = new Date('2023-01-01');
			const endDate = new Date('2023-12-31');

			const mockQueryBuilder = {
				createQueryBuilder: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				getCount: jest
					.fn()
					.mockResolvedValueOnce(150) // totalEvents
					.mockResolvedValueOnce(25) // escalatedEvents
					.mockResolvedValueOnce(100), // resolvedEvents
				select: jest.fn().mockReturnThis(),
				addSelect: jest.fn().mockReturnThis(),
				groupBy: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				limit: jest.fn().mockReturnThis(),
				getRawMany: jest
					.fn()
					.mockResolvedValueOnce([
						{ severity: 'critical', count: '10' },
						{ severity: 'high', count: '25' },
						{ severity: 'medium', count: '65' },
						{ severity: 'low', count: '50' },
					])
					.mockResolvedValueOnce([
						{ eventType: 'failed_login_attempt', count: '60' },
						{ eventType: 'suspicious_activity', count: '45' },
						{ eventType: 'brute_force_attack', count: '25' },
						{ eventType: 'data_breach_attempt', count: '20' },
					])
					.mockResolvedValueOnce([
						{ threatLevel: 'severe', count: '15' },
						{ threatLevel: 'high', count: '35' },
						{ threatLevel: 'moderate', count: '60' },
						{ threatLevel: 'low', count: '40' },
					])
					.mockResolvedValueOnce([
						{ vector: 'sql_injection', count: '25' },
						{ vector: 'xss', count: '20' },
						{ vector: 'path_traversal', count: '15' },
					])
					.mockResolvedValueOnce([
						{ ip: '192.168.1.100', threatLevel: 'high', count: '15' },
						{ ip: '10.0.0.1', threatLevel: 'medium', count: '10' },
						{ ip: '172.16.0.1', threatLevel: 'low', count: '8' },
					]),
				getRawOne: jest.fn().mockResolvedValue({ avgResponseTime: '45.5' }),
			};

			mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

			const result = await securityMonitoringService.getSecurityMetrics(startDate, endDate);

			expect(result).toEqual({
				period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
				totalEvents: 150,
				eventsBySeverity: {
					critical: 10,
					high: 25,
					medium: 65,
					low: 50,
				},
				eventsByType: {
					failed_login_attempt: 60,
					suspicious_activity: 45,
					brute_force_attack: 25,
					data_breach_attempt: 20,
				},
				threatLevelDistribution: {
					severe: 15,
					high: 35,
					moderate: 60,
					low: 40,
				},
				averageResponseTime: 45.5,
				escalatedEvents: 25,
				resolvedEvents: 100,
				topAttackVectors: [
					{ vector: 'sql_injection', count: 25 },
					{ vector: 'xss', count: 20 },
					{ vector: 'path_traversal', count: 15 },
				],
				topSourceIPs: [
					{ ip: '192.168.1.100', count: 15, threatLevel: 'high' },
					{ ip: '10.0.0.1', count: 10, threatLevel: 'medium' },
					{ ip: '172.16.0.1', count: 8, threatLevel: 'low' },
				],
			});
		});
	});

	describe('risk score and threat level calculation', () => {
		it('should calculate severity from risk score correctly', async () => {
			const testCases = [
				{ riskScore: 95, expectedSeverity: 'critical' },
				{ riskScore: 75, expectedSeverity: 'high' },
				{ riskScore: 45, expectedSeverity: 'medium' },
				{ riskScore: 25, expectedSeverity: 'low' },
				{ riskScore: 10, expectedSeverity: 'info' },
			];

			const mockSecurityEvent = { id: 'test-event' } as SecurityEvent;
			mockRepository.create.mockReturnValue(mockSecurityEvent);
			mockRepository.save.mockResolvedValue(mockSecurityEvent);

			for (const testCase of testCases) {
				await securityMonitoringService.reportSuspiciousApiActivity(
					mockRequest,
					'Test activity',
					testCase.riskScore,
					'user-123',
				);

				expect(mockRepository.create).toHaveBeenLastCalledWith(
					expect.objectContaining({
						severity: testCase.expectedSeverity,
					}),
				);
			}
		});

		it('should calculate threat level from risk score correctly', async () => {
			const testCases = [
				{ riskScore: 95, expectedThreatLevel: 'severe' },
				{ riskScore: 75, expectedThreatLevel: 'high' },
				{ riskScore: 45, expectedThreatLevel: 'moderate' },
				{ riskScore: 25, expectedThreatLevel: 'low' },
				{ riskScore: 10, expectedThreatLevel: 'minimal' },
			];

			const mockSecurityEvent = { id: 'test-event' } as SecurityEvent;
			mockRepository.create.mockReturnValue(mockSecurityEvent);
			mockRepository.save.mockResolvedValue(mockSecurityEvent);

			for (const testCase of testCases) {
				await securityMonitoringService.reportSuspiciousApiActivity(
					mockRequest,
					'Test activity',
					testCase.riskScore,
					'user-123',
				);

				expect(mockRepository.create).toHaveBeenLastCalledWith(
					expect.objectContaining({
						threatLevel: testCase.expectedThreatLevel,
					}),
				);
			}
		});
	});
});
