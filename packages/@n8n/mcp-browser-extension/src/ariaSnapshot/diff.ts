/**
 * Snapshot diff engine — computes minimal diffs between two snapshot trees.
 *
 * Returns either 'no-change', a unified 'diff', or 'full' content depending
 * on how much changed relative to the threshold.
 */

import { structuredPatch } from 'diff';

import { renderSnapshot } from './print';
import type { DiffResult, TreeNode } from './types';

export function computeSnapshotDiff(
	previous: TreeNode[],
	next: TreeNode[],
	threshold = 0.5,
): DiffResult {
	const nextText = renderSnapshot(next);

	if (previous.length === 0) {
		return { diffType: 'full', content: nextText };
	}

	const prevText = renderSnapshot(previous);

	if (prevText === nextText) {
		return { diffType: 'no-change', content: '' };
	}

	const patch = structuredPatch('snapshot', 'snapshot', prevText, nextText, 'previous', 'current', {
		context: 3,
	});

	let addedLines = 0;
	let removedLines = 0;
	for (const hunk of patch.hunks) {
		for (const line of hunk.lines) {
			if (line.startsWith('+')) addedLines++;
			else if (line.startsWith('-')) removedLines++;
		}
	}

	const oldLineCount = prevText.split('\n').length;
	const newLineCount = nextText.split('\n').length;
	const maxLines = Math.max(oldLineCount, newLineCount, 1);
	const changeRatio = Math.min(Math.max(addedLines, removedLines) / maxLines, 1);

	const diffLines: string[] = ['--- snapshot (previous)', '+++ snapshot (current)'];
	for (const hunk of patch.hunks) {
		diffLines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);
		diffLines.push(...hunk.lines);
	}
	const diffString = diffLines.join('\n');

	if (changeRatio >= threshold || diffString.length >= nextText.length) {
		return { diffType: 'full', content: nextText };
	}

	return { diffType: 'diff', content: diffString };
}
