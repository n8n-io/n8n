import path from 'node:path';
import { pathToFileURL } from 'node:url';
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

export async function loadModule<T>({
	file,
	schema,
	subject,
}: Omit<ParseInput<T>, 'value'> & { file: string }): Promise<T> {
	const value: unknown = await import(pathToFileURL(path.resolve(file)).href);
	return parse({ schema, value, subject: `${subject} in ${file}` });
}
