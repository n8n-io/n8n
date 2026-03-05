/**
 * Execute compiled fixtures with pin data.
 *
 * Compiles each fixture's input.js → SDK → WorkflowJSON → executes with pin data.
 * Reports which nodes fail (missing pin data) so you can iteratively fix them.
 *
 * Usage:
 *   npx tsx src/simplified-compiler/run-fixtures.ts          # all fixtures
 *   npx tsx src/simplified-compiler/run-fixtures.ts w01      # single fixture
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	IPinData,
	IRun,
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { createDeferredPromise, createRunExecutionData, NodeHelpers, Workflow } from 'n8n-workflow';
import { transpileWorkflowJS } from './compiler';
import { parseWorkflowCode } from '../codegen/parse-workflow-code';

// ---------------------------------------------------------------------------
// Inline lightweight executor (based on ai-workflow-builder.ee/workflow-executor.ts)
// Self-contained: no external path aliases needed
// ---------------------------------------------------------------------------

function findRepoRoot(startDir: string): string | undefined {
	let dir = startDir;
	while (dir !== path.dirname(dir)) {
		if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
		dir = path.dirname(dir);
	}
	return undefined;
}

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

async function resolveImports(): Promise<ResolvedImports> {
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

	resolvedImports = {
		WorkflowExecute: weModule.WorkflowExecute as ResolvedImports['WorkflowExecute'],
		ExecutionLifecycleHooks:
			hookModule.ExecutionLifecycleHooks as ResolvedImports['ExecutionLifecycleHooks'],
		nodeTypes,
	};

	return resolvedImports;
}

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

function findTriggerByGroup(nodes: INode[], nodeTypes: INodeTypes): INode | undefined {
	return nodes.find((currentNode) => {
		if (currentNode.disabled) return false;
		const nt = nodeTypes.getByNameAndVersion(currentNode.type, currentNode.typeVersion);
		return nt.description.group?.includes('trigger');
	});
}

interface ExecutionResult {
	success: boolean;
	error?: string;
	errorNode?: string;
	durationMs: number;
	executedNodes: string[];
}

async function executeWorkflow(
	workflow: { name: string; nodes: INode[]; connections: import('n8n-workflow').IConnections },
	pinData: IPinData,
): Promise<ExecutionResult> {
	const startTime = Date.now();
	const executedNodes: string[] = [];

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

		const additionalData = makeAdditionalDataStub({ executionId: '1', hooks });

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

		return {
			success: !hasError && result.status === 'success',
			error: hasError ? ((resultError as Error)?.message ?? String(resultError)) : undefined,
			errorNode,
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const fixturesDir = path.join(__dirname, '__fixtures__');
const filter = process.argv[2];

async function run() {
	const dirs = fs
		.readdirSync(fixturesDir)
		.filter((d) => d.startsWith('w') && fs.statSync(path.join(fixturesDir, d)).isDirectory())
		.filter((d) => !filter || d.includes(filter))
		.sort();

	let passed = 0;
	let failed = 0;

	for (const dir of dirs) {
		const inputPath = path.join(fixturesDir, dir, 'input.js');
		if (!fs.existsSync(inputPath)) continue;

		const input = fs.readFileSync(inputPath, 'utf-8');

		// Step 1: Compile simplified JS → SDK
		const sdk = transpileWorkflowJS(input);
		if (sdk.errors.length > 0) {
			console.log(`✕ ${dir} — compile errors: ${sdk.errors.map((e) => e.message).join(', ')}`);
			failed++;
			continue;
		}

		// Step 2: Parse SDK → WorkflowJSON
		let workflowJson;
		try {
			workflowJson = parseWorkflowCode(sdk.code);
		} catch (e) {
			console.log(`✕ ${dir} — parse error: ${(e as Error).message}`);
			failed++;
			continue;
		}

		// Step 3: Extract pin data from workflow JSON and wrap in { json: ... }
		const pinData: IPinData = {};
		if (workflowJson.pinData) {
			for (const [nodeName, data] of Object.entries(workflowJson.pinData)) {
				pinData[nodeName] = (data as IDataObject[]).map((item) => ({ json: item }));
			}
		}

		// Step 4: Execute with pin data
		const result = await executeWorkflow(
			{
				name: dir,
				nodes: workflowJson.nodes as unknown as INode[],
				connections: workflowJson.connections,
			},
			pinData,
		);

		if (result.success) {
			console.log(`✓ ${dir} — ${result.executedNodes.length} nodes (${result.durationMs}ms)`);
			passed++;
		} else {
			console.log(`✕ ${dir} — ${result.error}`);
			if (result.errorNode) console.log(`  Failed at: ${result.errorNode}`);
			console.log(`  Executed: [${result.executedNodes.join(', ')}]`);

			const nodeNames = workflowJson.nodes.map((n) => n.name);
			const pinned = Object.keys(pinData);
			const unpinned = nodeNames.filter((n) => !pinned.includes(n));
			if (unpinned.length > 0) {
				console.log(`  Missing pin data: [${unpinned.join(', ')}]`);
			}
			failed++;
		}
	}

	console.log(`\n${passed} passed, ${failed} failed out of ${passed + failed} fixtures`);
}

run().catch(console.error);
