import { pageContentSchema, pageTitleSchema } from '../../schemas/page.schema';
import { Z } from '../../zod-class';

export class CreatePageDto extends Z.class({
	title: pageTitleSchema,
	content: pageContentSchema.optional(),
}) {}
