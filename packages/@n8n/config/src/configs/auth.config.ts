import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';

const samesiteSchema = z.enum(['strict', 'lax', 'none']);
const cookieNameSchema = z.string().regex(/^[a-zA-Z0-9!#$%&'*+.^_`|~-]+$/, {
	message:
		'Invalid cookie name. It should contain only ASCII characters, no spaces, and must not start or end with a special character.',
});

type Samesite = z.infer<typeof samesiteSchema>;

@Config
class CookieConfig {
	@Env('N8N_AUTH_COOKIE_NAME', cookieNameSchema)
	name: string = 'n8n-auth';

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
