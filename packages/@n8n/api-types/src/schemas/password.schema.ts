import { z } from 'zod';

const MIN_LENGTH_FLOOR = 8;
const MAX_LENGTH = 64;

const envMinLength = parseInt(process.env.N8N_PASSWORD_MIN_LENGTH ?? '', 10);
const minLength = Number.isFinite(envMinLength)
	? Math.min(Math.max(envMinLength, MIN_LENGTH_FLOOR), MAX_LENGTH)
	: MIN_LENGTH_FLOOR;

export { minLength as passwordMinLength };

export const createPasswordSchema = (min: number) =>
	z
		.string()
		.min(min, `Password must be ${min} to ${MAX_LENGTH} characters long.`)
		.max(MAX_LENGTH, `Password must be ${min} to ${MAX_LENGTH} characters long.`)
		.refine((password) => /\d/.test(password), {
			message: 'Password must contain at least 1 number.',
		})
		.refine((password) => /[A-Z]/.test(password), {
			message: 'Password must contain at least 1 uppercase letter.',
		});

export const passwordSchema = createPasswordSchema(minLength);
