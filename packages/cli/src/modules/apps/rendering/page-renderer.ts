import type { AppBlock, AppContent, AppTheme } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import { buildMenu, pageTitle, type MenuItem } from '../serving/page-menu';
import type { PageNode } from '../serving/resolve-page-path';
import { getBlockRenderer } from './renderer-registry';
import { renderPartial, renderTemplate } from './templates';
import type { BlockRenderContext } from './types';

export type PageToRender = {
	app: { id: string; name: string; namespace: string; projectId: string; theme: AppTheme | null };
	page: { id: string; route: string; content: AppContent | null; path: string };
	/** Every page of the same tree (draft or snapshot), for the menu. */
	pages: PageNode[];
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

	const variables = declarations.length ? `<style>:root{${declarations.join('')}}</style>` : '';
	const customCss = theme.customCss
		? `<style>${theme.customCss.replaceAll('</', '<\\/')}</style>`
		: '';
	return variables + customCss;
}

async function renderBlock(block: AppBlock, ctx: BlockRenderContext): Promise<string> {
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
		const message = error instanceof Error ? error.message : String(error);
		const stack = error instanceof Error ? error.stack : undefined;
		return await renderPartial('block-error', ctx.preview ? { preview: true, message, stack } : {});
	}
}

export async function renderPage(input: PageToRender): Promise<string> {
	const ctx: BlockRenderContext = {
		app: input.app,
		page: { id: input.page.id, route: input.page.route, path: input.page.path },
		params: input.params,
		query: input.query,
		viewer: input.viewer,
		baseUrl: input.baseUrl,
		preview: input.preview,
	};

	const blocks = await Promise.all(
		(input.page.content ?? []).map(async (block) => await renderBlock(block, ctx)),
	);

	const menu: MenuItem[] = buildMenu(input.app.namespace, input.pages, input.page.id, input.params);

	return await renderTemplate('app-page', {
		title: pageTitle(input.page.route, input.params) ?? input.app.name,
		appName: input.app.name,
		menu,
		blocks,
		cssHref: `${input.baseUrl}/apps/_static/app.css`,
		jsHref: `${input.baseUrl}/apps/_static/app.js`,
		appBase: `${input.baseUrl}/apps/${input.app.namespace}`,
		themeStyle: renderThemeStyle(input.app.theme),
	});
}
