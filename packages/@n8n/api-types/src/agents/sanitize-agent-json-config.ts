import { z } from 'zod';

import { AgentIntegrationConfigSchema } from './agent-integration.schema';
import {
	AgentJsonConfigSchema,
	AgentJsonSkillConfigSchema,
	AgentJsonTaskConfigSchema,
	AgentJsonToolConfigSchema,
} from './agent-json-config.schema';

const TYPED_ARRAY_CONFIG_SCHEMAS = {
	integrations: AgentIntegrationConfigSchema,
	tools: AgentJsonToolConfigSchema,
	skills: AgentJsonSkillConfigSchema,
	tasks: AgentJsonTaskConfigSchema,
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function filterUnsupportedTypedEntries(
	entries: unknown,
	supportedTypes: readonly string[],
): unknown {
	if (!Array.isArray(entries)) return entries;

	return entries.filter((entry) => {
		if (typeof entry !== 'object' || entry === null) {
			return true;
		}

		if (!('type' in entry)) {
			return true;
		}

		const { type } = entry;
		if (typeof type !== 'string') {
			return true;
		}

		return supportedTypes.includes(type);
	});
}

function getObjectProperty(value: object, property: string): unknown {
	return Object.entries(value).find(([key]) => key === property)?.[1];
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
	if (schema instanceof z.ZodObject) {
		const value = getObjectDiscriminatorLiteralValue(schema, discriminator);
		return value === undefined ? [] : [value];
	}

	if (schema instanceof z.ZodDiscriminatedUnion) {
		return [...schema.options.values()]
			.map((option) => getObjectDiscriminatorLiteralValue(option, schema.discriminator))
			.filter((value): value is string => value !== undefined);
	}

	return [];
}

function getDiscriminatedUnionOption(
	schema: z.ZodDiscriminatedUnion<string, Array<z.ZodObject<z.ZodRawShape>>>,
	value: unknown,
): z.ZodObject<z.ZodRawShape> | undefined {
	if (!isRecord(value)) return undefined;

	const discriminatorValue = getObjectProperty(value, schema.discriminator);
	if (typeof discriminatorValue !== 'string') return undefined;

	return [...schema.options.values()].find(
		(option) =>
			getObjectDiscriminatorLiteralValue(option, schema.discriminator) === discriminatorValue,
	);
}

function stripUnknownSchemaFields(value: unknown, schema: z.ZodTypeAny): unknown {
	if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
		return stripUnknownSchemaFields(value, schema.unwrap());
	}

	if (schema instanceof z.ZodDefault) {
		return stripUnknownSchemaFields(value, schema.removeDefault());
	}

	if (schema instanceof z.ZodEffects) {
		return stripUnknownSchemaFields(value, schema.innerType());
	}

	if (schema instanceof z.ZodArray) {
		if (!Array.isArray(value)) return value;
		return value.map((entry) => stripUnknownSchemaFields(entry, schema.element));
	}

	if (schema instanceof z.ZodRecord) {
		if (!isRecord(value)) return value;

		return Object.fromEntries(
			Object.entries(value).map(([key, entryValue]) => [
				key,
				stripUnknownSchemaFields(entryValue, schema.valueSchema),
			]),
		);
	}

	if (schema instanceof z.ZodObject) {
		if (!isRecord(value)) return value;

		const sanitized: Record<string, unknown> = {};
		for (const [key, entryValue] of Object.entries(value)) {
			const childSchema = schema.shape[key];
			if (childSchema !== undefined) {
				sanitized[key] = stripUnknownSchemaFields(entryValue, childSchema);
			}
		}
		return sanitized;
	}

	if (schema instanceof z.ZodDiscriminatedUnion) {
		const option = getDiscriminatedUnionOption(schema, value);
		return option === undefined ? value : stripUnknownSchemaFields(value, option);
	}

	return value;
}

/**
 * Strip legacy or unsupported typed entries from agent JSON config before strict
 * Zod validation. Unknown top-level keys are dropped from `AgentJsonConfigSchema`.
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

	for (const [key, schema] of Object.entries(TYPED_ARRAY_CONFIG_SCHEMAS)) {
		if (key in sanitized) {
			sanitized[key] = filterUnsupportedTypedEntries(
				sanitized[key],
				getDiscriminatorLiteralValues(schema, 'type'),
			);
		}
	}

	return sanitized;
}
