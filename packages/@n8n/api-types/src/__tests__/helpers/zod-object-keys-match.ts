import { isDeepStrictEqual } from 'node:util';
import type { ZodDefault, ZodObject, ZodOptional, ZodRawShape, ZodTypeAny } from 'zod';
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
