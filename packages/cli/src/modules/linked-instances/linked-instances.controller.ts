import {
	LinkInstanceRequestDto,
	UpdateLinkedInstanceRequestDto,
	type LinkedInstanceSummary,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Param,
	Patch,
	Post,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { LinkedInstancesService } from './linked-instances.service';
import { remoteCallRateLimit } from './remote-call-rate-limit';

/** Each signed-in user manages only their own links. No response holds a token. */
@RestController('/linked-instances')
export class LinkedInstancesController {
	constructor(private readonly service: LinkedInstancesService) {}

	@Get('/')
	@GlobalScope('instanceAi:message')
	async list(req: AuthenticatedRequest): Promise<LinkedInstanceSummary[]> {
		return await this.service.list(req.user);
	}

	@Post('/', { keyedRateLimit: remoteCallRateLimit() })
	@GlobalScope('instanceAi:message')
	async link(
		req: AuthenticatedRequest,
		res: Response,
		@Body payload: LinkInstanceRequestDto,
	): Promise<LinkedInstanceSummary> {
		const { name, url, token } = payload;
		const summary = await this.service.link(req.user, { name, address: url, token });
		res.status(201);
		return summary;
	}

	@Post('/:id/verify', { keyedRateLimit: remoteCallRateLimit() })
	@GlobalScope('instanceAi:message')
	async verify(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
	): Promise<LinkedInstanceSummary> {
		return await this.service.verify(req.user, id);
	}

	@Patch('/:id', { keyedRateLimit: remoteCallRateLimit() })
	@GlobalScope('instanceAi:message')
	async update(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body payload: UpdateLinkedInstanceRequestDto,
	): Promise<LinkedInstanceSummary> {
		return await this.service.update(req.user, id, payload);
	}

	@Delete('/:id')
	@GlobalScope('instanceAi:message')
	async unlink(req: AuthenticatedRequest, res: Response, @Param('id') id: string): Promise<void> {
		await this.service.unlink(req.user, id);
		res.status(204).send();
	}
}
