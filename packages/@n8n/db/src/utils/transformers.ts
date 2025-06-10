import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { ValueTransformer, FindOperator } from '@n8n/typeorm';
import { jsonParse } from 'n8n-workflow';

export const idStringifier = {
	from: (value?: number): string | undefined => value?.toString(),
	to: (
		value: string | FindOperator<unknown> | undefined,
	): number | FindOperator<unknown> | undefined =>
		typeof value === 'string' ? Number(value) : value,
};

export const lowerCaser = {
	from: (value: string): string => value,
	to: (value: string): string => (typeof value === 'string' ? value.toLowerCase() : value),
};

/**
 * Unmarshal JSON as JS object.
 */
export const objectRetriever: ValueTransformer = {
	to: (value: object): object => value,
	from: (value: string | object): object => (typeof value === 'string' ? jsonParse(value) : value),
};

/** Remove invisible Unicode characters that break JSON parsing. */
function sanitizeJson(value: string): string {
	return value
		.replace(/\u2028/g, '') // line separator (LSEP)
		.replace(/\u2029/g, '') // paragraph separator (PSEP)
		.replace(/\u200B/g, '') // zero-width space
		.replace(/\u200C/g, '') // zero width non-joiner
		.replace(/\u200D/g, '') // zero width joiner
		.replace(/\uFEFF/g, ''); // byte order mark (BOM)
}

const jsonColumn: ValueTransformer = {
	to: (value: object): string | object => {
		if (Container.get(GlobalConfig).database.type === 'sqlite') {
			return sanitizeJson(JSON.stringify(value));
		}
		return value;
	},
	from: (value: string | object): object => (typeof value === 'string' ? jsonParse(value) : value),
};

export const sqlite = { jsonColumn };
