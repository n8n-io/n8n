import { makeResolverFromLegacyOptions } from '@n8n/vm2';
import { json as generateJsonSchema } from 'generate-schema';
import type { SchemaObject } from 'generate-schema';
import type { JSONSchema7 } from 'json-schema';
import { JavaScriptSandbox } from 'n8n-nodes-base/dist/nodes/Code/JavaScriptSandbox';
import { getSandboxContext } from 'n8n-nodes-base/dist/nodes/Code/Sandbox';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError, jsonParse } from 'n8n-workflow';

const vmResolver = makeResolverFromLegacyOptions({
	external: {
		modules: ['json-schema-to-zod', 'zod'],
		transitive: false,
	},
	resolve(moduleName, parentDirname) {
		if (moduleName === 'json-schema-to-zod') {
			return require.resolve(
				'@n8n/n8n-nodes-langchain/node_modules/json-schema-to-zod/dist/cjs/jsonSchemaToZod.js',
				{
					paths: [parentDirname],
				},
			);
		}
		if (moduleName === 'zod') {
			return require.resolve('@n8n/n8n-nodes-langchain/node_modules/zod.cjs', {
				paths: [parentDirname],
			});
		}
		return;
	},
	builtin: [],
});

export function getSandboxWithZod(ctx: IExecuteFunctions, schema: JSONSchema7, itemIndex: number) {
	const context = getSandboxContext.call(ctx, itemIndex);
	let itemSchema: JSONSchema7 = schema;
	try {
		// If the root type is not defined, we assume it's an object
		if (itemSchema.type === undefined) {
			itemSchema = {
				type: 'object',
				properties: itemSchema.properties ?? (itemSchema as { [key: string]: JSONSchema7 }),
			};
		}
	} catch (error) {
		throw new NodeOperationError(ctx.getNode(), 'Error during parsing of JSON Schema.');
	}

	// Make sure to remove the description from root schema
	const { description, ...restOfSchema } = itemSchema;
	const sandboxedSchema = new JavaScriptSandbox(
		context,
		`
			const { z } = require('zod');
			const { parseSchema } = require('json-schema-to-zod');
			const zodSchema = parseSchema(${JSON.stringify(restOfSchema)});
			const itemSchema = new Function('z', 'return (' + zodSchema + ')')(z)
			return itemSchema
		`,
		itemIndex,
		ctx.helpers,
		{ resolver: vmResolver },
	);
	return sandboxedSchema;
}

export function generateSchema(schemaString: string): JSONSchema7 {
	const parsedSchema = jsonParse<SchemaObject>(schemaString);

	return generateJsonSchema(parsedSchema) as JSONSchema7;
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
