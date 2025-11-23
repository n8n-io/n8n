import type { DynamicStructuredToolInput } from '@langchain/core/tools';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import { StructuredOutputParser } from 'langchain/output_parsers';
import type { ISupplyDataFunctions, IDataObject } from 'n8n-workflow';
import { NodeConnectionTypes, jsonParse, NodeOperationError } from 'n8n-workflow';
import type { ZodTypeAny } from 'zod';
import { ZodBoolean, ZodNullable, ZodNumber, ZodObject, ZodOptional } from 'zod';

import type { ZodObjectAny } from '../types/types';

const getSimplifiedType = (schema: ZodTypeAny) => {
	if (schema instanceof ZodObject) {
		return 'object';
	} else if (schema instanceof ZodNumber) {
		return 'number';
	} else if (schema instanceof ZodBoolean) {
		return 'boolean';
	} else if (schema instanceof ZodNullable || schema instanceof ZodOptional) {
		return getSimplifiedType(schema.unwrap());
	}

	return 'string';
};

const getParametersDescription = (parameters: Array<[string, ZodTypeAny]>) =>
	parameters
		.map(
			([name, schema]) =>
				`${name}: (description: ${schema.description ?? ''}, type: ${getSimplifiedType(schema)}, required: ${!schema.isOptional()})`,
		)
		.join(',\n ');

export const prepareFallbackToolDescription = (toolDescription: string, schema: ZodObject<any>) => {
	let description = `${toolDescription}`;

	const toolParameters = Object.entries<ZodTypeAny>(schema.shape);

	if (toolParameters.length) {
		description += `
Tool expects valid stringified JSON object with ${toolParameters.length} properties.
Property names with description, type and required status:
${getParametersDescription(toolParameters)}
ALL parameters marked as required must be provided`;
	}

	return description;
};

export class N8nTool extends DynamicStructuredTool<ZodObjectAny> {
	constructor(
		private context: ISupplyDataFunctions,
		fields: DynamicStructuredToolInput<ZodObjectAny>,
	) {
		super(fields);
	}

	asDynamicTool(): DynamicTool {
		const { name, func, schema, context, description } = this;

		const parser = new StructuredOutputParser(schema);

		const wrappedFunc = async function (query: string) {
			let parsedQuery: object;

			// First we try to parse the query using the structured parser (Zod schema)
			try {
				parsedQuery = await parser.parse(query);
			} catch (e) {
				// If we were unable to parse the query using the schema, we try to gracefully handle it
				let dataFromModel;

				try {
					// First we try to parse a JSON with more relaxed rules
					dataFromModel = jsonParse<IDataObject>(query, { acceptJSObject: true });
				} catch (error) {
					// In case of error,
					// If model supplied a simple string instead of an object AND only one parameter expected, we try to recover the object structure
					if (Object.keys(schema.shape).length === 1) {
						const parameterName = Object.keys(schema.shape)[0];
						dataFromModel = { [parameterName]: query };
					} else {
						// Finally throw an error if we were unable to parse the query
						throw new NodeOperationError(
							context.getNode(),
							`Input is not a valid JSON: ${error.message}`,
						);
					}
				}

				// If we were able to parse the query with a fallback, we try to validate it using the schema
				// Here we will throw an error if the data still does not match the schema
				parsedQuery = schema.parse(dataFromModel);
			}

			try {
				// Call tool function with parsed query
				const result = await func(parsedQuery);

				return result;
			} catch (e) {
				const { index } = context.addInputData(NodeConnectionTypes.AiTool, [[{ json: { query } }]]);
				void context.addOutputData(NodeConnectionTypes.AiTool, index, e);

				return e.toString();
			}
		};

		return new DynamicTool({
			name,
			description: prepareFallbackToolDescription(description, schema),
			func: wrappedFunc,
		});
	}
}
