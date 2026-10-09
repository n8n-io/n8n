import { createHash } from 'node:crypto';

/** Unified diffs and lists of changes that the tests of the software factory template build. */

/** One file of a unified diff: its path and the lines of its one hunk (added, deleted and context). */
export interface DiffFile {
	path: string;
	lines: string[];
}

export const unifiedDiff = (files: DiffFile[]) =>
	files
		.map(({ path, lines: body }) =>
			[
				`diff --git a/${path} b/${path}`,
				'index 1111111..2222222 100644',
				`--- a/${path}`,
				`+++ b/${path}`,
				`@@ -1,${body.length} +1,${body.length} @@`,
				...body,
				'',
			].join('\n'),
		)
		.join('');

export const binaryDiff = (path: string, blob: string) =>
	`diff --git a/${path} b/${path}\nindex 1111111..${blob} 100644\nBinary files a/${path} and b/${path} differ\n`;

/**
 * A deleted file as `coding_diff` returns it: the diff, where each line of the file is a deleted
 * line, and its entry in the list of changes.
 */
export const deletedFile = (path: string, content: string[]) => ({
	diff: [
		`diff --git a/${path} b/${path}`,
		'deleted file mode 100644',
		'index 1111111..0000000',
		`--- a/${path}`,
		'+++ /dev/null',
		`@@ -1,${content.length} +0,0 @@`,
		...content.map((line) => `-${line}`),
		'',
	].join('\n'),
	change: { path, status: 'D', additions: 0, deletions: content.length },
});

/** The list of changes that `coding_diff` returns for the files: one entry for each file. */
export const changesOf = (files: DiffFile[]) =>
	files.map(({ path, lines: body }) => ({
		path,
		status: 'M',
		additions: body.filter((line) => line.startsWith('+')).length,
		deletions: body.filter((line) => line.startsWith('-')).length,
	}));

/** The SHA-256 hash in hex of a diff, as `coding_diff` returns it in `diffSha256`. */
export const sha256Of = (text: string) => createHash('sha256').update(text).digest('hex');
