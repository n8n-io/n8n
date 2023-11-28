import { NotStringArrayError } from '@/errors/not-string-array.error';
import type { SchemaObj } from 'convict';

export const ensureStringArray = (values: string[], { env }: SchemaObj<string>) => {
	if (!env) throw new Error(`Missing env: ${env}`);

	if (!Array.isArray(values)) throw new NotStringArrayError(env);

	for (const value of values) {
		if (typeof value !== 'string') throw new NotStringArrayError(env);
	}
};
