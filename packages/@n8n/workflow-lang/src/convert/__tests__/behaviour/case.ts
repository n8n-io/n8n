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
	http?: Record<
		string,
		{
			path: string;
			/**
			 * The answer of each request. A status of 400 or more is the response, as the runtime
			 * gives it (the v1 node reads the status and the body); `error` fails the request, as a
			 * refused connection does.
			 */
			responses: Array<{
				status?: number;
				body?: unknown;
				headers?: Record<string, string>;
				error?: string;
			}>;
		}
	>;
	/** Node names whose output the test compares. The default is every leaf of the converted run. */
	compare?: string[];
}

/** The port in the URLs of the case workflows. The oracle replaces it with the port of its server. */
export const ORACLE_PORT = 47123;
