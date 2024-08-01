import type { DynamicStructuredToolInput } from '@langchain/core/tools';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { StructuredOutputParser } from 'langchain/output_parsers';

export class N8nTool extends DynamicStructuredTool {
	private context: IExecuteFunctions;

	private fallbackDescription: string;

	constructor(
		context: IExecuteFunctions,
		fields: DynamicStructuredToolInput & { fallbackDescription?: string },
	) {
		super(fields);

		this.context = context;
		this.fallbackDescription = fields.fallbackDescription ?? '';
	}

	asDynamicTool(): DynamicTool {
		const { name, func, schema, context } = this;

		const parser = new StructuredOutputParser(schema);
		// const formattingInstructions = parser.getFormatInstructions();

		// console.log({ formattingInstructions });

		const wrappedFunc = async function (query: string) {
			console.log('TOOL CALLED');

			try {
				const parsedQuery = await parser.parse(query);

				console.log({ parsedQuery });

				const result = await func(parsedQuery);
				console.log({ result });

				return result;
			} catch (e) {
				console.log('ERROR', e);

				const { index } = context.addInputData(NodeConnectionType.AiTool, [[{ json: { query } }]]);
				void context.addOutputData(NodeConnectionType.AiTool, index, e);

				return e.toString();
			}
		};

		console.log('CONVERTED to DynamicTool');

		return new DynamicTool({
			name,
			description: this.fallbackDescription,
			// description + '\n\n' + formattingInstructions.replace(/\{/g, '{{').replace(/\}/g, '}}'),
			func: wrappedFunc,
		});
	}
}
