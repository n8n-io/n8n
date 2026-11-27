import '../../openapi-extend';
import {
	promotionProjectAccessSchema,
	type PromotionProjectAccessSettings,
} from '@n8n/permissions';
import { z } from 'zod';

import { Z } from '../../zod-class';

const ACCESS_OPTIONS =
	'`instanceAdmins`: only instance owners and admins. `projectAdmins`: also project admins, in their projects. `projectAdminsAndEditors`: also project admins and editors, in their projects.';

// Rebuilt from the options with this package's zod, which `openapi-extend` extends. The schema
// from `@n8n/permissions` can resolve to another zod copy that has no `.openapi()`.
const accessSchema = z.enum(promotionProjectAccessSchema.options);

const whoCanPromote = accessSchema.openapi({
	description: `Who can promote a project and see its promotion reviews. ${ACCESS_OPTIONS}`,
});
const whoCanApprove = accessSchema.openapi({
	description: `Who can see and approve the promotion reviews of a project. ${ACCESS_OPTIONS}`,
});
const whoCanApply = accessSchema.openapi({
	description: `Who can apply changes into a project. ${ACCESS_OPTIONS}`,
});

export const promotionRequireApprovalSchema = z.enum(['whenConfigured', 'alwaysRequired']);
export type PromotionRequireApproval = z.infer<typeof promotionRequireApprovalSchema>;

const requireApproval = promotionRequireApprovalSchema.openapi({
	description:
		'Whether a promote needs a review. `whenConfigured`: each Promote environment uses its own review setting. `alwaysRequired`: every promote pushes a new branch. With a `gitlab` provider, it also opens a merge request. With a `git` provider, n8n cannot see the review and cannot stop direct pushes.',
});

export class PromotionSettingsPublicDto extends Z.class({
	whoCanPromote,
	whoCanApprove,
	whoCanApply,
	requireApproval,
}) {}

/** Only the settings to change, so a change never overwrites a newer value of another setting. */
export class UpdatePromotionSettingsDto extends Z.class(
	{
		whoCanPromote: whoCanPromote.optional(),
		whoCanApprove: whoCanApprove.optional(),
		whoCanApply: whoCanApply.optional(),
		requireApproval: requireApproval.optional(),
	},
	{ strict: true },
) {}

export type PromotionSettings = PromotionProjectAccessSettings & {
	requireApproval: PromotionRequireApproval;
};
