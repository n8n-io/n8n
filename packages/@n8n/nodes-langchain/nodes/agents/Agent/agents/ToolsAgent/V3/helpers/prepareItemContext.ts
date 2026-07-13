import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ChatPromptTemplate } from '@langchain/core/prompts';
import type { DynamicStructuredTool, Tool } from '@langchain/classic/tools';
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, ISupplyDataFunctions, EngineResponse } from 'n8n-workflow';

import {
	buildSteps,
	type ToolCallData,
	type RequestResponseMetadata,
} from '@utils/agent-execution';
import { getPromptInputByType } from '@utils/helpers';
import { getOptionalOutputParser } from '@utils/output_parsers/N8nOutputParser';
import type { N8nOutputParser } from '@utils/output_parsers/N8nOutputParser';

import { getTools, prepareMessages, preparePrompt } from '../../common';
import type { AgentOptions } from '../types';

/**
 * Context specific to a single item's processing
 */
export type ItemContext = {
	itemIndex: number;
	input: string;
	steps: ToolCallData[];
	tools: Array<DynamicStructuredTool | Tool>;
	prompt: ChatPromptTemplate;
	options: AgentOptions;
	outputParser: N8nOutputParser | undefined;
	useNativeStructuredOutput: boolean;
};

/**
 * Prepares the context for processing a single item.
 * This includes loading steps, input, tools, prompt, and options.
 *
 * @param ctx - The execution context
 * @param itemIndex - The index of the item to process
 * @param response - Optional engine response with previous tool calls
 * @param model - Connected chat model (used by prepareMessages to pick the
 *   right binary content format)
 * @param useNativeStructuredOutput - Whether the parser's schema was bound
 *   natively on the model upstream; if so, skip the synthetic format tool
 *   and the prompt formatting instructions
 * @returns ItemContext containing all item-specific state
 */
export async function prepareItemContext(
	ctx: IExecuteFunctions | ISupplyDataFunctions,
	itemIndex: number,
	response: EngineResponse<RequestResponseMetadata> | undefined,
	model: BaseChatModel,
	useNativeStructuredOutput: boolean = false,
): Promise<ItemContext> {
	const steps = buildSteps(response, itemIndex);

	const input = getPromptInputByType({
		ctx,
		i: itemIndex,
		inputKey: 'text',
		promptTypeKey: 'promptType',
	});
	if (input === undefined) {
		throw new NodeOperationError(ctx.getNode(), 'The "text" parameter is empty.');
	}

	const outputParser = await getOptionalOutputParser(ctx, itemIndex);

	// When the connected chat model accepts the parser's schema as native
	// constrained-decoding configuration (applied upstream in `executeBatch`),
	// skip the legacy synthetic `format_final_json_response` tool and the
	// prompt formatting instructions — the model emits schema-conformant JSON
	// by construction and the parser still validates the final response.
	const promptOutputParser = useNativeStructuredOutput ? undefined : outputParser;

	const tools = await getTools(ctx, promptOutputParser);
	const options = ctx.getNodeParameter('options', itemIndex) as AgentOptions;

	if (options.enableStreaming === undefined) {
		options.enableStreaming = true;
	}

	// Prepare the prompt messages and prompt template.
	const messages = await prepareMessages(ctx, itemIndex, {
		systemMessage: options.systemMessage,
		passthroughBinaryImages: options.passthroughBinaryImages ?? true,
		passthroughBinaryPdfs: options.passthroughBinaryPdfs ?? false,
		outputParser: promptOutputParser,
		model,
	});
	const prompt: ChatPromptTemplate = preparePrompt(messages);

	return {
		itemIndex,
		input,
		steps,
		tools,
		prompt,
		options,
		outputParser,
		useNativeStructuredOutput,
	};
}
