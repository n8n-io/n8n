import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mergeTree } from './branch-replay.mjs';

const fail =
	(stdout = '') =>
	() => {
		const err = new Error('command failed');
		err.status = 1;
		err.stdout = stdout;
		throw err;
	};

// Verbatim `git merge-tree --write-tree --name-only` output (git 2.50) for a conflict on four
// root-level files, three of which are named like git's own informational messages. The path
// section runs to the blank line; the messages come after it.
const REAL_OUTPUT = `d40195cb2b4b58a22942313bcdd3e30497d48e37
Auto-merging
CONFLICT.md
normal.txt
warning.txt

Auto-merging Auto-merging
CONFLICT (content): Merge conflict in Auto-merging
Auto-merging CONFLICT.md
CONFLICT (content): Merge conflict in CONFLICT.md
Auto-merging normal.txt
CONFLICT (content): Merge conflict in normal.txt
Auto-merging warning.txt
CONFLICT (content): Merge conflict in warning.txt`;

test('mergeTree reports conflicted paths that look like git informational messages', () => {
	const git = () => fail(REAL_OUTPUT)();
	const res = mergeTree(git, 'A', 'B');

	assert.equal(res.ok, false);
	assert.equal(res.tree, 'd40195cb2b4b58a22942313bcdd3e30497d48e37');
	// Filtering these by prefix would silently drop three of the four conflicts.
	assert.deepEqual(res.conflictedPaths, [
		'Auto-merging',
		'CONFLICT.md',
		'normal.txt',
		'warning.txt',
	]);
});
