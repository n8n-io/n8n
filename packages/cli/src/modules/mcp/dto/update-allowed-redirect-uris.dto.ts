import { z } from 'zod';
import { Z } from 'zod-class';

export class UpdateAllowedRedirectUrisDto extends Z.class({
	uris: z.array(z.string()),
}) {}
