import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import { json as generateJsonSchema } from 'generate-schema';
import type { SchemaObject } from 'generate-schema';
import type { JSONSchema7 } from 'json-schema';
import type { IExecuteFunctions, ResourceMapperValue } from 'n8n-workflow';
import { NodeOperationError, jsonParse } from 'n8n-workflow';
import { z } from 'zod';

export function generateSchema(schemaString: string): JSONSchema7 {
	const parsedSchema = jsonParse<SchemaObject>(schemaString);

	return generateJsonSchema(parsedSchema) as JSONSchema7;
}

export function convertJsonSchemaToZod<T extends z.ZodTypeAny = z.ZodTypeAny>(schema: JSONSchema7) {
	return jsonSchemaToZod<T>(schema);
}

export function convertResourceMapperFieldsToZod(inputs: ResourceMapperValue): z.ZodObject<any> {
	const schemaObject: Record<string, z.ZodType<any>> = {};

	inputs.schema.forEach((field) => {
		switch (field.type) {
			case 'string':
				schemaObject[field.id] = z.string();
				break;
			case 'number':
				schemaObject[field.id] = z.number();
				break;
			case 'boolean':
				schemaObject[field.id] = z.boolean();
				break;
			default:
				schemaObject[field.id] = z.any();
		}
	});
	return z.object(schemaObject) as z.ZodObject<any>;
}

export function throwIfToolSchema(ctx: IExecuteFunctions, error: Error) {
	if (error?.message?.includes('tool input did not match expected schema')) {
		throw new NodeOperationError(
			ctx.getNode(),
			`${error.message}.
			This is most likely because some of your tools are configured to require a specific schema. This is not supported by Conversational Agent. Remove the schema from the tool configuration or use Tools agent instead.`,
		);
	}
}
