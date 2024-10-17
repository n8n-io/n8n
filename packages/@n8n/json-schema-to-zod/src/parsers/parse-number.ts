import { z } from 'zod';

import type { JsonSchemaObject } from '../types';
import { extendSchemaWithMessage } from '../utils/extend-schema';

export const parseNumber = (jsonSchema: JsonSchemaObject & { type: 'number' | 'integer' }) => {
	let zodSchema = z.number();

	let isInteger = false;
	if (jsonSchema.type === 'integer') {
		isInteger = true;
		zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, 'type', (zs, _, errorMsg) =>
			zs.int(errorMsg),
		);
	} else if (jsonSchema.format === 'int64') {
		isInteger = true;
		zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, 'format', (zs, _, errorMsg) =>
			zs.int(errorMsg),
		);
	}

	zodSchema = extendSchemaWithMessage(
		zodSchema,
		jsonSchema,
		'multipleOf',
		(zs, multipleOf, errorMsg) => {
			if (multipleOf === 1) {
				if (isInteger) return zs;

				return zs.int(errorMsg);
			}

			return zs.multipleOf(multipleOf, errorMsg);
		},
	);

	if (typeof jsonSchema.minimum === 'number') {
		if (jsonSchema.exclusiveMinimum === true) {
			zodSchema = extendSchemaWithMessage(
				zodSchema,
				jsonSchema,
				'minimum',
				(zs, minimum, errorMsg) => zs.gt(minimum, errorMsg),
			);
		} else {
			zodSchema = extendSchemaWithMessage(
				zodSchema,
				jsonSchema,
				'minimum',
				(zs, minimum, errorMsg) => zs.gte(minimum, errorMsg),
			);
		}
	} else if (typeof jsonSchema.exclusiveMinimum === 'number') {
		zodSchema = extendSchemaWithMessage(
			zodSchema,
			jsonSchema,
			'exclusiveMinimum',
			(zs, exclusiveMinimum, errorMsg) => zs.gt(exclusiveMinimum as number, errorMsg),
		);
	}

	if (typeof jsonSchema.maximum === 'number') {
		if (jsonSchema.exclusiveMaximum === true) {
			zodSchema = extendSchemaWithMessage(
				zodSchema,
				jsonSchema,
				'maximum',
				(zs, maximum, errorMsg) => zs.lt(maximum, errorMsg),
			);
		} else {
			zodSchema = extendSchemaWithMessage(
				zodSchema,
				jsonSchema,
				'maximum',
				(zs, maximum, errorMsg) => zs.lte(maximum, errorMsg),
			);
		}
	} else if (typeof jsonSchema.exclusiveMaximum === 'number') {
		zodSchema = extendSchemaWithMessage(
			zodSchema,
			jsonSchema,
			'exclusiveMaximum',
			(zs, exclusiveMaximum, errorMsg) => zs.lt(exclusiveMaximum as number, errorMsg),
		);
	}

	return zodSchema;
};
