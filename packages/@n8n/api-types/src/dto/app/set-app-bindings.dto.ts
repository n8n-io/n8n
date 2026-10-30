import { appVersionSchema } from '../../schemas/app.schema';
import { appBindingsSchema } from '../../schemas/app-binding.schema';
import { Z } from '../../zod-class';

/** Saves the bindings as a new version on top of `baseVersionId`, the draft that the client read. */
export class SetAppBindingsDto extends Z.class(
	{ baseVersionId: appVersionSchema.shape.id, bindings: appBindingsSchema },
	{ strict: true },
) {}
