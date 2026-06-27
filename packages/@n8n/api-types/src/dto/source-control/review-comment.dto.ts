import { z } from 'zod';

import { Z } from '../../zod-class';

/** Which side of the PR diff a review comment targets. */
export type ReviewCommentSide = 'LEFT' | 'RIGHT';

/** Whether the comment targets a specific line or the entire file. */
export type ReviewCommentSubjectType = 'line' | 'file';

/** Anchor for mapping a canvas / parameter selection to a workflow JSON line. */
export interface ReviewCommentAnchor {
	nodeId: string;
	/** Dot path within the node, e.g. `parameters.errorMessage`. */
	jsonPath?: string;
}

export class CreateSourceControlReviewCommentRequestDto extends Z.class({
	body: z.string().trim().min(1),
	path: z.string().trim().min(1).optional(),
	anchor: z
		.object({
			nodeId: z.string().trim().min(1),
			jsonPath: z.string().trim().optional(),
		})
		.optional(),
	inReplyToId: z.number().int().positive().optional(),
	/** Defaults to RIGHT (PR head). */
	side: z.enum(['LEFT', 'RIGHT']).optional(),
}) {}

export type CreateSourceControlReviewCommentRequest = z.infer<
	typeof CreateSourceControlReviewCommentRequestDto.schema
>;

export interface SourceControlReviewComment {
	id: number;
	body: string;
	path: string;
	line?: number;
	side: ReviewCommentSide;
	subjectType?: ReviewCommentSubjectType;
	url: string;
	author?: string;
	createdAt: string;
	updatedAt: string;
	anchor?: ReviewCommentAnchor;
	inReplyToId?: number;
}
