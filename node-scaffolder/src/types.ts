export type AuthType = 'none' | 'apiKey' | 'oAuth2';

export interface OperationSpec {
	name: string;
	value: string;
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	path: string;
	description?: string;
}

export interface ResourceSpec {
	name: string;
	value: string;
	operations: OperationSpec[];
}

export interface NodeSpec {
	name: string;
	displayName: string;
	description: string;
	baseUrl: string;
	auth: AuthType;
	resources: ResourceSpec[];
	simulation?: boolean;
}

export interface BoundaryReport {
	root: string;
	written: string[];
	refused: Array<{ path: string; reason: string }>;
}
