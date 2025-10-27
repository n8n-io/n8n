import type { ToolCallData } from './helpers/buildSteps';
import type { ToolCallRequest } from './helpers/createEngineRequests';

export type RequestResponseMetadata = {
	itemIndex?: number;
	previousRequests: ToolCallData[];
};

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

export type AgentResult = {
	output: string;
	intermediateSteps?: IntermediateStep[];
	toolCalls?: ToolCallRequest[];
};

export type AgentOptions = {
	systemMessage?: string;
	maxIterations?: number;
	returnIntermediateSteps?: boolean;
	passthroughBinaryImages?: boolean;
	enableStreaming?: boolean;
	maxTokensFromMemory?: number;
};
