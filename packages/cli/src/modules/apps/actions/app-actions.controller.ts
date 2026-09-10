import type { AppLayoutBlock, AppVersionSnapshot } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Options, Post, RootLevelController } from '@n8n/decorators';
import type { Request, Response } from 'express';
import multer from 'multer';
import { posix } from 'node:path';

import { applyCors } from '@/utils/cors.util';

import { blockStaticData } from '../rendering/block-context';
import type { BlockRenderContext } from '../rendering/types';
import { AppRequestAuth } from '../serving/app-request-auth';
import { appBasePath, pagePath } from '../serving/page-menu';
import { resolvePagePath } from '../serving/resolve-page-path';

import { AppCodeRuntime } from '../runtime/app-code-runtime';
import { PageContextFactory } from '../runtime/page-context.factory';
import { runTableAction } from './table-actions';

/** Status keys ride along in the POST body only to route the redirect; a workflow
 * or code action never sees them as input. */
const RESERVED_INPUT_KEYS = new Set(['_form', '_status', '_message']);

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

type SnapshotPage = AppVersionSnapshot['pages'][number];

/** The page the action was triggered from, with its route params and canonical path. */
type RenderedPage = { page: SnapshotPage; params: Record<string, string>; path: string };

/**
 * Resolves the `_path` query of an action URL (the rendered page's path, put
 * there by `ctx.actionUrl()`) to a page of the snapshot. A layout block's
 * action page can differ from the rendered page, so the URL carries both.
 */
function resolveRenderedPage(
	pages: SnapshotPage[],
	namespace: string,
	rawPath: unknown,
): RenderedPage | undefined {
	const base = appBasePath(namespace);
	if (typeof rawPath !== 'string' || (rawPath !== base && !rawPath.startsWith(`${base}/`))) {
		return undefined;
	}
	let segments: string[];
	try {
		segments = rawPath
			.slice(base.length)
			.split('/')
			.filter((segment) => segment !== '')
			.map(decodeURIComponent);
	} catch {
		return undefined;
	}
	const resolved = resolvePagePath(pages, segments);
	return resolved && { ...resolved, path: pagePath(namespace, segments) };
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
 * block's `submit`, a `button` block whose target is a workflow, or a `table`
 * row action. Per `serving-and-actions.md`, unauthenticated (`skipAuth`) — the
 * access token in the `Authorization` header is this endpoint's only credential.
 */
@RootLevelController('/apps')
export class AppActionsController {
	constructor(
		private readonly appRequestAuth: AppRequestAuth,
		private readonly pageContextFactory: PageContextFactory,
		private readonly appCodeRuntime: AppCodeRuntime,
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

		const authorized = await this.appRequestAuth.authorize(req, namespace);
		if ('error' in authorized) {
			res.status(authorized.status).json({ error: authorized.error });
			return;
		}
		const { app, viewer, pages } = authorized;

		const actionPage = pages.find((p) => p.id === pageId);
		// A layout block of this page runs from every page that inherits the layout;
		// its action URL names the owner page, so the lookup covers `layout` too.
		const block = actionPage
			? [...(actionPage.content ?? []), ...(actionPage.layout ?? [])].find((b) => b.id === blockId)
			: undefined;
		if (!actionPage || !block) {
			res.status(404).json({ error: 'Action not found' });
			return;
		}

		const rendered = resolveRenderedPage(pages, namespace, req.query._path) ?? {
			page: actionPage,
			params: {},
			path: appBasePath(namespace),
		};
		const ctx: BlockRenderContext = {
			app: { id: app.id, name: app.name, namespace, projectId: app.projectId, theme: app.theme },
			page: { id: rendered.page.id, route: rendered.page.route, path: rendered.path },
			actionPageId: actionPage.id,
			params: rendered.params,
			query: {},
			viewer,
			menu: [],
			baseUrl: `${req.protocol}://${req.get('host') ?? ''}`,
			preview: false,
		};
		const input = stripReservedKeys((req.body as Record<string, unknown> | undefined) ?? {});

		let outcome: ActionOutcome;
		try {
			outcome = await this.dispatch(ctx, block, name, input);
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

		this.respond(res, outcome, namespace, rendered.path, blockId, req);
	}

	private async dispatch(
		ctx: BlockRenderContext,
		block: AppLayoutBlock,
		name: string,
		input: Record<string, unknown>,
	): Promise<ActionOutcome> {
		const staticData = blockStaticData(ctx, block.id);

		if (block.type === 'code') {
			const actionContext = this.pageContextFactory.buildAction({ ...staticData, logs: [], input });
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
				await pageContext.workflows.submitForm(block.data.workflowId, input),
				block.id,
			);
		}

		if (block.type === 'button' && block.data.target.kind === 'workflow' && name === 'run') {
			const pageContext = this.pageContextFactory.build({ ...staticData, logs: [] });
			return this.toFormOutcome(
				await pageContext.workflows.execute(block.data.target.workflowId, input),
				block.id,
			);
		}

		if (block.type === 'table') {
			const pageContext = this.pageContextFactory.build({ ...staticData, logs: [] });
			const handle = await pageContext.dataTables.get(block.data.source.dataTableId);
			return await runTableAction({ handle, block, name, input, ctx });
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
