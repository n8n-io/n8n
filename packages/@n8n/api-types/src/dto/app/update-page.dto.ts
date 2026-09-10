import { appContentSchema, appLayoutSchema } from '../../schemas/app-content.schema';
import { pageRouteSchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

export class UpdatePageDto extends Z.class({
	route: pageRouteSchema.optional(),
	content: appContentSchema.nullable().optional(),
	/** `null` inherits the nearest ancestor's layout. */
	layout: appLayoutSchema.nullable().optional(),
}) {}
