import type { AffectedResource } from '../types';

const MAX_PREVIEW_CHARS = 16_000;

function truncate(content: string): { content: string; truncated: boolean } {
	if (content.length <= MAX_PREVIEW_CHARS) return { content, truncated: false };

	return {
		content: `${content.slice(0, MAX_PREVIEW_CHARS)}\n... truncated ...`,
		truncated: true,
	};
}
export function buildTextPreview(
	title: string,
	content: string,
): NonNullable<AffectedResource['preview']> {
	const preview = truncate(content);
	return {
		kind: 'text',
		title,
		content: preview.content,
		truncated: preview.truncated,
	};
}

export function buildDiffPreview(
	filePath: string,
	before: string,
	after: string,
): NonNullable<AffectedResource['preview']> {
	if (before === after) {
		return buildTextPreview(
			`No content changes: ${filePath}`,
			'The proposed content matches the current file.',
		);
	}

	const diff = [
		`--- ${filePath}`,
		`+++ ${filePath}`,
		...before.split('\n').map((line) => `-${line}`),
		...after.split('\n').map((line) => `+${line}`),
	].join('\n');
	const preview = truncate(diff);

	return {
		kind: 'diff',
		title: `Preview changes: ${filePath}`,
		content: preview.content,
		truncated: preview.truncated,
	};
}
