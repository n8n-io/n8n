import { z } from 'zod/v4';

import type { TelemetryEventDef } from './define';

type ValidationPath = Array<string | number>;
type ObjectSchema = z.ZodObject<Record<string, z.ZodType>>;
type UnionSchema = z.ZodUnion<readonly z.ZodType[]>;
type ArraySchema = z.ZodArray<z.ZodType>;
type RecordSchema = z.ZodRecord<z.ZodString, z.ZodType>;
type ReadonlySchema = z.ZodReadonly<z.ZodType>;
type WrappedSchema =
	| z.ZodOptional<z.ZodType>
	| z.ZodNullable<z.ZodType>
	| z.ZodDefault<z.ZodType>
	| z.ZodNonOptional<z.ZodType>
	| z.ZodCatch<z.ZodType>
	| z.ZodLazy<z.ZodType>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatPath(path: ValidationPath): string {
	return path.map(String).join('.') || '(root)';
}

function isObjectSchema(schema: z.ZodType): schema is ObjectSchema {
	return schema instanceof z.ZodObject;
}

function isUnionSchema(schema: z.ZodType): schema is UnionSchema {
	return schema instanceof z.ZodUnion;
}

function isArraySchema(schema: z.ZodType): schema is ArraySchema {
	return schema instanceof z.ZodArray;
}

function isRecordSchema(schema: z.ZodType): schema is RecordSchema {
	return schema instanceof z.ZodRecord;
}

function isWrappedSchema(schema: z.ZodType): schema is WrappedSchema {
	return (
		schema instanceof z.ZodOptional ||
		schema instanceof z.ZodNullable ||
		schema instanceof z.ZodDefault ||
		schema instanceof z.ZodNonOptional ||
		schema instanceof z.ZodCatch ||
		schema instanceof z.ZodLazy
	);
}

function isReadonlySchema(schema: z.ZodType): schema is ReadonlySchema {
	return schema instanceof z.ZodReadonly;
}

function isSchema(value: unknown): value is z.ZodType {
	return value instanceof z.ZodType;
}

function getWrappedSchema(schema: z.ZodType): z.ZodType | undefined {
	if (isWrappedSchema(schema)) {
		return schema.unwrap();
	}

	if (isReadonlySchema(schema)) {
		return schema.def.innerType;
	}

	return undefined;
}

function getUnrecognizedPropertyIssues(
	schema: z.ZodType,
	value: unknown,
	path: ValidationPath = [],
): string[] {
	const wrappedSchema = getWrappedSchema(schema);
	if (wrappedSchema !== undefined) {
		return getUnrecognizedPropertyIssues(wrappedSchema, value, path);
	}

	if (isObjectSchema(schema)) {
		if (!isRecord(value)) return [];

		const issues: string[] = [];
		for (const [key, childValue] of Object.entries(value)) {
			const childPath = [...path, key];
			const childSchema = schema.shape[key];
			if (childSchema !== undefined) {
				issues.push(...getUnrecognizedPropertyIssues(childSchema, childValue, childPath));
			} else if (schema.def.catchall === undefined) {
				issues.push(`${formatPath(childPath)}: unrecognized property`);
			} else if (isSchema(schema.def.catchall)) {
				issues.push(...getUnrecognizedPropertyIssues(schema.def.catchall, childValue, childPath));
			}
		}
		return issues;
	}

	if (isArraySchema(schema)) {
		if (!Array.isArray(value)) return [];
		return value.flatMap((item, index) =>
			getUnrecognizedPropertyIssues(schema.element, item, [...path, index]),
		);
	}

	if (isRecordSchema(schema)) {
		if (!isRecord(value)) return [];
		return Object.entries(value).flatMap(([key, childValue]) =>
			getUnrecognizedPropertyIssues(schema.valueType, childValue, [...path, key]),
		);
	}

	if (isUnionSchema(schema)) {
		const matchingOptions = schema.options.filter((option) => option.safeParse(value).success);
		if (matchingOptions.length === 0) return [];

		return matchingOptions
			.map((option) => getUnrecognizedPropertyIssues(option, value, path))
			.reduce((fewestIssues, optionIssues) =>
				optionIssues.length < fewestIssues.length ? optionIssues : fewestIssues,
			);
	}

	return [];
}

export function getEventValidationError(
	event: TelemetryEventDef,
	properties: unknown,
): string | null {
	const issues: string[] = [];

	const result = event.properties.safeParse(properties);
	if (!result.success) {
		for (const issue of result.error.issues) {
			issues.push(`${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`);
		}
	}

	issues.push(...getUnrecognizedPropertyIssues(event.properties, properties));

	if (issues.length === 0) return null;
	return `Telemetry event "${event.name}" failed schema validation: ${issues.join('; ')}`;
}
