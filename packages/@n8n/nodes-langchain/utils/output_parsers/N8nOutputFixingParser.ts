import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { AIMessage } from '@langchain/core/messages';
import { BaseOutputParser } from '@langchain/core/output_parsers';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import type { N8nStructuredOutputParser } from './N8nStructuredOutputParser';
import { NAIVE_FIX_PROMPT } from './prompt';
import { logAiEvent } from '../helpers';

export class N8nOutputFixingParser extends BaseOutputParser {
	private context: IExecuteFunctions;

	private model: BaseLanguageModel;

	private outputParser: N8nStructuredOutputParser;

	lc_namespace = ['langchain', 'output_parsers', 'fix'];

	constructor(
		context: IExecuteFunctions,
		model: BaseLanguageModel,
		outputParser: N8nStructuredOutputParser,
	) {
		super();
		this.context = context;
		this.model = model;
		this.outputParser = outputParser;
	}

	getRetryChain() {
		return NAIVE_FIX_PROMPT.pipe(this.model);
	}

	/**
	 * Attempts to parse the completion string using the output parser.
	 * If the initial parse fails, it tries to fix the output using a retry chain.
	 * @param completion The string to be parsed
	 * @returns The parsed response
	 * @throws Error if both parsing attempts fail
	 */
	async parse(completion: string, callbacks?: Callbacks) {
		const { index } = this.context.addInputData(NodeConnectionType.AiOutputParser, [
			[{ json: { action: 'parse', text: completion } }],
		]);

		try {
			// First attempt to parse the completion
			const response = await this.outputParser.parse(completion, callbacks, (e) => e);
			logAiEvent(this.context, 'ai-output-parsed', { text: completion, response });

			this.context.addOutputData(NodeConnectionType.AiOutputParser, index, [
				[{ json: { action: 'parse', response } }],
			]);

			return response;
		} catch (error) {
			try {
				// Second attempt: use retry chain to fix the output
				const result = (await this.getRetryChain().invoke({
					completion,
					error,
					instructions: this.getFormatInstructions(),
				})) as AIMessage;

				const resultText = result.content.toString();
				const parsed = await this.outputParser.parse(resultText, callbacks);

				// Add the successfully parsed output to the context
				this.context.addOutputData(NodeConnectionType.AiOutputParser, index, [
					[{ json: { action: 'parse', response: parsed } }],
				]);

				return parsed;
			} catch (autoParseError) {
				// If both attempts fail, add the error to the output and throw
				this.context.addOutputData(NodeConnectionType.AiOutputParser, index, autoParseError);
				throw autoParseError;
			}
		}
	}

	/**
	 * Method to get the format instructions for the parser.
	 * @returns The format instructions for the parser.
	 */
	getFormatInstructions() {
		return this.outputParser.getFormatInstructions();
	}

	getSchema() {
		return this.outputParser.schema;
	}
}
