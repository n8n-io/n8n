'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const license_1 = require('@/license');
const worker_status_service_ee_1 = require('@/scaling/worker-status.service.ee');
const orchestration_controller_1 = require('../orchestration.controller');
describe('OrchestrationController', () => {
	(0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	const licenseService = (0, backend_test_utils_1.mockInstance)(license_1.License);
	const workerStatusService = (0, backend_test_utils_1.mockInstance)(
		worker_status_service_ee_1.WorkerStatusService,
	);
	const controller = di_1.Container.get(orchestration_controller_1.OrchestrationController);
	beforeEach(() => {
		jest.clearAllMocks();
	});
	describe('getWorkersStatusAll', () => {
		it('should request worker status when license is valid', async () => {
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
			const result = await controller.getWorkersStatusAll();
			expect(licenseService.isWorkerViewLicensed).toHaveBeenCalled();
			expect(workerStatusService.requestWorkerStatus).toHaveBeenCalled();
			expect(result).toEqual(mockWorkerResponse);
		});
		it('should return undefined when license is not valid', async () => {
			licenseService.isWorkerViewLicensed.mockReturnValue(false);
			const result = await controller.getWorkersStatusAll();
			expect(licenseService.isWorkerViewLicensed).toHaveBeenCalled();
			expect(workerStatusService.requestWorkerStatus).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
		});
		it('should handle empty worker response', async () => {
			const emptyResponse = {
				workers: [],
				total: 0,
			};
			licenseService.isWorkerViewLicensed.mockReturnValue(true);
			workerStatusService.requestWorkerStatus.mockResolvedValue(emptyResponse);
			const result = await controller.getWorkersStatusAll();
			expect(licenseService.isWorkerViewLicensed).toHaveBeenCalled();
			expect(workerStatusService.requestWorkerStatus).toHaveBeenCalled();
			expect(result).toEqual(emptyResponse);
			expect(result.workers).toHaveLength(0);
		});
		it('should handle worker status service errors', async () => {
			const error = new Error('Redis connection failed');
			licenseService.isWorkerViewLicensed.mockReturnValue(true);
			workerStatusService.requestWorkerStatus.mockRejectedValue(error);
			await expect(controller.getWorkersStatusAll()).rejects.toThrow('Redis connection failed');
			expect(licenseService.isWorkerViewLicensed).toHaveBeenCalled();
			expect(workerStatusService.requestWorkerStatus).toHaveBeenCalled();
		});
		it('should handle null response from worker status service', async () => {
			licenseService.isWorkerViewLicensed.mockReturnValue(true);
			workerStatusService.requestWorkerStatus.mockResolvedValue(null);
			const result = await controller.getWorkersStatusAll();
			expect(licenseService.isWorkerViewLicensed).toHaveBeenCalled();
			expect(workerStatusService.requestWorkerStatus).toHaveBeenCalled();
			expect(result).toBeNull();
		});
		it('should handle detailed worker status information', async () => {
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
						uptime: 86400000,
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
			const result = await controller.getWorkersStatusAll();
			expect(result).toEqual(detailedResponse);
			expect(result.workers[0].status).toBe('busy');
			expect(result.workers[0].activeJobs).toBe(5);
			expect(result.summary?.busy).toBe(1);
		});
		it('should handle license check exceptions', async () => {
			const error = new Error('License validation failed');
			licenseService.isWorkerViewLicensed.mockImplementation(() => {
				throw error;
			});
			await expect(controller.getWorkersStatusAll()).rejects.toThrow('License validation failed');
			expect(licenseService.isWorkerViewLicensed).toHaveBeenCalled();
			expect(workerStatusService.requestWorkerStatus).not.toHaveBeenCalled();
		});
		it('should handle mixed worker statuses', async () => {
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
						lastSeen: new Date(Date.now() - 300000).toISOString(),
						cpu: 0,
						memory: 0,
					},
				],
				total: 4,
			};
			licenseService.isWorkerViewLicensed.mockReturnValue(true);
			workerStatusService.requestWorkerStatus.mockResolvedValue(mixedResponse);
			const result = await controller.getWorkersStatusAll();
			expect(result).toEqual(mixedResponse);
			expect(result.workers).toHaveLength(4);
			expect(result.workers.find((w) => w.status === 'active')).toBeDefined();
			expect(result.workers.find((w) => w.status === 'idle')).toBeDefined();
			expect(result.workers.find((w) => w.status === 'busy')).toBeDefined();
			expect(result.workers.find((w) => w.status === 'offline')).toBeDefined();
		});
	});
});
//# sourceMappingURL=orchestration.controller.test.js.map
