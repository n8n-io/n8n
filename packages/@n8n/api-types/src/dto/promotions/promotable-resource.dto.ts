import '../../openapi-extend';

import { z } from 'zod';

import { n8nIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';
import { promotionCommitMessageSchema, promotionSelectedIdsSchema } from './promotion-common.dto';

/**
 * A Promote always writes the project itself, so a request without workflows and folders
 * promotes only the project.
 */
export const promoteRequestSchema = z.object({
	workflowIds: promotionSelectedIdsSchema('workflowIds'),
	folderIds: promotionSelectedIdsSchema('folderIds').openapi({
		description:
			'Folders of the project to promote. Promote writes a selected folder with its current name and place, even when it is empty.',
	}),
	commitMessage: promotionCommitMessageSchema,
});

export type PromoteRequest = z.infer<typeof promoteRequestSchema>;

/** Request body for the project-scoped selective promote endpoint. */
export class PromoteSelectionRequestDto extends Z.class(promoteRequestSchema.shape, {
	strict: true,
}) {}

/** Meta.code on 400 responses when selective push includes cross-project moved workflows. */
export const PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE =
	'promotions-workflows-moved-cross-project' as const;

export const promotionsWorkflowsMovedCrossProjectMetaSchema = z.object({
	code: z.literal(PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE),
	workflowIds: z.array(n8nIdSchema).min(1),
});

export type PromotionsWorkflowsMovedCrossProjectMeta = z.infer<
	typeof promotionsWorkflowsMovedCrossProjectMetaSchema
>;

export function parsePromotionsWorkflowsMovedCrossProjectMeta(
	meta: unknown,
): PromotionsWorkflowsMovedCrossProjectMeta | undefined {
	const parsed = promotionsWorkflowsMovedCrossProjectMetaSchema.safeParse(meta);
	return parsed.success ? parsed.data : undefined;
}
