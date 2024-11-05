import type { BaseOutputParser } from '@langchain/core/output_parsers';
import type { IExecuteFunctions } from 'n8n-workflow';

export async function extractParsedOutput(
	ctx: IExecuteFunctions,
	outputParser: BaseOutputParser<unknown>,
	output: string,
): Promise<Record<string, unknown> | undefined> {
	const parsedOutput = (await outputParser.parse(output)) as {
		output: Record<string, unknown>;
	};

	if (ctx.getNode().typeVersion <= 1.6) {
		return parsedOutput;
	}
	// For 1.7 and above, we try to extract the output from the parsed output
	// with fallback to the original output if it's not present
	return parsedOutput?.output ?? parsedOutput;
}
