import { Z } from '../../zod-class';
import { appVersionSchema } from '../../schemas/app.schema';

export class PublishAppDto extends Z.class(
	{ versionId: appVersionSchema.shape.id },
	{ strict: true },
) {}
