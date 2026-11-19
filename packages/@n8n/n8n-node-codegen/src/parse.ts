import type { z } from 'zod';

export function parse<T>(schema: z.ZodType<T>, value: unknown, subject: string): T {
	const result = schema.safeParse(value);
	if (result.success) return result.data;
	const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
	throw new Error(`Cannot read ${subject}:\n- ${issues.join('\n- ')}`);
}
