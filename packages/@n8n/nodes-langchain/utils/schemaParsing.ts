import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import { json as generateJsonSchema } from 'generate-schema';
import type { SchemaObject } from 'generate-schema';
import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError, jsonParse } from 'n8n-workflow';
import type { z } from 'zod';

function makeAllPropertiesRequired(schema: JSONSchema7): JSONSchema7 {
	function isPropertySchema(property: JSONSchema7Definition): property is JSONSchema7 {
		return typeof property === 'object' && property !== null && 'type' in property;
	}

	if (!schema.properties) {
		return schema;
	}

	const requiredProperties = Object.keys(schema.properties);
	if (requiredProperties.length > 0) {
		schema.required = requiredProperties;
	}

	for (const key of requiredProperties) {
		const property = schema.properties[key];
		if (isPropertySchema(property) && property.properties) {
			makeAllPropertiesRequired(property);
		}
	}

	return schema;
}

export function generateSchemaFromExample(
	exampleJsonString: string,
	allFieldsRequired = false,
): JSONSchema7 {
	const parsedExample = jsonParse<SchemaObject>(exampleJsonString);

	const schema = generateJsonSchema(parsedExample) as JSONSchema7;

	if (allFieldsRequired) {
		return makeAllPropertiesRequired(schema);
	}

	return schema;
}

export function convertJsonSchemaToZod<T extends z.ZodTypeAny = z.ZodTypeAny>(schema: JSONSchema7) {
	return jsonSchemaToZod<T>(schema);
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
