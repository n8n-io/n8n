/**
 * Heuristic sizing for sticky note text content.
 *
 * The SDK has no access to DOM/canvas measurement at serialization time, so
 * the sticky's rendered footprint is approximated from character counts.
 * Char widths are slightly inflated versus n8n's actual rendering so we
 * over-reserve rather than under-reserve — a sticky that's a few pixels too
 * tall reads fine, one that clips its content does not.
 */

const HEADER_CHAR_WIDTH = 13;
const HEADER_LINE_HEIGHT = 32;
const TEXT_CHAR_WIDTH = 8;
const TEXT_LINE_HEIGHT = 22;
const EMPTY_LINE_HEIGHT = 12;

/** Internal top/bottom padding around the rendered text inside a sticky. */
export const STICKY_TEXT_INTERNAL_PADDING = 32;

/**
 * Minimum vertical room reserved above wrapped nodes for the sticky's title
 * and body. Just enough for a single header line plus some breathing room —
 * keeping this small prevents single-node stickies stacked close together
 * from intruding into each other.
 */
export const STICKY_MIN_TEXT_RESERVE = 48;

/** Minimum auto-width for stickies — comfortable for a short heading. */
export const STICKY_AUTO_MIN_WIDTH = 240;

/**
 * Upper bound on how wide a long heading can drive the auto-width. Above
 * this, headings wrap to two lines instead of dominating the canvas.
 */
export const STICKY_AUTO_MAX_HEADER_WIDTH = 500;

/**
 * Estimate the rendered height of a sticky's markdown content at a given
 * render width. Body lines word-wrap based on character count; headers
 * (markdown `# `, `## `, etc.) are sized larger.
 */
export function estimateStickyTextHeight(
	content: string | undefined,
	availableWidth: number,
): number {
	if (!content) return 0;
	const usable = Math.max(80, availableWidth - STICKY_TEXT_INTERNAL_PADDING * 2);
	let totalHeight = 0;
	for (const line of content.split('\n')) {
		if (line.length === 0) {
			totalHeight += EMPTY_LINE_HEIGHT;
			continue;
		}
		const headerMatch = /^(#+)\s/.exec(line);
		if (headerMatch) {
			const textLen = line.length - headerMatch[1].length - 1;
			const wrapped = Math.max(1, Math.ceil((textLen * HEADER_CHAR_WIDTH) / usable));
			totalHeight += wrapped * HEADER_LINE_HEIGHT;
		} else {
			const wrapped = Math.max(1, Math.ceil((line.length * TEXT_CHAR_WIDTH) / usable));
			totalHeight += wrapped * TEXT_LINE_HEIGHT;
		}
	}
	return totalHeight;
}

/**
 * Pick an auto-width for an auto-laid-out sticky given the content and the
 * width of the wrapped-node group it should cover. Width is the larger of
 * the node group (plus side padding) and the widest markdown header line,
 * capped at a sane maximum so a long heading wraps instead of taking over.
 * Body text always wraps inside whatever width is chosen.
 */
export function estimateStickyWidth(
	content: string | undefined,
	nodeGroupWidth: number,
	sidePadding: number,
): number {
	const baseWidth = Math.max(nodeGroupWidth + sidePadding * 2, STICKY_AUTO_MIN_WIDTH);
	if (!content) return baseWidth;

	let headerWidth = 0;
	for (const line of content.split('\n')) {
		const headerMatch = /^(#+)\s(.*)/.exec(line);
		if (!headerMatch) continue;
		const headerText = headerMatch[2];
		const w = headerText.length * HEADER_CHAR_WIDTH + STICKY_TEXT_INTERNAL_PADDING * 2;
		headerWidth = Math.max(headerWidth, w);
	}
	headerWidth = Math.min(headerWidth, STICKY_AUTO_MAX_HEADER_WIDTH);

	return Math.max(baseWidth, headerWidth);
}

/**
 * Estimate the standalone height for a sticky that has known content and
 * width but no externally-tracked wrapped nodes (e.g. an intro sticky the
 * caller placed manually with `sticky('...', { position, width })`). Used
 * to fill in `parameters.height` when the caller supplied width but not
 * height — keeps the body from clipping under n8n's default 160px.
 */
export function estimateStickyHeightForContent(content: string | undefined, width: number): number {
	const textHeight = estimateStickyTextHeight(content, width);
	return textHeight + STICKY_TEXT_INTERNAL_PADDING * 2;
}
