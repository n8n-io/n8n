// --- Graph types (static analysis output) ---

export interface StaticGraph {
	nodes: StaticNode[];
	edges: StaticEdge[];
}

export interface StaticNode {
	/** Method name used as unique identifier */
	id: string;
	/** Description from decorator argument */
	label: string;
	type: 'trigger' | 'callable';
	/** HTTP method for trigger nodes */
	method?: string;
	/** URL path for trigger nodes */
	path?: string;
}

export interface StaticEdge {
	from: string;
	to: string;
	/** Branch condition: 'true', 'false', or 'case:xxx' */
	condition?: string;
}

// --- Execution trace types (runtime output) ---

export interface ExecutionTrace {
	nodes: TraceNode[];
	edges: TraceEdge[];
	startedAt: number;
	completedAt: number;
	status: 'success' | 'error';
	error?: string;
}

export interface TraceNode {
	id: string;
	label: string;
	type: 'trigger' | 'callable';
	input: unknown;
	output: unknown;
	startedAt: number;
	completedAt: number;
	error?: string;
}

export interface TraceEdge {
	from: string;
	to: string;
}

// --- Decorator metadata types ---

export interface ControllerMetadata {
	basePath: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface HttpMethodMetadata {
	method: HttpMethod;
	path: string;
	propertyKey: string;
}

export interface CallableMetadata {
	description: string;
	propertyKey: string;
}

export interface ClassMetadata {
	controller: ControllerMetadata;
	httpMethods: HttpMethodMetadata[];
	callables: CallableMetadata[];
}

export type Constructor = new (...args: unknown[]) => object;
