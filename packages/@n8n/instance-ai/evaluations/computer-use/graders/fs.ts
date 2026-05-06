// ---------------------------------------------------------------------------
// Filesystem post-condition graders.
//
// Run after the agent run completes. They inspect the sandbox dir to confirm
// the agent's effects (e.g. a markdown file was written with expected content).
// ---------------------------------------------------------------------------

import fg from 'fast-glob';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import type { FsFileExistsGrader, FsFileMatchesGrader, GraderResult } from '../types';

const MAX_FILE_BYTES = 2 * 1024 * 1024;

export async function gradeFileExists(
	sandboxDir: string,
	grader: FsFileExistsGrader,
): Promise<GraderResult> {
	const matches = await findFiles(sandboxDir, grader.glob);
	const pass = matches.length > 0;
	return {
		grader,
		pass,
		reason: pass
			? `found ${String(matches.length)} file(s) matching "${grader.glob}": ${matches.slice(0, 3).join(', ')}`
			: `no file matching "${grader.glob}" exists under sandbox`,
	};
}

export async function gradeFileMatches(
	sandboxDir: string,
	grader: FsFileMatchesGrader,
): Promise<GraderResult> {
	const matches = await findFiles(sandboxDir, grader.glob);
	if (matches.length === 0) {
		return {
			grader,
			pass: false,
			reason: `no file matching "${grader.glob}" exists under sandbox`,
		};
	}

	const anyOf = grader.anyOf.map((p) => new RegExp(p, 'i'));
	const allOf = (grader.allOf ?? []).map((p) => new RegExp(p, 'i'));

	for (const relPath of matches) {
		const absPath = join(sandboxDir, relPath);
		let content: string;
		try {
			const stats = await stat(absPath);
			if (stats.size > MAX_FILE_BYTES) continue;
			content = await readFile(absPath, 'utf-8');
		} catch {
			continue;
		}

		const anyHit = anyOf.length === 0 || anyOf.some((re) => re.test(content));
		const allHit = allOf.every((re) => re.test(content));

		if (anyHit && allHit) {
			return {
				grader,
				pass: true,
				reason: `"${relPath}" satisfies all required patterns`,
			};
		}
	}

	return {
		grader,
		pass: false,
		reason: `no file matching "${grader.glob}" satisfied the required patterns (${String(matches.length)} candidate(s) checked)`,
	};
}

// ---------------------------------------------------------------------------
// Glob: thin wrapper around fast-glob, returning POSIX-style paths relative
// to `rootDir`. Supports `*`, `**`, `?`, character classes, and brace
// expansion — anything fast-glob handles.
// ---------------------------------------------------------------------------

export async function findFiles(rootDir: string, glob: string): Promise<string[]> {
	return await fg(glob, { cwd: rootDir, onlyFiles: true });
}
