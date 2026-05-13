import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { HarnessDiff, HarnessDiffFile } from '../types';

const execFileAsync = promisify(execFile);

const GIT_TIMEOUT_MS = 60_000;

async function git(args: string[], cwd: string): Promise<string> {
	const { stdout } = await execFileAsync('git', args, {
		cwd,
		timeout: GIT_TIMEOUT_MS,
		maxBuffer: 50 * 1024 * 1024, // 50 MB for large diffs
		env: {
			...process.env,
			// Suppress git prompts and pager
			GIT_TERMINAL_PROMPT: '0',
			GIT_PAGER: '',
		},
	});
	return stdout;
}

/**
 * Clone a git repository into the workspace directory.
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

/**
 * Initialize a new git repository in the workspace.
 */
export async function gitInit(cwd: string): Promise<void> {
	await git(['init'], cwd);
	// Configure minimal git identity for commits
	await git(['config', 'user.email', 'harness@n8n.io'], cwd);
	await git(['config', 'user.name', 'n8n Harness'], cwd);
}

/**
 * Stage all files in the workspace (including normally-ignored files).
 */
export async function gitAddAll(cwd: string): Promise<void> {
	await git(['add', '-A', '--force'], cwd);
}

/**
 * Create a baseline commit for diff tracking.
 */
export async function gitCommitBaseline(cwd: string): Promise<void> {
	await git(['commit', '-m', 'baseline', '--allow-empty'], cwd);
}

/**
 * Get the unified diff of all changes since the baseline.
 */
export async function gitDiffUnified(cwd: string): Promise<string> {
	// Stage everything first so new untracked files show in the diff
	await gitAddAll(cwd);
	return await git(['diff', '--cached', 'HEAD', '--unified=3'], cwd);
}

/**
 * Get the list of changed files with their status.
 */
export async function gitDiffNameStatus(
	cwd: string,
): Promise<Array<{ status: string; path: string }>> {
	await gitAddAll(cwd);
	const output = await git(['diff', '--cached', 'HEAD', '--name-status'], cwd);
	if (!output.trim()) return [];

	return output
		.trim()
		.split('\n')
		.map((line) => {
			const [status, ...pathParts] = line.split('\t');
			return {
				status: status.trim(),
				path: pathParts.join('\t').trim(),
			};
		});
}

/**
 * Get numstat (additions/deletions per file).
 */
export async function gitDiffNumstat(
	cwd: string,
): Promise<Array<{ additions: number; deletions: number; path: string }>> {
	await gitAddAll(cwd);
	const output = await git(['diff', '--cached', 'HEAD', '--numstat'], cwd);
	if (!output.trim()) return [];

	return output
		.trim()
		.split('\n')
		.map((line) => {
			const [addStr, delStr, ...pathParts] = line.split('\t');
			return {
				additions: addStr === '-' ? 0 : parseInt(addStr, 10),
				deletions: delStr === '-' ? 0 : parseInt(delStr, 10),
				path: pathParts.join('\t').trim(),
			};
		});
}

/**
 * Map git status letter to a semantic status string.
 */
function mapGitStatus(status: string): HarnessDiffFile['status'] {
	switch (status.charAt(0)) {
		case 'A':
			return 'added';
		case 'M':
			return 'modified';
		case 'D':
			return 'deleted';
		case 'R':
			return 'renamed';
		default:
			return 'modified';
	}
}

/**
 * Compute a structured diff from the workspace.
 * Call this after the harness CLI has finished running.
 */
export async function computeDiff(cwd: string): Promise<HarnessDiff> {
	const [unified, nameStatus, numstat] = await Promise.all([
		gitDiffUnified(cwd),
		gitDiffNameStatus(cwd),
		gitDiffNumstat(cwd),
	]);

	// Build numstat lookup
	const statsByPath = new Map(numstat.map((s) => [s.path, s]));

	// Build per-file patches from unified diff
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
 * Split a unified diff string into per-file patches.
 */
function splitUnifiedDiffByFile(unified: string): Map<string, string> {
	const patches = new Map<string, string>();
	if (!unified.trim()) return patches;

	// Split on 'diff --git' markers
	const parts = unified.split(/^(?=diff --git )/m);

	for (const part of parts) {
		if (!part.trim()) continue;
		// Extract file path from 'diff --git a/path b/path'
		const match = part.match(/^diff --git a\/(.+?) b\/(.+)/);
		if (match) {
			const filePath = match[2];
			patches.set(filePath, part);
		}
	}

	return patches;
}
