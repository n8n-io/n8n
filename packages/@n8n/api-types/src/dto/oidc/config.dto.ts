import { z } from 'zod';
import { Z } from 'zod-class';

export class OidcConfigDto extends Z.class({
	clientId: z.string().min(1),
	clientSecret: z.string().min(1),
	discoveryEndpoint: z.string().url(),
	loginEnabled: z.boolean().optional().default(false),
}) {}
