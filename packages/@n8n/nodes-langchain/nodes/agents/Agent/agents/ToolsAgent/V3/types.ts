import type { ContentBlock } from '@langchain/core/messages';
import type {
	ToolCallData,
	ToolCallRequest,
	AgentResult,
	RequestResponseMetadata as SharedRequestResponseMetadata,
} from '@utils/agent-execution';
import type { IBinaryData, IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';

// Re-export shared types for backwards compatibility
export type { ToolCallData, ToolCallRequest, AgentResult };

// Use the shared metadata type directly (it already includes previousRequests)
export type RequestResponseMetadata = SharedRequestResponseMetadata;

// Keep the IntermediateStep type for compatibility
export type IntermediateStep = {
	action: {
		tool: string;
		toolInput: Record<string, unknown>;
		log: string;
		messageLog: unknown[];
		toolCallId: string;
		type: string;
	};
	observation?: string;
};

export type AgentOptions = {
	systemMessage?: string;
	maxIterations?: number;
	returnIntermediateSteps?: boolean;
	passthroughBinaryImages?: boolean;
	enableStreaming?: boolean;
	maxTokensFromMemory?: number;
};

export const BinaryDataToContentBlockFnKey = Symbol('binaryDataToContentBlock');

export type BinaryDataToContentBlockFn = (
	ctx: IExecuteFunctions | ISupplyDataFunctions,
	data: IBinaryData,
) => Promise<ContentBlock | null>;

declare module '@langchain/core/language_models/chat_models' {
	interface BaseChatModel {
		/**
		 * Custom transform to support platform specific content blocks
		 */
		[BinaryDataToContentBlockFnKey]?: BinaryDataToContentBlockFn;
	}
}
