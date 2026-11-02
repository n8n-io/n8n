// Overlays the changes between two versions of a markdown text on a markdown editor, as a
// classic inline diff: blocks and list items that the newer version added or changed get a
// green background, and the ones it removed come back in red, where they used to be.
//
// The editor shows the newer text. The older text is parsed with the editor's own markdown
// parser and schema, so both sides compare as the same kind of block, and a removed block
// renders with the same typography as the editor. The classes are global; the page that
// uses the overlay styles them.
import type { Editor, JSONContent } from '@tiptap/core';
import { DOMSerializer, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { h, render } from 'vue';

import N8nCallout from '../N8nCallout';

const markdownDiffKey = new PluginKey('markdownDiff');

export const SKILL_DIFF_ADDED_CLASS = 'skill-diff-added';
export const SKILL_DIFF_REMOVED_CLASS = 'skill-diff-removed';
export const SKILL_DIFF_WORD_ADDED_CLASS = 'skill-diff-word-added';
export const SKILL_DIFF_WORD_REMOVED_CLASS = 'skill-diff-word-removed';

type MarkdownParser = { parse: (markdown: string) => JSONContent };

/** The `markdown` manager that @tiptap/markdown adds to the editor. */
function markdownOf(editor: Editor): MarkdownParser | undefined {
	return (editor as unknown as { markdown?: MarkdownParser }).markdown;
}

/**
 * What the diff compares: a list item, or any other top-level block. A list compares item
 * by item, so one changed rule marks one item, not the whole list, and the marks match
 * the line counts (one markdown line per item or block).
 */
type DiffUnit = {
	node: ProseMirrorNode;
	pos: number;
	/** The list that holds the item; unset for a top-level block. */
	list?: { node: ProseMirrorNode; pos: number };
};

function isList(node: ProseMirrorNode): boolean {
	return node.type.name.endsWith('List') && node.childCount > 0;
}

function diffUnits(doc: ProseMirrorNode): DiffUnit[] {
	const units: DiffUnit[] = [];
	doc.forEach((node, pos) => {
		if (isList(node)) {
			node.forEach((item, offset) => {
				units.push({ node: item, pos: pos + 1 + offset, list: { node, pos } });
			});
		} else {
			units.push({ node, pos });
		}
	});
	return units;
}

/** Two units match when the content and the kind of container (list type or none) match. */
function sameUnit(a: DiffUnit, b: DiffUnit): boolean {
	return a.list?.node.type !== b.list?.node.type ? false : a.node.eq(b.node);
}

/** Two units can be one edited line: the same block type, in the same kind of container. */
function sameKind(a: DiffUnit, b: DiffUnit): boolean {
	return a.node.type === b.node.type && a.list?.node.type === b.list?.node.type;
}

/** An empty paragraph is what an empty editor holds; it is not a change. */
function isEmptyBlock(node: ProseMirrorNode): boolean {
	return node.isTextblock && node.content.size === 0;
}

/** Where a removed unit goes, and whether it needs a list around it to render. */
function removedTarget(
	unit: DiffUnit,
	previous: DiffUnit | undefined,
	next: DiffUnit | undefined,
	docEnd: number,
): { pos: number; wrapInList: boolean } {
	const listType = unit.list?.node.type;
	if (listType) {
		// Inside a list of the same type: before the next item, else after the last one.
		if (next?.list?.node.type === listType) return { pos: next.pos, wrapInList: false };
		if (previous?.list?.node.type === listType) {
			return { pos: previous.list.pos + previous.list.node.nodeSize - 1, wrapInList: false };
		}
	}
	// A top-level position: after the list the previous item is in, else before the next unit.
	let pos = docEnd;
	if (previous?.list && previous.list.pos === next?.list?.pos) {
		pos = previous.list.pos + previous.list.node.nodeSize;
	} else if (next) {
		pos = next.list ? next.list.pos : next.pos;
	}
	return { pos, wrapInList: !!listType };
}

/** Document positions of a character range of a node's text (its textContent). */
function textPositions(
	node: ProseMirrorNode,
	nodePos: number,
	[start, end]: [number, number],
): Array<[number, number]> {
	const positions: Array<[number, number]> = [];
	let offset = 0;
	node.descendants((child, childPos) => {
		if (!child.isText || !child.text) return;
		const from = Math.max(start, offset);
		const to = Math.min(end, offset + child.text.length);
		if (from < to) {
			const textPos = nodePos + 1 + childPos;
			positions.push([textPos + from - offset, textPos + to - offset]);
		}
		offset += child.text.length;
	});
	return positions;
}

/** Wraps character ranges of a rendered block's text in highlight spans. */
function highlightText(dom: Node, ranges: Array<[number, number]>, className: string) {
	if (ranges.length === 0) return;
	const walker = document.createTreeWalker(dom, NodeFilter.SHOW_TEXT);
	const texts: Text[] = [];
	for (let node = walker.nextNode(); node; node = walker.nextNode()) texts.push(node as Text);
	let offset = 0;
	for (const text of texts) {
		const length = text.data.length;
		const textStart = offset;
		offset += length;
		// From the end, so the split points before it stay valid.
		for (const [start, end] of [...ranges].reverse()) {
			const from = Math.max(start, textStart) - textStart;
			const to = Math.min(end, textStart + length) - textStart;
			if (from >= to) continue;
			const range = document.createRange();
			range.setStart(text, from);
			range.setEnd(text, to);
			const span = document.createElement('span');
			span.className = className;
			range.surroundContents(span);
		}
	}
}

function buildDecorations(doc: ProseMirrorNode, base: ProseMirrorNode, schema: Schema) {
	const before = diffUnits(base).filter(({ node }) => !isEmptyBlock(node));
	const after = diffUnits(doc);
	const serializer = DOMSerializer.fromSchema(schema);

	const table = Array.from({ length: before.length + 1 }, () => new Uint32Array(after.length + 1));
	for (let i = before.length - 1; i >= 0; i--) {
		for (let j = after.length - 1; j >= 0; j--) {
			table[i][j] = sameUnit(before[i], after[j])
				? table[i + 1][j + 1] + 1
				: Math.max(table[i + 1][j], table[i][j + 1]);
		}
	}

	const decorations: Decoration[] = [];
	let removed: DiffUnit[] = [];
	let added: DiffUnit[] = [];
	let previous: DiffUnit | undefined;
	/** The changed words of a removed unit that pairs with an added one. */
	const removedWords = new Map<DiffUnit, Array<[number, number]>>();

	// Each removed unit renders as a widget, before the unit that now takes its place.
	// Removed items that need a list of their own share one list, so they read as one list.
	// `nextFor` says which unit each removed one goes before.
	function flushRemoved(nextFor: (unit: DiffUnit, index: number) => DiffUnit | undefined) {
		const groups: Array<{ pos: number; wrapInList: boolean; units: DiffUnit[] }> = [];
		for (const [index, unit] of removed.entries()) {
			const { pos, wrapInList } = removedTarget(
				unit,
				previous,
				nextFor(unit, index),
				doc.content.size,
			);
			const last = groups[groups.length - 1];
			if (
				last?.wrapInList &&
				wrapInList &&
				last.pos === pos &&
				last.units[0].list?.node.type === unit.list?.node.type
			) {
				last.units.push(unit);
			} else {
				groups.push({ pos, wrapInList, units: [unit] });
			}
		}

		groups.forEach(({ pos, wrapInList, units }, index) => {
			decorations.push(
				Decoration.widget(
					pos,
					() => {
						const doms = units.map((unit) => {
							const dom = serializer.serializeNode(unit.node);
							if (dom instanceof HTMLElement) {
								dom.classList.add(SKILL_DIFF_REMOVED_CLASS);
								dom.setAttribute('contenteditable', 'false');
							}
							highlightText(dom, removedWords.get(unit) ?? [], SKILL_DIFF_WORD_REMOVED_CLASS);
							return dom;
						});
						const list = units[0].list?.node;
						if (!wrapInList || !list) return doms[0];
						const wrapper = serializer.serializeNode(list.type.create(list.attrs));
						for (const dom of doms) wrapper.appendChild(dom);
						return wrapper;
					},
					{
						side: -1,
						key: `removed-${pos}-${index}-${units.map((unit) => unit.node.textContent).join('|')}`,
					},
				),
			);
		});
		removed = [];
	}

	/**
	 * One run of changes between two unchanged units: the removed units, then the added ones.
	 * The n-th removed unit and the n-th added unit of the same kind are one edited line, so
	 * their changed words are highlighted too.
	 */
	function flushChanges(next: DiffUnit | undefined) {
		const addedWords = new Map<DiffUnit, Array<[number, number]>>();
		const partners = new Map<DiffUnit, DiffUnit>();
		removed.forEach((unit, index) => {
			const partner = added[index];
			if (!partner || !sameKind(unit, partner)) return;
			partners.set(unit, partner);
			const ranges = changedWordRanges(diffWords(unit.node.textContent, partner.node.textContent));
			removedWords.set(unit, ranges.from);
			addedWords.set(partner, ranges.to);
		});

		// An edited line's old version goes right before its new one; others before the run.
		flushRemoved((unit) => partners.get(unit) ?? added[0] ?? next);
		for (const unit of added) {
			if (isEmptyBlock(unit.node)) continue;
			decorations.push(
				Decoration.node(unit.pos, unit.pos + unit.node.nodeSize, {
					class: SKILL_DIFF_ADDED_CLASS,
				}),
			);
			for (const range of addedWords.get(unit) ?? []) {
				for (const [from, to] of textPositions(unit.node, unit.pos, range)) {
					decorations.push(Decoration.inline(from, to, { class: SKILL_DIFF_WORD_ADDED_CLASS }));
				}
			}
		}
		if (added.length > 0) previous = added[added.length - 1];
		added = [];
	}

	let i = 0;
	let j = 0;
	while (i < before.length || j < after.length) {
		if (i < before.length && j < after.length && sameUnit(before[i], after[j])) {
			flushChanges(after[j]);
			previous = after[j];
			i++;
			j++;
		} else if (i < before.length && (j === after.length || table[i + 1][j] >= table[i][j + 1])) {
			// A removal after additions starts a new run, so the additions keep their place.
			if (added.length > 0) flushChanges(after[j]);
			removed.push(before[i++]);
		} else {
			added.push(after[j++]);
		}
	}
	flushChanges(undefined);

	return DecorationSet.create(doc, decorations);
}

/**
 * Adds the diff overlay to an editor. `getBase` returns the older markdown, or undefined
 * for no overlay. Call `refresh` when the older text changes.
 */
export function attachMarkdownDiff(editor: Editor, getBase: () => string | undefined) {
	let cachedMarkdown: string | undefined;
	let cachedDoc: ProseMirrorNode | null = null;

	function baseDoc(): ProseMirrorNode | null {
		const markdown = getBase();
		if (markdown === undefined) return null;
		if (markdown !== cachedMarkdown) {
			const parser = markdownOf(editor);
			// Without the parser (not set up yet), try again on the next draw; do not cache.
			if (markdown.trim() && !parser) return null;
			try {
				const json: JSONContent = markdown.trim()
					? parser!.parse(markdown)
					: { type: 'doc', content: [] };
				cachedDoc = editor.schema.nodeFromJSON(json);
				cachedMarkdown = markdown;
			} catch {
				return null;
			}
		}
		return cachedDoc;
	}

	editor.registerPlugin(
		new Plugin({
			key: markdownDiffKey,
			// When a view takes the plugin (also a view made later, when the editor mounts),
			// draw once more so the overlay shows straight away.
			view(view) {
				queueMicrotask(() => {
					if (!editor.isDestroyed && view.dom.isConnected) {
						view.dispatch(view.state.tr.setMeta(markdownDiffKey, true));
					}
				});
				return {};
			},
			props: {
				decorations(state) {
					const base = baseDoc();
					return base ? buildDecorations(state.doc, base, editor.schema) : null;
				},
			},
		}),
	);

	function refresh() {
		if (editor.isDestroyed) return;
		editor.view.dispatch(editor.state.tr.setMeta(markdownDiffKey, true));
	}

	// The editor reports ready before it is in the page and has its content, so the first
	// draw can miss the overlay. One more draw, once the page has painted, shows it without
	// waiting for a click.
	requestAnimationFrame(() => requestAnimationFrame(refresh));

	return { refresh };
}

// ---- Check findings ----

export type MarkdownFindingSeverity = 'blocked' | 'needs_review' | 'info';

/** One finding to mark: the text it is about, how severe it is, and what it says. */
export type MarkdownFinding = {
	match: string;
	severity: MarkdownFindingSeverity;
	message: string;
};

export const MARKDOWN_FINDING_MARK_CLASS = 'skill-finding-mark';
export const MARKDOWN_FINDING_NOTE_CLASS = 'skill-finding-note';

const markdownFindingsKey = new PluginKey('markdownFindings');

/** The text of a finding as the editor renders it: markdown marks gone, hidden characters back. */
function findingNeedles(match: string): string[] {
	const visible = match.replace(/⟦U\+([0-9A-F]{4,6})⟧/gi, (_, hex: string) =>
		String.fromCodePoint(parseInt(hex, 16)),
	);
	const plain = visible.replace(/[*_`~]/g, '');
	return [...new Set([visible.trim(), plain.trim()])].filter((needle) => needle.length > 0);
}

const CALLOUTS = {
	blocked: { theme: 'danger', icon: 'circle-x' },
	needs_review: { theme: 'warning', icon: 'triangle-alert' },
	info: { theme: 'info', icon: 'circle-alert' },
} as const;

/** The message of a finding, as a slim callout under the block. */
function noteOf(finding: MarkdownFinding): HTMLElement {
	const note = document.createElement('div');
	note.className = `${MARKDOWN_FINDING_NOTE_CLASS} ${MARKDOWN_FINDING_NOTE_CLASS}--${finding.severity}`;
	note.setAttribute('contenteditable', 'false');
	const { theme, icon } = CALLOUTS[finding.severity];
	render(
		h(N8nCallout, { theme, icon, iconSize: 'small', slim: true }, () => finding.message),
		note,
	);
	return note;
}

/** Unmounts the callout of a note that the editor dropped. */
function destroyNote(node: Node) {
	if (node instanceof HTMLElement) render(null, node);
}

/** Options of the findings overlay. */
export type MarkdownFindingsOptions = {
	/** True to show only the blocks with a finding. The others hide. */
	getFocus?: () => boolean;
};

export const MARKDOWN_FINDING_HIDDEN_CLASS = 'skill-finding-hidden';
function buildFindingDecorations(
	doc: ProseMirrorNode,
	findings: MarkdownFinding[],
	{ focus }: { focus: boolean },
) {
	const units = diffUnits(doc);
	const decorations: Decoration[] = [];
	const unplaced: MarkdownFinding[] = [];
	const marked = new Set<DiffUnit>();

	findings.forEach((finding, index) => {
		let place: { unit: DiffUnit; at: number; length: number } | undefined;
		for (const needle of findingNeedles(finding.match)) {
			const unit = units.find(({ node }) => node.textContent.includes(needle));
			if (unit) {
				place = { unit, at: unit.node.textContent.indexOf(needle), length: needle.length };
				break;
			}
		}
		if (!place) {
			unplaced.push(finding);
			return;
		}
		const { unit, at, length } = place;
		marked.add(unit);
		for (const [from, to] of textPositions(unit.node, unit.pos, [at, at + length])) {
			decorations.push(
				Decoration.inline(from, to, {
					class: `${MARKDOWN_FINDING_MARK_CLASS} ${MARKDOWN_FINDING_MARK_CLASS}--${finding.severity}`,
				}),
			);
		}
		// The note goes under the block: inside a list item, so the list stays whole.
		const end = unit.pos + unit.node.nodeSize;
		decorations.push(
			Decoration.widget(unit.list ? end - 1 : end, () => noteOf(finding), {
				side: 1,
				key: `finding-${index}-${finding.message}`,
				destroy: destroyNote,
			}),
		);
	});

	// Focus: each block without a finding hides.
	if (focus) {
		for (const unit of units) {
			if (marked.has(unit)) continue;
			decorations.push(
				Decoration.node(unit.pos, unit.pos + unit.node.nodeSize, {
					class: MARKDOWN_FINDING_HIDDEN_CLASS,
				}),
			);
		}
	}

	// A finding whose text is not in the editor, such as one in the raw markdown, goes on top.
	unplaced.forEach((finding, index) => {
		decorations.push(
			Decoration.widget(0, () => noteOf(finding), {
				side: -1,
				key: `finding-top-${index}-${finding.message}`,
				destroy: destroyNote,
			}),
		);
	});

	return DecorationSet.create(doc, decorations);
}

/**
 * Marks check findings on an editor: the text of each finding gets a mark, and its message
 * shows as a callout under the block that holds it. Call `refresh` when the findings change.
 */
export function attachMarkdownFindings(
	editor: Editor,
	getFindings: () => MarkdownFinding[],
	{ getFocus = () => false }: MarkdownFindingsOptions = {},
) {
	editor.registerPlugin(
		new Plugin({
			key: markdownFindingsKey,
			view(view) {
				queueMicrotask(() => {
					if (!editor.isDestroyed && view.dom.isConnected) {
						view.dispatch(view.state.tr.setMeta(markdownFindingsKey, true));
					}
				});
				return {};
			},
			props: {
				decorations(state) {
					const findings = getFindings();
					const focus = getFocus();
					return findings.length > 0 || focus
						? buildFindingDecorations(state.doc, findings, { focus })
						: null;
				},
			},
		}),
	);

	function refresh() {
		if (editor.isDestroyed) return;
		editor.view.dispatch(editor.state.tr.setMeta(markdownFindingsKey, true));
	}

	requestAnimationFrame(() => requestAnimationFrame(refresh));

	return { refresh };
}

// ---- Word diff of two lines ----

export type MarkdownWordDiffPart = { kind: 'same' | 'added' | 'removed'; text: string };

/** Words, runs of spaces and runs of punctuation, so "draft" still matches "draft.". */
const WORD_TOKENS = /[\p{L}\p{N}_'-]+|\s+|[^\p{L}\p{N}_'\s-]+/gu;

/**
 * A word-level diff of two lines. Joining the parts of one side gives back that side's
 * text. Removed words come before added ones, as in a classic diff.
 */
export function diffWords(from: string, to: string): MarkdownWordDiffPart[] {
	const a = from.match(WORD_TOKENS) ?? [];
	const b = to.match(WORD_TOKENS) ?? [];
	const same = (x: string, y: string) => x === y;

	// The LCS table, filled from the end so the walk below can go forwards.
	const table = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
	for (let i = a.length - 1; i >= 0; i--) {
		for (let j = b.length - 1; j >= 0; j--) {
			table[i][j] = same(a[i], b[j])
				? table[i + 1][j + 1] + 1
				: Math.max(table[i + 1][j], table[i][j + 1]);
		}
	}

	const parts: MarkdownWordDiffPart[] = [];
	const push = (kind: MarkdownWordDiffPart['kind'], text: string) => {
		const last = parts[parts.length - 1];
		if (last?.kind === kind) last.text += text;
		else parts.push({ kind, text });
	};
	let i = 0;
	let j = 0;
	while (i < a.length || j < b.length) {
		if (i < a.length && j < b.length && same(a[i], b[j])) {
			push('same', b[j]);
			i++;
			j++;
		} else if (i < a.length && (j === b.length || table[i + 1][j] >= table[i][j + 1])) {
			push('removed', a[i++]);
		} else {
			push('added', b[j++]);
		}
	}
	return parts;
}

/** Character ranges, [start, end), of the words that changed on each side of a word diff. */
export function changedWordRanges(parts: MarkdownWordDiffPart[]): {
	from: Array<[number, number]>;
	to: Array<[number, number]>;
} {
	const from: Array<[number, number]> = [];
	const to: Array<[number, number]> = [];
	let fromOffset = 0;
	let toOffset = 0;
	for (const part of parts) {
		// Spaces at either end of a changed run are not highlighted.
		const lead = part.text.length - part.text.trimStart().length;
		const length = part.text.trim().length;
		if (part.kind === 'removed' && length > 0) {
			from.push([fromOffset + lead, fromOffset + lead + length]);
		}
		if (part.kind === 'added' && length > 0) to.push([toOffset + lead, toOffset + lead + length]);
		if (part.kind !== 'added') fromOffset += part.text.length;
		if (part.kind !== 'removed') toOffset += part.text.length;
	}
	const fromText = parts
		.filter((part) => part.kind !== 'added')
		.map((part) => part.text)
		.join('');
	const toText = parts
		.filter((part) => part.kind !== 'removed')
		.map((part) => part.text)
		.join('');
	return { from: mergeAcrossSpaces(from, fromText), to: mergeAcrossSpaces(to, toText) };
}

/** Joins changed words that only a space separates, so a changed phrase reads as one run. */
function mergeAcrossSpaces(ranges: Array<[number, number]>, text: string): Array<[number, number]> {
	const merged: Array<[number, number]> = [];
	for (const range of ranges) {
		const last = merged[merged.length - 1];
		if (last && text.slice(last[1], range[0]).trim() === '') last[1] = range[1];
		else merged.push([...range]);
	}
	return merged;
}

/** Splits a line into plain and highlighted pieces, for one side of a word diff. */
export function splitByRanges(
	text: string,
	ranges: Array<[number, number]>,
): Array<{ text: string; changed: boolean }> {
	const pieces: Array<{ text: string; changed: boolean }> = [];
	let offset = 0;
	for (const [start, end] of ranges) {
		if (start > offset) pieces.push({ text: text.slice(offset, start), changed: false });
		pieces.push({ text: text.slice(start, end), changed: true });
		offset = end;
	}
	if (offset < text.length) pieces.push({ text: text.slice(offset), changed: false });
	return pieces;
}
