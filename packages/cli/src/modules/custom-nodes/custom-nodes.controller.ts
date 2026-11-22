import {
	CreateCustomNodeDto,
	PreviewCustomActionDto,
	RollbackCustomActionRevisionDto,
	SaveCustomActionDto,
	SetCustomNodeIconDto,
	UpdateCustomNodeDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Param,
	Patch,
	Post,
	Put,
	RestController,
} from '@n8n/decorators';
import { BadRequestError, ConflictError, UnexpectedError } from '@n8n/errors';
import type { Response } from 'express';

import { CustomNodeConflictError } from './custom-nodes.errors';
import { CustomNodesService } from './custom-nodes.service';
import { InvalidCustomActionError } from './draft-validator';
import type { IconMimeType } from './icon-validator';

const ICON_MIME_TYPES: readonly string[] = ['image/png', 'image/svg+xml'] satisfies IconMimeType[];

/** An SVG icon must not run script or load anything, even when a browser opens it directly. */
const ICON_HEADERS = {
	'X-Content-Type-Options': 'nosniff',
	'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
	'Cache-Control': 'private, no-cache',
};

/**
 * Maps the module errors that the shared response layer does not map.
 * `ForbiddenError`, `NotFoundError` and other `UserError`s keep their default status.
 */
async function withErrorMapping<T>(res: Response, fn: () => Promise<T>): Promise<T | undefined> {
	try {
		return await fn();
	} catch (error) {
		if (error instanceof InvalidCustomActionError) {
			// The editor shows each issue at its field, so the body carries the list.
			res.status(400).json({ code: 400, message: error.message, issues: error.issues });
			return undefined;
		}
		if (error instanceof CustomNodeConflictError) throw new ConflictError(error.message);
		throw error;
	}
}

function parseVersion(version: string): number {
	if (!/^[1-9]\d{0,8}$/.test(version)) {
		throw new BadRequestError('The version must be a positive integer');
	}
	return Number(version);
}

/** Internal REST routes only. Each service method checks the same scope again. */
@RestController('/custom-nodes')
export class CustomNodesController {
	constructor(private readonly service: CustomNodesService) {}

	@Get('/')
	@GlobalScope('customNode:list')
	async list(req: AuthenticatedRequest) {
		return await this.service.list(req.user);
	}

	@Post('/preview')
	@GlobalScope('customNode:list')
	async preview(req: AuthenticatedRequest, _res: Response, @Body dto: PreviewCustomActionDto) {
		return this.service.preview(req.user, dto.draft);
	}

	@Post('/nodes')
	@GlobalScope('customNode:create')
	async createNode(req: AuthenticatedRequest, res: Response, @Body dto: CreateCustomNodeDto) {
		return await withErrorMapping(res, async () => await this.service.createNode(req.user, dto));
	}

	@Patch('/nodes/:id')
	@GlobalScope('customNode:update')
	async updateNode(
		req: AuthenticatedRequest,
		res: Response,
		@Param('id') id: string,
		@Body dto: UpdateCustomNodeDto,
	) {
		return await withErrorMapping(
			res,
			async () => await this.service.updateNode(req.user, id, dto),
		);
	}

	@Delete('/nodes/:id')
	@GlobalScope('customNode:delete')
	async deleteNode(req: AuthenticatedRequest, res: Response, @Param('id') id: string) {
		await withErrorMapping(res, async () => await this.service.deleteNode(req.user, id));
	}

	@Put('/nodes/:id/icon')
	@GlobalScope('customNode:update')
	async setIcon(
		req: AuthenticatedRequest,
		res: Response,
		@Param('id') id: string,
		@Body dto: SetCustomNodeIconDto,
	) {
		await withErrorMapping(
			res,
			async () => await this.service.setIcon(req.user, id, dto.iconDataUri),
		);
	}

	/**
	 * The editor loads the icon with an `<img>` element, which cannot send the browser-id header.
	 * So this route is on the browser-id skip list in `AuthService`. It still needs a session.
	 * This scope check is the only gate, because `getIcon` has no user.
	 */
	@Get('/nodes/:id/icon')
	@GlobalScope('customNode:list')
	async getIcon(_req: AuthenticatedRequest, res: Response, @Param('id') id: string) {
		const icon = await this.service.getIcon(id);
		if (!ICON_MIME_TYPES.includes(icon.mimeType)) {
			throw new UnexpectedError('The stored icon has an unknown mime type', {
				extra: { customNodeId: id },
			});
		}
		res.status(200).set(ICON_HEADERS).setHeader('Content-Type', icon.mimeType);
		res.send(icon.data);
	}

	@Post('/nodes/:id/actions')
	@GlobalScope('customNode:update')
	async addAction(
		req: AuthenticatedRequest,
		res: Response,
		@Param('id') id: string,
		@Body dto: SaveCustomActionDto,
	) {
		return await withErrorMapping(res, async () => await this.service.addAction(req.user, id, dto));
	}

	@Patch('/actions/:id')
	@GlobalScope('customNode:update')
	async saveAction(
		req: AuthenticatedRequest,
		res: Response,
		@Param('id') id: string,
		@Body dto: SaveCustomActionDto,
	) {
		return await withErrorMapping(
			res,
			async () => await this.service.saveAction(req.user, id, dto),
		);
	}

	@Post('/actions/:id/versions/:version/rollback')
	@GlobalScope('customNode:update')
	async rollbackRevision(
		req: AuthenticatedRequest,
		res: Response,
		@Param('id') id: string,
		@Param('version') version: string,
		@Body dto: RollbackCustomActionRevisionDto,
	) {
		const versionNumber = parseVersion(version);
		return await withErrorMapping(
			res,
			async () => await this.service.rollbackRevision(req.user, id, versionNumber, dto.revision),
		);
	}

	@Delete('/actions/:id')
	@GlobalScope('customNode:delete')
	async deleteAction(req: AuthenticatedRequest, res: Response, @Param('id') id: string) {
		await withErrorMapping(res, async () => await this.service.deleteAction(req.user, id));
	}
}
