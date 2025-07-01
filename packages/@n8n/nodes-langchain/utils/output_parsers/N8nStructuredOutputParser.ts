import type { Callbacks } from '@langchain/core/callbacks/manager';
import { StructuredOutputParser } from 'langchain/output_parsers';
import get from 'lodash/get';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { z } from 'zod';

import { logAiEvent, unwrapNestedOutput } from '../helpers';

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
		const { index } = this.context.addInputData(NodeConnectionTypes.AiOutputParser, [
			[{ json: { action: 'parse', text } }],
		]);

		try {
			const jsonString = text.includes('```') ? text.split(/```(?:json)?/)[1] : text;
			const json = JSON.parse(jsonString.trim());
			const parsed = await this.schema.parseAsync(json);

			let result = (get(parsed, [STRUCTURED_OUTPUT_KEY, STRUCTURED_OUTPUT_OBJECT_KEY]) ??
				get(parsed, [STRUCTURED_OUTPUT_KEY, STRUCTURED_OUTPUT_ARRAY_KEY]) ??
				get(parsed, STRUCTURED_OUTPUT_KEY) ??
				parsed) as Record<string, unknown>;

			// Unwrap any doubly-nested output structures (e.g., {output: {output: {...}}})
			result = unwrapNestedOutput(result);

			logAiEvent(this.context, 'ai-output-parsed', { text, response: result });

			this.context.addOutputData(NodeConnectionTypes.AiOutputParser, index, [
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

			// Add additional context to the error
			if (e instanceof SyntaxError) {
				nodeError.context.outputParserFailReason = 'Invalid JSON in model output';
			} else if (
				text.trim() === '{}' ||
				(e instanceof z.ZodError &&
					e.issues?.[0] &&
					e.issues?.[0].code === 'invalid_type' &&
					e.issues?.[0].path?.[0] === 'output' &&
					e.issues?.[0].expected === 'object' &&
					e.issues?.[0].received === 'undefined')
			) {
				nodeError.context.outputParserFailReason = 'Model output wrapper is an empty object';
			} else if (e instanceof z.ZodError) {
				nodeError.context.outputParserFailReason =
					'Model output does not match the expected schema';
			}

			logAiEvent(this.context, 'ai-output-parsed', {
				text,
				response: e.message ?? e,
			});

			this.context.addOutputData(NodeConnectionTypes.AiOutputParser, index, nodeError);
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
		} else if (nodeVersion < 1.3) {
			returnSchema = z.object({
				output: zodSchema.optional(),
			});
		} else {
			returnSchema = z.object({
				output: zodSchema,
			});
		}

		return new N8nStructuredOutputParser(context, returnSchema);
	}

	getSchema() {
		return this.schema;
	}
}
