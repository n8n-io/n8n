import { execFile } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { HarnessDiff, HarnessDiffFile } from '../types';

const execFileAsync = promisify(execFile);

const GIT_TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------
// Low-level git wrapper
// ---------------------------------------------------------------------------

async function git(args: string[], cwd: string): Promise<string> {
	const { stdout } = await execFileAsync('git', args, {
		cwd,
		timeout: GIT_TIMEOUT_MS,
		maxBuffer: 50 * 1024 * 1024, // 50 MB for large diffs
		env: {
			...process.env,
			GIT_TERMINAL_PROMPT: '0', // never prompt for credentials
			GIT_PAGER: '', // no pager
		},
	});
	return stdout;
}

// ---------------------------------------------------------------------------
// Repository setup
// ---------------------------------------------------------------------------

/**
 * Shallow-clone a repository at a specific branch.
 * Credentials can be embedded in the URL (https://user:token@host/repo).
 */
export async function gitClone(url: string, branch: string, dest: string): Promise<void> {
	const args = ['clone', '--depth', '1'];
	if (branch) {
		args.push('--branch', branch);
	}
	args.push(url, dest);

	await execFileAsync('git', args, {
		timeout: GIT_TIMEOUT_MS * 5, // cloning can take longer
		env: {
			...process.env,
			GIT_TERMINAL_PROMPT: '0',
		},
	});
}

/** Initialize a new git repository with a harness identity. */
export async function gitInit(cwd: string): Promise<void> {
	await git(['init'], cwd);
	await git(['config', 'user.email', 'harness@n8n.io'], cwd);
	await git(['config', 'user.name', 'n8n Harness'], cwd);
}

/** Stage all files in the workspace, respecting .gitignore. */
export async function gitAddAll(cwd: string): Promise<void> {
	await git(['add', '-A'], cwd);
}

/** Create a baseline commit for diff tracking. */
export async function gitCommitBaseline(cwd: string, message = 'baseline'): Promise<void> {
	await git(['commit', '-m', message, '--allow-empty'], cwd);
}

/** Remove stale .git/index.lock left by interrupted git operations. */
export async function removeGitLockFile(cwd: string): Promise<void> {
	await rm(join(cwd, '.git', 'index.lock'), { force: true });
}

// ---------------------------------------------------------------------------
// Diff computation
// ---------------------------------------------------------------------------

interface NameStatusEntry {
	status: string;
	path: string;
}

interface NumstatEntry {
	additions: number;
	deletions: number;
	path: string;
}

function parseNameStatus(output: string): NameStatusEntry[] {
	if (!output.trim()) return [];

	return output
		.trim()
		.split('\n')
		.map((line) => {
			const parts = line.split('\t');
			const status = parts[0].trim();

			// For renames (R<score>\t<old>\t<new>), treat as delete + add.
			// We use --no-renames so this shouldn't happen, but handle defensively.
			if (status.startsWith('R') && parts.length >= 3) {
				return { status: 'M', path: parts[2].trim() };
			}

			return { status, path: parts.slice(1).join('\t').trim() };
		});
}

function parseNumstat(output: string): NumstatEntry[] {
	if (!output.trim()) return [];

	return output
		.trim()
		.split('\n')
		.map((line) => {
			const [addStr, delStr, ...pathParts] = line.split('\t');
			return {
				// Binary files report '-' for additions/deletions.
				additions: addStr === '-' ? 0 : parseInt(addStr, 10),
				deletions: delStr === '-' ? 0 : parseInt(delStr, 10),
				path: pathParts.join('\t').trim(),
			};
		});
}

function mapGitStatus(status: string): HarnessDiffFile['status'] {
	switch (status.charAt(0)) {
		case 'A':
			return 'added';
		case 'D':
			return 'deleted';
		default:
			return 'modified';
	}
}

/** Split a raw unified diff into per-file patches keyed by file path. */
function splitUnifiedDiffByFile(unified: string): Map<string, string> {
	const patches = new Map<string, string>();
	if (!unified.trim()) return patches;

	const parts = unified.split(/^(?=diff --git )/m);
	for (const part of parts) {
		if (!part.trim()) continue;
		const match = part.match(/^diff --git a\/(.+?) b\/(.+)/);
		if (match) {
			patches.set(match[2], part);
		}
	}

	return patches;
}

/**
 * Compute a structured diff of all changes since the last commit.
 *
 * Stages all changes first, then runs three git diff queries in parallel
 * to build the full diff structure.
 */
export async function computeDiff(cwd: string): Promise<HarnessDiff> {
	await gitAddAll(cwd);

	const [unified, nameStatusRaw, numstatRaw] = await Promise.all([
		git(['diff', '--cached', 'HEAD', '--unified=3', '--no-renames'], cwd),
		git(['diff', '--cached', 'HEAD', '--name-status', '--no-renames'], cwd),
		git(['diff', '--cached', 'HEAD', '--numstat', '--no-renames'], cwd),
	]);

	const nameStatus = parseNameStatus(nameStatusRaw);
	const numstat = parseNumstat(numstatRaw);
	const statsByPath = new Map(numstat.map((s) => [s.path, s]));
	const patchesByPath = splitUnifiedDiffByFile(unified);

	const files: HarnessDiffFile[] = nameStatus.map((entry) => {
		const stats = statsByPath.get(entry.path);
		return {
			path: entry.path,
			status: mapGitStatus(entry.status),
			additions: stats?.additions ?? 0,
			deletions: stats?.deletions ?? 0,
			patch: patchesByPath.get(entry.path) ?? '',
		};
	});

	const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
	const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

	return {
		unified,
		stats: {
			additions: totalAdditions,
			deletions: totalDeletions,
			filesChanged: files.length,
		},
		files,
	};
}

/**
 * Get the name-status list of changed files (for reading their content).
 */
export async function gitDiffNameStatus(cwd: string): Promise<NameStatusEntry[]> {
	await gitAddAll(cwd);
	const output = await git(['diff', '--cached', 'HEAD', '--name-status', '--no-renames'], cwd);
	return parseNameStatus(output);
}
