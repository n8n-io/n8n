import type {
	INodeParameters,
	INodeProperties,
	INodePropertyOptions,
	ResourceMapperField,
} from 'n8n-workflow';
import type z from 'zod';

import type { JsonSchemaNodeMcpPocEndpoint } from '../node-mcp-poc.types';

export type JsonSchema = {
	type?: string | string[];
	title?: string;
	description?: string;
	default?: unknown;
	enum?: Array<string | number | boolean>;
	'x-enumNames'?: string[];
	const?: unknown;
	format?: string;
	pattern?: string;
	contentMediaType?: string;
	minimum?: number;
	maximum?: number;
	exclusiveMinimum?: number;
	exclusiveMaximum?: number;
	multipleOf?: number;
	minItems?: number;
	maxItems?: number;
	uniqueItems?: boolean;
	minProperties?: number;
	maxProperties?: number;
	properties?: Record<string, JsonSchema>;
	required?: string[];
	items?: JsonSchema;
	oneOf?: JsonSchema[];
	anyOf?: JsonSchema[];
	allOf?: JsonSchema[];
	if?: JsonSchema;
	then?: JsonSchema;
	not?: JsonSchema;
	additionalProperties?: boolean | JsonSchema;
	writeOnly?: boolean;
	'x-sensitive'?: boolean;
	'x-ordered'?: boolean;
	'x-selector'?: string;
	'x-resource-locator'?: boolean;
	'x-resource-mapper'?: { mode: string; resolver?: string };
	'x-dynamic'?: { resolver: string; dependsOn: string[] };
	'x-destructive'?: boolean;
};

export type DynamicParameterKind =
	| 'loadOptions'
	| 'declarativeOptions'
	| 'listSearch'
	| 'resourceMapper'
	| 'localResourceMapper';

export interface DynamicParameterDescriptor {
	path: string;
	property: INodeProperties;
	kind: DynamicParameterKind;
	methodName?: string;
	dependencies: string[];
}

export interface DeferredOptionsDescriptor {
	path: string;
	displayName: string;
	jsonSchema: JsonSchema;
	options: INodeProperties[];
}

export interface CompiledOperationTool {
	name: string;
	description: string;
	destructive: boolean;
	resource?: string;
	operation?: string;
	inputSchema: z.ZodType<Record<string, unknown>>;
	inputFields: z.ZodRawShape;
	jsonSchema: JsonSchema;
	properties: INodeProperties[];
	hiddenDefaults: INodeParameters;
	dynamicParameters: DynamicParameterDescriptor[];
	deferredOptions: DeferredOptionsDescriptor[];
}

export interface CompiledNodeToolset {
	endpoint: JsonSchemaNodeMcpPocEndpoint;
	tools: CompiledOperationTool[];
}

export interface ResolvedOption {
	name: string;
	value: string | number | boolean;
	description?: string;
	url?: string;
}

export interface DynamicResolutionResult {
	kind: 'options' | 'resourceLocator' | 'resourceMapperFields' | 'needsInput';
	appliesTo: string;
	missing?: string[];
	values?: ResolvedOption[];
	fields?: ResourceMapperField[];
	paginationToken?: string;
	next?: string;
}

export function isPropertyOption(value: unknown): value is INodePropertyOptions {
	return (
		typeof value === 'object' &&
		value !== null &&
		'name' in value &&
		'value' in value &&
		!('type' in value)
	);
}
