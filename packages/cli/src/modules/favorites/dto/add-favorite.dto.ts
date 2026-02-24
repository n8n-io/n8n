import { Z } from '@n8n/api-types';
import { z } from 'zod';

export class AddFavoriteDto extends Z.class({
	resourceId: z.string(),
	resourceType: z.string(),
}) {}
