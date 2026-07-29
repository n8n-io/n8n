import { isDeepStrictEqual } from 'node:util';
import type { ZodArray, ZodDefault, ZodObject, ZodOptional, ZodRawShape, ZodTypeAny } from 'zod';
import { z } from 'zod';

type ZodObjectKeyTree = {
	[key: string]: ZodObjectKeyTree | true;
};

const isZodOptional = (schema: ZodTypeAny): schema is ZodOptional<ZodTypeAny> => {
	return schema instanceof z.ZodOptional;
};

const isZodDefault = (schema: ZodTypeAny): schema is ZodDefault<ZodTypeAny> => {
	return schema instanceof z.ZodDefault;
};

const isZodObject = (schema: ZodTypeAny): schema is ZodObject<ZodRawShape> => {
	return schema instanceof z.ZodObject;
};

const isZodArray = (schema: ZodTypeAny): schema is ZodArray<ZodTypeAny> => {
	return schema instanceof z.ZodArray;
};

const unwrapOptionalOrDefault = (schema: ZodTypeAny): ZodTypeAny => {
	if (isZodOptional(schema) || isZodDefault(schema)) {
		return unwrapOptionalOrDefault(schema._def.innerType);
	}
	return schema;
};

/** Nested ZodObject key tree; non-objects become `true` leaf markers. */
const zodObjectKeyTree = (schema: ZodTypeAny): ZodObjectKeyTree | true => {
	const current = unwrapOptionalOrDefault(schema);
	if (!isZodObject(current)) {
		return true;
	}

	const tree: ZodObjectKeyTree = {};
	const shape: ZodRawShape = current.shape;
	for (const key of Object.keys(shape)) {
		const fieldSchema = shape[key];
		if (fieldSchema === undefined) {
			continue;
		}
		tree[key] = zodObjectKeyTree(fieldSchema);
	}
	return tree;
};

/**
 * Whether two Zod schemas have the same nested object keys after stripping
 * `.optional()` / `.default()` wrappers. Useful to keep a full Public API PUT
 * body aligned with the internal preferences DTO.
 */
export const zodObjectKeysMatch = (a: ZodTypeAny, b: ZodTypeAny): boolean => {
	return isDeepStrictEqual(zodObjectKeyTree(a), zodObjectKeyTree(b));
};

/** Whether a Zod object (and nested objects/array items) has no `.optional()` / `.default()` fields. */
export const zodObjectFieldsAreAllRequired = (schema: ZodTypeAny): boolean => {
	if (isZodOptional(schema) || isZodDefault(schema)) {
		return false;
	}
	if (isZodArray(schema)) {
		return zodObjectFieldsAreAllRequired(schema.element);
	}
	if (!isZodObject(schema)) {
		return true;
	}

	for (const fieldSchema of Object.values(schema.shape)) {
		if (fieldSchema !== undefined && !zodObjectFieldsAreAllRequired(fieldSchema)) {
			return false;
		}
	}
	return true;
};
