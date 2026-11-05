import { appVersionSchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

/**
 * Restores a version as a new version on top of `baseVersionId`, the draft that
 * the client read.
 */
export class RestoreAppVersionDto extends Z.class(
	{ baseVersionId: appVersionSchema.shape.id.nullable() },
	{ strict: true },
) {}
