import type { SkillScanLocation } from '@n8n/api-types';

import type { SkillContent } from './skill-content-hash';

/**
 * Characters that a reviewer cannot see but a model reads: zero-width and format characters,
 * bidirectional controls, Unicode tags, and C0 and C1 controls other than tab and line breaks.
 * Binary data read as text has controls too. The zero-width joiner and the variation
 * selectors U+FE00 to U+FE0F stay allowed, because emoji use them.
 */
const HIDDEN_RANGES: Array<[number, number]> = [
	[0x0000, 0x0008],
	[0x000b, 0x000c],
	[0x000e, 0x001f],
	[0x007f, 0x009f],
	[0x00ad, 0x00ad], // soft hyphen
	[0x034f, 0x034f], // combining grapheme joiner
	[0x061c, 0x061c], // Arabic letter mark
	[0x115f, 0x1160], // Hangul fillers
	[0x17b4, 0x17b5],
	[0x180e, 0x180e],
	[0x200b, 0x200c], // zero-width space and non-joiner
	[0x200e, 0x200f], // left-to-right and right-to-left marks
	[0x202a, 0x202e], // bidirectional embeddings and overrides
	[0x2060, 0x2064],
	[0x2066, 0x206f], // bidirectional isolates and deprecated format characters
	[0x3164, 0x3164],
	[0xfeff, 0xfeff],
	[0xffa0, 0xffa0],
	[0xfff9, 0xfffb],
	[0x1bca0, 0x1bca3], // shorthand format controls
	[0x1d173, 0x1d17a], // musical symbol format controls
	[0xe0000, 0xe007f], // Unicode tags
	[0xe0100, 0xe01ef], // variation selectors supplement
];

const HIDDEN_CLASS = `[${HIDDEN_RANGES.map(
	([first, last]) => `\\u{${first.toString(16)}}-\\u{${last.toString(16)}}`,
).join('')}]`;

/** Every hidden character of a text. */
export const HIDDEN_PATTERN = new RegExp(HIDDEN_CLASS, 'gu');

/** One hidden character, to test one character. */
const HIDDEN_CHARACTER = new RegExp(HIDDEN_CLASS, 'u');

export function codePointOf(character: string): string {
	return `U+${(character.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`;
}

/** The marker that the review shows for a hidden character, such as `⟦U+200B⟧`. */
function markerOf(character: string): string {
	return `⟦${codePointOf(character)}⟧`;
}

/** Shows each hidden character of a text as a marker. Line breaks and tabs stay. */
export function showHidden(text: string): string {
	return text.replace(HIDDEN_PATTERN, markerOf);
}

/**
 * SKILL.md as the review shows it, before `showHidden`: `---`, the name, the description, one
 * line for each frontmatter key with its value as JSON, `---`, an empty line, then the
 * instructions. The offsets say where each part starts in the text, so a rule that found
 * something in a part can place it in the file.
 */
export function skillMdText(content: SkillContent): {
	text: string;
	name: number;
	description: number;
	instructions: number;
	/** Where each top-level frontmatter key starts. */
	keys: Map<string, number>;
} {
	let text = '---\nname: ';
	const name = text.length;
	text += `${content.name}\ndescription: `;
	const description = text.length;
	text += `${content.description}\n`;
	const keys = new Map<string, number>();
	for (const [key, value] of Object.entries(content.frontmatter ?? {})) {
		keys.set(key, text.length);
		text += `${key}: ${JSON.stringify(value)}\n`;
	}
	text += '---\n\n';
	const instructions = text.length;
	text += content.instructions;
	return { text, name, description, instructions, keys };
}

/**
 * The place of `text.slice(start, end)`, as the review shows `text` after `showHidden`. A range
 * over several lines is cut at the end of its first line.
 */
export function locate(text: string, start: number, end: number): SkillScanLocation {
	const lineStart = text.lastIndexOf('\n', start - 1) + 1;
	const nextBreak = text.indexOf('\n', start);
	const lineEnd = nextBreak < 0 ? text.length : nextBreak;
	let line = 1;
	for (let at = text.indexOf('\n'); at >= 0 && at < lineStart; at = text.indexOf('\n', at + 1)) {
		line += 1;
	}
	// Each hidden character before the mark, or in it, grows into a marker.
	let shown = 0;
	let markStart = -1;
	let markEnd = -1;
	for (let at = lineStart; at < lineEnd; ) {
		if (at >= start && markStart < 0) markStart = shown;
		if (at >= end && markEnd < 0) markEnd = shown;
		const character = String.fromCodePoint(text.codePointAt(at) ?? 0);
		shown += HIDDEN_CHARACTER.test(character) ? markerOf(character).length : character.length;
		at += character.length;
	}
	return {
		line,
		start: markStart < 0 ? shown : markStart,
		end: markEnd < 0 ? shown : markEnd,
	};
}
