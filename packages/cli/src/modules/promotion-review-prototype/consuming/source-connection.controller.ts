import { AddPromotionSourceConnectionDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, Param, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { PromotionSourceConnectionService } from './source-connection.service';

/**
 * Consuming-side pairing: manage which producing instances this instance pulls
 * promotions from. API keys are write-only over this API — never returned.
 */
@RestController('/promotion-review-prototype/consuming')
export class PromotionSourceConnectionController {
	constructor(private readonly service: PromotionSourceConnectionService) {}
	@Get('/source-connections')
	async list(_req: AuthenticatedRequest, _res: Response) {
		return await this.service.list();
	}

	@Post('/source-connections')
	async add(_req: AuthenticatedRequest, _res: Response) {
		const parsed = AddPromotionSourceConnectionDto.safeParse(_req.body);
		if (!parsed.success) {
			throw new BadRequestError(
				parsed.error.errors[0]?.message ?? 'Invalid source connection request',
			);
		}

		return await this.service.add(parsed.data);
	}

	@Delete('/source-connections/:id')
	async delete(_req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		await this.service.delete(id);
		return { success: true };
	}
}
