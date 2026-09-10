import { CreateAppDto, CreatePageDto, UpdateAppDto, UpdatePageDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Middleware,
	Param,
	Patch,
	Post,
	ProjectScope,
	RestController,
} from '@n8n/decorators';
import { NextFunction, Response } from 'express';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InstanceWriteAccessService } from '@/services/instance-write-access.service';
import { ProjectService } from '@/services/project.service.ee';

import { AppsService } from './apps.service';
import { AppNamespaceConflictError } from './errors/app-namespace-conflict.error';
import { PageRouteConflictError } from './errors/page-route-conflict.error';

/** Values of `req.query.params`, sent by the editor as a JSON-encoded object of strings. */
const parsePreviewParams = (raw: unknown): Record<string, string> => {
	if (typeof raw !== 'string') return {};
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return {};
	}
	if (typeof parsed !== 'object' || parsed === null) return {};

	const params: Record<string, string> = {};
	for (const [key, value] of Object.entries(parsed)) {
		if (typeof value === 'string') params[key] = value;
	}
	return params;
};

const RENDER_ERRORS_HEADER = 'X-N8N-App-Render-Errors';

/** Header values must be Latin-1; the JSON stays valid with `\uXXXX` escapes. */
const toHeaderJson = (value: unknown): string =>
	JSON.stringify(value).replace(
		/[^\x20-\x7e]/g,
		(char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
	);

@RestController('/projects/:projectId/apps')
export class AppsController {
	constructor(
		private readonly appsService: AppsService,
		private readonly projectService: ProjectService,
		private readonly instanceWriteAccess: InstanceWriteAccessService,
	) {}

	private checkInstanceWriteAccess(): void {
		if (this.instanceWriteAccess.isReadOnly()) {
			throw new ForbiddenError(
				'Cannot modify apps on a protected instance. This instance is in read-only mode.',
			);
		}
	}

	private handleAppError(e: unknown): never {
		if (e instanceof AppNamespaceConflictError || e instanceof PageRouteConflictError) {
			throw new ConflictError(e.message);
		}
		// AppContentInvalidError is already a 400 ResponseError; let it propagate as-is.
		throw e;
	}

	@Middleware()
	async validateProjectExists(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: Response,
		next: NextFunction,
	) {
		try {
			await this.projectService.getProject(req.params.projectId);
			next();
		} catch {
			res.status(404).send('Project not found');
		}
	}

	@Post('/')
	@ProjectScope('app:create')
	async createApp(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body dto: CreateAppDto,
	) {
		this.checkInstanceWriteAccess();
		try {
			return await this.appsService.createApp(req.params.projectId, dto);
		} catch (e: unknown) {
			this.handleAppError(e);
		}
	}

	@Get('/')
	@ProjectScope('app:listProject')
	async listApps(req: AuthenticatedRequest<{ projectId: string }>, _res: Response) {
		return await this.appsService.listApps(req.params.projectId);
	}

	@Get('/:appId')
	@ProjectScope('app:read')
	async getApp(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
	) {
		return await this.appsService.getAppForResponse(appId);
	}

	@Patch('/:appId')
	@ProjectScope('app:update')
	async updateApp(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Body dto: UpdateAppDto,
	) {
		this.checkInstanceWriteAccess();
		try {
			return await this.appsService.updateApp(appId, dto);
		} catch (e: unknown) {
			this.handleAppError(e);
		}
	}

	@Delete('/:appId')
	@ProjectScope('app:delete')
	async deleteApp(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
	) {
		this.checkInstanceWriteAccess();
		await this.appsService.deleteApp(appId);
	}

	@Post('/:appId/publish')
	@ProjectScope('app:update')
	async publish(
		req: AuthenticatedRequest<{ projectId: string; appId: string }>,
		_res: Response,
		@Param('appId') appId: string,
	) {
		this.checkInstanceWriteAccess();
		try {
			return await this.appsService.publish(appId, req.user.id);
		} catch (e: unknown) {
			this.handleAppError(e);
		}
	}

	@Get('/:appId/versions')
	@ProjectScope('app:read')
	async listVersions(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
	) {
		return await this.appsService.listVersions(appId);
	}

	@Post('/:appId/versions/:versionId/activate')
	@ProjectScope('app:update')
	async activateVersion(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Param('versionId') versionId: string,
	) {
		this.checkInstanceWriteAccess();
		await this.appsService.activateVersion(appId, versionId);
	}

	@Post('/:appId/pages')
	@ProjectScope('app:update')
	async createPage(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Body dto: CreatePageDto,
	) {
		this.checkInstanceWriteAccess();
		try {
			return await this.appsService.createPage(appId, dto);
		} catch (e: unknown) {
			this.handleAppError(e);
		}
	}

	@Get('/:appId/pages')
	@ProjectScope('app:read')
	async listPages(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
	) {
		return await this.appsService.listPages(appId);
	}

	@Patch('/:appId/pages/:pageId')
	@ProjectScope('app:update')
	async updatePage(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Param('pageId') pageId: string,
		@Body dto: UpdatePageDto,
	) {
		this.checkInstanceWriteAccess();
		try {
			return await this.appsService.updatePage(appId, pageId, dto);
		} catch (e: unknown) {
			this.handleAppError(e);
		}
	}

	@Delete('/:appId/pages/:pageId')
	@ProjectScope('app:update')
	async deletePage(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Param('pageId') pageId: string,
	) {
		this.checkInstanceWriteAccess();
		await this.appsService.deletePage(appId, pageId);
	}

	/** The sanitized effective draft layout, for the editor to place its content editor into. */
	@Get('/:appId/pages/:pageId/layout-preview')
	@ProjectScope('app:read')
	async previewLayout(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Param('pageId') pageId: string,
	) {
		return await this.appsService.previewLayout(appId, pageId);
	}

	/** Renders the draft page tree, for the editor/AI Assistant preview iframe. */
	@Get('/:appId/pages/:pageId/preview', { usesTemplates: true })
	@ProjectScope('app:read')
	async previewPage(
		req: AuthenticatedRequest<
			{ projectId: string; appId: string; pageId: string },
			unknown,
			unknown,
			{ path?: string; params?: string }
		>,
		res: Response,
		@Param('appId') appId: string,
		@Param('pageId') pageId: string,
	) {
		const { html, errors } = await this.appsService.preview(
			appId,
			pageId,
			req.query.path,
			parsePreviewParams(req.query.params),
		);
		res.setHeader('X-Content-Type-Options', 'nosniff');
		if (Object.keys(errors).length > 0) {
			res.setHeader(RENDER_ERRORS_HEADER, toHeaderJson(errors));
		}
		res.type('html').send(html);
	}
}
