import type { WorkerStatus } from '@n8n/api-types';
import type { UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { Push } from '@/push';
import { WorkerStatusService } from '@/scaling/worker-status.service.ee';
import type { RoleService } from '@/services/role.service';

describe('WorkerStatusService', () => {
	let workerStatusService: WorkerStatusService;
	let mockPush: jest.Mocked<Push>;
	let mockRoleService: jest.Mocked<RoleService>;
	let mockUserRepository: jest.Mocked<UserRepository>;

	beforeEach(() => {
		mockPush = {
			sendToUsers: jest.fn(),
		} as any;

		mockRoleService = {
			rolesWithScope: jest.fn(),
		} as any;

		mockUserRepository = {
			find: jest.fn(),
		} as any;

		workerStatusService = new WorkerStatusService(
			mock(), // jobProcessor
			mock(), // instanceSettings
			mock(), // publisher
			mockPush,
			mockRoleService,
			mockUserRepository,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('handleWorkerStatusResponse', () => {
		const createMockWorkerStatus = (overrides?: Partial<WorkerStatus>): WorkerStatus => ({
			senderId: 'test-worker-1',
			runningJobsSummary: [],
			freeMem: 1000000,
			totalMem: 2000000,
			uptime: 3600,
			loadAvg: [1.0, 1.5, 2.0],
			cpus: '4x Intel Core',
			arch: 'x64',
			platform: 'linux',
			hostname: 'test-worker',
			interfaces: [],
			version: '1.0.0',
			isInContainer: false,
			process: {
				memory: {
					available: 1000000,
					constraint: 2000000,
					rss: 100000,
					heapTotal: 50000,
					heapUsed: 30000,
				},
				uptime: 3600,
			},
			host: {
				memory: {
					total: 2000000,
					free: 1000000,
				},
			},
			...overrides,
		});

		describe('authorization', () => {
			it('should send worker status only to users with orchestration:read permission', async () => {
				const ownerId = 'owner-user-id';
				const adminId = 'admin-user-id';

				mockRoleService.rolesWithScope.mockResolvedValue(['global:owner', 'global:admin']);
				mockUserRepository.find.mockResolvedValue([{ id: ownerId } as any, { id: adminId } as any]);

				const mockWorkerStatus = createMockWorkerStatus();

				await workerStatusService.handleWorkerStatusResponse(mockWorkerStatus);

				expect(mockRoleService.rolesWithScope).toHaveBeenCalledWith('global', 'orchestration:read');
				expect(mockPush.sendToUsers).toHaveBeenCalledWith(
					{
						type: 'sendWorkerStatusMessage',
						data: {
							workerId: 'test-worker-1',
							status: mockWorkerStatus,
						},
					},
					[ownerId, adminId],
				);
			});

			it("should not send worker status to users who don't have orchestration:read permission", async () => {
				mockRoleService.rolesWithScope.mockResolvedValue([]);

				const mockWorkerStatus = createMockWorkerStatus();

				await workerStatusService.handleWorkerStatusResponse(mockWorkerStatus);

				expect(mockRoleService.rolesWithScope).toHaveBeenCalledWith('global', 'orchestration:read');
				expect(mockUserRepository.find).not.toHaveBeenCalled();
				expect(mockPush.sendToUsers).not.toHaveBeenCalled();
			});
		});
	});
});
