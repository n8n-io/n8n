import { pageRouteSchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

export class UpdatePageDto extends Z.class({
	route: pageRouteSchema.optional(),
}) {}
