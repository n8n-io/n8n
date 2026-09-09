import { Utils } from 'handlebars';

import type { BlockRenderContext } from './types';

const PLACEHOLDER = /\{\{\s*(params|query|viewer)\.([A-Za-z0-9_]+)\s*\}\}/g;

/**
 * Replaces `{{ params.x }}`, `{{ query.x }}` and `{{ viewer.id }}` /
 * `{{ viewer.email }}` placeholders in a typed block's text fields. An
 * unknown or missing value becomes `''`; there are no expressions or
 * functions. The caller's renderer HTML-escapes the result like any other
 * text (this function never marks anything as safe HTML).
 */
export function interpolate(text: string, ctx: BlockRenderContext): string {
	return text.replace(PLACEHOLDER, (_match, scope: string, key: string) => {
		const source: Record<string, string> | null =
			scope === 'params' ? ctx.params : scope === 'query' ? ctx.query : ctx.viewer;
		if (!source) return '';
		return Object.prototype.hasOwnProperty.call(source, key) ? source[key] : '';
	});
}

/**
 * Like `interpolate`, for text that is inserted as HTML (a text block with
 * inline formatting): every substituted value is HTML-escaped, so a URL
 * parameter can never contribute markup, while the author's own tags stay.
 */
export function interpolateHtml(text: string, ctx: BlockRenderContext): string {
	return interpolate(text, {
		...ctx,
		params: escapeValues(ctx.params),
		query: escapeValues(ctx.query),
		viewer: ctx.viewer ? escapeValues(ctx.viewer) : ctx.viewer,
	});
}

const escapeValues = <T extends Record<string, string>>(source: T): T =>
	Object.fromEntries(
		Object.entries(source).map(([key, value]) => [key, Utils.escapeExpression(value)]),
	) as T;
