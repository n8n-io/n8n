/**
 * A Markdown subset as Google Docs batchUpdate requests: headings, bullet and numbered lists,
 * paragraphs, and inline bold, italic, code, and links. Docs counts indexes in UTF-16 code
 * units, as JavaScript string lengths do.
 */

type Kind = 'heading' | 'bullet' | 'numbered' | 'paragraph';

interface Span {
	readonly start: number;
	readonly end: number;
	readonly style: { readonly bold?: true; readonly italic?: true; readonly link?: string };
}

interface Block {
	readonly kind: Kind;
	readonly level: number;
	readonly text: string;
	readonly spans: readonly Span[];
}

// Bold, then link, then italic with * or _, then code.
const INLINE =
	/\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|\*(?!\s)(.+?)\*|(?<!\w)_(?!\s)(.+?)_(?!\w)|`([^`]+)`/g;

const isWebLink = (url: string) => /^(https?:\/\/|mailto:)/i.test(url);

/** The text without inline markers, and the style of each marked span. */
function inline(source: string): Pick<Block, 'text' | 'spans'> {
	const parts = [...source.matchAll(INLINE)];
	const pieces = parts.reduce<{ text: string; spans: Span[]; at: number }>(
		(acc, match) => {
			const [whole, bold, label, url, starred, underscored, code] = match;
			const before = source.slice(acc.at, match.index);
			const content = bold ?? label ?? starred ?? underscored ?? code ?? whole;
			const start = acc.text.length + before.length;
			const end = start + content.length;
			const style: Span['style'] | undefined =
				bold !== undefined
					? { bold: true }
					: label !== undefined
						? url && isWebLink(url)
							? { link: url }
							: undefined
						: starred !== undefined || underscored !== undefined
							? { italic: true }
							: undefined;
			return {
				text: `${acc.text}${before}${content}`,
				spans: style ? [...acc.spans, { start, end, style }] : acc.spans,
				at: match.index + whole.length,
			};
		},
		{ text: '', spans: [], at: 0 },
	);
	return { text: `${pieces.text}${source.slice(pieces.at)}`, spans: pieces.spans };
}

function blockOf(line: string): Block {
	const heading = /^(#{1,6})\s+(.*)$/.exec(line);
	if (heading)
		return { kind: 'heading', level: heading[1]?.length ?? 1, ...inline(heading[2] ?? '') };
	const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
	if (bullet) return { kind: 'bullet', level: 0, ...inline(bullet[1] ?? '') };
	const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
	if (numbered) return { kind: 'numbered', level: 0, ...inline(numbered[1] ?? '') };
	return { kind: 'paragraph', level: 0, ...inline(line.trim()) };
}

/** Blank lines separate blocks; they do not become empty paragraphs. */
export const blocksOf = (markdown: string): Block[] =>
	markdown
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.filter((line) => line.trim() !== '' && !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line))
		.map(blockOf);

const PRESET: Readonly<Record<'bullet' | 'numbered', string>> = {
	bullet: 'BULLET_DISC_CIRCLE_SQUARE',
	numbered: 'NUMBERED_DECIMAL_ALPHA_ROMAN',
};

type Range = { readonly startIndex: number; readonly endIndex: number };

/**
 * The requests that write `markdown` at `index`, in an empty paragraph before the last newline
 * of the body. The text goes in with one insert, then the styles follow. Bullets come last:
 * without tabs they move no index.
 */
export function markdownRequests(markdown: string, index: number): object[] {
	const blocks = blocksOf(markdown);
	if (blocks.length === 0) return [];
	const placed = blocks.map((block, position) => {
		const startIndex =
			index + blocks.slice(0, position).reduce((sum, { text }) => sum + text.length + 1, 0);
		return { block, range: { startIndex, endIndex: startIndex + block.text.length + 1 } };
	});
	// The new text ends at the last newline of the document, so it adds no empty paragraph.
	const text = blocks.map((block) => block.text).join('\n');
	const headings = placed
		.filter(({ block }) => block.kind === 'heading')
		.map(({ block, range }) => ({
			updateParagraphStyle: {
				range,
				paragraphStyle: { namedStyleType: `HEADING_${block.level}` },
				fields: 'namedStyleType',
			},
		}));
	const spans = placed.flatMap(({ block, range }) =>
		block.spans.map(({ start, end, style }) => ({
			updateTextStyle: {
				range: { startIndex: range.startIndex + start, endIndex: range.startIndex + end },
				textStyle: style.link ? { link: { url: style.link } } : style,
				fields: Object.keys(style).join(','),
			},
		})),
	);
	// Consecutive list items of one kind form one list.
	const lists = placed.reduce<Array<{ kind: 'bullet' | 'numbered'; range: Range }>>(
		(all, { block, range }, position) => {
			if (block.kind !== 'bullet' && block.kind !== 'numbered') return all;
			const last = all.at(-1);
			const joins = last?.kind === block.kind && placed[position - 1]?.block.kind === block.kind;
			return joins && last
				? [
						...all.slice(0, -1),
						{ kind: last.kind, range: { ...last.range, endIndex: range.endIndex } },
					]
				: [...all, { kind: block.kind, range }];
		},
		[],
	);
	return [
		{ insertText: { location: { index }, text } },
		...headings,
		...spans,
		...lists.map(({ kind, range }) => ({
			createParagraphBullets: { range, bulletPreset: PRESET[kind] },
		})),
	];
}
