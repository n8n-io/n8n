import type { SchemaObj } from 'convict';

class NotStringArrayError extends Error {
	constructor(env: string) {
		super(`${env} is not a string array.`);
	}
}

export const ensureStringArray = (values: string[], { env }: SchemaObj<string>) => {
	if (!env) throw new Error(`Missing env: ${env}`);

	if (!Array.isArray(values)) throw new NotStringArrayError(env);

	for (const value of values) {
		if (typeof value !== 'string') throw new NotStringArrayError(env);
	}
};
