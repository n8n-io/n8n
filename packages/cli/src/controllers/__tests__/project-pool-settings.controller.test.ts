import { UpdateProjectPoolSettingsDto } from '@n8n/api-types';
import type { Request, Response } from 'express';
import { mock } from 'jest-mock-extended';

import { ProjectPoolSettingsController } from '@/controllers/project-pool-settings.controller';
import type { PoolConfigService } from '@/scaling/pool-config.service';

describe('ProjectPoolSettingsController', () => {
	const poolConfigService = mock<PoolConfigService>();
	const controller = new ProjectPoolSettingsController(poolConfigService);

	const req = mock<Request>();
	const res = mock<Response>();
	const projectId = 'project-1';

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getPoolSettings', () => {
		it('delegates to PoolConfigService.getProjectPoolSettings', async () => {
			poolConfigService.getProjectPoolSettings.mockResolvedValue({
				assignment: { production: 'gpu' },
				allowedPools: ['gpu', 'cpu'],
			});

			const result = await controller.getPoolSettings(req, res, projectId);

			expect(poolConfigService.getProjectPoolSettings).toHaveBeenCalledWith(projectId);
			expect(result).toEqual({
				assignment: { production: 'gpu' },
				allowedPools: ['gpu', 'cpu'],
			});
		});
	});

	describe('updatePoolSettings', () => {
		it('delegates to PoolConfigService.setProjectPoolSettings with the DTO', async () => {
			const dto = new UpdateProjectPoolSettingsDto({
				assignment: { production: 'gpu' },
				allowedPools: ['gpu'],
			});
			poolConfigService.setProjectPoolSettings.mockResolvedValue({
				assignment: { production: 'gpu' },
				allowedPools: ['gpu'],
			});

			const result = await controller.updatePoolSettings(req, res, dto, projectId);

			expect(poolConfigService.setProjectPoolSettings).toHaveBeenCalledWith(projectId, dto);
			expect(result).toEqual({
				assignment: { production: 'gpu' },
				allowedPools: ['gpu'],
			});
		});
	});
});
