import type { INodeParameters } from 'n8n-workflow';
import type { ZodIssue } from 'zod';

import type { AddedNode, NodeDetails, NodeSearchResult } from './nodes';

/**
 * Types of progress updates
 */
export type ProgressUpdateType = 'input' | 'output' | 'progress' | 'error';

/**
 * Progress update during tool execution
 */
export interface ProgressUpdate<T = Record<string, unknown>> {
	type: ProgressUpdateType;
	data: T;
	timestamp?: string;
}

/**
 * Tool progress message for streaming updates
 */
export interface ToolProgressMessage<TToolName extends string = string> {
	type: 'tool';
	toolName: TToolName;
	toolCallId?: string;
	status: 'running' | 'completed' | 'error';
	updates: ProgressUpdate[];
	displayTitle?: string; // Name of tool action in UI, for example "Adding nodes"
	customDisplayTitle?: string; // Custom name for tool action in UI, for example "Adding Gmail node"
}

/**
 * Tool execution error
 */
export interface ToolError {
	message: string;
	code?: string;
	details?: ZodIssue[] | Record<string, unknown>;
}

/**
 * Progress reporter interface for tools
 */
export interface ProgressReporter {
	start: <T>(input: T, options?: { customDisplayTitle: string }) => void;
	progress: (message: string, data?: Record<string, unknown>) => void;
	complete: <T>(output: T) => void;
	error: (error: ToolError) => void;
	createBatchReporter: (scope: string) => BatchReporter;
}

/**
 * Batch progress reporter for multi-item operations
 */
export interface BatchReporter {
	init: (total: number) => void;
	next: (itemDescription: string) => void;
	complete: () => void;
}

/**
 * Output type for update node parameters tool
 */
export interface UpdateNodeParametersOutput {
	nodeId: string;
	nodeName: string;
	nodeType: string;
	updatedParameters: INodeParameters;
	appliedChanges: string[];
	message: string;
}

/**
 * Output type for add node tool
 */
export interface AddNodeOutput {
	addedNode: AddedNode;
	message: string;
}

/**
 * Output type for connect nodes tool
 */
export interface ConnectNodesOutput {
	sourceNode: string;
	targetNode: string;
	connectionType: string;
	swapped: boolean;
	message: string;
	found: {
		sourceNode: boolean;
		targetNode: boolean;
	};
}

/**
 * Output type for remove node tool
 */
export interface RemoveNodeOutput {
	removedNodeId: string;
	removedNodeName: string;
	removedNodeType: string;
	connectionsRemoved: number;
	message: string;
}

/**
 * Output type for node details tool
 */
export interface NodeDetailsOutput {
	details: NodeDetails;
	found: boolean;
	message: string;
}

/**
 * Output type for node search tool
 */
export interface NodeSearchOutput {
	results: Array<{
		query: string;
		results: NodeSearchResult[];
	}>;
	totalResults: number;
	message: string;
}

/**
 * Output type for get node parameter tool
 */
export interface GetNodeParameterOutput {
	message: string; // This is only to report success or error, without actual value (we don't need to send it to the frontend)
}
