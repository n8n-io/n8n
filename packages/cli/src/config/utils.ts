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
