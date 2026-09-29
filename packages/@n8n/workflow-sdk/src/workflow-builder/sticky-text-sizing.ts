/**
 * Heuristic sizing for sticky note text content.
 *
 * The SDK has no DOM at serialization time, so a sticky's rendered footprint is
 * approximated from the editor's actual sticky markdown CSS rather than guessed.
 * Calibrated against the `.sticky` rules in
 * `packages/frontend/@n8n/design-system/src/components/N8nMarkdown/Markdown.vue`
 * and the design tokens they reference:
 *
 *   - line-height (`--line-height--lg`)       = 1.35
 *   - block margin-bottom (`--spacing--2xs`)  = 8px  (headings, paragraphs)
 *   - container padding: top `--spacing--2xs` = 8px, sides `--spacing--xs` = 12px,
 *     bottom 0
 *   - 1px border on every side
 *   - heading font-size: h1 36, h2 24, h3..h6 16 (`--font-size--md`)
 *   - body font-size (`--font-size--sm`)      = 14px
 *
 * Heading height is sized PER LEVEL — an h1 (36px) reserves far more room than an
 * h3 (16px), where a single flat header height would under-size one and over-size
 * the other. Values bias slightly large: a sticky a few px too tall reads fine,
 * one that clips its content does not. The canvas renders the text area with
 * `overflow: hidden`, so anything that does not fit is silently cut off.
 */

/** `--line-height--lg`, applied to sticky headings and paragraphs. */
const LINE_HEIGHT = 1.35;
/** `--spacing--2xs`: margin below each rendered block (heading/paragraph). */
const BLOCK_MARGIN = 8;
/** `--spacing--xs`: horizontal container padding (each side). */
const SIDE_PADDING = 12;
/** `--spacing--2xs`: container padding above the text. There is none below. */
const TOP_PADDING = 8;
/** The sticky's own 1px border, on every side. */
const BORDER = 1;

/** Chrome consumed horizontally by border + padding. */
const HORIZONTAL_CHROME = (SIDE_PADDING + BORDER) * 2;
/** Chrome consumed vertically by border + top padding. */
const VERTICAL_CHROME = BORDER * 2 + TOP_PADDING;

/** Per-level glyph metrics. Average char width is about 0.55 x font-size for the
 *  bold heading face / regular body face (matches n8n's rendered proportions). */
const H1 = { font: 36, char: 20 };
const H2 = { font: 24, char: 13 };
const HN = { font: 16, char: 9 }; // h3-h6 render at --font-size--md
const BODY = { font: 14, char: 8 };

/**
 * Characters that render full-width, so they occupy roughly twice the advance of
 * a Latin glyph: CJK ideographs, kana, Hangul, and the full-width forms. Counting
 * them as one unit under-estimates the line count and the text then clips, which
 * measurement against the real renderer showed by up to 48px for Japanese.
 */
const WIDE_CHAR =
	/[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/;

/**
 * Advance width of a string in "average Latin glyphs", so a run of CJK is not
 * counted as if it were the same width as the same number of Latin letters.
 */
function advanceUnits(text: string): number {
	let units = 0;
	for (const ch of text) units += WIDE_CHAR.test(ch) ? 2 : 1;
	return units;
}

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

/**
 * Text width available inside a sticky of the given outer width.
 * Mirrors `.wrapper`: border on both sides plus `--spacing--xs` of padding.
 */
export function usableTextWidth(outerWidth: number): number {
	return Math.max(80, outerWidth - HORIZONTAL_CHROME);
}

/** Text height available inside a sticky of the given outer height. */
export function usableTextHeight(outerHeight: number): number {
	return Math.max(0, outerHeight - VERTICAL_CHROME);
}

/**
 * Mirror the renderer's `withMultiBreaks` pre-pass, which stickies use.
 *
 * A run of three or more newlines becomes one paragraph break plus an `&nbsp;`
 * line for every extra blank line, so those runs occupy real vertical space.
 * Fenced code blocks are excluded, exactly as the renderer excludes them.
 *
 * Kept in step with `withMultiBreaks` in
 * `packages/frontend/@n8n/design-system/src/components/N8nMarkdown/Markdown.vue`.
 */
export function expandMultiBreaks(content: string): string {
	const parseFence = (line: string) => {
		const match = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
		return match ? { char: match[1][0], length: match[1].length, rest: match[2] } : null;
	};
	const renderExtraBlankLines = (text: string) =>
		text.replace(/\n{3,}/g, (match) => '\n\n' + '&nbsp;\n'.repeat(match.length - 2));

	const segments: Array<{ isCode: boolean; lines: string[] }> = [];
	let openFence: { char: string; length: number } | null = null;
	for (const line of content.split('\n')) {
		const fence = parseFence(line);
		let isCode = false;
		if (openFence) {
			isCode = true;
			if (
				fence?.char === openFence.char &&
				fence.length >= openFence.length &&
				fence.rest.trim() === ''
			) {
				openFence = null;
			}
		} else if (fence) {
			openFence = { char: fence.char, length: fence.length };
			isCode = true;
		}
		const previous = segments[segments.length - 1];
		if (previous?.isCode === isCode) {
			previous.lines.push(line);
		} else {
			segments.push({ isCode, lines: [line] });
		}
	}
	return segments
		.map(({ isCode, lines }) =>
			isCode ? lines.join('\n') : renderExtraBlankLines(lines.join('\n')),
		)
		.join('\n');
}

/** Minimum vertical room reserved above wrapped nodes for the sticky's text. */
export const STICKY_MIN_TEXT_RESERVE = 64;

/** Minimum auto-width for stickies — comfortable for a short heading. */
export const STICKY_AUTO_MIN_WIDTH = 240;

/**
 * Upper bound on how wide a long heading can drive the auto-width. Above this,
 * headings wrap to two lines instead of dominating the canvas.
 */
export const STICKY_AUTO_MAX_HEADER_WIDTH = 500;

/**
 * Estimate the rendered height of a sticky's markdown content at a given OUTER
 * sticky width. Each line is treated as a block, because the renderer runs with
 * `breaks: true` and a single newline is a real line break: headings are sized by
 * level, body lines word-wrap by character count, and every block contributes its
 * bottom margin.
 */
export function estimateStickyTextHeight(content: string | undefined, outerWidth: number): number {
	if (!content) return 0;
	const usable = usableTextWidth(outerWidth);
	let totalHeight = 0;
	for (const line of expandMultiBreaks(content).split('\n')) {
		if (line.length === 0) {
			totalHeight += BLOCK_MARGIN;
			continue;
		}
		const headerMatch = /^(#{1,6})\s/.exec(line);
		if (headerMatch) {
			const { font, char } = headingMetrics(headerMatch[1].length);
			const textLen = advanceUnits(line.slice(headerMatch[1].length + 1));
			const wrapped = Math.max(1, Math.ceil((textLen * char) / usable));
			totalHeight += wrapped * lineHeightPx(font) + BLOCK_MARGIN;
		} else {
			const wrapped = Math.max(1, Math.ceil((advanceUnits(line) * BODY.char) / usable));
			totalHeight += wrapped * lineHeightPx(BODY.font) + BLOCK_MARGIN;
		}
	}
	return totalHeight;
}

/**
 * Pick an auto-width for an auto-laid-out sticky, given its content and the width
 * of the wrapped-node group it must cover. Width is the larger of the node group
 * (plus side padding) and the widest markdown heading, capped so a long heading
 * wraps instead of taking over the canvas. Body text always wraps inside whatever
 * width is chosen.
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
		headerWidth = Math.max(headerWidth, advanceUnits(headerMatch[2]) * char + HORIZONTAL_CHROME);
	}
	headerWidth = Math.min(headerWidth, STICKY_AUTO_MAX_HEADER_WIDTH);

	return Math.max(baseWidth, headerWidth);
}

/**
 * Outer height a standalone sticky needs to show all of its content at the given
 * outer width. Used for notes that carry no wrapped nodes, so the body does not
 * clip under the StickyNote node's default 160px.
 */
export function estimateStickyHeightForContent(
	content: string | undefined,
	outerWidth: number,
): number {
	return estimateStickyTextHeight(content, outerWidth) + VERTICAL_CHROME;
}
