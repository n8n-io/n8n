import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';

const samesiteSchema = z.enum(['strict', 'lax', 'none']);

type Samesite = z.infer<typeof samesiteSchema>;

@Config
class CookieConfig {
	/** Whether to set the `Secure` flag on the n8n authentication cookie (recommended for HTTPS). */
	@Env('N8N_SECURE_COOKIE')
	secure: boolean = true;

	/** Value for the `SameSite` attribute on the n8n authentication cookie (`strict`, `lax`, or `none`). */
	@Env('N8N_SAMESITE_COOKIE', samesiteSchema)
	samesite: Samesite = 'lax';
}

@Config
export class AuthConfig {
	@Nested
	cookie: CookieConfig;
}
