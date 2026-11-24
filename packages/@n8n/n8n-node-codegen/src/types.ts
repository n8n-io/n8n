import type { INodeProperties } from 'n8n-workflow';

export type HttpMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';

export interface Schema {
	type?: string;
	format?: string;
	enum?: unknown[];
	default?: unknown;
	minimum?: number;
	maximum?: number;
	description?: string;
	readOnly?: boolean;
	deprecated?: boolean;
	items?: Schema;
	properties?: Record<string, Schema>;
	anyOf?: Schema[];
	required?: string[];
	[key: string]: unknown;
}

export type ParameterLocation = 'path' | 'query' | 'body' | 'wholeBody';

export interface ApiParameter {
	name: string;
	location: ParameterLocation;
	required: boolean;
	deprecated: boolean;
	schema: Schema;
	description?: string;
	property?: string;
}

export interface SpecGroup {
	name: string;
	displayName: string;
}

export interface SpecTag {
	name: string;
	displayName: string;
	group: SpecGroup;
}

export interface SpecOperation {
	operationId: string;
	summary: string;
	method: HttpMethod;
	apiPath: string;
	tag: SpecTag;
	deprecated: boolean;
	paginated: boolean;
	emptyResponse: boolean;
	parameters: ApiParameter[];
	blockers: string[];
}

export interface Spec {
	operations: SpecOperation[];
}

export interface SpecOptions {
	ignoredHeaderParameters: string[];
	cursorParameter: string;
	offsetParameter: string;
	limitParameter: string;
	nextCursorProperty: string;
	itemsProperty: string;
}

export interface GenerateConfig {
	envelopeFile: string;
	routesFile: string;
	overridesFile: string;
	outputFile: string;
	spec: SpecOptions;
}

export interface Resource {
	id: string;
	displayName: string;
}

export interface OperationRow {
	operation: SpecOperation;
	resource: Resource;
	excludeReason?: string;
	isDefault: boolean;
	fields: Record<string, Partial<INodeProperties>>;
}
