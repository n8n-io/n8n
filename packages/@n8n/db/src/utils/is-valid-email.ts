import { z } from 'zod';

export function isValidEmail(email: string): boolean {
	return z.string().email().safeParse(email).success;
}
