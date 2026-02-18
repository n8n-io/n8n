/**
 * Lightweight workflow executor for evaluations.
 *
 * Executes a SimpleWorkflow with pin data using the n8n execution engine.
 * Service/API nodes use pin data (skipping real API calls). Utility nodes
 * (Set, If, Code, etc.) actually execute using their compiled dist
 * implementations, validating the workflow structure end-to-end.
 *
 * Node implementations are loaded directly from the compiled dist/ files in
 * nodes-base and nodes-langchain, bypassing the DI-based loader infrastructure
 * and its TypeScript path-alias issues.
 *
 * Uses path-based resolution to import WorkflowExecute and
 * ExecutionLifecycleHooks from @n8n/core dist without adding it as a package
 * dependency, following the NodeTestHarness pattern.
 */

import type {
	IExecuteFunctions,
	IPinData,
	IRun,
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { createDeferredPromise, createRunExecutionData, NodeHelpers, Workflow } from 'n8n-workflow';
import path from 'path';

import { findRepoRoot } from './environment';
import type { SimpleWorkflow } from '../../src/types/workflow';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExecutionResult {
	success: boolean;
	error?: string;
	/** Node that caused the error, if identifiable */
	errorNode?: string;
	/** Total execution duration in ms */
	durationMs: number;
	/** Which nodes actually executed (in order) */
	executedNodes: string[];
}

// ---------------------------------------------------------------------------
// DistNodeTypes
//
// Implements INodeTypes by loading compiled node classes directly from the
// dist/ directories of nodes-base and nodes-langchain packages.
//
// - Reads dist/known/nodes.json for the lazy-load index (no actual loading yet)
// - On getByName/getByNameAndVersion: require()s the compiled .js file and
//   instantiates the class on demand
// - Unknown types fall back to a passthrough; service nodes never reach
//   execute() because the engine short-circuits on pin data
//
// No DI container, no TypeScript source files, no path alias issues.
// ---------------------------------------------------------------------------

interface KnownNodeEntry {
	className: string;
	sourcePath: string;
	packageDir: string;
}

class DistNodeTypes implements INodeTypes {
	private readonly knownNodes: Map<string, KnownNodeEntry>;

	private readonly cache = new Map<string, INodeType | IVersionedNodeType>();

	constructor(
		packages: Array<{
			packagePrefix: string;
			packageDir: string;
			knownNodes: Record<string, { className: string; sourcePath: string }>;
		}>,
	) {
		this.knownNodes = new Map();
		for (const { packagePrefix, packageDir, knownNodes } of packages) {
			for (const [shortName, info] of Object.entries(knownNodes)) {
				// Workflow nodes use the full type name: "n8n-nodes-base.set"
				// The known.nodes JSON uses just the short name: "set"
				this.knownNodes.set(`${packagePrefix}.${shortName}`, { ...info, packageDir });
			}
		}
	}

	getByName(type: string): INodeType | IVersionedNodeType {
		return this.loadNode(type);
	}

	getByNameAndVersion(type: string, version?: number): INodeType {
		const loaded = this.loadNode(type);
		if ('nodeVersions' in loaded) {
			return NodeHelpers.getVersionedNodeType(loaded, version);
		}
		return loaded;
	}

	getKnownTypes() {
		return {};
	}

	private loadNode(type: string): INodeType | IVersionedNodeType {
		const cached = this.cache.get(type);
		if (cached) return cached;

		const known = this.knownNodes.get(type);
		if (!known) {
			// Unknown type — return a passthrough so the engine doesn't crash.
			// Service nodes never reach execute() because pin data intercepts them first.
			return {
				description: {
					displayName: type,
					name: type,
					group: ['transform'],
					version: 1,
					description: '',
					defaults: { name: type },
					inputs: ['main'],
					outputs: ['main'],
					properties: [],
				} as unknown as INodeTypeDescription,
				async execute(this: IExecuteFunctions) {
					return [this.getInputData()];
				},
			};
		}

		// Load from compiled dist JS file — no path aliases, no DI
		const filePath = path.join(known.packageDir, known.sourcePath);
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const mod = require(filePath) as Record<string, new () => INodeType | IVersionedNodeType>;
		const NodeClass = mod[known.className];
		const instance = new NodeClass();
		this.cache.set(type, instance);
		return instance;
	}
}

// ---------------------------------------------------------------------------
// Lazy singleton for WorkflowExecute + ExecutionLifecycleHooks + DistNodeTypes
// ---------------------------------------------------------------------------

let resolvedImports: ResolvedImports | undefined;

interface ResolvedImports {
	WorkflowExecute: new (
		additionalData: IWorkflowExecuteAdditionalData,
		mode: string,
		runExecutionData: unknown,
	) => { processRunExecutionData: (workflow: Workflow) => Promise<IRun> };
	ExecutionLifecycleHooks: new (
		mode: string,
		executionId: string,
		workflowData: unknown,
	) => {
		addHandler: (event: string, handler: (...args: unknown[]) => void) => void;
	};
	nodeTypes: DistNodeTypes;
}

function getPaths(): { corePath: string; nodesBasePath: string; langchainPath: string } {
	const repoRoot = findRepoRoot(__dirname);
	if (!repoRoot) {
		throw new Error('Cannot find monorepo root — workflow execution requires the n8n monorepo');
	}
	return {
		corePath: path.join(repoRoot, 'packages', 'core'),
		nodesBasePath: path.join(repoRoot, 'packages', 'nodes-base'),
		langchainPath: path.join(repoRoot, 'packages', '@n8n', 'nodes-langchain'),
	};
}

async function resolveImports(): Promise<ResolvedImports> {
	if (resolvedImports) return resolvedImports;

	const { corePath, nodesBasePath, langchainPath } = getPaths();
	const distPath = path.join(corePath, 'dist', 'execution-engine');

	// Import WorkflowExecute and ExecutionLifecycleHooks from compiled dist
	const weModule = (await import(path.join(distPath, 'workflow-execute.js'))) as Record<
		string,
		unknown
	>;
	const hookModule = (await import(path.join(distPath, 'execution-lifecycle-hooks.js'))) as Record<
		string,
		unknown
	>;

	// Load the lazy-load index from each package's dist/known/nodes.json.
	// These JSON files are built during `pnpm build` and map short node names
	// to their compiled .js entry points.
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const nodesBaseKnown = require(path.join(nodesBasePath, 'dist', 'known', 'nodes.json')) as Record<
		string,
		{ className: string; sourcePath: string }
	>;
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const langchainKnown = require(path.join(langchainPath, 'dist', 'known', 'nodes.json')) as Record<
		string,
		{ className: string; sourcePath: string }
	>;

	const nodeTypes = new DistNodeTypes([
		{
			packagePrefix: 'n8n-nodes-base',
			packageDir: nodesBasePath,
			knownNodes: nodesBaseKnown,
		},
		{
			packagePrefix: '@n8n/n8n-nodes-langchain',
			packageDir: langchainPath,
			knownNodes: langchainKnown,
		},
	]);

	resolvedImports = {
		WorkflowExecute: weModule.WorkflowExecute as ResolvedImports['WorkflowExecute'],
		ExecutionLifecycleHooks:
			hookModule.ExecutionLifecycleHooks as ResolvedImports['ExecutionLifecycleHooks'],
		nodeTypes,
	};

	return resolvedImports;
}

// ---------------------------------------------------------------------------
// Proxy-based additionalData stub
//
// WorkflowExecute calls various methods on additionalData at runtime.
// Rather than importing jest-mock-extended (which requires the Jest runtime),
// we use a Proxy that returns a no-op function for any property access and
// allows specific values to be injected via the `overrides` map.
// ---------------------------------------------------------------------------

function makeAdditionalDataStub(
	overrides: Record<string, unknown>,
): IWorkflowExecuteAdditionalData {
	return new Proxy({} as IWorkflowExecuteAdditionalData, {
		get(_target, prop: string) {
			if (prop in overrides) return overrides[prop];
			return () => undefined;
		},
	});
}

// ---------------------------------------------------------------------------
// Main execution function
// ---------------------------------------------------------------------------

/**
 * Execute a workflow with pin data and return the result.
 *
 * Service/API nodes use pin data (skipping real API calls). Utility nodes
 * (Set, If, Code, etc.) execute normally using their compiled dist
 * implementations, validating the workflow structure end-to-end.
 *
 * @param workflow - The workflow to execute
 * @param pinData  - Pin data for service/API nodes
 */
export async function executeWorkflowWithPinData(
	workflow: SimpleWorkflow,
	pinData: IPinData,
): Promise<ExecutionResult> {
	const startTime = Date.now();
	const executedNodes: string[] = [];

	try {
		const imports = await resolveImports();

		// Create Workflow instance with real node implementations
		const workflowInstance = new Workflow({
			id: 'eval-execution',
			nodes: workflow.nodes,
			connections: workflow.connections,
			nodeTypes: imports.nodeTypes,
			active: false,
		});

		// Find start node
		const startNode = workflowInstance.getStartNode();
		if (!startNode) {
			return {
				success: false,
				error: 'No start node found in workflow',
				durationMs: Date.now() - startTime,
				executedNodes: [],
			};
		}

		// Set up execution lifecycle hooks
		const hooks = new imports.ExecutionLifecycleHooks('trigger', '1', {} as never);
		hooks.addHandler('nodeExecuteAfter', (nodeName: unknown) => {
			if (typeof nodeName === 'string') {
				executedNodes.push(nodeName);
			}
		});

		const waitPromise = createDeferredPromise<IRun>();
		hooks.addHandler('workflowExecuteAfter', (fullRunData: unknown) => {
			waitPromise.resolve(fullRunData as IRun);
		});

		// Set up additional data with a Proxy stub so WorkflowExecute can safely call
		// any method on it without hitting "Cannot read properties of undefined".
		// WorkflowExecute reads `hooks` at runtime — it's not on the TS type, so we
		// inject it via the proxy's known-values map.
		const additionalData = makeAdditionalDataStub({ executionId: '1', hooks });

		// Create execution data with pin data in resultData
		const runExecutionData = createRunExecutionData({
			executionData: {
				nodeExecutionStack: [
					{
						node: startNode,
						data: { main: [[{ json: {} }]] },
						source: null,
					},
				],
			},
			resultData: {
				pinData,
			},
		});

		// Execute the workflow
		const workflowExecute = new imports.WorkflowExecute(additionalData, 'manual', runExecutionData);
		await workflowExecute.processRunExecutionData(workflowInstance);

		const result = await waitPromise.promise;

		// Check result for errors
		const resultError = result.data?.resultData?.error;
		const hasError = !!resultError;

		return {
			success: !hasError && result.status === 'success',
			error: hasError ? ((resultError as Error)?.message ?? resultError) : undefined,
			errorNode: hasError ? findErrorNode(result) : undefined,
			durationMs: Date.now() - startTime,
			executedNodes,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
			durationMs: Date.now() - startTime,
			executedNodes,
		};
	}
}

/**
 * Find the node that caused an execution error from run data.
 */
function findErrorNode(run: IRun): string | undefined {
	const { runData } = run.data.resultData;
	for (const [nodeName, nodeRuns] of Object.entries(runData)) {
		for (const nodeRun of nodeRuns) {
			if (nodeRun.error) {
				return nodeName;
			}
		}
	}
	return undefined;
}
