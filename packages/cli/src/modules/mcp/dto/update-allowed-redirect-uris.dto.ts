import { Z } from '@n8n/api-types';
import { z } from 'zod';

export class UpdateAllowedRedirectUrisDto extends Z.class({
	uris: z.array(z.string()),
}) {}
