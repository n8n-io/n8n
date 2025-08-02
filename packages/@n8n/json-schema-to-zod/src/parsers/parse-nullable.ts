import { parseSchema } from './parse-schema';
import type { JsonSchemaObject, Refs } from '../types';
import { omit } from '../utils/omit';

/**
 * For compatibility with open api 3.0 nullable
 */
export const parseNullable = (jsonSchema: JsonSchemaObject & { nullable: true }, refs: Refs) => {
	return parseSchema(omit(jsonSchema, 'nullable'), refs, true).nullable();
};
