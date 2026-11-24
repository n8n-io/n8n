import type { AgentSkillReference } from '@n8n/api-types';

import { compareSkillFilePaths } from './skill-content-hash';
import { MARKDOWN_FILE } from './skill-md';

/**
 * The files of an update that a model sends. A model reads a binary file as a path with no
 * content, so it cannot send the file back. The stored binary files that the update does not
 * name stay, and a binary file with empty content means the stored file. `keepNonMarkdown` is
 * for a caller whose instructions say to send Markdown only: its update replaces the Markdown
 * files, and every other stored file stays. The result keeps stored path order so an unchanged
 * update compares equal to the stored skill.
 */
export function withUnsentSkillFiles(
	stored: readonly AgentSkillReference[],
	sent: readonly AgentSkillReference[],
	{ keepNonMarkdown = false }: { keepNonMarkdown?: boolean } = {},
): AgentSkillReference[] {
	const storedByPath = new Map(stored.map((file) => [file.path, file]));
	const named = new Set(sent.map((file) => file.path));
	const files = sent.map((file) => {
		const old = storedByPath.get(file.path);
		return file.isBinary && file.content === '' && old?.isBinary ? old : file;
	});
	const kept = stored.filter(
		(file) =>
			!named.has(file.path) &&
			(file.isBinary === true || (keepNonMarkdown && !MARKDOWN_FILE.test(file.path))),
	);
	return [...files, ...kept].sort((left, right) => compareSkillFilePaths(left.path, right.path));
}
