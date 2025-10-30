import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';

const samesiteSchema = z.enum(['strict', 'lax', 'none']);

type Samesite = z.infer<typeof samesiteSchema>;

@Config
class CookieConfig {
	/** This sets the `Secure` flag on n8n auth cookie */
	@Env('N8N_SECURE_COOKIE')
	secure: boolean = true;

	/** This sets the `Samesite` flag on n8n auth cookie */
	@Env('N8N_SAMESITE_COOKIE', samesiteSchema)
	samesite: Samesite = 'lax';
}

@Config
export class AuthConfig {
	@Nested
	cookie: CookieConfig;
}
