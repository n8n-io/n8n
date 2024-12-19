import type { IExecuteFunctions } from 'n8n-workflow';

import { N8nItemListOutputParser } from './N8nItemListOutputParser';
import { N8nOutputFixingParser } from './N8nOutputFixingParser';
import { N8nStructuredOutputParser } from './N8nStructuredOutputParser';

export type N8nOutputParser =
	| N8nOutputFixingParser
	| N8nStructuredOutputParser
	| N8nItemListOutputParser;

export { N8nOutputFixingParser, N8nItemListOutputParser, N8nStructuredOutputParser };

export async function getOptionalOutputParsers(ctx: IExecuteFunctions): Promise<N8nOutputParser[]> {
	const outputParsers: N8nOutputParser[] = [];

	if (ctx.getNodeParameter('hasOutputParser', 0, true) === true) {
		outputParsers.push((await ctx.aiRootContext.getStructuredOutputParser()) as N8nOutputParser);
	}

	return outputParsers;
}
