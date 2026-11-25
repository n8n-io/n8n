import { agentSkillReferencePathSchema } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { isUtf8 } from 'node:buffer';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import { compareSkillFilePaths, type SkillContent } from './skill-content-hash';
import { isTextFile } from './skipped-files';
import { SkillParseError } from '../errors/skill-parse.error';

/** One file of a skill folder. The path is relative to the folder. */
export type SkillFolderFile = { path: string; content: string | Buffer };

export const SKILL_MD = 'SKILL.md';

export const MARKDOWN_FILE = /\.(?:md|markdown)$/i;

/**
 * One skill folder to the content of one skill. The reader is lenient. It keeps every
 * frontmatter key other than name and description, so an imported skill keeps keys that
 * n8n does not know.
 * Keeps other files at their original relative paths. Files with invalid paths are left out.
 * A Markdown file loses its byte order mark and gets LF line endings, as before n8n kept
 * other files, so a skill that n8n synced earlier shows no update. Every other text file
 * keeps its bytes, because a script can depend on them. A file that is not UTF-8 text is
 * stored as Base64, unless its name says that it is text.
 */
export function readSkillFolder(
	folderName: string,
	files: SkillFolderFile[],
): { content: SkillContent; skippedFiles: string[] } {
	const sorted = [...files].sort((left, right) => compareSkillFilePaths(left.path, right.path));
	// Sorted, so two paths for one file are neighbors.
	const duplicate = sorted.find((file, index) => sorted[index + 1]?.path === file.path);
	if (duplicate) {
		throw new SkillParseError(`The folder has more than one file at ${duplicate.path}.`);
	}
	const skillFile = sorted.find((file) => file.path === SKILL_MD);
	if (!skillFile) throw new SkillParseError('The folder has no SKILL.md.');
	const { data, instructions } = parseSkillMd(skillFile.content.toString());
	const kept: SkillContent['files'] = [];
	const skippedFiles: string[] = [];
	for (const { path, content } of sorted) {
		if (path === SKILL_MD) continue;
		if (!agentSkillReferencePathSchema.safeParse(path).success) {
			skippedFiles.push(path);
			continue;
		}
		const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
		// A file with a text name stays text when some bytes are not UTF-8. The decoder writes
		// U+FFFD for each of them, as before n8n kept other files, so an agent can still read
		// the file. Postgres cannot store NUL in text, so a file with NUL is binary.
		if (bytes.includes(0) || (!isUtf8(bytes) && !isTextFile(path))) {
			kept.push({ path, content: bytes.toString('base64'), isBinary: true });
			continue;
		}
		const text = bytes.toString('utf8');
		kept.push({ path, content: MARKDOWN_FILE.test(path) ? normalizeText(text) : text });
	}
	const { name, description, ...frontmatter } = data;
	return {
		content: {
			name: nameOf(name, folderName),
			description: descriptionOf(description),
			instructions,
			frontmatter: Object.keys(frontmatter).length > 0 ? frontmatter : null,
			files: kept,
		},
		skippedFiles,
	};
}

/**
 * The content of one skill back to its folder: SKILL.md, then the references. For content
 * that `readSkillFolder` returned, reading the result gives the same `skillContentHash`.
 * Other content can change, because the reader trims SKILL.md and normalizes Markdown files.
 */
export function writeSkillFolder(content: SkillContent): SkillFolderFile[] {
	// The real name and description win over the same keys in the frontmatter.
	const { name: _name, description: _description, ...otherKeys } = content.frontmatter ?? {};
	const frontmatter = stringifyYaml(
		{ name: content.name, description: content.description, ...otherKeys },
		// No line folding, so a long description stays on one line.
		{ lineWidth: 0 },
	);
	return [
		{ path: SKILL_MD, content: `---\n${frontmatter}---\n\n${content.instructions}\n` },
		...content.files.map(({ path, content: text, isBinary }) => ({
			path,
			content: isBinary ? Buffer.from(text, 'base64') : text,
		})),
	];
}

/** The frontmatter keys of a SKILL.md and its trimmed body. */
function parseSkillMd(text: string): { data: Record<string, unknown>; instructions: string } {
	// A delimiter line can end in spaces, as some editors leave them.
	const match = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n([\s\S]*))?$/.exec(normalizeText(text));
	if (!match) {
		throw new SkillParseError('SKILL.md must start with frontmatter between two --- lines.');
	}
	let data: unknown;
	try {
		data = parseYaml(match[1]);
	} catch {
		throw new SkillParseError('The SKILL.md frontmatter is not valid YAML.');
	}
	if (!isRecord(data)) throw new SkillParseError('The SKILL.md frontmatter must be a map of keys.');
	// A YAML alias can make a map hold itself, which no hash or JSON column can store.
	try {
		JSON.stringify(data);
	} catch {
		throw new SkillParseError('The SKILL.md frontmatter cannot refer to itself.');
	}
	const instructions = (match[2] ?? '').trim();
	if (!instructions) {
		throw new SkillParseError('SKILL.md needs instructions after the frontmatter.');
	}
	// Postgres stores no NUL in a text or JSON column, so the skill cannot come in.
	if (instructions.includes('\0') || hasNul(data)) {
		throw new SkillParseError('SKILL.md has a NUL character, which n8n cannot store.');
	}
	return { data, instructions };
}

/** Whether a frontmatter value holds a NUL character in a string or a key, at any level. */
function hasNul(value: unknown): boolean {
	if (typeof value === 'string') return value.includes('\0');
	if (Array.isArray(value)) return value.some(hasNul);
	if (isRecord(value)) {
		return Object.entries(value).some(([key, entry]) => key.includes('\0') || hasNul(entry));
	}
	return false;
}

/** The frontmatter name, or else the folder name, as the Agent Skills format does. */
function nameOf(value: unknown, folderName: string): string {
	const name = typeof value === 'string' ? value.trim() : '';
	return name || folderName;
}

function descriptionOf(value: unknown): string {
	const description = typeof value === 'string' ? value.trim() : '';
	if (!description) throw new SkillParseError('The SKILL.md frontmatter needs a description.');
	return description;
}

/**
 * LF line endings and no byte order mark. A checkout on Windows or an editor setting must
 * not change `skillContentHash`, or every check would report an update.
 */
function normalizeText(text: string): string {
	return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}
