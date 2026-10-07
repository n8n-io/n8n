import type { InjectionKey } from 'vue';

export const CODING_OPEN_FILE: InjectionKey<(path: string) => void> = Symbol('coding-open-file');

export interface CodingDiffLine {
	index: number;
	kind: 'added' | 'removed' | 'context' | 'hunk' | 'header';
	text: string;
	oldLine?: number;
	newLine?: number;
}

export interface CodingReviewComment {
	id: string;
	path: string;
	side: 'old' | 'new';
	line: number;
	endLine: number;
	code: string;
	body: string;
	revision: string;
}

export function codingDiffLines(diff: string): CodingDiffLine[] {
	let oldLine = 0;
	let newLine = 0;
	let inHunk = false;
	return diff.split('\n').map((text, index) => {
		const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(text);
		if (hunk) {
			oldLine = Number(hunk[1]);
			newLine = Number(hunk[2]);
			inHunk = true;
			return { index, kind: 'hunk', text };
		}
		if (!inHunk || !text || text.startsWith('\\')) return { index, kind: 'header', text };
		if (text.startsWith('+'))
			return { index, kind: 'added', text: text.slice(1), newLine: newLine++ };
		if (text.startsWith('-'))
			return { index, kind: 'removed', text: text.slice(1), oldLine: oldLine++ };
		if (text.startsWith(' '))
			return {
				index,
				kind: 'context',
				text: text.slice(1),
				oldLine: oldLine++,
				newLine: newLine++,
			};
		inHunk = false;
		return { index, kind: 'header', text };
	});
}

export function formatCodingReview(comments: CodingReviewComment[], summary: string): string {
	return [
		summary.trim(),
		...comments.map((comment) => {
			const range =
				comment.line === comment.endLine
					? String(comment.line)
					: `${comment.line}-${comment.endLine}`;
			return `${comment.path}:${range} (${comment.side} version)\n${comment.body}\n\nReviewed code snapshot:\n\`\`\`\n${comment.code}\n\`\`\``;
		}),
	]
		.filter(Boolean)
		.join('\n\n');
}
