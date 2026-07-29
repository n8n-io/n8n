import type { INodePropertyMode } from 'n8n-workflow';
import type {
	CompiledNodeToolset,
	CompiledOperationTool,
	DynamicParameterDescriptor,
} from '../json-schema/node-mcp-poc.types';

export type NodeActionFieldType =
	| 'array'
	| 'boolean'
	| 'choice'
	| 'json'
	| 'number'
	| 'object'
	| 'resource'
	| 'string';

export interface NodeActionChoice {
	value: string | number | boolean;
	label: string;
	description?: string;
}

export type NodeActionConditionOperator =
	| 'equals'
	| 'notEquals'
	| 'in'
	| 'greaterThan'
	| 'lessThan'
	| 'between'
	| 'startsWith'
	| 'endsWith'
	| 'contains'
	| 'matches'
	| 'exists';

export interface NodeActionCondition {
	field: string;
	operator: NodeActionConditionOperator;
	value?: unknown;
}

export interface NodeActionField {
	name: string;
	label: string;
	type: NodeActionFieldType;
	description?: string;
	required: boolean;
	default?: unknown;
	acceptsExpression?: boolean;
	choices?: NodeActionChoice[];
	accepts?: string[];
	fields?: NodeActionField[];
	items?: NodeActionField;
	when?: { all: NodeActionCondition[] };
	resolve?: { dependsOn: string[] };
}

export interface NodeActionSummary {
	id: string;
	node: {
		type: string;
		version: number;
		name: string;
	};
	name: string;
	description: string;
	destructive: boolean;
	requiresCredential: boolean;
	hasDynamicParameters: boolean;
}

export interface NodeActionDefinition {
	id: string;
	node: NodeActionSummary['node'];
	action: {
		resource?: string;
		operation: string;
		name: string;
		description: string;
		destructive: boolean;
	};
	input: {
		fields: NodeActionField[];
	};
}

export interface DynamicParameterSummary {
	path: string;
	dependsOn: string[];
}

export interface CompiledActionPlan {
	id: string;
	summary: NodeActionSummary;
	definition: NodeActionDefinition;
	toolset: CompiledNodeToolset;
	tool: CompiledOperationTool;
	dynamicParameters: DynamicParameterDescriptor[];
	resourceModesByPath: Map<string, readonly INodePropertyMode[]>;
}

export interface VisibleActionCatalog {
	endpoint: string;
	actions: readonly CompiledActionPlan[];
}

export interface SearchNodeActionsResult {
	actions: NodeActionSummary[];
	nextCursor: string | null;
}

export interface ResolveNodeParameterInput {
	actionId: string;
	parameter: string;
	knownInput: Record<string, unknown>;
	query?: string;
	cursor?: string;
}

export type ResolveNodeParameterResult =
	| {
			status: 'needsInput';
			parameter: string;
			missing: string[];
	  }
	| {
			status: 'resolved';
			parameter: string;
			options: Array<{
				label: string;
				value: string | number | boolean;
				description?: string;
			}>;
			field: NodeActionField | null;
			next: string[];
			nextCursor: string | null;
	  };
