/**
 * Lightweight workflow executor for fixture testing.
 * Extracted from run-fixtures.ts so both the CLI script and Jest tests can share it.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
	IConnections,
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	IPinData,
	IRun,
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	IRunExecutionData,
	ITaskData,
	IVersionedNodeType,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { createDeferredPromise, createRunExecutionData, NodeHelpers, Workflow } from 'n8n-workflow';

// ---------------------------------------------------------------------------
// Repo root finder
// ---------------------------------------------------------------------------

function findRepoRoot(startDir: string): string | undefined {
	let dir = startDir;
	while (dir !== path.dirname(dir)) {
		if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
		dir = path.dirname(dir);
	}
	return undefined;
}

// ---------------------------------------------------------------------------
// Node type loader (loads real node implementations from dist/)
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
// Import resolver (heavy dynamic imports from packages/core)
// ---------------------------------------------------------------------------

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

let resolvedImports: ResolvedImports | undefined;

export async function resolveImports(): Promise<ResolvedImports> {
	if (resolvedImports) return resolvedImports;

	const repoRoot = findRepoRoot(__dirname);
	if (!repoRoot) throw new Error('Cannot find monorepo root');

	const corePath = path.join(repoRoot, 'packages', 'core');
	const nodesBasePath = path.join(repoRoot, 'packages', 'nodes-base');
	const langchainPath = path.join(repoRoot, 'packages', '@n8n', 'nodes-langchain');

	const distPath = path.join(corePath, 'dist', 'execution-engine');

	const weModule = (await import(path.join(distPath, 'workflow-execute.js'))) as Record<
		string,
		unknown
	>;
	const hookModule = (await import(path.join(distPath, 'execution-lifecycle-hooks.js'))) as Record<
		string,
		unknown
	>;

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
		{ packagePrefix: 'n8n-nodes-base', packageDir: nodesBasePath, knownNodes: nodesBaseKnown },
		{
			packagePrefix: '@n8n/n8n-nodes-langchain',
			packageDir: langchainPath,
			knownNodes: langchainKnown,
		},
	]);

	// Disable task runner so Code node uses in-process JavaScriptSandbox
	// instead of JsTaskRunnerSandbox (which requires a running task broker)
	try {
		const diPath = path.join(repoRoot, 'packages', '@n8n', 'di', 'dist', 'di.js');
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { Container } = require(diPath) as {
			Container: { get: (cls: unknown) => { enabled: boolean } };
		};
		const configPath = path.join(
			repoRoot,
			'packages',
			'@n8n',
			'config',
			'dist',
			'configs',
			'runners.config.js',
		);
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { TaskRunnersConfig } = require(configPath) as {
			TaskRunnersConfig: new () => { enabled: boolean };
		};
		const runnersConfig = Container.get(TaskRunnersConfig);
		runnersConfig.enabled = false;
	} catch {
		// If @n8n/di or config not available, Code nodes will attempt task runner path
	}

	resolvedImports = {
		WorkflowExecute: weModule.WorkflowExecute as ResolvedImports['WorkflowExecute'],
		ExecutionLifecycleHooks:
			hookModule.ExecutionLifecycleHooks as ResolvedImports['ExecutionLifecycleHooks'],
		nodeTypes,
	};

	return resolvedImports;
}

// ---------------------------------------------------------------------------
// Execution helpers
// ---------------------------------------------------------------------------

function findTriggerByGroup(nodes: INode[], nodeTypes: INodeTypes): INode | undefined {
	return nodes.find((currentNode) => {
		if (currentNode.disabled) return false;
		const nt = nodeTypes.getByNameAndVersion(currentNode.type, currentNode.typeVersion);
		return nt.description.group?.includes('trigger');
	});
}

function findSubworkflowStart(nodes: INode[]): INode | undefined {
	return (
		nodes.find((n) => n.type === 'n8n-nodes-base.executeWorkflowTrigger') ??
		nodes.find((n) => ['n8n-nodes-base.manualTrigger', 'n8n-nodes-base.start'].includes(n.type))
	);
}

function getLastExecutedNodeData(run: IRun): ITaskData | undefined {
	const { runData, lastNodeExecuted } = run.data.resultData;
	if (!lastNodeExecuted || !runData[lastNodeExecuted]) return undefined;
	return runData[lastNodeExecuted][runData[lastNodeExecuted].length - 1];
}

// ---------------------------------------------------------------------------
// Sub-workflow executor
// ---------------------------------------------------------------------------

interface SubWorkflowRunEntry {
	name: string;
	run: IRun;
}

async function executeSubWorkflow(
	workflowCode: {
		nodes: INode[];
		connections: IConnections;
		name?: string;
		id?: string;
		pinData?: Record<string, IDataObject[]>;
	},
	inputData: INodeExecutionData[],
	imports: ResolvedImports,
	collector: SubWorkflowRunEntry[],
): Promise<{ executionId: string; data: Array<INodeExecutionData[] | null> }> {
	const subId = `sub-${collector.length + 1}`;

	const workflowInstance = new Workflow({
		id: workflowCode.id ?? subId,
		nodes: workflowCode.nodes,
		connections: workflowCode.connections,
		nodeTypes: imports.nodeTypes,
		active: false,
	});

	const startNode = findSubworkflowStart(workflowCode.nodes);
	if (!startNode) {
		throw new Error(`Sub-workflow "${workflowCode.name ?? subId}" has no start node`);
	}

	// Extract pin data from the sub-workflow JSON
	const pinData = extractPinData(workflowCode);

	const subHooks = new imports.ExecutionLifecycleHooks('integrated', subId, {} as never);
	const subWaitPromise = createDeferredPromise<IRun>();
	subHooks.addHandler('workflowExecuteAfter', (fullRunData: unknown) => {
		subWaitPromise.resolve(fullRunData as IRun);
	});

	// Build additionalData for sub-workflow (recursive — supports nested sub-workflows)
	const subAdditionalData = buildAdditionalData(imports, subHooks, subId, collector);

	const subRunData = createRunExecutionData({
		executionData: {
			nodeExecutionStack: [{ node: startNode, data: { main: [inputData] }, source: null }],
		},
		resultData: { pinData },
	});

	const subExecute = new imports.WorkflowExecute(subAdditionalData, 'integrated', subRunData);
	await subExecute.processRunExecutionData(workflowInstance);

	const subRun = await subWaitPromise.promise;
	collector.push({ name: workflowCode.name ?? subId, run: subRun });

	const lastNodeData = getLastExecutedNodeData(subRun);
	const outputData = lastNodeData?.data?.main ?? [];

	return { executionId: subId, data: outputData };
}

// ---------------------------------------------------------------------------
// additionalData builder (shared between main and sub-workflow execution)
// ---------------------------------------------------------------------------

function buildAdditionalData(
	imports: ResolvedImports,
	hooks: { addHandler: (event: string, handler: (...args: unknown[]) => void) => void },
	executionId: string,
	subWorkflowCollector: SubWorkflowRunEntry[],
): IWorkflowExecuteAdditionalData {
	// Store sub-workflow run data for getRunExecutionData lookups
	const subRunDataById = new Map<string, IRunExecutionData>();

	const overrides: Record<string, unknown> = {
		executionId,
		hooks,
		executeWorkflow: async (
			workflowInfo: {
				id?: string;
				code?: { nodes: INode[]; connections: IConnections; name?: string; id?: string };
			},
			_additionalData: unknown,
			options?: { inputData?: INodeExecutionData[]; parentExecution?: unknown },
		) => {
			if (!workflowInfo.code) {
				throw new Error('Sub-workflow execution only supports inline code (source: parameter)');
			}
			const result = await executeSubWorkflow(
				workflowInfo.code,
				options?.inputData ?? [{ json: {} }],
				imports,
				subWorkflowCollector,
			);
			// Store the sub-workflow's run data so getRunExecutionData can find it
			const lastEntry = subWorkflowCollector[subWorkflowCollector.length - 1];
			if (lastEntry) {
				subRunDataById.set(result.executionId, lastEntry.run.data);
			}
			return result;
		},
		getRunExecutionData: async (execId: string): Promise<IRunExecutionData | undefined> => {
			return subRunDataById.get(execId);
		},
	};

	return new Proxy({} as IWorkflowExecuteAdditionalData, {
		get(_target, prop: string) {
			if (prop in overrides) return overrides[prop];
			return () => undefined;
		},
	});
}

// ---------------------------------------------------------------------------
// Sub-workflow error detection
// ---------------------------------------------------------------------------

interface SubWorkflowErrorInfo {
	workflowName: string;
	nodeName: string;
	error: string;
}

function findSubWorkflowError(
	subWorkflowRuns: SubWorkflowRunEntry[],
): SubWorkflowErrorInfo | undefined {
	for (const entry of subWorkflowRuns) {
		const runData = entry.run?.data?.resultData?.runData;
		if (!runData) continue;
		for (const [nodeName, taskDataArr] of Object.entries(runData)) {
			for (const taskData of taskDataArr) {
				if (taskData.error) {
					return {
						workflowName: entry.name,
						nodeName,
						error: taskData.error.message,
					};
				}
			}
		}
	}
	return undefined;
}

// ---------------------------------------------------------------------------
// executeWorkflow — compile + run with pin data
// ---------------------------------------------------------------------------

export interface ExecutionResult {
	success: boolean;
	error?: string;
	errorNode?: string;
	durationMs: number;
	executedNodes: string[];
	run?: IRun;
	subWorkflowRuns?: SubWorkflowRunEntry[];
}

export async function executeWorkflow(
	workflow: { name: string; nodes: INode[]; connections: IConnections },
	pinData: IPinData,
): Promise<ExecutionResult> {
	const startTime = Date.now();
	const executedNodes: string[] = [];
	const subWorkflowRuns: SubWorkflowRunEntry[] = [];

	try {
		const imports = await resolveImports();

		const workflowInstance = new Workflow({
			id: 'fixture-run',
			nodes: workflow.nodes,
			connections: workflow.connections,
			nodeTypes: imports.nodeTypes,
			active: false,
		});

		const startNode =
			workflowInstance.getStartNode() ?? findTriggerByGroup(workflow.nodes, imports.nodeTypes);
		if (!startNode) {
			return {
				success: false,
				error: 'No start node found',
				durationMs: Date.now() - startTime,
				executedNodes: [],
			};
		}

		const hooks = new imports.ExecutionLifecycleHooks('trigger', '1', {} as never);
		hooks.addHandler('nodeExecuteAfter', (nodeName: unknown) => {
			if (typeof nodeName === 'string') executedNodes.push(nodeName);
		});

		const waitPromise = createDeferredPromise<IRun>();
		hooks.addHandler('workflowExecuteAfter', (fullRunData: unknown) => {
			waitPromise.resolve(fullRunData as IRun);
		});

		const additionalData = buildAdditionalData(imports, hooks, '1', subWorkflowRuns);

		const runExecutionData = createRunExecutionData({
			executionData: {
				nodeExecutionStack: [{ node: startNode, data: { main: [[{ json: {} }]] }, source: null }],
			},
			resultData: { pinData },
		});

		const workflowExecute = new imports.WorkflowExecute(additionalData, 'manual', runExecutionData);
		await workflowExecute.processRunExecutionData(workflowInstance);

		const result = await waitPromise.promise;
		const resultError = result.data?.resultData?.error;
		const hasError = !!resultError;

		let errorNode: string | undefined;
		if (hasError) {
			const { runData } = result.data.resultData;
			for (const [nodeName, nodeRuns] of Object.entries(runData)) {
				for (const nodeRun of nodeRuns) {
					if (nodeRun.error) {
						errorNode = nodeName;
						break;
					}
				}
				if (errorNode) break;
			}
		}

		// Check sub-workflow runs for node-level errors
		const subWorkflowError = findSubWorkflowError(subWorkflowRuns);

		const mainSuccess = !hasError && result.status === 'success';
		const overallSuccess = mainSuccess && !subWorkflowError;

		let finalError = hasError
			? ((resultError as Error)?.message ?? String(resultError))
			: undefined;
		if (!finalError && subWorkflowError) {
			finalError = `Sub-workflow "${subWorkflowError.workflowName}" node "${subWorkflowError.nodeName}": ${subWorkflowError.error}`;
			errorNode = errorNode ?? subWorkflowError.nodeName;
		}

		return {
			success: overallSuccess,
			error: finalError,
			errorNode,
			durationMs: Date.now() - startTime,
			executedNodes,
			run: result,
			subWorkflowRuns: subWorkflowRuns.length > 0 ? subWorkflowRuns : undefined,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
			durationMs: Date.now() - startTime,
			executedNodes,
			subWorkflowRuns: subWorkflowRuns.length > 0 ? subWorkflowRuns : undefined,
		};
	}
}

// ---------------------------------------------------------------------------
// Pin data extraction helper
// ---------------------------------------------------------------------------

export function extractPinData(workflowJson: { pinData?: Record<string, unknown> }): IPinData {
	const pinData: IPinData = {};
	if (workflowJson.pinData) {
		for (const [nodeName, data] of Object.entries(workflowJson.pinData)) {
			pinData[nodeName] = (data as IDataObject[]).map((item) => ({ json: item }));
		}
	}
	return pinData;
}
