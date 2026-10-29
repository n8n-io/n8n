import { Parser, type ReadEntry } from 'tar';

import { SkillSourceReadError } from '../../errors/skill-source-read.error';

const MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024;
const MAX_ENTRIES = 50_000;
/** A larger file keeps its path, without its text. */
const MAX_TEXT_FILE_BYTES = 1024 * 1024;

/**
 * The files of a repository at one commit. Every file keeps its path, so the picker can list
 * the files that an import skips. Only the files that can become skill content keep their
 * text: SKILL.md files and markdown under a `references` folder.
 */
export type RepositoryArchive = {
	paths: string[];
	text: Map<string, string>;
};

export const ARCHIVE_TOO_LARGE =
	'The repository is too large for n8n to read. Link to the folder of the skills.';

/**
 * Reads a GitHub tarball (`codeload.github.com/<owner>/<repo>/tar.gz/<sha>`). GitHub puts every
 * file under one folder named after the repository and the commit. The paths here leave it out.
 * Links, folders and other entries that are not files are left out.
 */
export async function readRepositoryArchive(archive: Buffer): Promise<RepositoryArchive> {
	const paths: string[] = [];
	const text = new Map<string, string>();
	let entries = 0;
	let bytes = 0;

	return await new Promise((resolve, reject) => {
		let failed = false;
		const parser = new Parser({ strict: true });
		const fail = (error: Error) => {
			if (failed) return;
			failed = true;
			reject(error);
		};

		parser.on('entry', (entry: ReadEntry) => {
			entries += 1;
			bytes += entry.size;
			if (entries > MAX_ENTRIES || bytes > MAX_UNCOMPRESSED_BYTES) {
				entry.resume();
				fail(new SkillSourceReadError('archive_too_large', ARCHIVE_TOO_LARGE));
				return;
			}
			const path = withoutTopFolder(entry.path);
			if (entry.type !== 'File' || path === undefined) {
				entry.resume();
				return;
			}
			paths.push(path);
			if (!keepsText(path) || entry.size > MAX_TEXT_FILE_BYTES) {
				entry.resume();
				return;
			}
			const chunks: Buffer[] = [];
			entry.on('data', (chunk: Buffer) => chunks.push(chunk));
			entry.on('end', () => text.set(path, Buffer.concat(chunks).toString('utf8')));
		});
		parser.on('error', (error: Error) =>
			fail(
				new SkillSourceReadError('unreachable', 'GitHub sent an archive that n8n cannot read.', {
					cause: error,
				}),
			),
		);
		parser.on('end', () => {
			if (!failed) resolve({ paths, text });
		});
		parser.end(archive);
	});
}

/** `repo-<sha>/skills/a/SKILL.md` to `skills/a/SKILL.md`. Undefined for the top folder. */
function withoutTopFolder(path: string): string | undefined {
	const slash = path.indexOf('/');
	const rest = slash === -1 ? '' : path.slice(slash + 1);
	return rest === '' ? undefined : rest;
}

function keepsText(path: string): boolean {
	const segments = path.split('/');
	const name = segments.at(-1) ?? '';
	if (name === 'SKILL.md') return true;
	return segments.includes('references') && /\.(md|markdown)$/i.test(name);
}
