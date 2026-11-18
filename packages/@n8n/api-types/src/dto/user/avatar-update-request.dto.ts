import {
	generatedAvatarSchema,
	userAvatarBackgroundSchema,
	userAvatarSourceSchema,
} from '../../schemas/user-avatar.schema';
import { Z } from '../../zod-class';

/**
 * Changes to the signed-in user's picture that don't involve a file: switching
 * between the pictures they already have, saving a generated avatar, or picking
 * the backdrop shown behind a transparent picture.
 *
 * At least one field must be set, and `source` must name a picture the user
 * has. Both are enforced service-side: `Z.class` wraps a plain `z.object` with
 * no `superRefine` hook.
 */
export class AvatarUpdateRequestDto extends Z.class({
	source: userAvatarSourceSchema.optional(),
	background: userAvatarBackgroundSchema.optional(),
	generated: generatedAvatarSchema.optional(),
}) {}
