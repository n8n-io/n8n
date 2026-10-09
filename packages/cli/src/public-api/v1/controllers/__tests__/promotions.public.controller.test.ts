import { ListPromotionRepositoriesQueryDto } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@n8n/errors';

import { PromotionsPublicController } from '../promotions.public.controller';

describe('Promotion discovery cursor validation', () => {
	const moduleRegistry = mock<ModuleRegistry>();
	const controller = new PromotionsPublicController(moduleRegistry);
	const request = mock<AuthenticatedRequest>();
	const response = mock<Response>();

	async function rejectsCursor(cursor: string) {
		await expect(
			controller.getPromotionProviderRepositories(
				request,
				response,
				'not-needed',
				ListPromotionRepositoriesQueryDto.parse({ cursor }),
			),
			cursor,
		).rejects.toThrow(BadRequestError);
		expect(moduleRegistry.isActive).not.toHaveBeenCalled();
	}

	it('rejects undecodable and non-offset cursors before accessing the module', async () => {
		await rejectsCursor('not-a-cursor');
		await rejectsCursor(Buffer.from(JSON.stringify({ lastId: '42', limit: 2 })).toString('base64'));
	});

	it('rejects invalid page bounds and offsets that do not start a page', async () => {
		for (const cursor of [
			{ offset: -1, limit: 2 },
			{ offset: 1, limit: 2 },
			{ offset: 0, limit: 51 },
			{ offset: 0, limit: -2 },
			{ offset: 0, limit: '2' },
			{ offset: 1.5, limit: 2 },
		]) {
			await rejectsCursor(Buffer.from(JSON.stringify(cursor)).toString('base64'));
		}
	});
});
