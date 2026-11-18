import { appendMarkdownBlock } from './page-append';

const HEADING_LINE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

/** The heading level of a new section. */
const NEW_SECTION_HEADING = '##';

type Heading = { level: number; title: string };

function readHeading(line: string): Heading | undefined {
	const match = HEADING_LINE.exec(line);
	return match ? { level: match[1].length, title: match[2] } : undefined;
}

function hasTitle(heading: Heading | undefined, title: string): boolean {
	return heading !== undefined && heading.title.toLowerCase() === title.trim().toLowerCase();
}

/** Returns the index of the first line after `start` that opens a section of the same level or above. */
function findSectionEnd(lines: string[], start: number, level: number): number {
	const offset = lines.slice(start + 1).findIndex((line) => {
		const heading = readHeading(line);
		return heading !== undefined && heading.level <= level;
	});
	return offset === -1 ? lines.length : start + 1 + offset;
}

/**
 * Replaces the text under the first heading with this title. The heading line stays.
 * The section ends at the next heading of the same level or above, so its sub-sections go too.
 * The title matches without regard to case. A content with no such heading gets a new section at its end.
 */
export function replaceMarkdownSection(content: string, title: string, text: string): string {
	const lines = content.split('\n');
	const start = lines.findIndex((line) => hasTitle(readHeading(line), title));
	if (start === -1) {
		return appendMarkdownBlock(content, `${NEW_SECTION_HEADING} ${title.trim()}\n\n${text}`);
	}

	const end = findSectionEnd(lines, start, readHeading(lines[start])?.level ?? 1);
	const after = lines.slice(end);
	return [...lines.slice(0, start + 1), '', text, ...(after.length > 0 ? ['', ...after] : [])].join(
		'\n',
	);
}
