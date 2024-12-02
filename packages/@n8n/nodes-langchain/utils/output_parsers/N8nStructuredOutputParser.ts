import type { Callbacks } from '@langchain/core/callbacks/manager';
import { StructuredOutputParser } from 'langchain/output_parsers';
import get from 'lodash/get';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { z } from 'zod';

import { logAiEvent } from '../helpers';

const STRUCTURED_OUTPUT_KEY = '__structured__output';
const STRUCTURED_OUTPUT_OBJECT_KEY = '__structured__output__object';
const STRUCTURED_OUTPUT_ARRAY_KEY = '__structured__output__array';

export class N8nStructuredOutputParser extends StructuredOutputParser<
	z.ZodType<object, z.ZodTypeDef, object>
> {
	constructor(
		private context: ISupplyDataFunctions,
		zodSchema: z.ZodSchema<object>,
	) {
		super(zodSchema);
	}

	lc_namespace = ['langchain', 'output_parsers', 'structured'];

	async parse(
		text: string,
		_callbacks?: Callbacks,
		errorMapper?: (error: Error) => Error,
	): Promise<object> {
		const { index } = this.context.addInputData(NodeConnectionType.AiOutputParser, [
			[{ json: { action: 'parse', text } }],
		]);
		try {
			const jsonString = text.includes('```') ? text.split(/```(?:json)?/)[1] : text;
			const json = JSON.parse(jsonString.trim());
			const parsed = await this.schema.parseAsync(json);

			const result = (get(parsed, [STRUCTURED_OUTPUT_KEY, STRUCTURED_OUTPUT_OBJECT_KEY]) ??
				get(parsed, [STRUCTURED_OUTPUT_KEY, STRUCTURED_OUTPUT_ARRAY_KEY]) ??
				get(parsed, STRUCTURED_OUTPUT_KEY) ??
				parsed) as Record<string, unknown>;

			logAiEvent(this.context, 'ai-output-parsed', { text, response: result });

			this.context.addOutputData(NodeConnectionType.AiOutputParser, index, [
				[{ json: { action: 'parse', response: result } }],
			]);

			return result;
		} catch (e) {
			const nodeError = new NodeOperationError(
				this.context.getNode(),
				"Model output doesn't fit required format",
				{
					description:
						"To continue the execution when this happens, change the 'On Error' parameter in the root node's settings",
				},
			);

			logAiEvent(this.context, 'ai-output-parsed', {
				text,
				response: e.message ?? e,
			});

			this.context.addOutputData(NodeConnectionType.AiOutputParser, index, nodeError);
			if (errorMapper) {
				throw errorMapper(e);
			}

			throw nodeError;
		}
	}

	static async fromZodJsonSchema(
		zodSchema: z.ZodSchema<object>,
		nodeVersion: number,
		context: ISupplyDataFunctions,
	): Promise<N8nStructuredOutputParser> {
		let returnSchema: z.ZodType<object, z.ZodTypeDef, object>;
		if (nodeVersion === 1) {
			returnSchema = z.object({
				[STRUCTURED_OUTPUT_KEY]: z
					.object({
						[STRUCTURED_OUTPUT_OBJECT_KEY]: zodSchema.optional(),
						[STRUCTURED_OUTPUT_ARRAY_KEY]: z.array(zodSchema).optional(),
					})
					.describe(
						`Wrapper around the output data. It can only contain ${STRUCTURED_OUTPUT_OBJECT_KEY} or ${STRUCTURED_OUTPUT_ARRAY_KEY} but never both.`,
					)
					.refine(
						(data) => {
							// Validate that one and only one of the properties exists
							return (
								Boolean(data[STRUCTURED_OUTPUT_OBJECT_KEY]) !==
								Boolean(data[STRUCTURED_OUTPUT_ARRAY_KEY])
							);
						},
						{
							message:
								'One and only one of __structured__output__object and __structured__output__array should be present.',
							path: [STRUCTURED_OUTPUT_KEY],
						},
					),
			});
		} else {
			returnSchema = z.object({
				output: zodSchema.optional(),
			});
		}

		return new N8nStructuredOutputParser(context, returnSchema);
	}

	getSchema() {
		return this.schema;
	}
}
