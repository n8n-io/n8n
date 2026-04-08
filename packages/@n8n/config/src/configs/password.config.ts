import { z } from 'zod';

import { Config, Env } from '../decorators';

const minPasswordLengthSchema = z
	.number({ coerce: true })
	.int()
	.transform((v) => Math.min(Math.max(v, 8), 64));

@Config
export class PasswordConfig {
	/** Minimum required password length. Must be between 8 and 64. */
	@Env('N8N_PASSWORD_MIN_LENGTH', minPasswordLengthSchema)
	minLength: number = 8;
}
