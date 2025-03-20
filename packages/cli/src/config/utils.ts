import type { SchemaObj } from 'convict';
import { UserError } from 'n8n-workflow';

import { NotStringArrayError } from '@/errors/not-string-array.error';

export const ensureStringArray = (values: string[], { env }: SchemaObj<string>) => {
	if (!env) throw new UserError('Missing env', { extra: { env } });

	if (!Array.isArray(values)) throw new NotStringArrayError(env);

	for (const value of values) {
		if (typeof value !== 'string') throw new NotStringArrayError(env);
	}
};
