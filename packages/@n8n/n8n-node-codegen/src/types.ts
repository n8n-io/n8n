export type HttpMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';

export interface Schema {
	type?: string;
	format?: string;
	enum?: unknown[];
	default?: unknown;
	description?: string;
	readOnly?: boolean;
	deprecated?: boolean;
	items?: Schema;
	properties?: Record<string, Schema>;
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
	summary?: string;
	method: HttpMethod;
	apiPath: string;
	tag: SpecTag;
	deprecated: boolean;
	paginated: boolean;
	parameters: ApiParameter[];
	blockers: string[];
}

export interface Spec {
	tags: SpecTag[];
	operations: SpecOperation[];
}

export interface SpecOptions {
	ignoredHeaderParameters: string[];
	cursorParameter: string;
	limitParameter: string;
}
