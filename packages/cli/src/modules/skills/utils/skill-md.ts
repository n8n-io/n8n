import { agentSkillReferencePathSchema } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import { compareSkillFilePaths, type SkillContent } from './skill-content-hash';
import { SkillParseError } from '../errors/skill-parse.error';

/** One file of a skill folder. The path is relative to the folder. */
export type SkillFolderFile = { path: string; content: string };

export const SKILL_MD = 'SKILL.md';

/**
 * One skill folder to the content of one skill. The reader is lenient. It keeps every
 * frontmatter key other than name and description, so an imported skill keeps keys that
 * n8n does not know.
 * A skill holds only `references/*.md` besides SKILL.md. Every other file is left out and
 * listed in `skippedFiles`, in path order.
 */
export function readSkillFolder(
	folderName: string,
	files: SkillFolderFile[],
): { content: SkillContent; skippedFiles: string[] } {
	const normalized = files
		.map((file) => ({ path: normalizePath(file.path), content: file.content }))
		.sort((left, right) => compareSkillFilePaths(left.path, right.path));
	// Sorted, so two paths for one file are neighbors.
	const duplicate = normalized.find((file, index) => normalized[index + 1]?.path === file.path);
	if (duplicate) {
		throw new SkillParseError(`The folder has more than one file at ${duplicate.path}.`);
	}
	const skillFile = normalized.find((file) => file.path === SKILL_MD);
	if (!skillFile) throw new SkillParseError('The folder has no SKILL.md.');
	const others = normalized.filter((file) => file !== skillFile);
	const { data, instructions } = parseSkillMd(skillFile.content);
	const { name, description, ...frontmatter } = data;
	return {
		content: {
			name: nameOf(name, folderName),
			description: descriptionOf(description),
			instructions,
			frontmatter: Object.keys(frontmatter).length > 0 ? frontmatter : null,
			files: others
				.filter((file) => isReferencePath(file.path))
				.map((file) => ({ path: file.path, content: normalizeText(file.content) })),
		},
		skippedFiles: others.filter((file) => !isReferencePath(file.path)).map((file) => file.path),
	};
}

/**
 * The content of one skill back to its folder: SKILL.md, then the references. For content
 * that `readSkillFolder` returned, reading the result gives the same `skillContentHash`.
 * Other content can change, because the reader trims text and normalizes line endings
 * and paths.
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
		...content.files.map(({ path, content: text }) => ({ path, content: text })),
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
	return { data, instructions };
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

/** Forward slashes and no leading `./`, so a path from any checkout names the same file. */
function normalizePath(path: string): string {
	return path.replaceAll('\\', '/').replace(/^(\.\/)+/, '');
}

/** A markdown file under `references/`, by the rule of `agentSkillReferencePathSchema`. */
function isReferencePath(path: string): boolean {
	return agentSkillReferencePathSchema.safeParse(path).success;
}
