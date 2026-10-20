import {
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
	AGENT_SKILL_REFERENCES_TOTAL_MAX_LENGTH,
	agentSkillSchema,
	type SkillGitCheckResult,
	type SkillGitSkippedFile,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { parse as parseYaml } from 'yaml';
import type { ZodIssue } from 'zod';

import type { SkillFrontmatter } from '../../entities/skill-version.entity';
import type { SkillContent } from '../skill-content-hash';
import type { GitHubClient, GitHubTreeEntry } from './github-client';
import { checkSkillContent } from '../skill-security-check';

const SKILL_FILE = 'SKILL.md';
/** More folders than this in one link is not a skill collection the import modal can show. */
export const MAX_SKILL_FOLDERS = 50;
const MAX_SKIPPED_LISTED = 30;
/** A SKILL.md larger than this cannot fit the instructions limit, so n8n does not read it. */
const MAX_SKILL_FILE_BYTES = AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH * 2;

/** The folders under `root` that hold a SKILL.md, `root` itself included, sorted. */
export function findSkillFolders(entries: GitHubTreeEntry[], root: string): string[] {
	const prefix = root ? `${root}/` : '';
	const folders: string[] = [];
	for (const entry of entries) {
		if (entry.type !== 'blob' || !entry.path.startsWith(prefix)) continue;
		if (entry.path === SKILL_FILE || entry.path.endsWith(`/${SKILL_FILE}`)) {
			folders.push(entry.path.slice(0, -SKILL_FILE.length).replace(/\/$/, ''));
		}
	}
	return folders.sort();
}

/** The Git tree SHA of a folder. It changes only when something inside it changes. */
export function folderTreeSha(
	entries: GitHubTreeEntry[],
	rootTreeSha: string,
	folder: string,
): string | undefined {
	if (!folder) return rootTreeSha;
	return entries.find((entry) => entry.type === 'tree' && entry.path === folder)?.sha;
}

type ParsedSkillFile =
	| {
			ok: true;
			name: string;
			description: string;
			instructions: string;
			frontmatter: SkillFrontmatter | null;
	  }
	| { ok: false; message: string };

/**
 * Reads SKILL.md: YAML frontmatter with `name` and `description`, then the instructions.
 * Other frontmatter keys are kept as given, as for a skill made in n8n.
 */
export function parseSkillFile(text: string): ParsedSkillFile {
	const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
	if (lines[0]?.trim() !== '---') {
		return { ok: false, message: 'SKILL.md must start with YAML frontmatter (---).' };
	}
	const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
	if (end === -1) return { ok: false, message: 'The SKILL.md frontmatter has no closing ---.' };
	let data: unknown;
	try {
		data = parseYaml(lines.slice(1, end).join('\n'));
	} catch {
		return { ok: false, message: 'The SKILL.md frontmatter is not valid YAML.' };
	}
	if (!isRecord(data)) return { ok: false, message: 'The SKILL.md frontmatter is not a YAML map.' };
	const { name, description, ...rest } = data;
	if (typeof name !== 'string' || !name.trim()) {
		return { ok: false, message: 'The SKILL.md frontmatter has no name.' };
	}
	if (typeof description !== 'string' || !description.trim()) {
		return { ok: false, message: 'The SKILL.md frontmatter has no description.' };
	}
	return {
		ok: true,
		name: name.trim(),
		description: description.trim(),
		instructions: lines
			.slice(end + 1)
			.join('\n')
			.trim(),
		frontmatter: Object.keys(rest).length > 0 ? rest : null,
	};
}

/** What n8n read from one skill folder, and the check result for exactly that content. */
export type ReadSkillFolder = {
	path: string;
	/** The frontmatter name, or the folder name when SKILL.md cannot be read. */
	name: string;
	description: string;
	/** Undefined when the check blocked the skill before n8n could build its content. */
	content?: SkillContent;
	check: SkillGitCheckResult;
	skippedFiles: SkillGitSkippedFile[];
};

const FIELD_LABELS: Record<string, string> = {
	name: 'The name',
	description: 'The description',
	instructions: 'The instructions',
	references: 'The reference files',
};

/** One line a user can act on, from the first schema issue. */
function describeIssue(issue: ZodIssue | undefined): string {
	if (!issue) return 'The skill is not valid.';
	const label = FIELD_LABELS[String(issue.path[0])] ?? 'The skill';
	if (issue.code === 'too_big' && issue.type === 'string') {
		return `${label} is longer than ${Number(issue.maximum)} characters, the limit in n8n.`;
	}
	if (issue.code === 'too_small' && issue.type === 'string') return `${label} is empty.`;
	return `${label} is not valid: ${issue.message}`;
}

function isMarkdown(path: string) {
	return path.endsWith('.md') || path.endsWith('.markdown');
}

function blocked(
	path: string,
	name: string,
	code: 'invalid_skill' | 'too_large',
	message: string,
	skippedFiles: SkillGitSkippedFile[] = [],
): ReadSkillFolder {
	return {
		path,
		name,
		description: '',
		check: { result: 'blocked', findings: [{ level: 'blocked', code, message }] },
		skippedFiles,
	};
}

/**
 * Reads one skill folder at one commit: SKILL.md and the Markdown files under
 * `references/`. Every other file is listed as skipped. Nested skill folders belong to
 * their own skill. The content is checked before it is returned.
 */
export async function readSkillFolder(
	client: GitHubClient,
	source: { owner: string; repo: string; commitSha: string },
	entries: GitHubTreeEntry[],
	folder: string,
	allSkillFolders: string[],
): Promise<ReadSkillFolder> {
	const prefix = folder ? `${folder}/` : '';
	const fallbackName = folder.split('/').at(-1) || source.repo;
	const nested = allSkillFolders.filter(
		(other) => other !== folder && (folder === '' || other.startsWith(prefix)),
	);
	const inNested = (path: string) => nested.some((other) => path.startsWith(`${other}/`));

	let skillFile: GitHubTreeEntry | undefined;
	const references: GitHubTreeEntry[] = [];
	const skipped: SkillGitSkippedFile[] = [];
	for (const entry of entries) {
		if (entry.type !== 'blob' || !entry.path.startsWith(prefix) || inNested(entry.path)) continue;
		const relative = entry.path.slice(prefix.length);
		if (relative === SKILL_FILE) skillFile = entry;
		else if (relative.startsWith('references/') && isMarkdown(relative)) references.push(entry);
		else
			skipped.push({
				path: relative,
				reason: relative.startsWith('references/')
					? 'n8n imports Markdown files under references/ only'
					: 'n8n imports SKILL.md and the Markdown files under references/ only',
			});
	}
	const skippedFiles = skipped.slice(0, MAX_SKIPPED_LISTED);
	if (skipped.length > MAX_SKIPPED_LISTED) {
		skippedFiles.push({
			path: `${skipped.length - MAX_SKIPPED_LISTED} more files`,
			reason: 'Not imported',
		});
	}

	if (!skillFile) return blocked(folder, fallbackName, 'invalid_skill', 'SKILL.md is missing.');
	if ((skillFile.size ?? 0) > MAX_SKILL_FILE_BYTES) {
		return blocked(folder, fallbackName, 'too_large', 'SKILL.md is too large.', skippedFiles);
	}
	if (references.length > AGENT_SKILL_REFERENCE_MAX_COUNT) {
		return blocked(
			folder,
			fallbackName,
			'too_large',
			`The skill has ${references.length} reference files. The limit is ${AGENT_SKILL_REFERENCE_MAX_COUNT}.`,
			skippedFiles,
		);
	}
	const totalReferenceBytes = references.reduce((sum, entry) => sum + (entry.size ?? 0), 0);
	if (
		references.some((entry) => (entry.size ?? 0) > AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH * 2) ||
		totalReferenceBytes > AGENT_SKILL_REFERENCES_TOTAL_MAX_LENGTH * 2
	) {
		return blocked(
			folder,
			fallbackName,
			'too_large',
			'The reference files are too large.',
			skippedFiles,
		);
	}

	const { owner, repo, commitSha } = source;
	const skillText = await client.file(owner, repo, commitSha, skillFile.path);
	const referenceTexts = await Promise.all(
		references.map(async (entry) => ({
			path: entry.path.slice(prefix.length),
			content: await client.file(owner, repo, commitSha, entry.path),
		})),
	);

	const parsed = parseSkillFile(skillText);
	if (!parsed.ok)
		return blocked(folder, fallbackName, 'invalid_skill', parsed.message, skippedFiles);

	const files = referenceTexts
		.filter((file) => file.content.trim().length > 0)
		.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
	const content: SkillContent = {
		name: parsed.name,
		description: parsed.description,
		instructions: parsed.instructions,
		frontmatter: parsed.frontmatter,
		files,
	};

	// The same limits a skill made in n8n has.
	const valid = agentSkillSchema.omit({ allowedTools: true }).safeParse({
		name: content.name,
		description: content.description,
		instructions: content.instructions,
		...(files.length ? { references: files } : {}),
	});
	if (!valid.success) {
		const [issue] = valid.error.issues;
		return {
			...blocked(folder, parsed.name, 'invalid_skill', describeIssue(issue), skippedFiles),
			description: parsed.description,
		};
	}

	return {
		path: folder,
		name: parsed.name,
		description: parsed.description,
		content,
		check: checkSkillContent(
			[{ path: SKILL_FILE, content: skillText }, ...referenceTexts],
			skippedFiles,
		),
		skippedFiles,
	};
}
