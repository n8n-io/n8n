import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SimpleGit } from 'simple-git';

import type { ChangeStatus } from '../engine/types';
import { PACKAGE_DIRS } from '../spec/projections';

/**
 * Git's well-known empty-tree object. Seeding `base` with it makes D008's
 * first-connect need no special-case code: diffing from it yields all-'A', so
 * deletion is structurally impossible on the first sync.
 */
export const EMPTY_TREE_SHA = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

export async function revParse(git: SimpleGit, ref: string): Promise<string | null> {
	try {
		return (await git.raw(['rev-parse', ref])).trim();
	} catch {
		return null;
	}
}

// NOTE: `merge-base --is-ancestor` signals via exit code 1 with EMPTY stderr,
// which simple-git's raw() does not surface as an error — so ancestry is
// decided by comparing the merge-base to the candidate ancestor instead.
export async function isAncestor(
	git: SimpleGit,
	ancestor: string,
	descendant: string,
): Promise<boolean> {
	const base = await mergeBase(git, ancestor, descendant);
	if (!base) return false;
	return base === (await revParse(git, ancestor));
}

export async function mergeBase(git: SimpleGit, a: string, b: string): Promise<string | null> {
	try {
		const out = (await git.raw(['merge-base', a, b])).trim();
		return out || null;
	} catch {
		return null;
	}
}

export async function countCommits(git: SimpleGit, from: string, to: string): Promise<number> {
	const out = await git.raw(['rev-list', '--count', `${from}..${to}`]);
	return Number(out.trim());
}

/** Raw file contents of the package dirs at a commit/tree (path -> file text). */
export async function readTreeFiles(git: SimpleGit, ref: string): Promise<Record<string, string>> {
	if (ref === EMPTY_TREE_SHA) return {};
	const out = await git.raw(['ls-tree', '-r', '--name-only', ref, '--', ...PACKAGE_DIRS]);
	const files: Record<string, string> = {};
	for (const filePath of out
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)) {
		files[filePath] = await git.raw(['show', `${ref}:${filePath}`]);
	}
	return files;
}

function parseNameStatus(out: string): Map<string, ChangeStatus> {
	const statuses = new Map<string, ChangeStatus>();
	for (const line of out.split('\n')) {
		const match = /^([AMD])\t(.+)$/.exec(line);
		if (match) statuses.set(match[2], match[1] as ChangeStatus);
	}
	return statuses;
}

/** `git diff --name-status from..to` restricted to the package dirs (D006). */
export async function diffNameStatus(
	git: SimpleGit,
	from: string,
	to: string,
): Promise<Map<string, ChangeStatus>> {
	const out = await git.raw([
		'diff',
		'--name-status',
		'--no-renames',
		from,
		to,
		'--',
		...PACKAGE_DIRS,
	]);
	return parseNameStatus(out);
}

/**
 * Replace the package dirs in the worktree with the serialized live package and
 * stage everything. After this, the index IS the live side, and `git diff
 * --cached <base>` is the live-vs-base name-status diff.
 */
export async function stageLivePackage(
	git: SimpleGit,
	dir: string,
	files: Record<string, string>,
): Promise<void> {
	for (const packageDir of PACKAGE_DIRS) {
		await rm(path.join(dir, packageDir), { recursive: true, force: true });
	}
	for (const [filePath, content] of Object.entries(files)) {
		const absolute = path.join(dir, filePath);
		await mkdir(path.dirname(absolute), { recursive: true });
		await writeFile(absolute, content, 'utf8');
	}
	await git.raw(['add', '-A']);
}

/** Name-status of the staged (live) package against a commit/tree. */
export async function diffStagedAgainst(
	git: SimpleGit,
	ref: string,
): Promise<Map<string, ChangeStatus>> {
	const out = await git.raw([
		'diff',
		'--cached',
		'--name-status',
		'--no-renames',
		ref,
		'--',
		...PACKAGE_DIRS,
	]);
	return parseNameStatus(out);
}

/**
 * The one commit-authoring primitive (R2). The index holds the exact tree n8n
 * computed; record it as a commit with the given parents and push it to the
 * target branch. The push is fast-forward-only by construction — a rejection
 * means the remote moved and the caller re-reconciles (D003, no force-push).
 */
export async function authorCommit(
	git: SimpleGit,
	opts: { message: string; parents: string[]; targetBranch: string },
): Promise<string> {
	const tree = (await git.raw(['write-tree'])).trim();
	const args = ['commit-tree', '-m', opts.message];
	for (const parent of opts.parents) args.push('-p', parent);
	args.push(tree);
	const sha = (await git.raw(args)).trim();
	await git.raw(['push', 'origin', `${sha}:refs/heads/${opts.targetBranch}`]);
	await git.raw(['reset', '--hard', sha]);
	return sha;
}

/**
 * Squash-land (D004): record an existing ref's tree as ONE new commit on top of
 * the target branch — the reconciled content lands as a single squashed commit,
 * keeping the target's history linear. Deletions ride along for free (the tree
 * is taken verbatim).
 */
export async function commitTreeOf(
	git: SimpleGit,
	opts: { treeRef: string; parents: string[]; message: string; targetBranch: string },
): Promise<string> {
	const tree = (await git.raw(['rev-parse', `${opts.treeRef}^{tree}`])).trim();
	const args = ['commit-tree', '-m', opts.message];
	for (const parent of opts.parents) args.push('-p', parent);
	args.push(tree);
	const sha = (await git.raw(args)).trim();
	await git.raw(['push', 'origin', `${sha}:refs/heads/${opts.targetBranch}`]);
	return sha;
}
