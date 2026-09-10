/**
 * Apps tool — list/create apps, manage pages (typed content blocks), publish,
 * and read the `code` block API types. See the `app-builder` skill for the
 * block schema and the write → validate → render loop.
 */
import { Tool } from '@n8n/agents';
import {
	appAuthSchema,
	appContentSchema,
	appLayoutSchema,
	appNameSchema,
	appNamespaceSchema,
	appThemeSchema,
	pageRouteSchema,
	instanceAiApprovalResumeSchema,
	buildAppsSessionGrantKey,
	instanceAiConfirmationSeveritySchema,
} from '@n8n/api-types';
import type { AppContent, AppLayout } from '@n8n/api-types';
import { UnexpectedError, UserError } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiAppService, InstanceAiContext } from '../types';
import { APPS_TOOL_ID } from './tool-ids';

export { APPS_TOOL_ID };

// ── Shared schemas ─────────────────────────────────────────────────────────

const confirmationSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
});

const confirmationResumeSchema = instanceAiApprovalResumeSchema;

type ResumeData = z.infer<typeof confirmationResumeSchema>;

interface ConfirmationToolContext {
	resumeData: ResumeData | undefined;
	suspend: (payload: z.infer<typeof confirmationSuspendSchema>) => Promise<never>;
}

function hasSessionGrant(context: InstanceAiContext, action: string): boolean {
	return context.sessionApprovedToolKeys?.has(buildAppsSessionGrantKey(action)) === true;
}

async function persistSessionGrantIfRequested(
	context: InstanceAiContext,
	action: string,
	resumeData: ResumeData | undefined,
): Promise<void> {
	if (resumeData?.approved && resumeData.scope === 'session') {
		await context.grantSessionToolApproval?.(buildAppsSessionGrantKey(action));
	}
}

/**
 * Whether `error` carries structured validation issues from the adapter's DTO
 * re-validation. Duck-typed rather than an `instanceof` on a concrete class:
 * the class lives in `packages/cli` and isn't exported to this package.
 */
function hasIssues(error: unknown): error is UserError & { issues: unknown } {
	return error instanceof UserError && 'issues' in error;
}

/**
 * Whether `error` is the apps module's content-invalid error (thrown by
 * `publish` when a draft page's content fails schema validation). Matched by
 * name for the same cross-package reason as {@link hasIssues}.
 */
function isAppContentInvalid(
	error: unknown,
): error is Error & { meta: { pages: Array<{ pageId: string; issues: unknown }> } } {
	return (
		error instanceof Error && error.constructor.name === 'AppContentInvalidError' && 'meta' in error
	);
}

/** Runs a mutation, turning a business-rule or validation error into a `{ denied }` result the model can act on. */
async function callOrDeny<T>(
	fn: () => Promise<T>,
): Promise<T | { denied: true; reason: string; issues?: unknown }> {
	try {
		return await fn();
	} catch (error) {
		if (isAppContentInvalid(error)) {
			return { denied: true, reason: error.message, issues: error.meta.pages };
		}
		if (hasIssues(error)) {
			return { denied: true, reason: error.message, issues: error.issues };
		}
		if (error instanceof UserError) {
			return { denied: true, reason: error.message };
		}
		throw error;
	}
}

function resolveProjectId(context: InstanceAiContext, provided?: string): string {
	const projectId = provided ?? context.projectId;
	if (!projectId) {
		throw new UserError('This conversation has no project to work in; pass a projectId.');
	}
	return projectId;
}

/** Lazy slug for `create` when the model doesn't supply a namespace. Always produces a valid `appNamespaceSchema` value. */
function slugify(name: string): string {
	const slug = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 128);
	return slug || 'app';
}

type RawBlock = Record<string, unknown>;

/** Fills in a `nanoid` for any block missing an `id`, ahead of `appContentSchema` validation. */
function ensureBlockIds(blocks: RawBlock[]): RawBlock[] {
	return blocks.map((block) => {
		const { id } = block;
		return typeof id === 'string' && id.length > 0 ? block : { ...block, id: nanoid() };
	});
}

/** Backfills block ids, then validates against the content or layout schema. */
function validateBlocks<T>(
	schema: z.ZodType<T, z.ZodTypeDef, unknown>,
	rawBlocks: RawBlock[],
): { data: T } | { issues: z.ZodIssue[] } {
	const parsed = schema.safeParse(ensureBlockIds(rawBlocks));
	return parsed.success ? { data: parsed.data } : { issues: parsed.error.issues };
}

// ── Action schemas ─────────────────────────────────────────────────────────

const projectIdDescribe =
	"Project ID. Scopes `list`/`create` — defaults to the conversation's bound project.";

const rawBlockSchema = z.record(z.unknown());
const contentDescribe =
	"Content blocks (see the `app-builder` skill's block catalog). Block `id` is optional — missing " +
	'ids are generated automatically. Rejected with `issues` (zod issues) when the blocks are invalid.';
const routeDescribe =
	"URL segment: '' for the index page of its level, a slug ('clients'), or a dynamic segment (':id')";
const layoutDescribe =
	'Layout blocks (see the `app-builder` skill, "Layouts"): any content block plus exactly one ' +
	'`slot` block where the page content goes. Block `id` is optional. Pass null to inherit the ' +
	"nearest ancestor's layout, or the built-in shell when no ancestor has one.";

const listAction = z.object({
	action: z.literal('list').describe('List apps in a project'),
	projectId: z.string().optional().describe(projectIdDescribe),
});

const createAction = z.object({
	action: z.literal('create').describe('Create a new app'),
	projectId: z.string().optional().describe(projectIdDescribe),
	name: appNameSchema.describe('App name'),
	namespace: appNamespaceSchema
		.optional()
		.describe('URL slug under /apps/<namespace>/. Slugified from the name when omitted.'),
});

const getAction = z.object({
	action: z.literal('get').describe('Get an app and its pages'),
	appId: z.string().describe('App ID'),
});

const updateAppAction = z.object({
	action: z.literal('update-app').describe("Update an app's name, theme or access"),
	appId: z.string().describe('App ID'),
	name: appNameSchema.optional().describe('App name'),
	theme: appThemeSchema
		.nullable()
		.optional()
		.describe(
			'Colors, radius, font and custom CSS applied on top of the default stylesheet. Pass null to reset.',
		),
	auth: appAuthSchema
		.optional()
		.describe(
			'Who may open the app: "public" (anyone with the link, default) or "n8n" (signed-in users of this n8n instance only).',
		),
});

const createPageAction = z.object({
	action: z.literal('create-page').describe('Create a page in an app'),
	appId: z.string().describe('App ID'),
	route: pageRouteSchema.describe(routeDescribe),
	parentPageId: z.string().optional().describe('Parent page ID; omit for a top-level page'),
	content: z.array(rawBlockSchema).max(200).optional().describe(contentDescribe),
	layout: z.array(rawBlockSchema).max(200).optional().describe(layoutDescribe),
});

const getPageAction = z.object({
	action: z.literal('get-page').describe("Read a page's route, path, and content"),
	appId: z.string().describe('App ID'),
	pageId: z.string().describe('Page ID'),
});

const setContentAction = z.object({
	action: z.literal('set-content').describe("Replace a page's content blocks"),
	appId: z.string().describe('App ID'),
	pageId: z.string().describe('Page ID'),
	content: z.array(rawBlockSchema).max(200).describe(contentDescribe),
});

const setLayoutAction = z.object({
	action: z
		.literal('set-layout')
		.describe(
			"Replace a page's layout: the blocks rendered around the content of this page and of every page below it that has no layout of its own",
		),
	appId: z.string().describe('App ID'),
	pageId: z.string().describe('Page ID'),
	layout: z.array(rawBlockSchema).max(200).nullable().describe(layoutDescribe),
});

const updatePageAction = z.object({
	action: z.literal('update-page').describe("Change a page's route"),
	appId: z.string().describe('App ID'),
	pageId: z.string().describe('Page ID'),
	route: pageRouteSchema.describe(routeDescribe),
});

const deletePageAction = z.object({
	action: z.literal('delete-page').describe('Delete a page'),
	appId: z.string().describe('App ID'),
	pageId: z.string().describe('Page ID'),
});

const publishAction = z.object({
	action: z
		.literal('publish')
		.describe(
			"Publish the app: freeze the draft pages as a new version and serve it at the app's URL",
		),
	appId: z.string().describe('App ID'),
});

const codeApiAction = z.object({
	action: z
		.literal('code-api')
		.describe(
			"Get the TypeScript types for the `code` block's PageContext API. Call before writing a `code` block.",
		),
});

const allActions = [
	listAction,
	createAction,
	getAction,
	updateAppAction,
	createPageAction,
	getPageAction,
	setContentAction,
	setLayoutAction,
	updatePageAction,
	deletePageAction,
	publishAction,
	codeApiAction,
] as const;

type FullInput = z.infer<z.ZodDiscriminatedUnion<'action', typeof allActions>>;

// ── Handlers ───────────────────────────────────────────────────────────────

async function handleList(
	appService: InstanceAiAppService,
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'list' }>,
) {
	const projectId = resolveProjectId(context, input.projectId);
	const apps = await appService.listApps(projectId);
	return { apps };
}

async function handleCreate(
	appService: InstanceAiAppService,
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'create' }>,
	ctx: ConfirmationToolContext,
) {
	const resumeData = ctx.resumeData;

	if (context.permissions?.createApp === 'blocked') {
		return { denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval =
		context.permissions?.createApp !== 'always_allow' && !hasSessionGrant(context, 'create');
	const namespace = input.namespace ?? slugify(input.name);
	const projectId = resolveProjectId(context, input.projectId);

	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Create app "${input.name}" (namespace \`${namespace}\`)`,
			severity: 'info' as const,
		});
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { denied: true, reason: 'User denied the action' };
	}

	await persistSessionGrantIfRequested(context, 'create', resumeData);

	const result = await appService.createApp({ projectId, name: input.name, namespace });
	if ('conflict' in result) {
		return {
			denied: true,
			reason: `Namespace "${namespace}" is already in use by another app. Choose a different namespace.`,
		};
	}
	const { app } = result;
	return {
		appId: app.id,
		name: app.name,
		namespace: app.namespace,
		projectId: app.projectId,
		url: app.url,
	};
}

async function handleGet(
	appService: InstanceAiAppService,
	input: Extract<FullInput, { action: 'get' }>,
) {
	const [app, pages] = await Promise.all([
		appService.getApp(input.appId),
		appService.listPages(input.appId),
	]);
	return {
		appId: app.id,
		name: app.name,
		namespace: app.namespace,
		projectId: app.projectId,
		url: app.url,
		activeVersionId: app.activeVersionId,
		pages,
	};
}

async function handleUpdateApp(
	appService: InstanceAiAppService,
	input: Extract<FullInput, { action: 'update-app' }>,
) {
	return await callOrDeny(async () => {
		const app = await appService.updateApp(input.appId, {
			name: input.name,
			theme: input.theme,
			auth: input.auth,
		});
		return {
			appId: app.id,
			name: app.name,
			namespace: app.namespace,
			projectId: app.projectId,
			url: app.url,
		};
	});
}

async function handleCreatePage(
	appService: InstanceAiAppService,
	input: Extract<FullInput, { action: 'create-page' }>,
) {
	let content: AppContent | undefined;
	if (input.content) {
		const validated = validateBlocks(appContentSchema, input.content);
		if ('issues' in validated) {
			return { denied: true, reason: 'Invalid page content', issues: validated.issues };
		}
		content = validated.data;
	}
	let layout: AppLayout | undefined;
	if (input.layout) {
		const validated = validateBlocks(appLayoutSchema, input.layout);
		if ('issues' in validated) {
			return { denied: true, reason: 'Invalid page layout', issues: validated.issues };
		}
		layout = validated.data;
	}

	return await callOrDeny(async () => {
		const page = await appService.createPage(input.appId, {
			route: input.route,
			parentPageId: input.parentPageId,
			content,
			layout,
		});
		const app = await appService.getApp(input.appId);
		return {
			appId: input.appId,
			pageId: page.id,
			route: page.route,
			path: page.path,
			projectId: app.projectId,
			namespace: app.namespace,
		};
	});
}

async function handleGetPage(
	appService: InstanceAiAppService,
	input: Extract<FullInput, { action: 'get-page' }>,
) {
	const page = await appService.getPage(input.appId, input.pageId);
	return {
		appId: input.appId,
		pageId: page.id,
		route: page.route,
		path: page.path,
		content: page.content,
		layout: page.layout,
	};
}

async function handleSetContent(
	appService: InstanceAiAppService,
	input: Extract<FullInput, { action: 'set-content' }>,
) {
	const validated = validateBlocks(appContentSchema, input.content);
	if ('issues' in validated) {
		return { denied: true, reason: 'Invalid page content', issues: validated.issues };
	}

	return await callOrDeny(async () => {
		const page = await appService.updatePage(input.appId, input.pageId, {
			content: validated.data,
		});
		return {
			appId: input.appId,
			pageId: page.id,
			path: page.path,
			blockCount: validated.data.length,
		};
	});
}

async function handleSetLayout(
	appService: InstanceAiAppService,
	input: Extract<FullInput, { action: 'set-layout' }>,
) {
	let layout: AppLayout | null = null;
	if (input.layout) {
		const validated = validateBlocks(appLayoutSchema, input.layout);
		if ('issues' in validated) {
			return { denied: true, reason: 'Invalid page layout', issues: validated.issues };
		}
		layout = validated.data;
	}

	return await callOrDeny(async () => {
		const page = await appService.updatePage(input.appId, input.pageId, { layout });
		return {
			appId: input.appId,
			pageId: page.id,
			path: page.path,
			blockCount: layout?.length ?? null,
		};
	});
}

async function handleUpdatePage(
	appService: InstanceAiAppService,
	input: Extract<FullInput, { action: 'update-page' }>,
) {
	return await callOrDeny(async () => {
		const page = await appService.updatePage(input.appId, input.pageId, { route: input.route });
		return { appId: input.appId, pageId: page.id, route: page.route, path: page.path };
	});
}

async function handleDeletePage(
	appService: InstanceAiAppService,
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'delete-page' }>,
	ctx: ConfirmationToolContext,
) {
	const resumeData = ctx.resumeData;

	if (context.permissions?.deleteAppPage === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval =
		context.permissions?.deleteAppPage !== 'always_allow' &&
		!hasSessionGrant(context, 'delete-page');

	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		let message = `Delete page ${input.pageId} from app ${input.appId}`;
		try {
			const page = await appService.getPage(input.appId, input.pageId);
			message = `Delete page "${page.route || '(index)'}" from app ${input.appId}`;
		} catch {
			// Fall back to the plain message above — the confirmation card still
			// works without the nicer label.
		}
		return await ctx.suspend({ requestId: nanoid(), message, severity: 'destructive' as const });
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	await persistSessionGrantIfRequested(context, 'delete-page', resumeData);

	await appService.deletePage(input.appId, input.pageId);
	return { appId: input.appId, pageId: input.pageId, deleted: true as const };
}

async function handlePublish(
	appService: InstanceAiAppService,
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'publish' }>,
	ctx: ConfirmationToolContext,
) {
	const resumeData = ctx.resumeData;

	if (context.permissions?.publishApp === 'blocked') {
		return { denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval =
		context.permissions?.publishApp !== 'always_allow' && !hasSessionGrant(context, 'publish');

	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		let message = `Publish app ${input.appId}`;
		try {
			const app = await appService.getApp(input.appId);
			message = `Publish app "${app.name}"`;
		} catch {
			// Fall back to the plain message above.
		}
		return await ctx.suspend({ requestId: nanoid(), message, severity: 'warning' as const });
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { denied: true, reason: 'User denied the action' };
	}

	await persistSessionGrantIfRequested(context, 'publish', resumeData);

	return await callOrDeny(async () => {
		const { versionId, url } = await appService.publish(input.appId);
		return { appId: input.appId, versionId, url };
	});
}

function handleCodeApi(appService: InstanceAiAppService) {
	return { types: appService.codeApi() };
}

// ── Tool factory ───────────────────────────────────────────────────────────

export function createAppsTool(context: InstanceAiContext) {
	const appService = context.appService;
	if (!appService) {
		throw new UnexpectedError('createAppsTool requires context.appService');
	}

	const inputSchema = sanitizeInputSchema(z.discriminatedUnion('action', [...allActions]));

	return new Tool(APPS_TOOL_ID)
		.description(
			'Load `app-builder` via `load_skill` before calling this tool. Build and edit end-user-facing ' +
				'web Apps served at /apps/<namespace>/ — list/create apps, manage pages made of typed content ' +
				'blocks and their layouts, publish, and read the `code` block API types.',
		)
		.input(inputSchema)
		.suspend(confirmationSuspendSchema)
		.resume(confirmationResumeSchema)
		.handler(async (input: FullInput, ctx) => {
			switch (input.action) {
				case 'list':
					return await handleList(appService, context, input);
				case 'create':
					return await handleCreate(appService, context, input, ctx);
				case 'get':
					return await handleGet(appService, input);
				case 'update-app':
					return await handleUpdateApp(appService, input);
				case 'create-page':
					return await handleCreatePage(appService, input);
				case 'get-page':
					return await handleGetPage(appService, input);
				case 'set-content':
					return await handleSetContent(appService, input);
				case 'set-layout':
					return await handleSetLayout(appService, input);
				case 'update-page':
					return await handleUpdatePage(appService, input);
				case 'delete-page':
					return await handleDeletePage(appService, context, input, ctx);
				case 'publish':
					return await handlePublish(appService, context, input, ctx);
				case 'code-api':
					return handleCodeApi(appService);
			}
		})
		.build();
}
