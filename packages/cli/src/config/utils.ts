import { NotStringArrayError } from '@/errors/not-string-array.error';
import type { SchemaObj } from 'convict';
import { ApplicationError } from 'n8n-workflow';

export const ensureStringArray = (values: string[], { env }: SchemaObj<string>) => {
	if (!env) throw new ApplicationError('Missing env', { extra: { env } });

	if (!Array.isArray(values)) throw new NotStringArrayError(env);

	for (const value of values) {
		if (typeof value !== 'string') throw new NotStringArrayError(env);
	}
};

export function findSchemaEnvVars(schema: Record<string, unknown>) {
	const envVars: string[] = [];

	const traverse = (obj: Record<string, unknown>) => {
		for (const key in obj) {
			const value = obj[key] as Record<string, unknown> | string;

			if (typeof value === 'object') {
				traverse(value);
			} else if (typeof value === 'string' && key === 'env') {
				envVars.push(value);
			}
		}
	};

	traverse(schema);

	return envVars;
}
