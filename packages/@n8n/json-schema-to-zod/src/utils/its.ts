import type { JsonSchema, JsonSchemaObject, Serializable } from '../types';

export const its = {
	an: {
		object: (x: JsonSchemaObject): x is JsonSchemaObject & { type: 'object' } =>
			x.type === 'object',
		array: (x: JsonSchemaObject): x is JsonSchemaObject & { type: 'array' } => x.type === 'array',
		anyOf: (
			x: JsonSchemaObject,
		): x is JsonSchemaObject & {
			anyOf: JsonSchema[];
		} => x.anyOf !== undefined,
		allOf: (
			x: JsonSchemaObject,
		): x is JsonSchemaObject & {
			allOf: JsonSchema[];
		} => x.allOf !== undefined,
		enum: (
			x: JsonSchemaObject,
		): x is JsonSchemaObject & {
			enum: Serializable | Serializable[];
		} => x.enum !== undefined,
	},
	a: {
		nullable: (x: JsonSchemaObject): x is JsonSchemaObject & { nullable: true } =>
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
			(x as any).nullable === true,
		multipleType: (x: JsonSchemaObject): x is JsonSchemaObject & { type: string[] } =>
			Array.isArray(x.type),
		not: (
			x: JsonSchemaObject,
		): x is JsonSchemaObject & {
			not: JsonSchema;
		} => x.not !== undefined,
		const: (
			x: JsonSchemaObject,
		): x is JsonSchemaObject & {
			const: Serializable;
		} => x.const !== undefined,
		primitive: <T extends 'string' | 'number' | 'integer' | 'boolean' | 'null'>(
			x: JsonSchemaObject,
			p: T,
		): x is JsonSchemaObject & { type: T } => x.type === p,
		conditional: (
			x: JsonSchemaObject,
		): x is JsonSchemaObject & {
			if: JsonSchema;
			then: JsonSchema;
			else: JsonSchema;
		} => Boolean('if' in x && x.if && 'then' in x && 'else' in x && x.then && x.else),
		oneOf: (
			x: JsonSchemaObject,
		): x is JsonSchemaObject & {
			oneOf: JsonSchema[];
		} => x.oneOf !== undefined,
	},
};
