import { writeFileSync } from 'fs';
import { join } from 'path';
import nock from 'nock';
import type { IConnections, INode, IPinData, IRunData } from 'n8n-workflow';
import { parseDataFlowCode } from './dataflow-parser';
import { loadFixtures } from './fixture-loader';
import {
	resolveImports,
	executeWorkflow,
	extractPinData,
	patchFilterConditions,
} from './execution-utils';
import { checkExpectations } from './expectation-matcher';
import type { ExpectationMismatch, NockRequestRecord, NodeOutputMap } from './expectation-matcher';

// ---------------------------------------------------------------------------
// Node output extraction
// ---------------------------------------------------------------------------

interface NodeOutputEntry {
	items: unknown[];
	outputIndex: number;
}

interface SubWorkflowExecutionEntry {
	name: string;
	executedNodes: string[];
	nodeOutputs: NodeOutputMap;
}

interface NockTraceEntry {
	interceptors: string[];
	consumed: string[];
	pending: string[];
	requests: NockRequestRecord[];
}

interface FixtureExecutionEntry {
	status: 'pass' | 'error' | 'skip';
	error?: string;
	reason?: string;
	executedNodes?: string[];
	nodeOutputs?: NodeOutputMap;
	subWorkflows?: SubWorkflowExecutionEntry[];
	nockTrace?: NockTraceEntry;
	expectationMismatches?: ExpectationMismatch[];
}

const executionData: Record<string, FixtureExecutionEntry> = {};

function extractNodeOutputs(runData?: IRunData): NodeOutputMap {
	const result: NodeOutputMap = {};
	if (!runData) return result;
	for (const [nodeName, taskDataArr] of Object.entries(runData)) {
		const taskData = taskDataArr[0];
		if (!taskData) continue;

		const outputs: NodeOutputEntry[] = [];
		const mainOutputs = taskData.data?.main;
		if (mainOutputs) {
			for (let i = 0; i < mainOutputs.length; i++) {
				const items = mainOutputs[i];
				if (items && items.length > 0) {
					outputs.push({
						items: items.map((item) => item.json),
						outputIndex: i,
					});
				}
			}
		}

		const error = taskData.error?.message;
		if (outputs.length > 0 || error) {
			result[nodeName] = {
				outputs,
				error,
				startTime: taskData.startTime,
				executionTime: taskData.executionTime,
			};
		}
	}
	return result;
}

// ---------------------------------------------------------------------------
// Nock helpers
// ---------------------------------------------------------------------------

interface NockModule {
	setupNock: () => nock.Scope[] | void;
}

function loadNockModule(fixtureDir: string): NockModule | undefined {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		return require(join(__dirname, '__fixtures__', fixtureDir, 'nock')) as NockModule;
	} catch {
		return undefined;
	}
}

function parseJsonSafe(str: string): unknown {
	try {
		return JSON.parse(str) as unknown;
	} catch {
		return str || undefined;
	}
}

function rawHeadersToRecord(raw: string[]): Record<string, string> {
	const result: Record<string, string> = {};
	for (let i = 0; i < raw.length; i += 2) {
		result[raw[i].toLowerCase()] = raw[i + 1];
	}
	return result;
}

function attachNockListeners(scopes: nock.Scope[], log: NockRequestRecord[]): void {
	for (const scope of scopes) {
		scope.on(
			'request',
			(
				req: { method: string; path: string; headers: Record<string, string> },
				interceptor: { statusCode: number; body: unknown; rawHeaders: string[] },
				body: string,
			) => {
				const host =
					(interceptor as unknown as { __nock_scopeHost: string }).__nock_scopeHost ?? '';
				log.push({
					timestamp: Date.now(),
					method: req.method,
					url: `${host}${req.path}`,
					requestHeaders: req.headers,
					requestBody: parseJsonSafe(body),
					responseStatus: interceptor.statusCode,
					responseHeaders: rawHeadersToRecord(interceptor.rawHeaders ?? []),
					responseBody:
						typeof interceptor.body === 'string'
							? parseJsonSafe(interceptor.body)
							: interceptor.body,
				});
			},
		);
	}
}

/**
 * Strip pin data for httpRequest nodes so they execute against nock interceptors.
 */
function stripHttpPinData(
	pinData: IPinData,
	nodes: Array<{ name: string; type: string }>,
): IPinData {
	const httpNodeNames = new Set(
		nodes.filter((n) => n.type === 'n8n-nodes-base.httpRequest').map((n) => n.name),
	);
	const filtered: IPinData = {};
	for (const [name, data] of Object.entries(pinData)) {
		if (!httpNodeNames.has(name)) {
			filtered[name] = data;
		}
	}
	return filtered;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Fixture execution with pin data', () => {
	beforeAll(async () => {
		await resolveImports();
	}, 120_000);

	afterAll(() => {
		writeFileSync(
			join(__dirname, '__fixtures__', 'execution-data.json'),
			JSON.stringify(executionData, null, 2) + '\n',
		);
	});

	afterEach(() => {
		nock.cleanAll();
	});

	const fixtures = loadFixtures();

	for (const fixture of fixtures) {
		// Only run execution tests for fixtures with pin data or nock
		if (!fixture.hasPinData && !fixture.hasNock) {
			continue;
		}

		if (fixture.skip) {
			executionData[fixture.dir] = { status: 'skip', reason: fixture.skip };
			it.skip(`${fixture.title} [execution]`, () => {});
			continue;
		}

		it(`${fixture.title} [execution]`, async () => {
			// Step 1: Parse data-flow code → WorkflowJSON
			const parsed = parseDataFlowCode(fixture.input);

			// Step 2: Extract pin data from fixture's pin-data.json
			let pinData = extractPinData({ pinData: fixture.pinData as Record<string, unknown> });

			// Step 3: Patch filter conditions
			patchFilterConditions(parsed.nodes as Array<{ parameters?: Record<string, unknown> }>);

			// Step 3b: Inject pin data for Wait nodes
			for (const nd of parsed.nodes as Array<{ name: string; type: string }>) {
				if (nd.type === 'n8n-nodes-base.wait' && !pinData[nd.name]) {
					pinData[nd.name] = [{ json: {} }];
				}
			}

			// Step 3c: If fixture has nock interceptors, set them up and strip HTTP pin data
			let nockInterceptors: string[] = [];
			const nockRequests: NockRequestRecord[] = [];
			if (fixture.hasNock) {
				const nockModule = loadNockModule(fixture.dir);
				if (nockModule) {
					const scopes = nockModule.setupNock();
					if (scopes) {
						attachNockListeners(scopes, nockRequests);
					}
					nockInterceptors = [...nock.pendingMocks()];
					pinData = stripHttpPinData(
						pinData,
						parsed.nodes as Array<{ name: string; type: string }>,
					);
				}
			}

			// Step 4: Execute with pin data
			const result = await executeWorkflow(
				{
					name: fixture.dir,
					nodes: parsed.nodes as unknown as INode[],
					connections: parsed.connections as unknown as IConnections,
				},
				pinData,
			);

			// Step 4b: Capture nock trace
			let nockTrace: NockTraceEntry | undefined;
			if (nockInterceptors.length > 0) {
				const pending = nock.pendingMocks();
				const consumed = nockInterceptors.filter((i) => !pending.includes(i));
				nockTrace = { interceptors: nockInterceptors, consumed, pending, requests: nockRequests };
			}

			// Step 5: Collect per-node output data
			const nodeOutputs = extractNodeOutputs(result.run?.data?.resultData?.runData);

			// Step 6: Collect sub-workflow output data
			const subWorkflows = result.subWorkflowRuns?.map((entry) => {
				const runData = entry.run?.data?.resultData?.runData;
				return {
					name: entry.name,
					executedNodes: Object.keys(runData ?? {}),
					nodeOutputs: extractNodeOutputs(runData),
				};
			});

			// Step 7: Check expectations if present
			let expectationMismatches: ExpectationMismatch[] | undefined;
			if (fixture.hasExpectations && fixture.expectations) {
				const allNodeOutputs: NodeOutputMap = { ...nodeOutputs };
				if (subWorkflows) {
					for (const sw of subWorkflows) {
						Object.assign(allNodeOutputs, sw.nodeOutputs);
					}
				}
				expectationMismatches = checkExpectations(
					fixture.expectations,
					nockRequests,
					allNodeOutputs,
				);
			}

			executionData[fixture.dir] = {
				status: result.success ? 'pass' : 'error',
				error: result.error,
				executedNodes: result.executedNodes,
				nodeOutputs,
				subWorkflows: subWorkflows && subWorkflows.length > 0 ? subWorkflows : undefined,
				nockTrace,
				expectationMismatches,
			};

			expect(result.success).toBe(true);
			if (expectationMismatches) {
				expect(expectationMismatches).toHaveLength(0);
			}
		});
	}
});
