import type { ApiKeyScope } from '@n8n/permissions';
import { z } from 'zod';

export const scopesSchema = z
	.array(z.string())
	.min(1)
	.transform((scopes) => {
		return scopes as ApiKeyScope[];
	});
