import Handlebars from 'handlebars';
import { UnexpectedError } from 'n8n-workflow';

import { isBlockType } from '../assert-block-type';
import { sanitizeHtml } from '../sanitize-html';
import { renderPartial } from '../templates';
import type { BlockRenderer } from '../types';

/**
 * A separate, bare Handlebars environment: no helpers, no partials, so an
 * author's template can only use the built-ins (`#each`, `#if`, …) against
 * `{ params, query, viewer }`. A compile or render error propagates so the
 * page renderer turns it into the error block instead of a 500.
 */
const env = Handlebars.create();

export const htmlBlockRenderer: BlockRenderer = {
	type: 'html',
	async render(block, ctx) {
		if (!isBlockType(block, 'html')) throw new UnexpectedError("Expected an 'html' block");
		const template = env.compile(block.data.template, { strict: false });
		const rendered = template({ params: ctx.params, query: ctx.query, viewer: ctx.viewer });
		return await renderPartial('block-html', { html: sanitizeHtml(rendered) });
	},
};
