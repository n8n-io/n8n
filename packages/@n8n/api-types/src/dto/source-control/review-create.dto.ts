import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateSourceControlReviewRequestDto extends Z.class({
	workflowIds: z.array(z.string()).min(1),
	title: z.string().optional(),
	body: z.string().optional(),
}) {}

export type CreateSourceControlReviewRequest = z.infer<
	typeof CreateSourceControlReviewRequestDto.schema
>;
