import { NodeConnectionType, type IExecuteFunctions } from 'n8n-workflow';
import { BaseChatModel } from 'langchain/chat_models/base';
import { BaseChatModel as BaseChatModelCore } from '@langchain/core/language_models/chat_models';
import type { BaseOutputParser } from '@langchain/core/output_parsers';

export function getMetadataFiltersValues(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Record<string, never> | undefined {
	const metadata = ctx.getNodeParameter('options.metadata.metadataValues', itemIndex, []) as Array<{
		name: string;
		value: string;
	}>;
	if (metadata.length > 0) {
		return metadata.reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {});
	}

	return undefined;
}

// TODO: Remove this function once langchain package is updated to 0.1.x
// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
export function isChatInstance(model: any): model is BaseChatModel | BaseChatModelCore {
	return model instanceof BaseChatModel || model instanceof BaseChatModelCore;
}

export async function getOptionalOutputParsers(
	ctx: IExecuteFunctions,
): Promise<Array<BaseOutputParser<unknown>>> {
	let outputParsers: BaseOutputParser[] = [];

	if (ctx.getNodeParameter('hasOutputParser', 0, true) === true) {
		outputParsers = (await ctx.getInputConnectionData(
			NodeConnectionType.AiOutputParser,
			0,
		)) as BaseOutputParser[];
	}

	return outputParsers;
}
