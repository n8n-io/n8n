import { agentSkillReferencePathSchema } from '@n8n/api-types';
import { posix } from 'node:path';

import { SkillParseError } from '../../errors/skill-parse.error';
import { readSkillFolder, type SkillFolderFile } from '../../utils/skill-md';

/** Keep JSON and TypeScript references as text. Scripts outside references stay unsupported. */
export function readGitHubSkillFolder(folderName: string, files: SkillFolderFile[]) {
	const conversions = new Map<string, string>();
	const paths = new Set(files.map((file) => file.path));
	for (const file of files) {
		if (!/\.(json|ts)$/.test(file.path)) continue;
		const target = `${file.path}.md`;
		if (!agentSkillReferencePathSchema.safeParse(target).success) continue;
		if (paths.has(target)) {
			throw new SkillParseError(`The reference example conflicts with ${target}.`);
		}
		conversions.set(file.path, target);
	}
	const result = readSkillFolder(
		folderName,
		files.map((file) => {
			const target = conversions.get(file.path);
			if (!target) return file;
			// A longer fence preserves source text that contains Markdown fences itself.
			let fenceLength = 3;
			for (const match of file.content.matchAll(/`+/g)) {
				fenceLength = Math.max(fenceLength, match[0].length + 1);
			}
			const fence = '`'.repeat(fenceLength);
			const language = file.path.endsWith('.json') ? 'json' : 'typescript';
			return {
				path: target,
				content: `Stored as a Markdown reference by n8n. Original file: ${file.path}\n\n${fence}${language}\n${file.content}\n${fence}\n`,
			};
		}),
	);
	if (conversions.size === 0) return result;
	const rewriteLinks = referenceLinkRewriter(conversions);
	result.content.instructions = rewriteLinks(result.content.instructions, 'SKILL.md');
	const convertedPaths = new Set(conversions.values());
	for (const file of result.content.files) {
		if (!convertedPaths.has(file.path)) {
			file.content = rewriteLinks(file.content, file.path);
		}
	}
	const originals = new Map([...conversions].map(([original, converted]) => [converted, original]));
	result.skippedFiles = result.skippedFiles.map((path) => originals.get(path) ?? path);
	result.unstorableFiles = result.unstorableFiles.map((path) => originals.get(path) ?? path);
	return result;
}

/** Change local links and inline file names. Keep URLs and fenced code unchanged. */
function referenceLinkRewriter(conversions: Map<string, string>) {
	const fileNames = new Map<string, string | null>();
	const patterns = new Set<string>();
	for (const original of conversions.keys()) {
		const name = posix.basename(original);
		fileNames.set(name, fileNames.has(name) ? null : original);
		patterns.add(`${posix.dirname(original)}/*${posix.extname(original)}`);
	}
	return (text: string, file: string) => {
		const rewrite = (value: string, inline: boolean) => {
			if (/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(value)) return value;
			const hash = value.indexOf('#');
			const path = hash === -1 ? value : value.slice(0, hash);
			const suffix = hash === -1 ? '' : value.slice(hash);
			const relative = posix.join(posix.dirname(file), path);
			if (conversions.has(relative) || (inline && conversions.has(path))) {
				return `${path}.md${suffix}`;
			}
			if (inline && (patterns.has(relative) || patterns.has(path))) {
				return `${path}.md${suffix}`;
			}
			// Some guides use a bare file name after the first full path.
			if (inline && !path.includes('/')) {
				const original = fileNames.get(path);
				if (original) return `${original}.md${suffix}`;
			}
			return value;
		};
		let fence: { character: string; length: number } | undefined;
		return text
			.split('\n')
			.map((line) => {
				const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
				if (fence) {
					if (
						marker &&
						marker[1][0] === fence.character &&
						marker[1].length >= fence.length &&
						marker[2].trim() === ''
					) {
						fence = undefined;
					}
					return line;
				}
				if (marker) {
					fence = { character: marker[1][0], length: marker[1].length };
					return line;
				}
				return line.replace(
					/`([^`\n]+)`|\]\(([^\s)]+)\)/g,
					(match, code?: string, link?: string) => {
						if (code !== undefined) return `\`${rewrite(code, true)}\``;
						return link !== undefined ? `](${rewrite(link, false)})` : match;
					},
				);
			})
			.join('\n');
	};
}
