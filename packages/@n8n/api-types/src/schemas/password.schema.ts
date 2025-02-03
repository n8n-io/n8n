import { z } from 'zod';

// TODO: Delete these from `cli` after all password-validation code starts using this schema
const minLength = 8;
const maxLength = 64;

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
