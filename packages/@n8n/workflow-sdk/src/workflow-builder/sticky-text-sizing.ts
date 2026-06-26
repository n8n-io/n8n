/**
 * Heuristic sizing for sticky note text content.
 *
 * The SDK has no DOM/canvas access at serialization time, so a sticky's
 * rendered footprint is approximated from the editor's actual sticky markdown
 * CSS rather than guessed. Calibrated against
 * `packages/frontend/@n8n/design-system/src/components/N8nMarkdown/Markdown.vue`
 * (the `.sticky` rules) and the design tokens it references:
 *
 *   - line-height (`--line-height--lg`)        = 1.35
 *   - block margin-bottom (`--spacing--2xs`)   = 8px   (headings, paragraphs)
 *   - container padding: top `--spacing--2xs`  = 8px, sides `--spacing--xs` = 12px
 *   - heading font-size:  h1 36, h2 24, h3..h6 16 (`--font-size--md`)
 *   - body font-size (`--font-size--sm`)        = 14px
 *
 * Heading height is sized PER LEVEL — an h1 (36px) reserves far more room than
 * an h3 (16px), where a single flat header height would under-size one and
 * over-size the other. Values bias slightly large: a sticky a few px too tall
 * reads fine, one that clips its content does not.
 */

/** `--line-height--lg`, applied to sticky headings and paragraphs. */
const LINE_HEIGHT = 1.35;
/** `--spacing--2xs`: margin below each rendered block (heading/paragraph). */
const BLOCK_MARGIN = 8;
/** `--spacing--xs`: horizontal container padding (each side). */
const SIDE_PADDING = 12;

/** Per-level glyph metrics. Average char width ≈ 0.55 × font-size for the
 *  bold heading face / regular body face (matches n8n's rendered proportions). */
const H1 = { font: 36, char: 20 };
const H2 = { font: 24, char: 13 };
const HN = { font: 16, char: 9 }; // h3–h6 render at --font-size--md
const BODY = { font: 14, char: 8 };

/** Rendered height of one line at a given font-size. */
function lineHeightPx(fontPx: number): number {
	return Math.ceil(fontPx * LINE_HEIGHT);
}

/** Glyph metrics for a markdown heading of the given `#` count. */
function headingMetrics(hashCount: number): { font: number; char: number } {
	if (hashCount <= 1) return H1;
	if (hashCount === 2) return H2;
	return HN;
}

/** Internal top/bottom padding around the rendered text inside a sticky. Also
 *  doubles as the clearance reserved between a sticky's text and its wrapped
 *  nodes, so multi-line content sits clear of the node row. */
export const STICKY_TEXT_INTERNAL_PADDING = 40;

/**
 * Minimum vertical room reserved above wrapped nodes for the sticky's title
 * and body, used when the content estimate is small — keeps single-node
 * stickies stacked close together from intruding into each other.
 */
export const STICKY_MIN_TEXT_RESERVE = 64;

/** Minimum auto-width for stickies — comfortable for a short heading. */
export const STICKY_AUTO_MIN_WIDTH = 240;

/**
 * Upper bound on how wide a long heading can drive the auto-width. Above
 * this, headings wrap to two lines instead of dominating the canvas.
 */
export const STICKY_AUTO_MAX_HEADER_WIDTH = 500;

/**
 * Estimate the rendered height of a sticky's markdown content at a given
 * render width. Each `\n`-separated line is treated as a block: headers
 * (`#`–`######`) are sized by level, body lines word-wrap by character count,
 * and every block contributes its bottom margin.
 */
export function estimateStickyTextHeight(
	content: string | undefined,
	availableWidth: number,
): number {
	if (!content) return 0;
	const usable = Math.max(80, availableWidth - SIDE_PADDING * 2);
	let totalHeight = 0;
	for (const line of content.split('\n')) {
		if (line.length === 0) {
			totalHeight += BLOCK_MARGIN;
			continue;
		}
		const headerMatch = /^(#{1,6})\s/.exec(line);
		if (headerMatch) {
			const { font, char } = headingMetrics(headerMatch[1].length);
			const textLen = line.length - headerMatch[1].length - 1;
			const wrapped = Math.max(1, Math.ceil((textLen * char) / usable));
			totalHeight += wrapped * lineHeightPx(font) + BLOCK_MARGIN;
		} else {
			const wrapped = Math.max(1, Math.ceil((line.length * BODY.char) / usable));
			totalHeight += wrapped * lineHeightPx(BODY.font) + BLOCK_MARGIN;
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
		const headerMatch = /^(#{1,6})\s(.*)/.exec(line);
		if (!headerMatch) continue;
		const { char } = headingMetrics(headerMatch[1].length);
		const w = headerMatch[2].length * char + SIDE_PADDING * 2;
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
