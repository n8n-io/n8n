// ---------------------------------------------------------------------------
// Filesystem post-condition graders.
//
// Run after the agent run completes. They inspect the sandbox dir to confirm
// the agent's effects (e.g. a markdown file was written with expected content).
// ---------------------------------------------------------------------------

import fg from 'fast-glob';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { isContained } from '../path-utils';
import type {
	FsFileExistsGrader,
	FsFileMatchesGrader,
	FsFileNotExistsGrader,
	GraderResult,
} from '../types';

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

export async function gradeFileNotExists(
	sandboxDir: string,
	grader: FsFileNotExistsGrader,
): Promise<GraderResult> {
	const matches = await findFiles(sandboxDir, grader.glob);
	const pass = matches.length === 0;
	return {
		grader,
		pass,
		reason: pass
			? `no file matches "${grader.glob}" (as expected)`
			: `expected no match for "${grader.glob}" but found ${String(matches.length)}: ${matches.slice(0, 3).join(', ')}`,
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
		const absPath = await resolveInsideSandbox(sandboxDir, relPath);
		if (!absPath) continue;
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
//
// Containment: matches whose realpath resolves outside `rootDir` (via `..`,
// absolute glob patterns, or symlinks the agent created) are dropped. The
// harness ships sandboxed-FS as a hard contract; graders inherit it.
// ---------------------------------------------------------------------------

export async function findFiles(rootDir: string, glob: string): Promise<string[]> {
	const matches = await fg(glob, {
		cwd: rootDir,
		onlyFiles: true,
		followSymbolicLinks: false,
	});
	const filtered: string[] = [];
	for (const rel of matches) {
		const abs = await resolveInsideSandbox(rootDir, rel);
		if (abs) filtered.push(rel);
	}
	return filtered;
}

/**
 * Returns the canonical absolute path of `relPath` if and only if it stays
 * inside `rootDir`'s realpath. Returns `null` for paths that escape via
 * `..`, absolute components, or symlinks pointing out of the sandbox.
 */
async function resolveInsideSandbox(rootDir: string, relPath: string): Promise<string | null> {
	let rootReal: string;
	let absReal: string;
	try {
		rootReal = await realpath(rootDir);
		absReal = await realpath(resolve(rootDir, relPath));
	} catch {
		return null;
	}
	return isContained(rootReal, absReal) ? absReal : null;
}
