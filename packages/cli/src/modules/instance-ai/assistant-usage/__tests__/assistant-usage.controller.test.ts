import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AssistantUsageController } from '../assistant-usage.controller';
import type { AssistantUsageService } from '../assistant-usage.service';

describe('AssistantUsageController', () => {
	const usageService = mock<AssistantUsageService>();
	const controller = new AssistantUsageController(usageService);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	const range = {
		startDate: new Date('2026-11-01T00:00:00.000Z'),
		endDate: new Date('2026-11-30T23:59:59.999Z'),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('serves the routes under /assistant/usage with the instanceAi:viewUsage scope', () => {
		const registry = Container.get(ControllerRegistryMetadata);
		const metadata = registry.getControllerMetadata(
			AssistantUsageController as unknown as Parameters<typeof registry.getControllerMetadata>[0],
		);

		expect(metadata.basePath).toBe('/assistant/usage');
		for (const [handler, path] of Object.entries({ getUsage: '/', getUsers: '/users' })) {
			expect(metadata.routes.get(handler)?.path).toBe(path);
			expect(metadata.routes.get(handler)?.accessScope).toEqual({
				scope: 'instanceAi:viewUsage',
				globalOnly: true,
			});
		}
	});

	it('returns the usage of the range', async () => {
		const usage = {
			summary: {
				conversations: 0,
				messages: 0,
				activeUsers: 0,
				workflowsCreated: 0,
				agentsCreated: 0,
				dataTablesCreated: 0,
			},
			byDay: [],
		};
		usageService.getUsage.mockResolvedValue(usage);
		const query = { ...range, timeZone: 'Europe/Berlin' };

		await expect(controller.getUsage(req, res, query)).resolves.toBe(usage);
		expect(usageService.getUsage).toHaveBeenCalledWith(query);
	});

	it('returns one page of the users of the range', async () => {
		usageService.getUsers.mockResolvedValue({ count: 0, data: [] });
		const query = { ...range, skip: 0, take: 10, sortBy: 'tokens:desc' as const };

		await controller.getUsers(req, res, query);

		expect(usageService.getUsers).toHaveBeenCalledWith(query);
	});

	it.each([
		[
			'a start after the end',
			{ startDate: range.endDate, endDate: range.startDate },
			'The start date must be before the end date',
		],
		[
			'a range longer than 366 days',
			{ startDate: new Date('2025-01-01T00:00:00.000Z'), endDate: range.endDate },
			'The date range must not be longer than 366 days',
		],
	])('refuses %s', async (_, query, message) => {
		await expect(controller.getUsage(req, res, query)).rejects.toThrow(BadRequestError);
		await expect(controller.getUsage(req, res, query)).rejects.toThrow(message);
		await expect(controller.getUsers(req, res, { ...query, skip: 0, take: 10 })).rejects.toThrow(
			BadRequestError,
		);
		expect(usageService.getUsage).not.toHaveBeenCalled();
		expect(usageService.getUsers).not.toHaveBeenCalled();
	});
});
