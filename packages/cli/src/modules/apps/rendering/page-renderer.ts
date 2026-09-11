import type { AppBlock, AppContent, AppTheme } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import { AppComponentsError } from '../runtime/app-code-runtime';
import { buildMenu, pageTitle } from '../serving/page-menu';
import type { ResolvedLayout } from '../serving/resolve-layout';
import type { PageNode } from '../serving/resolve-page-path';
import { getBlockRenderer } from './renderer-registry';
import { renderPartial, renderTemplate } from './templates';
import type { BlockRenderContext, RenderLogs } from './types';

export type PageToRender = {
	app: BlockRenderContext['app'];
	page: {
		id: string;
		route: string;
		title: string | null;
		content: AppContent | null;
		path: string;
	};
	/** Every page of the same tree (draft or snapshot), for the menu. */
	pages: PageNode[];
	/** Null renders the built-in shell. */
	layout: ResolvedLayout | null;
	params: Record<string, string>;
	query: Record<string, string>;
	viewer: { id: string; email: string } | null;
	baseUrl: string;
	preview: boolean;
};

/** `<`/`>` would close the shell's inline theme `<style>` tag early. */
const isSafeStyleValue = (value: string) => !/[<>]/.test(value);

const RADIUS_VAR: Record<AppTheme['radius'] & string, string> = {
	none: '0px',
	sm: 'var(--radius--sm)',
	md: 'var(--radius--md)',
	lg: 'var(--radius--lg)',
};

/**
 * The App's theme as `--app-color-*` custom properties on `:root`. `app.css`
 * (built from `rendering/styles/app.css`) reads these with a token-default
 * fallback wherever the compiled stylesheet cannot react to them at request
 * time (see that file's header comment for why).
 */
function renderThemeStyle(theme: AppTheme | null): string {
	if (!theme) return '';

	const declarations: string[] = [];
	const colors = theme.colors ?? {};
	for (const name of ['primary', 'background', 'surface', 'text', 'muted'] as const) {
		const value = colors[name];
		if (value && isSafeStyleValue(value)) declarations.push(`--app-color-${name}: ${value};`);
	}
	if (theme.radius) declarations.push(`--app-radius: ${RADIUS_VAR[theme.radius]};`);
	if (theme.fontFamily && isSafeStyleValue(theme.fontFamily)) {
		declarations.push(`--app-font-family: ${theme.fontFamily};`);
	}
	if (theme.contentWidth && isSafeStyleValue(theme.contentWidth)) {
		declarations.push(`--app-content-width: ${theme.contentWidth};`);
	}

	const variables = declarations.length ? `<style>:root{${declarations.join('')}}</style>` : '';
	const customCss = theme.customCss
		? `<style>${theme.customCss.replaceAll('</', '<\\/')}</style>`
		: '';
	return variables + customCss;
}

export type RenderErrors = Record<string, string>;
export type RenderResult = { html: string; errors: RenderErrors; logs: RenderLogs };

const describeError = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

/**
 * A block whose renderer throws renders as nothing; the error goes to `errors`
 * under its id, or under `components` when the App's shared module is at fault.
 */
async function renderBlock(
	block: AppBlock,
	ctx: BlockRenderContext,
	errors: RenderErrors,
): Promise<string> {
	const renderer = getBlockRenderer(block.type);
	if (!renderer) return await renderPartial('block-unsupported', { type: block.type });

	try {
		return await renderer.render(block, ctx);
	} catch (error) {
		Container.get(Logger).error('App block failed to render', {
			appId: ctx.app.id,
			pageId: ctx.page.id,
			blockId: block.id,
			error,
		});
		errors[error instanceof AppComponentsError ? 'components' : block.id] = describeError(error);
		return '';
	}
}

const renderBlocks = async (
	blocks: AppBlock[],
	ctx: BlockRenderContext,
	errors: RenderErrors,
): Promise<string[]> =>
	await Promise.all(blocks.map(async (block) => await renderBlock(block, ctx, errors)));

/** One entry per layout block, as the `appLayout` partial reads it. */
type LayoutBlockView = { id: string; slot: true } | { id: string; html: string };

/** Layout blocks belong to the owner page, so their action URLs point there. */
const renderLayoutBlocks = async (
	layout: ResolvedLayout,
	ctx: BlockRenderContext,
	errors: RenderErrors,
): Promise<LayoutBlockView[]> => {
	const ownerCtx: BlockRenderContext = { ...ctx, actionPageId: layout.ownerPageId };
	return await Promise.all(
		layout.blocks.map(async (block) =>
			block.type === 'slot'
				? { id: block.id, slot: true as const }
				: { id: block.id, html: await renderBlock(block, ownerCtx, errors) },
		),
	);
};

const buildContext = (input: PageToRender, logs: RenderLogs): BlockRenderContext => ({
	app: input.app,
	page: { id: input.page.id, route: input.page.route, path: input.page.path },
	actionPageId: input.page.id,
	params: input.params,
	query: input.query,
	viewer: input.viewer,
	menu: buildMenu(input.app.namespace, input.pages, input.page.id, input.params),
	baseUrl: input.baseUrl,
	preview: input.preview,
	logs,
});

export async function renderPage(input: PageToRender): Promise<RenderResult> {
	const errors: RenderErrors = {};
	const logs: RenderLogs = {};
	const ctx = buildContext(input, logs);

	const [blocks, layout] = await Promise.all([
		renderBlocks(input.page.content ?? [], ctx, errors),
		input.layout ? renderLayoutBlocks(input.layout, ctx, errors) : null,
	]);

	const html = await renderTemplate('app-page', {
		title: pageTitle(input.page, input.params) ?? input.app.name,
		appName: input.app.name,
		menu: ctx.menu,
		blocks,
		layout,
		cssHref: `${input.baseUrl}/apps/_static/app.css`,
		jsHref: `${input.baseUrl}/apps/_static/app.js`,
		appBase: `${input.baseUrl}/apps/${input.app.namespace}`,
		themeStyle: renderThemeStyle(input.app.theme),
	});
	return { html, errors, logs };
}

/** The layout alone, with an empty slot, for the editor to place its content editor into. */
export async function renderLayout(
	input: Omit<PageToRender, 'layout'> & { layout: ResolvedLayout },
): Promise<RenderResult> {
	const errors: RenderErrors = {};
	const logs: RenderLogs = {};
	const layout = await renderLayoutBlocks(input.layout, buildContext(input, logs), errors);
	return { html: await renderPartial('layout', { layout, blocks: [] }), errors, logs };
}
