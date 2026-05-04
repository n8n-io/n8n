// ---------------------------------------------------------------------------
// Filesystem post-condition graders.
//
// Run after the agent run completes. They inspect the sandbox dir to confirm
// the agent's effects (e.g. a markdown file was written with expected content).
// ---------------------------------------------------------------------------

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

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
// Glob: minimal implementation supporting * (no /) and ** (any depth)
// ---------------------------------------------------------------------------

export async function findFiles(rootDir: string, glob: string): Promise<string[]> {
	const regex = globToRegex(glob);
	const out: string[] = [];
	await walk(rootDir, rootDir, (relPath) => {
		if (regex.test(relPath)) out.push(relPath);
	});
	return out;
}

function globToRegex(glob: string): RegExp {
	const normalized = glob.split('/').join(sep === '\\' ? '\\\\' : '/');
	let pattern = '';
	let i = 0;
	while (i < normalized.length) {
		const ch = normalized[i];
		if (ch === '*' && normalized[i + 1] === '*') {
			pattern += '.*';
			i += 2;
			if (normalized[i] === '/') i += 1;
		} else if (ch === '*') {
			pattern += '[^/\\\\]*';
			i += 1;
		} else if (ch === '?') {
			pattern += '[^/\\\\]';
			i += 1;
		} else if ('.+^$()|[]{}\\'.includes(ch)) {
			pattern += '\\' + ch;
			i += 1;
		} else {
			pattern += ch;
			i += 1;
		}
	}
	return new RegExp(`^${pattern}$`);
}

async function walk(
	rootDir: string,
	currentDir: string,
	visit: (relPath: string) => void,
): Promise<void> {
	let entries;
	try {
		entries = await readdir(currentDir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		const abs = join(currentDir, entry.name);
		if (entry.isDirectory()) {
			await walk(rootDir, abs, visit);
		} else if (entry.isFile()) {
			visit(relative(rootDir, abs));
		}
	}
}
