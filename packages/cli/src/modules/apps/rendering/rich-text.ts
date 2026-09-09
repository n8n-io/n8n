import { interpolateHtml } from './interpolate';
import { sanitizeInlineHtml } from './sanitize-html';
import type { BlockRenderContext } from './types';

/**
 * The text of a `paragraph`, `header` or `list` block carries the inline
 * formatting the editor produced (`<b>`, `<i>`, `<a>`, `<br>`), so it is
 * rendered as HTML: placeholders are substituted with escaped values, then
 * everything but inline formatting is stripped.
 */
export const renderRichText = (text: string, ctx: BlockRenderContext): string =>
	sanitizeInlineHtml(interpolateHtml(text, ctx));
