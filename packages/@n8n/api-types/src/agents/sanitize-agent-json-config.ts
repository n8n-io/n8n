import { z, type ZodDiscriminatedUnionOption } from 'zod';

import { AgentJsonConfigSchema } from './agent-json-config.schema';

const TYPED_ARRAY_CONFIG_KEYS = ['integrations', 'tools', 'skills', 'tasks'] as const;

type DiscriminatedUnionSchema = z.ZodDiscriminatedUnion<
	string,
	ReadonlyArray<ZodDiscriminatedUnionOption<string>>
>;

function isZodOptionalSchema(schema: z.ZodTypeAny): schema is z.ZodOptional<z.ZodTypeAny> {
	return schema instanceof z.ZodOptional;
}

function isZodNullableSchema(schema: z.ZodTypeAny): schema is z.ZodNullable<z.ZodTypeAny> {
	return schema instanceof z.ZodNullable;
}

function isZodDefaultSchema(schema: z.ZodTypeAny): schema is z.ZodDefault<z.ZodTypeAny> {
	return schema instanceof z.ZodDefault;
}

function isZodEffectsSchema(schema: z.ZodTypeAny): schema is z.ZodEffects<z.ZodTypeAny> {
	return schema instanceof z.ZodEffects;
}

function isZodArraySchema(schema: z.ZodTypeAny): schema is z.ZodArray<z.ZodTypeAny> {
	return schema instanceof z.ZodArray;
}

function isZodRecordSchema(schema: z.ZodTypeAny): schema is z.ZodRecord<z.ZodString, z.ZodTypeAny> {
	return schema instanceof z.ZodRecord;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isZodObjectSchema(schema: z.ZodTypeAny): schema is z.ZodObject<z.ZodRawShape> {
	return schema instanceof z.ZodObject;
}

function isDiscriminatedUnionSchema(schema: z.ZodTypeAny): schema is DiscriminatedUnionSchema {
	return schema instanceof z.ZodDiscriminatedUnion;
}

function filterUnsupportedTypedEntries(
	entries: unknown,
	supportedTypes: readonly string[],
): unknown {
	if (!Array.isArray(entries)) return entries;

	return entries.filter((entry) => {
		if (!isRecord(entry)) {
			return true;
		}

		const type = getObjectProperty(entry, 'type');
		if (typeof type !== 'string') {
			return true;
		}

		return supportedTypes.includes(type);
	});
}

function getObjectProperty(value: Record<string, unknown>, property: string): unknown {
	return value[property];
}

function getObjectDiscriminatorLiteralValue(
	schema: z.ZodObject<z.ZodRawShape>,
	discriminator: string,
): string | undefined {
	const discriminatorSchema = schema.shape[discriminator];
	if (
		discriminatorSchema instanceof z.ZodLiteral &&
		typeof discriminatorSchema.value === 'string'
	) {
		return discriminatorSchema.value;
	}

	return undefined;
}

function getDiscriminatorLiteralValues(schema: z.ZodTypeAny, discriminator: string): string[] {
	if (isZodObjectSchema(schema)) {
		const value = getObjectDiscriminatorLiteralValue(schema, discriminator);
		return value === undefined ? [] : [value];
	}

	if (isDiscriminatedUnionSchema(schema)) {
		return schema.options
			.map((option) => getObjectDiscriminatorLiteralValue(option, schema.discriminator))
			.filter((value): value is string => value !== undefined);
	}

	return [];
}

function getDiscriminatedUnionOption(
	schema: DiscriminatedUnionSchema,
	value: unknown,
): z.ZodObject<z.ZodRawShape> | undefined {
	if (!isRecord(value)) return undefined;

	const discriminatorValue = getObjectProperty(value, schema.discriminator);
	if (typeof discriminatorValue !== 'string') return undefined;

	return schema.options.find(
		(option) =>
			getObjectDiscriminatorLiteralValue(option, schema.discriminator) === discriminatorValue,
	);
}

function getWrappedSchema(schema: z.ZodTypeAny): z.ZodTypeAny | undefined {
	if (isZodOptionalSchema(schema)) {
		return schema.unwrap();
	}

	if (isZodNullableSchema(schema)) {
		return schema.unwrap();
	}

	if (isZodDefaultSchema(schema)) {
		return schema.removeDefault();
	}

	if (isZodEffectsSchema(schema)) {
		return schema.innerType();
	}

	return undefined;
}

function getArrayElementSchema(schema: z.ZodTypeAny): z.ZodTypeAny | undefined {
	const wrappedSchema = getWrappedSchema(schema);
	if (wrappedSchema !== undefined) {
		return getArrayElementSchema(wrappedSchema);
	}

	return isZodArraySchema(schema) ? schema.element : undefined;
}

function stripUnknownSchemaFields(value: unknown, schema: z.ZodTypeAny): unknown {
	const wrappedSchema = getWrappedSchema(schema);
	if (wrappedSchema !== undefined) {
		return stripUnknownSchemaFields(value, wrappedSchema);
	}

	if (isZodArraySchema(schema)) {
		if (!Array.isArray(value)) return value;

		return value.map((entry) => stripUnknownSchemaFields(entry, schema.element));
	}

	if (isZodRecordSchema(schema)) {
		if (!isRecord(value)) return value;

		return Object.fromEntries(
			Object.entries(value).map(([key, entryValue]) => [
				key,
				stripUnknownSchemaFields(entryValue, schema.valueSchema),
			]),
		);
	}

	if (isZodObjectSchema(schema)) {
		if (!isRecord(value)) return value;

		const sanitized: Record<string, unknown> = {};
		for (const [key, entryValue] of Object.entries(value)) {
			const childSchema: z.ZodTypeAny | undefined = schema.shape[key];
			if (childSchema !== undefined) {
				sanitized[key] = stripUnknownSchemaFields(entryValue, childSchema);
			}
		}
		return sanitized;
	}

	if (isDiscriminatedUnionSchema(schema)) {
		const option = getDiscriminatedUnionOption(schema, value);
		return option === undefined ? value : stripUnknownSchemaFields(value, option);
	}

	return value;
}

/**
 * Strip legacy or unsupported typed entries from agent JSON config before strict
 * Zod validation. Unknown top-level keys are dropped from `AgentJsonConfigSchema`.
 * This intentionally cleans unknown fields gracefully, so older persisted configs
 * and generated drafts can move forward as the schema evolves.
 *
 * Entries with a supported `type` but invalid required fields are kept so validation
 * can surface the error instead of silently discarding user mistakes.
 */
export function sanitizeAgentJsonConfig(raw: unknown): unknown {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		return raw;
	}

	const sanitized = stripUnknownSchemaFields(raw, AgentJsonConfigSchema);
	if (!isRecord(sanitized)) return sanitized;

	for (const key of TYPED_ARRAY_CONFIG_KEYS) {
		if (key in sanitized) {
			const schema = getArrayElementSchema(AgentJsonConfigSchema.shape[key]);
			if (schema === undefined) continue;

			sanitized[key] = filterUnsupportedTypedEntries(
				sanitized[key],
				getDiscriminatorLiteralValues(schema, 'type'),
			);
		}
	}

	return sanitized;
}
