export interface ExpectationMismatch {
	path: string;
	expected: unknown;
	actual: unknown;
}

export function deepPartialMatch(
	expected: unknown,
	actual: unknown,
	path: string,
): ExpectationMismatch[] {
	// Array case
	if (Array.isArray(expected)) {
		if (!Array.isArray(actual)) {
			return [{ path, expected, actual }];
		}
		const mismatches: ExpectationMismatch[] = [];
		for (let i = 0; i < expected.length; i++) {
			if (i >= actual.length) {
				mismatches.push({ path: `${path}[${i}]`, expected: expected[i], actual: '(missing)' });
			} else {
				mismatches.push(...deepPartialMatch(expected[i], actual[i], `${path}[${i}]`));
			}
		}
		return mismatches;
	}

	// Object case (non-null, non-array)
	if (expected !== null && typeof expected === 'object') {
		if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) {
			return [{ path, expected, actual }];
		}
		const mismatches: ExpectationMismatch[] = [];
		for (const key of Object.keys(expected)) {
			if (!(key in (actual as Record<string, unknown>))) {
				mismatches.push({
					path: `${path}.${key}`,
					expected: (expected as Record<string, unknown>)[key],
					actual: '(missing)',
				});
			} else {
				mismatches.push(
					...deepPartialMatch(
						(expected as Record<string, unknown>)[key],
						(actual as Record<string, unknown>)[key],
						`${path}.${key}`,
					),
				);
			}
		}
		return mismatches;
	}

	// Primitive case
	if (expected === actual) {
		return [];
	}
	return [{ path, expected, actual }];
}

export function deepExactMatch(
	expected: unknown,
	actual: unknown,
	path: string,
): ExpectationMismatch[] {
	// Array case
	if (Array.isArray(expected)) {
		if (!Array.isArray(actual)) {
			return [{ path, expected, actual }];
		}
		const mismatches: ExpectationMismatch[] = [];
		const maxLen = Math.max(expected.length, actual.length);
		for (let i = 0; i < maxLen; i++) {
			if (i >= expected.length) {
				mismatches.push({ path: `${path}[${i}]`, expected: '(unexpected)', actual: actual[i] });
			} else if (i >= actual.length) {
				mismatches.push({ path: `${path}[${i}]`, expected: expected[i], actual: '(missing)' });
			} else {
				mismatches.push(...deepExactMatch(expected[i], actual[i], `${path}[${i}]`));
			}
		}
		return mismatches;
	}

	// Object case (non-null, non-array)
	if (expected !== null && typeof expected === 'object') {
		if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) {
			return [{ path, expected, actual }];
		}
		const expectedObj = expected as Record<string, unknown>;
		const actualObj = actual as Record<string, unknown>;
		const mismatches: ExpectationMismatch[] = [];

		// Check expected keys
		for (const key of Object.keys(expectedObj)) {
			if (!(key in actualObj)) {
				mismatches.push({
					path: `${path}.${key}`,
					expected: expectedObj[key],
					actual: '(missing)',
				});
			} else {
				mismatches.push(...deepExactMatch(expectedObj[key], actualObj[key], `${path}.${key}`));
			}
		}
		// Check extra keys in actual
		for (const key of Object.keys(actualObj)) {
			if (!(key in expectedObj)) {
				mismatches.push({
					path: `${path}.${key}`,
					expected: '(unexpected)',
					actual: actualObj[key],
				});
			}
		}
		return mismatches;
	}

	// Primitive case
	if (expected === actual) {
		return [];
	}
	return [{ path, expected, actual }];
}

// ---------------------------------------------------------------------------
// Types re-exported for test use
// ---------------------------------------------------------------------------

export interface NockRequestRecord {
	timestamp: number;
	method: string;
	url: string;
	requestHeaders: Record<string, string>;
	requestBody?: unknown;
	responseStatus: number;
	responseHeaders: Record<string, string>;
	responseBody?: unknown;
}

interface NodeOutputEntry {
	items: unknown[];
	outputIndex: number;
}

interface NodeExecutionInfo {
	outputs: NodeOutputEntry[];
	error?: string;
	startTime?: number;
	executionTime?: number;
}

export type NodeOutputMap = Record<string, NodeExecutionInfo>;

export interface RequestExpectation {
	requestBody?: unknown;
	requestHeaders?: Record<string, string>;
}

export interface Expectations {
	requests?: Record<string, RequestExpectation>;
	nodes?: Record<string, { items?: unknown[] }>;
}

// ---------------------------------------------------------------------------
// matchRequests
// ---------------------------------------------------------------------------

function parseRequestKey(key: string): { method: string; url: string; occurrence: number } {
	const hashIdx = key.lastIndexOf('#');
	let occurrence = 1;
	let methodUrl = key;
	if (hashIdx !== -1) {
		const suffix = key.slice(hashIdx + 1);
		const parsed = parseInt(suffix, 10);
		if (!isNaN(parsed)) {
			occurrence = parsed;
			methodUrl = key.slice(0, hashIdx);
		}
	}
	const spaceIdx = methodUrl.indexOf(' ');
	const method = methodUrl.slice(0, spaceIdx);
	const url = methodUrl.slice(spaceIdx + 1);
	return { method, url, occurrence };
}

export function matchRequests(
	expectations: Record<string, RequestExpectation>,
	requests: NockRequestRecord[],
): ExpectationMismatch[] {
	const mismatches: ExpectationMismatch[] = [];

	for (const [key, expected] of Object.entries(expectations)) {
		const { method, url, occurrence } = parseRequestKey(key);
		// Match URLs with or without scheme (nock may strip https://)
		const urlWithoutScheme = url.replace(/^https?:\/\//, '');
		const matching = requests.filter(
			(r) => r.method === method && (r.url === url || r.url === urlWithoutScheme),
		);

		if (matching.length < occurrence) {
			mismatches.push({
				path: `requests[${key}]`,
				expected: 'request exists',
				actual: '(no matching request)',
			});
			continue;
		}

		const request = matching[occurrence - 1];
		if (expected.requestBody !== undefined) {
			mismatches.push(
				...deepExactMatch(
					expected.requestBody,
					request.requestBody,
					`requests[${key}].requestBody`,
				),
			);
		}
		if (expected.requestHeaders !== undefined) {
			mismatches.push(
				...deepPartialMatch(
					expected.requestHeaders,
					request.requestHeaders,
					`requests[${key}].requestHeaders`,
				),
			);
		}
	}

	return mismatches;
}

// ---------------------------------------------------------------------------
// matchNodes
// ---------------------------------------------------------------------------

export function matchNodes(
	expectations: Record<string, { items?: unknown[] }>,
	nodeOutputs: NodeOutputMap,
): ExpectationMismatch[] {
	const mismatches: ExpectationMismatch[] = [];

	for (const [nodeName, expected] of Object.entries(expectations)) {
		const info = nodeOutputs[nodeName];
		if (!info) {
			mismatches.push({
				path: `nodes[${nodeName}]`,
				expected: 'node exists',
				actual: '(node not found)',
			});
			continue;
		}

		if (expected.items !== undefined) {
			const output = info.outputs.find((o) => o.outputIndex === 0);
			if (!output) {
				mismatches.push({
					path: `nodes[${nodeName}]`,
					expected: 'output at index 0',
					actual: '(no output at index 0)',
				});
				continue;
			}
			mismatches.push(
				...deepPartialMatch(expected.items, output.items, `nodes[${nodeName}].items`),
			);
		}
	}

	return mismatches;
}

// ---------------------------------------------------------------------------
// checkExpectations
// ---------------------------------------------------------------------------

export function checkExpectations(
	expectations: Expectations,
	requests: NockRequestRecord[],
	nodeOutputs: NodeOutputMap,
): ExpectationMismatch[] {
	const mismatches: ExpectationMismatch[] = [];

	if (expectations.requests) {
		mismatches.push(...matchRequests(expectations.requests, requests));
	}

	if (expectations.nodes) {
		mismatches.push(...matchNodes(expectations.nodes, nodeOutputs));
	}

	return mismatches;
}
