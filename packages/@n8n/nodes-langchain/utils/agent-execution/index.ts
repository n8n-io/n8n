/**
 * Agent Execution Utilities
 *
 * This module contains generalized utilities for agent execution that can be
 * reused across different agent types (Tools Agent, OpenAI Functions Agent, etc.).
 *
 * These utilities support engine-based tool execution, where tool calls are
 * delegated to the n8n workflow engine instead of being executed inline.
 */

export { createEngineRequests } from './createEngineRequests';
export { buildSteps } from './buildSteps';
export { processEventStream } from './processEventStream';
export { loadMemory, saveToMemory, saveToolResultsToMemory } from './memoryManagement';
export type {
	ToolCallRequest,
	ToolCallData,
	AgentResult,
	RequestResponseMetadata,
} from './types';
