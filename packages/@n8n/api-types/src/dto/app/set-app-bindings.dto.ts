import { appVersionSchema } from '../../schemas/app.schema';
import { appBindingsSchema } from '../../schemas/app-binding.schema';
import { Z } from '../../zod-class';

/**
 * Saves the bindings as a new version on top of `baseVersionId`, the draft that
 * the client read. `null` means the app has no version yet.
 */
export class SetAppBindingsDto extends Z.class(
	{ baseVersionId: appVersionSchema.shape.id.nullable(), bindings: appBindingsSchema },
	{ strict: true },
) {}
