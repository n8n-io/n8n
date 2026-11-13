/** The input of a behaviour case (`cases/<name>/case.json`). */
export interface BehaviourCase {
	description: string;
	trigger: {
		body?: unknown;
		headers?: Record<string, string>;
		query?: Record<string, string>;
		scheduledAt?: number;
	};
	/** Answers of the HTTP Request nodes, by node name. `path` is the first URL path segment. */
	http?: Record<string, { path: string; responses: Array<{ status?: number; body?: unknown }> }>;
	/** Node names whose output the test compares. The default is every leaf of the converted run. */
	compare?: string[];
}

/** The port in the URLs of the case workflows. The oracle replaces it with the port of its server. */
export const ORACLE_PORT = 47123;
