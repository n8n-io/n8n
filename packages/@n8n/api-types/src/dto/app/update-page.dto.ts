import { appContentSchema, appLayoutSchema } from '../../schemas/app-content.schema';
import { pageRouteSchema, pageTitleSchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

export class UpdatePageDto extends Z.class({
	route: pageRouteSchema.optional(),
	/** `null` falls back to the route-derived name. */
	title: pageTitleSchema.nullable().optional(),
	content: appContentSchema.nullable().optional(),
	/** `null` inherits the nearest ancestor's layout. */
	layout: appLayoutSchema.nullable().optional(),
}) {}
