import type { INodeTypeDescription } from 'n8n-workflow';
import type { z } from 'zod';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';

import type { ProgressReporter } from './progress-reporter';
import type { ResponseBuilder, StateUpdater } from './response-builder';
import type { WorkflowState } from '../../workflow-state';

/**
 * Error structure for tool execution
 */
export interface ToolError {
	message: string;
	code?: string;
	details?: any;
}

/**
 * Success result from tool execution
 */
export interface ToolSuccessResult<T> {
	success: true;
	data: T;
	message?: string;
	stateUpdates?: StateUpdater<typeof WorkflowState.State>;
}

/**
 * Error result from tool execution
 */
export interface ToolErrorResult {
	success: false;
	error: ToolError;
}

/**
 * Combined result type for tool execution
 */
export type ToolResult<T> = ToolSuccessResult<T> | ToolErrorResult;

/**
 * Context provided to tools during execution
 */
export interface ToolContext {
	reporter: ProgressReporter;
	responseBuilder: ResponseBuilder;
	nodeTypes: INodeTypeDescription[];
	config: LangGraphRunnableConfig;
	getCurrentTaskInput: () => unknown;
}

/**
 * Extended context with state access
 */
export interface ToolContextWithState extends ToolContext {
	state: typeof WorkflowState.State;
}

/**
 * Utility type to extract the output type from a tool result
 */
export type ExtractToolOutput<T> = T extends ToolResult<infer U> ? U : never;

/**
 * Utility type to infer the schema type from a Zod schema
 */
export type InferSchema<T> = T extends z.ZodType<infer U> ? U : never;

/**
 * Branded types for enhanced type safety
 */
export type NodeId = string & { __brand: 'NodeId' };
export type NodeType = string & { __brand: 'NodeType' };
export type ConnectionType = string & { __brand: 'ConnectionType' };

/**
 * Helper functions for branded types
 */
export const NodeId = (id: string): NodeId => id as NodeId;
export const NodeType = (type: string): NodeType => type as NodeType;
export const ConnectionType = (type: string): ConnectionType => type as ConnectionType;

/**
 * Common validation schemas
 */
export { z } from 'zod';

/**
 * Node position type
 */
export type Position = [x: number, y: number];

/**
 * Tool metadata for registration
 */
export interface ToolMetadata {
	name: string;
	description: string;
	category?: 'node' | 'connection' | 'search' | 'utility';
	version?: string;
}
