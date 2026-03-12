import { z } from 'zod';

const MIN_LENGTH_FLOOR = 8;
const maxLength = 64;

const envMinLength = parseInt(process.env.N8N_PASSWORD_MIN_LENGTH ?? '', 10);
const minLength =
	Number.isFinite(envMinLength) && envMinLength >= MIN_LENGTH_FLOOR && envMinLength <= maxLength
		? envMinLength
		: MIN_LENGTH_FLOOR;

export { minLength as passwordMinLength };

export const passwordSchema = z
	.string()
	.min(minLength, `Password must be ${minLength} to ${maxLength} characters long.`)
	.max(maxLength, `Password must be ${minLength} to ${maxLength} characters long.`)
	.refine((password) => /\d/.test(password), {
		message: 'Password must contain at least 1 number.',
	})
	.refine((password) => /[A-Z]/.test(password), {
		message: 'Password must contain at least 1 uppercase letter.',
	});
