import type { ConvertOptions } from '../../index.ts';

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
				/**
				 * The path of the request that gets this answer. Without it, the answers go out in
				 * the order of the requests. A v1 node sends the requests of its items at the same
				 * time, so a case with a different path for each item gives the path.
				 */
				url?: string;
				/**
				 * True for an answer that the runtime cannot store (a file over its largest size).
				 * The compiled node gets the error of that limit, and the fallback host runs the v1
				 * node, which gets the answer from the server of the test.
				 */
				runtimeLimit?: boolean;
			}>;
		}
	>;
	/**
	 * Answers of the `deduplication` service (spec 9.9), by node name, in the order of the calls
	 * of the node. The oracle gives them to the v1 node, and the test to the converted code.
	 */
	services?: Record<string, unknown[]>;
	/** Node names whose output the test compares. The default is every leaf of the converted run. */
	compare?: string[];
	/**
	 * Node names whose `pairedItem` of each output item the recording keeps, in the runs of the
	 * node (`pairedItems` of `expected.json`). The test does not compare them: the recording
	 * states what n8n saves.
	 */
	pairedItems?: string[];
	/**
	 * True to record the number of items of each output, for each run of each node
	 * (`runs` of `expected.json`). The test does not compare them.
	 */
	recordRuns?: boolean;
	/** True when the converter should refuse this case (no compiled form for the path). */
	expectRefusal?: boolean;
	/**
	 * True for a case whose compared nodes run more than once in the engine form: the
	 * converted run then gives the items of all their runs, as the recording has them.
	 */
	runData?: boolean;
	/**
	 * True when the runtime of the case stores a response as binary data
	 * (`NodeSources.storesResponses`): the response format "file" of an HTTP Request node.
	 */
	storesResponses?: boolean;
	/**
	 * The data of the credentials of the nodes for the v1 run, by credential type. The
	 * compiled run has no credential data: a credential is a slot name there.
	 */
	credentials?: Record<string, Record<string, unknown>>;
}

/** The options of the converter for a case. */
export function convertOptionsOf(spec: BehaviourCase): ConvertOptions {
	const options: ConvertOptions = spec.runData === true ? { runData: true } : {};
	if (spec.storesResponses !== true) return options;
	return {
		...options,
		nodeSources: {
			entry: () => undefined,
			readFile: () => undefined,
			description: () => undefined,
			storesResponses: true,
		},
	};
}

type Answer = NonNullable<BehaviourCase['http']>[string]['responses'][number];

/**
 * The answer of the server of a case to a request: the answers of the node whose `path` is
 * the first segment of the path. `counters` holds the number of requests of each node.
 */
export function answerOf(
	spec: BehaviourCase,
	pathname: string,
	counters: Map<string, number>,
): { step: string; answer: Answer } | undefined {
	const segment = pathname.split('/')[1] ?? '';
	const step = Object.entries(spec.http ?? {}).find(([, v]) => v.path === segment);
	if (!step) return undefined;
	const n = counters.get(step[0]) ?? 0;
	counters.set(step[0], n + 1);
	const responses = step[1].responses;
	// Several answers with one path: the requests of that path get them in their order, and
	// the last one again after that (a request that fails once, then gives an answer).
	const same = responses.filter((r) => r.url === pathname);
	if (same.length > 0) {
		const key = `${step[0]}|${pathname}`;
		const k = counters.get(key) ?? 0;
		counters.set(key, k + 1);
		return { step: step[0], answer: same[Math.min(k, same.length - 1)] };
	}
	return { step: step[0], answer: responses[n % responses.length] };
}

/**
 * The status, the headers and the body text of an answer. A text body of an answer with
 * `headers` goes out as it is. Each other body goes out as JSON.
 */
export function answerParts(answer: Answer): {
	status: number;
	headers: Record<string, string>;
	body: string;
} {
	const status = answer.status ?? 200;
	if (answer.headers !== undefined && typeof answer.body === 'string') {
		return { status, headers: answer.headers, body: answer.body };
	}
	return {
		status,
		headers: { 'content-type': 'application/json', ...answer.headers },
		body: JSON.stringify(answer.body ?? {}),
	};
}

/** The port in the URLs of the case workflows. The oracle replaces it with the port of its server. */
export const ORACLE_PORT = 47123;
