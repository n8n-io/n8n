import type { IExecuteFunctions } from 'n8n-workflow';
import { BaseChatModel } from 'langchain/chat_models/base';
import { BaseChatModel as BaseChatModelCore } from '@langchain/core/language_models/chat_models';

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
export function isChatInstance(model: any): model is BaseChatModel | BaseChatModelCore {
	return model instanceof BaseChatModel || model instanceof BaseChatModelCore;
}
