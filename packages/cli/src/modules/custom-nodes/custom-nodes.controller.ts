import {
	CreateCustomNodeDto,
	CreateCustomOperationDto,
	PreviewCustomOperationDto,
	SetActiveVersionDto,
	UpdateCustomNodeDto,
	UpdateCustomOperationDto,
	UploadCustomNodeIconDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Patch, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { CustomNodesService } from './custom-nodes.service';

@RestController('/custom-nodes')
export class CustomNodesController {
	constructor(private readonly service: CustomNodesService) {}

	@Get('/')
	async list() {
		return await this.service.list();
	}

	/** Demo helper: restore the seeded example nodes and actions. */
	@Post('/reseed')
	async reseed() {
		await this.service.reseed();
		return await this.service.list();
	}

	@Post('/preview')
	async preview(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: PreviewCustomOperationDto,
	) {
		return this.service.preview(payload);
	}

	@Get('/:id')
	async get(_req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		const row = await this.service.getEntity(id);
		return { id: row.id, kind: row.type, definition: row.definition };
	}

	@Get('/:id/icon')
	async icon(_req: AuthenticatedRequest, res: Response, @Param('id') id: string) {
		const { mimeType, data } = await this.service.getIcon(id);
		res.setHeader('Content-Type', mimeType);
		res.setHeader('Cache-Control', 'no-cache');
		res.end(data);
	}

	@Post('/operations')
	async createOperation(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: CreateCustomOperationDto,
	) {
		return await this.service.createOperation(payload);
	}

	@Patch('/operations/:id')
	async updateOperation(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body payload: UpdateCustomOperationDto,
	) {
		return await this.service.updateOperation(id, payload);
	}

	@Post('/operations/:id/active-version')
	async setActiveVersion(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body payload: SetActiveVersionDto,
	) {
		return await this.service.setActiveVersion(id, payload.version);
	}

	@Post('/nodes')
	async createNode(_req: AuthenticatedRequest, _res: Response, @Body payload: CreateCustomNodeDto) {
		return await this.service.createNode(payload);
	}

	@Patch('/nodes/:id')
	async updateNode(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body payload: UpdateCustomNodeDto,
	) {
		return await this.service.updateNode(id, payload);
	}

	@Post('/nodes/:id/icon')
	async uploadIcon(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body payload: UploadCustomNodeIconDto,
	) {
		return await this.service.setIcon(id, payload.iconDataUri);
	}

	@Delete('/:id')
	async delete(_req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		await this.service.delete(id);
		return { success: true };
	}
}
