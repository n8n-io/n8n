import type { SourceControlReviewComment } from '@n8n/api-types';

import { findLineInNodeJson } from './nodeJsonLineFinder';

export interface ReviewCommentThread {
	root: SourceControlReviewComment;
	replies: SourceControlReviewComment[];
	displayLine: number | null;
}

export function commentBelongsToNode(
	comment: SourceControlReviewComment,
	nodeId: string,
	allComments: SourceControlReviewComment[],
): boolean {
	if (comment.anchor?.nodeId === nodeId) return true;
	if (!comment.inReplyToId) return false;
	const parent = allComments.find((item) => item.id === comment.inReplyToId);
	return parent ? commentBelongsToNode(parent, nodeId, allComments) : false;
}

export function getNodeComments(
	comments: SourceControlReviewComment[],
	nodeId: string,
): SourceControlReviewComment[] {
	return comments.filter((comment) => commentBelongsToNode(comment, nodeId, comments));
}

export function buildCommentThreads(
	nodeComments: SourceControlReviewComment[],
	newString: string,
	oldString: string,
): ReviewCommentThread[] {
	const roots = nodeComments.filter((comment) => !comment.inReplyToId);
	const repliesByParent = new Map<number, SourceControlReviewComment[]>();

	for (const comment of nodeComments) {
		if (!comment.inReplyToId) continue;
		const replies = repliesByParent.get(comment.inReplyToId) ?? [];
		replies.push(comment);
		repliesByParent.set(comment.inReplyToId, replies);
	}

	return roots
		.map((root) => ({
			root,
			replies: (repliesByParent.get(root.id) ?? []).sort(
				(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
			),
			displayLine: getThreadDisplayLine(root, newString, oldString),
		}))
		.sort(
			(a, b) =>
				(a.displayLine ?? Number.MAX_SAFE_INTEGER) - (b.displayLine ?? Number.MAX_SAFE_INTEGER),
		);
}

function getThreadDisplayLine(
	comment: SourceControlReviewComment,
	newString: string,
	oldString: string,
): number | null {
	if (comment.subjectType === 'file' || !comment.anchor?.jsonPath) return null;
	const content = comment.side === 'LEFT' ? oldString : newString;
	return findLineInNodeJson(content, comment.anchor.jsonPath);
}
