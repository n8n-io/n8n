import type { ToolCallData, ToolCallRequest, AgentResult } from '@utils/agent-execution';

// Re-export shared types for backwards compatibility
export type { ToolCallData, ToolCallRequest, AgentResult };

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

export type TracingMetadataEntry = {
	key: string;
	type?: 'stringValue' | 'numberValue' | 'booleanValue' | 'arrayValue' | 'objectValue';
	stringValue?: string;
	numberValue?: string;
	booleanValue?: string;
	arrayValue?: string;
	objectValue?: string;
	value?: unknown; // For backwards compatibility
};

export type AgentOptions = {
	systemMessage?: string;
	maxIterations?: number;
	returnIntermediateSteps?: boolean;
	passthroughBinaryImages?: boolean;
	enableStreaming?: boolean;
	maxTokensFromMemory?: number;
	tracingMetadata?: {
		values?: TracingMetadataEntry[];
	};
};
