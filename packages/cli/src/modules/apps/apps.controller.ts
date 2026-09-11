import {
	CreateAppBindingDto,
	CreateAppDto,
	CreatePageDto,
	SetActiveAppVersionDto,
	UpdateAppBindingDto,
	UpdateAppDto,
	UpdateAppVersionFileDto,
	UpdatePageDto,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import {
	Body,
	Delete,
	Get,
	Middleware,
	Param,
	Patch,
	Post,
	ProjectScope,
	Put,
	RestController,
} from '@n8n/decorators';
import { NextFunction, RequestHandler, Response } from 'express';
import multer from 'multer';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { AttachableWorkflowsService } from '@/modules/agents/attachable-workflows.service';
import { InstanceAiMemoryService } from '@/modules/instance-ai/instance-ai-memory.service';
import { InstanceAiService } from '@/modules/instance-ai/instance-ai.service';
import { InstanceWriteAccessService } from '@/services/instance-write-access.service';
import { sendErrorResponse } from '@/response-helper';
import { ProjectService } from '@/services/project.service.ee';

import { AppSourceEditBuildService } from './app-source-edit-build.service';
import { MAX_TARBALL_BYTES } from './app-version.service';
import { AppsService } from './apps.service';
import { AppNamespaceConflictError } from './errors/app-namespace-conflict.error';
import { AppNotFoundError } from './errors/app-not-found.error';
import { PageRouteConflictError } from './errors/page-route-conflict.error';
import { pathSegments } from './serving/path-segments';

type TarballUploadRequest = AuthenticatedRequest<{ projectId: string }> & {
	files?: Record<string, Express.Multer.File[]>;
	fileUploadError?: Error;
};

const READ_ONLY_MESSAGE =
	'Cannot modify apps on a protected instance. This instance is in read-only mode.';

const tarballFields = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_TARBALL_BYTES, files: 2, fields: 0 },
}).fields([
	{ name: 'source', maxCount: 1 },
	{ name: 'dist', maxCount: 1 },
]);

/** Runs before multer so a protected instance answers 403 without buffering the upload. */
const rejectUploadWhenReadOnly: RequestHandler = (_req, res, next) => {
	if (Container.get(InstanceWriteAccessService).isReadOnly()) {
		sendErrorResponse(res, new ForbiddenError(READ_ONLY_MESSAGE));
		return;
	}
	next();
};

/** Parks a multer failure on the request so the handler can answer 400 instead of the default 500. */
const uploadTarballs: RequestHandler = (req, res, next) => {
	void tarballFields(req, res, (error: unknown) => {
		if (error instanceof Error) Object.assign(req, { fileUploadError: error });
		next();
	});
};

const uploadedTarball = (req: TarballUploadRequest, field: 'source' | 'dist'): Buffer => {
	const file = req.files?.[field]?.[0];
	if (!file) throw new BadRequestError(`Missing '${field}' tarball`);
	return file.buffer;
};

@RestController('/projects/:projectId/apps')
export class AppsController {
	constructor(
		private readonly appsService: AppsService,
		private readonly projectService: ProjectService,
		private readonly instanceWriteAccess: InstanceWriteAccessService,
		private readonly attachableWorkflowsService: AttachableWorkflowsService,
		private readonly appSourceEditBuildService: AppSourceEditBuildService,
		private readonly instanceAiMemoryService: InstanceAiMemoryService,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	private checkInstanceWriteAccess(): void {
		if (this.instanceWriteAccess.isReadOnly()) throw new ForbiddenError(READ_ONLY_MESSAGE);
	}

	private handleAppError(e: unknown): never {
		if (e instanceof AppNamespaceConflictError || e instanceof PageRouteConflictError) {
			throw new ConflictError(e.message);
		}
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

	/**
	 * Runs after the project-scope check. An `:appId` of another project answers
	 * the same 404 as an unknown id, so it does not reveal that the app exists.
	 */
	@Middleware()
	async validateAppBelongsToProject(
		req: AuthenticatedRequest<{ projectId: string; appId?: string }>,
		res: Response,
		next: NextFunction,
	) {
		const { projectId, appId } = req.params;
		if (appId === undefined) return next();
		try {
			const app = await this.appsService.getApp(appId);
			if (app.projectId !== projectId) throw new AppNotFoundError(appId);
			next();
		} catch (error) {
			sendErrorResponse(res, ensureError(error));
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
			const app = await this.appsService.createApp(req.params.projectId, dto);
			return await this.appsService.toResponse(app);
		} catch (e: unknown) {
			this.handleAppError(e);
		}
	}

	@Get('/')
	@ProjectScope('app:listProject')
	async listApps(req: AuthenticatedRequest<{ projectId: string }>, _res: Response) {
		const apps = await this.appsService.listApps(req.params.projectId);
		return await Promise.all(apps.map(async (app) => await this.appsService.toResponse(app)));
	}

	/** Workflows a page can set as its `dataWorkflowId` — same trigger-compatible list agents pick tools from. */
	@Get('/data-workflows')
	@ProjectScope('app:read')
	async listDataWorkflows(req: AuthenticatedRequest<{ projectId: string }>, _res: Response) {
		return await this.attachableWorkflowsService.list(req.user, req.params.projectId);
	}

	@Get('/:appId')
	@ProjectScope('app:read')
	async getApp(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
	) {
		return await this.appsService.toResponse(await this.appsService.getApp(appId));
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
			return await this.appsService.toResponse(await this.appsService.updateApp(appId, dto));
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
		// Resolved at call time: the instance-ai module owns the sandbox and may be inactive.
		if (this.moduleRegistry.isActive('instance-ai')) {
			await Container.get(InstanceAiService).destroyAppSandbox(appId);
		}
	}

	@Post('/:appId/versions', { middlewares: [rejectUploadWhenReadOnly, uploadTarballs] })
	@ProjectScope('app:update')
	async createVersion(req: TarballUploadRequest, _res: Response, @Param('appId') appId: string) {
		if (req.fileUploadError) {
			const message =
				req.fileUploadError instanceof multer.MulterError
					? req.fileUploadError.message
					: 'File upload failed';
			throw new BadRequestError(message);
		}
		return await this.appsService.createVersion(
			appId,
			uploadedTarball(req, 'source'),
			uploadedTarball(req, 'dist'),
		);
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

	@Get('/:appId/bindings')
	@ProjectScope('app:read')
	async listBindings(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
	) {
		const app = await this.appsService.getApp(appId);
		return await this.appsService.describeBindings(app);
	}

	@Post('/:appId/bindings')
	@ProjectScope('app:update')
	async addBinding(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: Response,
		@Param('appId') appId: string,
	) {
		this.checkInstanceWriteAccess();
		const parsed = CreateAppBindingDto.safeParse(req.body);
		if (!parsed.success) throw new BadRequestError(parsed.error.errors[0].message);
		const described = await this.appsService.addBinding(appId, parsed.data, req.user);
		res.status(201);
		return described;
	}

	@Patch('/:appId/bindings/:key')
	@ProjectScope('app:update')
	async updateBinding(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Param('key') key: string,
	) {
		this.checkInstanceWriteAccess();
		const parsed = UpdateAppBindingDto.safeParse(req.body);
		if (!parsed.success) throw new BadRequestError(parsed.error.errors[0].message);
		return await this.appsService.updateBinding(appId, key, parsed.data, req.user);
	}

	@Delete('/:appId/bindings/:key')
	@ProjectScope('app:update')
	async removeBinding(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Param('key') key: string,
	) {
		this.checkInstanceWriteAccess();
		return await this.appsService.removeBinding(appId, key);
	}

	/** The caller's assistant threads that build this app, newest activity first. */
	@Get('/:appId/threads')
	@ProjectScope('app:read')
	async listThreads(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
	) {
		await this.appsService.getApp(appId);
		return { threads: await this.instanceAiMemoryService.listThreadsForApp(req.user.id, appId) };
	}

	/** Serves a stored built version again, or unpublishes the app with `versionId: null`. */
	@Patch('/:appId/active-version')
	@ProjectScope('app:update')
	async setActiveVersion(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Body dto: SetActiveAppVersionDto,
	) {
		this.checkInstanceWriteAccess();
		const app = await this.appsService.setActiveVersion(appId, dto.versionId);
		return await this.appsService.toResponse(app);
	}

	/**
	 * Read-only browsing of a version's source: no path lists its files, a path
	 * returns that one file's content. One route, like `AppServingController`,
	 * since the wildcard already matches both shapes.
	 */
	@Get('/:appId/versions/:versionId/files{/*path}')
	@ProjectScope('app:read')
	async getVersionFiles(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Param('versionId') versionId: string,
		@Param('path') wildcardPath: unknown,
	) {
		const segments = pathSegments(wildcardPath);
		if (segments.length === 0) {
			return await this.appsService.listVersionFiles(appId, versionId);
		}
		return await this.appsService.getVersionFileContent(appId, versionId, segments);
	}

	/**
	 * Overwrites one existing source file and rebuilds the app, storing the
	 * result as a new version. `versionId` is accepted for symmetry with the
	 * read route above, but the edit always applies to the app's *active*
	 * version, resolved server-side.
	 */
	@Put('/:appId/versions/:versionId/files{/*path}')
	@ProjectScope('app:update')
	async updateVersionFile(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Param('path') wildcardPath: unknown,
		@Body dto: UpdateAppVersionFileDto,
	) {
		this.checkInstanceWriteAccess();
		const segments = pathSegments(wildcardPath);
		if (segments.length === 0) throw new BadRequestError('A file path is required');
		const result = await this.appSourceEditBuildService.saveFile(
			appId,
			segments.join('/'),
			dto.content,
			req.user,
		);
		if ('error' in result) throw new BadRequestError(result.message);
		return await this.appsService.getApp(appId);
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

	/** The app's real pages, derived from its source; what the builder UI shows. */
	@Get('/:appId/routes')
	@ProjectScope('app:read')
	async listRoutes(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
	) {
		return await this.appsService.listRoutes(appId);
	}

	@Patch('/:appId/pages/:pageId')
	@ProjectScope('app:update')
	async updatePage(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Param('pageId') pageId: string,
		@Body dto: UpdatePageDto,
	) {
		this.checkInstanceWriteAccess();
		try {
			return await this.appsService.updatePage(appId, pageId, dto, req.user);
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
}
