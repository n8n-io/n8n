import { z } from 'zod';

import type { JsonSchemaObject } from '../types';
import { extendSchemaWithMessage } from '../utils/extend-schema';

export const parseString = (jsonSchema: JsonSchemaObject & { type: 'string' }) => {
	let stringSchema = z.string();

	stringSchema = extendSchemaWithMessage(
		stringSchema,
		jsonSchema,
		'pattern',
		(zs, pattern, errorMsg) => zs.regex(new RegExp(pattern), errorMsg),
	);

	stringSchema = extendSchemaWithMessage(
		stringSchema,
		jsonSchema,
		'minLength',
		(zs, minLength, errorMsg) => zs.min(minLength, errorMsg),
	);

	stringSchema = extendSchemaWithMessage(
		stringSchema,
		jsonSchema,
		'maxLength',
		(zs, maxLength, errorMsg) => zs.max(maxLength, errorMsg),
	);

	let zodSchema: z.ZodType<string> = stringSchema;

	zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, 'format', (zs, format, errorMsg) => {
		switch (format) {
			case 'email':
				return z.email(errorMsg);
			case 'ip':
				return z.union([z.ipv4(), z.ipv6()]);
			case 'ipv4':
				return z.ipv4();
			case 'ipv6':
				return z.ipv6();
			case 'uri':
				return z.url(errorMsg);
			case 'uuid':
				return z.uuid(errorMsg);
			case 'date-time':
				return z.iso.datetime({ offset: true, message: errorMsg });
			case 'time':
				return z.iso.time(errorMsg);
			case 'date':
				return z.iso.date(errorMsg);
			case 'binary':
				return z.base64(errorMsg);
			case 'duration':
				return z.iso.duration(errorMsg);
			default:
				return zs;
		}
	});

	zodSchema = extendSchemaWithMessage(
		zodSchema,
		jsonSchema,
		'contentEncoding',
		(_zs, _pattern, errorMsg) => z.base64(errorMsg),
	);

	return zodSchema;
};
