import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { License } from '@/license';
import { WorkerStatusService } from '@/scaling/worker-status.service.ee';

import { OrchestrationController } from '../orchestration.controller';

describe('OrchestrationController', () => {
	mockInstance(Logger);

	const licenseService = mockInstance(License);
	const workerStatusService = mockInstance(WorkerStatusService);

	const controller = Container.get(OrchestrationController);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getWorkersStatusAll', () => {
		it('should request worker status when license is valid', async () => {
			// Arrange
			const mockWorkerResponse = {
				workers: [
					{
						id: 'worker-1',
						status: 'active',
						lastSeen: new Date().toISOString(),
						cpu: 45.2,
						memory: 67.8,
					},
					{
						id: 'worker-2',
						status: 'idle',
						lastSeen: new Date().toISOString(),
						cpu: 12.1,
						memory: 34.5,
					},
				],
				total: 2,
			};

			licenseService.isWorkerViewLicensed.mockReturnValue(true);
			workerStatusService.requestWorkerStatus.mockResolvedValue(mockWorkerResponse);

			// Act
			const result = await controller.getWorkersStatusAll();

			// Assert
			expect(licenseService.isWorkerViewLicensed).toHaveBeenCalled();
			expect(workerStatusService.requestWorkerStatus).toHaveBeenCalled();
			expect(result).toEqual(mockWorkerResponse);
		});

		it('should return undefined when license is not valid', async () => {
			// Arrange
			licenseService.isWorkerViewLicensed.mockReturnValue(false);

			// Act
			const result = await controller.getWorkersStatusAll();

			// Assert
			expect(licenseService.isWorkerViewLicensed).toHaveBeenCalled();
			expect(workerStatusService.requestWorkerStatus).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
		});

		it('should handle empty worker response', async () => {
			// Arrange
			const emptyResponse = {
				workers: [],
				total: 0,
			};

			licenseService.isWorkerViewLicensed.mockReturnValue(true);
			workerStatusService.requestWorkerStatus.mockResolvedValue(emptyResponse);

			// Act
			const result = await controller.getWorkersStatusAll();

			// Assert
			expect(licenseService.isWorkerViewLicensed).toHaveBeenCalled();
			expect(workerStatusService.requestWorkerStatus).toHaveBeenCalled();
			expect(result).toEqual(emptyResponse);
			expect(result.workers).toHaveLength(0);
		});

		it('should handle worker status service errors', async () => {
			// Arrange
			const error = new Error('Redis connection failed');

			licenseService.isWorkerViewLicensed.mockReturnValue(true);
			workerStatusService.requestWorkerStatus.mockRejectedValue(error);

			// Act & Assert
			await expect(controller.getWorkersStatusAll()).rejects.toThrow('Redis connection failed');
			expect(licenseService.isWorkerViewLicensed).toHaveBeenCalled();
			expect(workerStatusService.requestWorkerStatus).toHaveBeenCalled();
		});

		it('should handle null response from worker status service', async () => {
			// Arrange
			licenseService.isWorkerViewLicensed.mockReturnValue(true);
			workerStatusService.requestWorkerStatus.mockResolvedValue(null);

			// Act
			const result = await controller.getWorkersStatusAll();

			// Assert
			expect(licenseService.isWorkerViewLicensed).toHaveBeenCalled();
			expect(workerStatusService.requestWorkerStatus).toHaveBeenCalled();
			expect(result).toBeNull();
		});

		it('should handle detailed worker status information', async () => {
			// Arrange
			const detailedResponse = {
				workers: [
					{
						id: 'worker-detailed-1',
						status: 'busy',
						lastSeen: '2024-01-15T10:30:00Z',
						cpu: 89.3,
						memory: 92.1,
						activeJobs: 5,
						completedJobs: 1250,
						failedJobs: 12,
						version: '1.0.5',
						uptime: 86400000, // 1 day in ms
					},
				],
				total: 1,
				summary: {
					active: 0,
					idle: 0,
					busy: 1,
					offline: 0,
				},
			};

			licenseService.isWorkerViewLicensed.mockReturnValue(true);
			workerStatusService.requestWorkerStatus.mockResolvedValue(detailedResponse);

			// Act
			const result = await controller.getWorkersStatusAll();

			// Assert
			expect(result).toEqual(detailedResponse);
			expect(result.workers[0].status).toBe('busy');
			expect(result.workers[0].activeJobs).toBe(5);
			expect(result.summary?.busy).toBe(1);
		});

		it('should handle license check exceptions', async () => {
			// Arrange
			const error = new Error('License validation failed');

			licenseService.isWorkerViewLicensed.mockImplementation(() => {
				throw error;
			});

			// Act & Assert
			await expect(controller.getWorkersStatusAll()).rejects.toThrow('License validation failed');
			expect(licenseService.isWorkerViewLicensed).toHaveBeenCalled();
			expect(workerStatusService.requestWorkerStatus).not.toHaveBeenCalled();
		});

		it('should handle mixed worker statuses', async () => {
			// Arrange
			const mixedResponse = {
				workers: [
					{
						id: 'worker-active-1',
						status: 'active',
						lastSeen: new Date().toISOString(),
						cpu: 25.0,
						memory: 45.0,
					},
					{
						id: 'worker-idle-1',
						status: 'idle',
						lastSeen: new Date().toISOString(),
						cpu: 5.0,
						memory: 20.0,
					},
					{
						id: 'worker-busy-1',
						status: 'busy',
						lastSeen: new Date().toISOString(),
						cpu: 95.0,
						memory: 85.0,
					},
					{
						id: 'worker-offline-1',
						status: 'offline',
						lastSeen: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
						cpu: 0,
						memory: 0,
					},
				],
				total: 4,
			};

			licenseService.isWorkerViewLicensed.mockReturnValue(true);
			workerStatusService.requestWorkerStatus.mockResolvedValue(mixedResponse);

			// Act
			const result = await controller.getWorkersStatusAll();

			// Assert
			expect(result).toEqual(mixedResponse);
			expect(result.workers).toHaveLength(4);
			expect(result.workers.find((w) => w.status === 'active')).toBeDefined();
			expect(result.workers.find((w) => w.status === 'idle')).toBeDefined();
			expect(result.workers.find((w) => w.status === 'busy')).toBeDefined();
			expect(result.workers.find((w) => w.status === 'offline')).toBeDefined();
		});
	});
});
