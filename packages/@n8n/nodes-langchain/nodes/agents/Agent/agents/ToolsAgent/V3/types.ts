import type {
	ToolCallData,
	ToolCallRequest,
	AgentResult,
	RequestResponseMetadata as SharedRequestResponseMetadata,
} from '@utils/agent-execution';

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
