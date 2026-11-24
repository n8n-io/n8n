import type { z } from 'zod';

interface ParseInput<T> {
	schema: z.ZodType<T>;
	value: unknown;
	subject: string;
}

export function parse<T>({ schema, value, subject }: ParseInput<T>): T {
	const result = schema.safeParse(value);
	if (result.success) return result.data;
	const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
	throw new Error(`Cannot read ${subject}:\n- ${issues.join('\n- ')}`);
}
