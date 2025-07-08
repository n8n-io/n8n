import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { N8nItemListOutputParser } from './N8nItemListOutputParser';
import { N8nOutputFixingParser } from './N8nOutputFixingParser';
import { N8nStructuredOutputParser } from './N8nStructuredOutputParser';

export type N8nOutputParser =
	| N8nOutputFixingParser
	| N8nStructuredOutputParser
	| N8nItemListOutputParser;

export { N8nOutputFixingParser, N8nItemListOutputParser, N8nStructuredOutputParser };

export async function getOptionalOutputParser(
	ctx: IExecuteFunctions,
	index: number = 0,
): Promise<N8nOutputParser | undefined> {
	let outputParser: N8nOutputParser | undefined;

	if (ctx.getNodeParameter('hasOutputParser', 0, true) === true) {
		outputParser = (await ctx.getInputConnectionData(
			NodeConnectionTypes.AiOutputParser,
			index,
		)) as N8nOutputParser;
	}

	return outputParser;
}
