import type { IHttpRequestMethods } from 'n8n-workflow';

import type { Placement } from 'n8n-nodes-base/nodes/N8n/v2/define-overrides';

export type { Placement };

export interface Schema {
	type?: string;
	format?: string;
	enum?: unknown[];
	default?: unknown;
	description?: string;
	readOnly?: boolean;
	items?: Schema;
	properties?: Record<string, Schema>;
	required?: string[];
}

export type Location = 'path' | 'query' | 'body' | 'wholeBody' | 'flattened';

export interface ApiParameter {
	wire: string;
	name: string;
	location: Location;
	required: boolean;
	schema: Schema;
	description?: string;
	parent?: string;
}

export interface SpecOperation {
	operationId: string;
	tag: string;
	method: IHttpRequestMethods;
	apiPath: string;
	summary?: string;
	description?: string;
	scope?: string;
	emptyResponse: boolean;
	unsupported?: string;
	paginated: boolean;
	parameters: ApiParameter[];
}

export interface Field extends ApiParameter {
	nodeName: string;
	placement: Placement;
}

export interface ResolvedOperation extends SpecOperation {
	key: string;
	resource: string;
	operation: string;
	fields: Field[];
}

export interface ContractParam {
	api: string;
	placement: Placement;
	shape?: string;
	default?: unknown;
}

export interface ContractOperation {
	api: string;
	params: Record<string, ContractParam>;
}

export interface Contract {
	operations: Record<string, ContractOperation>;
	excluded: Record<string, string>;
}
