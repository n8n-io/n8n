import { z } from 'zod';

import { PAGE_RESOURCE_TYPES } from '../../schemas/page.schema';
import { Z } from '../../zod-class';

export class ListReferencingPagesQueryDto extends Z.class({
	resourceType: z.enum(PAGE_RESOURCE_TYPES),
	resourceId: z.string().min(1),
}) {}
