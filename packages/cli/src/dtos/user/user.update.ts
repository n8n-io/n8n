import { z } from 'zod';
import { Z } from 'zod-class';

const XSS_MESSAGE = 'Potential XSS attack detected';
const XSS_REGEX = /(^http|^www)|<(\s*)?(script|a)|(\.[\p{L}\d-]+)/u;
const xssCheck = (value: string) => !XSS_REGEX.test(value);

export class UserUpdateDTO extends Z.class({
	email: z.string().email(),
	firstName: z.string().min(1).max(32).refine(xssCheck, {
		message: XSS_MESSAGE,
	}),
	lastName: z.string().min(1).max(32).refine(xssCheck, {
		message: XSS_MESSAGE,
	}),
}) {}
