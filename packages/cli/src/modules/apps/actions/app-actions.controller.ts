import type { AppLayoutBlock, AppVersionSnapshot } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Options, Post, RootLevelController } from '@n8n/decorators';
import type { Request, Response } from 'express';
import multer from 'multer';
import { posix } from 'node:path';

import { applyCors } from '@/utils/cors.util';

import { AppRepository } from '../app.repository';
import { AppVersionRepository } from '../app-version.repository';
import { appBasePath, pagePath } from '../serving/page-menu';
import { isDynamicRoute } from '../serving/resolve-page-path';
import { AppTokenService, bearerToken } from '../serving/app-token.service';
import { ViewerService, type Viewer } from '../serving/viewer.service';

import { AppCodeRuntime } from '../runtime/app-code-runtime';
import { PageContextFactory } from '../runtime/page-context.factory';
import { runTableAction } from './table-actions';

/** `_path` rides along in the POST body only to route the redirect; a workflow
 * or code action never sees it or the status keys as input. */
const RESERVED_INPUT_KEYS = new Set(['_path', '_form', '_status', '_message']);

const stripReservedKeys = (input: Record<string, unknown>): Record<string, unknown> => {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(input)) {
		if (!RESERVED_INPUT_KEYS.has(key)) result[key] = value;
	}
	return result;
};

/** Only text fields — a file on this endpoint is a client error, not a body to buffer. */
const multipartTextFields = multer({ limits: { fields: 50, fieldSize: 1024 * 1024 } }).none();

const MAX_BODY_BYTES = 1024 * 1024;

type ActionOutcome = { redirect?: string } | { data: unknown } | { error: string };

/** Ancestor route segments only, so no `:param` value is required — used when
 * a request carries no `_path` (a `code` action called directly, not via a
 * rendered form). Falls back to the app root if an ancestor is dynamic. */
function staticPagePath(
	pages: AppVersionSnapshot['pages'],
	pageId: string,
	namespace: string,
): string {
	const byId = new Map(pages.map((p) => [p.id, p]));
	const segments: string[] = [];
	let current = byId.get(pageId);
	while (current) {
		if (isDynamicRoute(current.route)) return appBasePath(namespace);
		if (current.route !== '') segments.unshift(current.route);
		current = current.parentPageId ? byId.get(current.parentPageId) : undefined;
	}
	return pagePath(namespace, segments);
}

/** Normalized first, so `/apps/ns/../../x` does not pass on its prefix alone. */
function isWithinApp(path: string, namespace: string): boolean {
	if (path.includes('://') || path.startsWith('//')) return false;
	const normalized = posix.normalize(path);
	return (
		normalized === appBasePath(namespace) || normalized.startsWith(`${appBasePath(namespace)}/`)
	);
}

/** JSON first, so a client with no preference (`*\/*`) gets JSON; a browser form post says `text/html`. */
function prefersHtml(req: Request): boolean {
	return req.accepts(['json', 'html']) === 'html';
}

/**
 * Runs one App action: a `code` block's exported `actions[name]`, a `form`
 * block's `submit`, or a `button` block whose target is a workflow. Per
 * `serving-and-actions.md`, unauthenticated (`skipAuth`) — the access token
 * in the `Authorization` header is this endpoint's only credential.
 */
@RootLevelController('/apps')
export class AppActionsController {
	constructor(
		private readonly appTokenService: AppTokenService,
		private readonly appRepository: AppRepository,
		private readonly appVersionRepository: AppVersionRepository,
		private readonly pageContextFactory: PageContextFactory,
		private readonly appCodeRuntime: AppCodeRuntime,
		private readonly viewerService: ViewerService,
		private readonly logger: Logger,
	) {}

	// `usesTemplates` because these handlers write the response themselves; the
	// registry's default handler would send a second time.
	@Options('/:namespace/_actions/:pageId/:blockId/:name', { skipAuth: true, usesTemplates: true })
	preflight(req: Request, res: Response) {
		applyCors(req, res, { extraAllowedHeaders: ['Authorization'], maxAge: 600 });
		res.status(204).end();
	}

	@Post('/:namespace/_actions/:pageId/:blockId/:name', {
		skipAuth: true,
		usesTemplates: true,
		middlewares: [multipartTextFields],
	})
	async runAction(req: Request, res: Response) {
		applyCors(req, res, { extraAllowedHeaders: ['Authorization'], maxAge: 600 });

		const { namespace, pageId, blockId, name } = req.params as Record<string, string>;

		if ((req.rawBody?.length ?? 0) > MAX_BODY_BYTES) {
			res.status(400).json({ error: 'Request body exceeds the 1 MB limit' });
			return;
		}

		const token = bearerToken(req);
		const payload = token === undefined ? null : this.appTokenService.verifyAccess(token);
		const app = payload ? await this.appRepository.findByNamespace(namespace) : null;
		if (!app || app.id !== payload?.appId) {
			res.status(401).json({ error: 'Invalid access token' });
			return;
		}

		const viewer = await this.viewerService.fromToken(payload);
		if (app.auth === 'n8n' && !viewer) {
			res.status(401).json({ error: 'Sign in required' });
			return;
		}

		if (!app.activeVersionId) {
			res.status(404).json({ error: 'This app has no published version' });
			return;
		}
		const version = await this.appVersionRepository.findSnapshot(app.activeVersionId);
		if (!version) {
			res.status(404).json({ error: 'This app has no published version' });
			return;
		}
		const { snapshot } = version;

		const page = snapshot.pages.find((p) => p.id === pageId);
		// A layout block of this page runs from every page that inherits the layout;
		// its action URL names the owner page, so the lookup covers `layout` too.
		const block = page
			? [...(page.content ?? []), ...(page.layout ?? [])].find((b) => b.id === blockId)
			: undefined;
		if (!page || !block) {
			res.status(404).json({ error: 'Action not found' });
			return;
		}

		const input = stripReservedKeys((req.body as Record<string, unknown> | undefined) ?? {});
		const rawPath = (req.body as Record<string, unknown> | undefined)?._path;
		const pathForRedirect =
			typeof rawPath === 'string' && isWithinApp(rawPath, namespace)
				? rawPath
				: staticPagePath(snapshot.pages, pageId, namespace);

		let outcome: ActionOutcome;
		try {
			outcome = await this.dispatch({
				app,
				page,
				block,
				name,
				input,
				viewer,
				baseUrl: `${req.protocol}://${req.get('host') ?? ''}`,
			});
		} catch (error) {
			outcome = { error: error instanceof Error ? error.message : String(error) };
		}

		this.logger.info('App action ran', {
			appId: app.id,
			pageId,
			blockId,
			name,
			outcome: 'error' in outcome ? 'error' : 'redirect' in outcome ? 'redirect' : 'data',
		});

		this.respond(res, outcome, namespace, pathForRedirect, blockId, req);
	}

	private async dispatch(input: {
		app: { id: string; name: string; namespace: string; projectId: string };
		page: AppVersionSnapshot['pages'][number];
		block: AppLayoutBlock;
		name: string;
		input: Record<string, unknown>;
		viewer: Viewer | null;
		baseUrl: string;
	}): Promise<ActionOutcome> {
		const { app, page, block, name, viewer, baseUrl } = input;

		const staticData = {
			app,
			page: { id: page.id, route: page.route, path: '' },
			actionPageId: page.id,
			blockId: block.id,
			params: {},
			query: {},
			viewer,
			menu: [],
			baseUrl,
		};

		if (block.type === 'code') {
			const actionContext = this.pageContextFactory.buildAction({
				...staticData,
				logs: [],
				input: input.input,
			});
			const { value } = await this.appCodeRuntime.runAction(
				block.data.source,
				name,
				actionContext,
				staticData,
			);
			return value;
		}

		if (block.type === 'form' && name === 'submit') {
			const pageContext = this.pageContextFactory.build({ ...staticData, logs: [] });
			return this.toFormOutcome(
				await pageContext.workflows.submitForm(block.data.workflowId, input.input),
				block.id,
			);
		}

		if (block.type === 'button' && block.data.target.kind === 'workflow' && name === 'run') {
			const pageContext = this.pageContextFactory.build({ ...staticData, logs: [] });
			return this.toFormOutcome(
				await pageContext.workflows.execute(block.data.target.workflowId, input.input),
				block.id,
			);
		}

		if (block.type === 'table') {
			const pageContext = this.pageContextFactory.build({ ...staticData, logs: [] });
			const handle = await pageContext.dataTables.get(block.data.source.dataTableId);
			return await runTableAction({ handle, block, name, input: input.input });
		}

		return { error: 'Action not found' };
	}

	private toFormOutcome(
		result: { status: 'success' } | { status: 'error'; error: string },
		blockId: string,
	): ActionOutcome {
		return result.status === 'success'
			? { redirect: `?_form=${blockId}&_status=ok` }
			: {
					redirect: `?_form=${blockId}&_status=error&_message=${encodeURIComponent(result.error)}`,
				};
	}

	private respond(
		res: Response,
		outcome: ActionOutcome,
		namespace: string,
		pagePathForRedirect: string,
		blockId: string,
		req: Request,
	) {
		if ('redirect' in outcome && outcome.redirect !== undefined) {
			const target = outcome.redirect.startsWith('?')
				? `${pagePathForRedirect}${outcome.redirect}`
				: outcome.redirect;
			if (!isWithinApp(target.split('?')[0], namespace)) {
				res.status(400).json({ error: 'Redirect target is outside this app' });
				return;
			}
			res.redirect(303, target);
			return;
		}

		if ('data' in outcome) {
			res.status(200).json({ data: outcome.data });
			return;
		}

		const message = 'error' in outcome ? outcome.error : 'Action failed';
		if (prefersHtml(req)) {
			res.redirect(
				303,
				`${pagePathForRedirect}?_form=${blockId}&_status=error&_message=${encodeURIComponent(message)}`,
			);
			return;
		}
		res.status(400).json({ error: message });
	}
}
