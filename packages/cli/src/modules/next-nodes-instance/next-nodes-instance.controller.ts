import {
	NextNodeActionVersionsQueryDto,
	PublishNextNodeVersionDto,
	TestNextNodeDraftDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Param, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { NextNodesInstanceService } from './next-nodes-instance.service';

/** The next node versions that this instance published. */
@RestController('/next-nodes/instance')
export class NextNodesInstanceController {
	constructor(private readonly service: NextNodesInstanceService) {}

	@Get('/versions')
	@GlobalScope('nodeDefinition:list')
	async list() {
		return await this.service.list();
	}

	@Post('/versions')
	@GlobalScope('nodeDefinition:publish')
	async publish(req: AuthenticatedRequest, _res: Response, @Body dto: PublishNextNodeVersionDto) {
		return await this.service.publish(dto.config, dto.fixtures, { userId: req.user.id });
	}

	/** The shipped nodes that the form can add an action to. */
	@Get('/parents')
	@GlobalScope('nodeDefinition:create')
	parents() {
		return this.service.parents();
	}

	/** Runs a draft once, so the form shows its items and gets the fixture for publish. */
	@Post('/drafts/test')
	@GlobalScope('nodeDefinition:create')
	async test(req: AuthenticatedRequest, _res: Response, @Body dto: TestNextNodeDraftDto) {
		return await this.service.test(dto.config, dto.params, dto.credentialId, req.user);
	}

	@Get('/actions/:actionId/config')
	@GlobalScope('nodeDefinition:list')
	async config(_req: AuthenticatedRequest, _res: Response, @Param('actionId') actionId: string) {
		return await this.service.configOf(actionId);
	}

	/** The versions of an action major, for the version field of a contract node. */
	@Get('/actions/:actionId/versions')
	@GlobalScope('nodeDefinition:list')
	async versions(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('actionId') actionId: string,
		@Query { major }: NextNodeActionVersionsQueryDto,
	) {
		return await this.service.majorVersionsOf(actionId, major);
	}

	@Post('/actions/:actionId/hide')
	@GlobalScope('nodeDefinition:hide')
	async hide(_req: AuthenticatedRequest, _res: Response, @Param('actionId') actionId: string) {
		await this.service.hide(actionId);
		return { hidden: actionId };
	}
}
