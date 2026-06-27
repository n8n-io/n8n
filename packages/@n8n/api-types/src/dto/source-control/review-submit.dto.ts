import { z } from 'zod';

import { Z } from '../../zod-class';

export type SourceControlReviewSubmissionEvent = 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES';

export class CreateSourceControlSubmitReviewRequestDto extends Z.class({
	body: z.string().optional(),
	event: z.enum(['COMMENT', 'APPROVE', 'REQUEST_CHANGES']),
}) {}

export type CreateSourceControlSubmitReviewRequest = z.infer<
	typeof CreateSourceControlSubmitReviewRequestDto.schema
>;

export interface SourceControlReviewSubmission {
	id: number;
	url: string;
	state: string;
	body: string;
	author?: string;
	submittedAt: string;
}
