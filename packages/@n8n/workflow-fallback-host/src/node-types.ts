/**
 * The node types of the fallback host: every node of `n8n-nodes-base` and
 * `@n8n/n8n-nodes-langchain`, the `…Tool` variants that n8n makes from nodes
 * with `usableAsTool`, and the `n8n-nodes-testing.testData` node of n8n's
 * node tests.
 *
 * Each class loads once, on first use, from the `dist/known/nodes.json` index
 * of its package.
 */
import { existsSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import type { ExecuteContext } from 'n8n-core';
import { RoutingNode, UnrecognizedNodeTypeError } from 'n8n-core';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeHelpers } from 'n8n-workflow';

import { hostExtensions } from './extensions';
import { isJsonObject } from './protocol';

export class NodeTypeLoadError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NodeTypeLoadError';
	}
}

interface KnownNode {
	className: string;
	sourcePath: string;
}

function isKnownNode(value: unknown): value is KnownNode {
	return (
		isJsonObject(value) &&
		typeof value.className === 'string' &&
		typeof value.sourcePath === 'string'
	);
}

function isNodeType(value: unknown): value is INodeType | IVersionedNodeType {
	return typeof value === 'object' && value !== null && 'description' in value;
}

function isConstructor(value: unknown): value is new () => unknown {
	return typeof value === 'function';
}

/** A package of nodes. `root` is the folder that holds `dist/known/nodes.json`. */
interface NodePackage {
	prefix: string;
	root: string;
	known?: Record<string, unknown>;
}

const load = createRequire(__filename);

/**
 * The folder of a package. `@n8n/n8n-nodes-langchain` exports neither its
 * `package.json` nor a built main file, so the folder comes from the module
 * search paths.
 */
function packageRoot(name: string): string {
	for (const base of load.resolve.paths(name) ?? []) {
		const folder = join(base, name);
		if (existsSync(join(folder, 'package.json'))) return realpathSync(folder);
	}
	throw new NodeTypeLoadError(`The package ${name} is not installed`);
}

export const LANGCHAIN_PREFIX = '@n8n/n8n-nodes-langchain.';

export const NODES_BASE_PREFIX = 'n8n-nodes-base.';

export const TEST_DATA_TYPE = 'n8n-nodes-testing.testData';

/** The step that evaluates v1 expressions for compiled nodes (converter `hostValue`). */
export const EVALUATE_TYPE = 'n8n-compiled.evaluate';

let langchainFolder: string | undefined;

/**
 * The folder of the LangChain node package, for helpers of that package.
 * The folder does not change while the process runs, so the first lookup is kept.
 */
export function langchainRoot(): string {
	langchainFolder ??= packageRoot('@n8n/n8n-nodes-langchain');
	return langchainFolder;
}

/**
 * The test-only node of n8n's node tests (`packages/core/nodes-testing`). It
 * emits the items of its `data` parameter, once.
 */
export class TestDataNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Data',
		name: 'testData',
		group: ['input'],
		version: 1,
		description: 'Provides static test data',
		defaults: { name: 'Test Data' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [{ displayName: 'Data', name: 'data', type: 'json', default: '[]' }],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const raw = this.getNodeParameter('data', 0);
		const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
		const list: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
		return [list.filter(isJsonObject).map((json) => ({ json }))];
	}
}

/**
 * Evaluates the v1 expressions in its `values` parameter for each input item,
 * with n8n's expression engine, and gives the values as the item. The
 * converter uses it for the expressions of a compiled node that do not
 * translate (Luxon, regular expressions and the like).
 */
export class EvaluateNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Evaluate',
		name: 'evaluate',
		group: ['transform'],
		version: 1,
		description: 'Evaluates expressions',
		defaults: { name: 'Evaluate' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [{ displayName: 'Values', name: 'values', type: 'json', default: {} }],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			const values = this.getNodeParameter('values', i, {});
			out.push({ json: isJsonObject(values) ? values : {}, pairedItem: { item: i } });
		}
		return [out];
	}
}

/** True when n8n gives the node an `execute` that runs its declarative routing. */
function needsRoutingExecute(nodeType: INodeType): boolean {
	const declarative = nodeType.description.requestDefaults !== undefined;
	return (
		!nodeType.execute &&
		!nodeType.supplyData &&
		!nodeType.poll &&
		!nodeType.trigger &&
		(!nodeType.webhook || declarative) &&
		(!nodeType.methods || declarative)
	);
}

/**
 * The tool variant of a node, as `convertNodeToAiTool` in n8n's CLI makes it.
 * The variant has the methods of the node and a description with the tool
 * name and one `ai_tool` output. The node itself is not changed.
 */
function toolVariant(nodeType: INodeType): INodeType {
	const base = nodeType.description;
	const description: INodeTypeDescription = Object.create(base, {
		name: { value: `${base.name}Tool` },
		displayName: { value: `${base.displayName} Tool` },
		inputs: { value: [] },
		outputs: { value: [NodeConnectionTypes.AiTool] },
		properties: { value: base.properties },
	});
	return Object.create(nodeType, { description: { value: description } });
}

export class HostNodeTypes implements INodeTypes {
	private readonly packages: NodePackage[] = [
		{ prefix: NODES_BASE_PREFIX, root: dirname(load.resolve('n8n-nodes-base/package.json')) },
		{ prefix: LANGCHAIN_PREFIX, root: langchainRoot() },
	];

	private readonly loaded = new Map<string, INodeType | IVersionedNodeType>();

	private readonly versions = new Map<string, INodeType>();

	/** Extra node types, for tests. */
	constructor(private readonly extra: Record<string, INodeType> = {}) {}

	getByName(type: string): INodeType | IVersionedNodeType {
		const extra = this.extra[type];
		if (extra) return extra;
		if (type === TEST_DATA_TYPE) return this.cache(type, () => new TestDataNode());
		if (type === EVALUATE_TYPE) return this.cache(type, () => new EvaluateNode());
		const cached = this.loaded.get(type);
		if (cached) return cached;

		const found = this.find(type);
		if (found) return this.cache(type, () => this.load(found.pkg, found.entry));
		// A community or custom node (`extensions.ts`), loaded when the host started a step.
		const extension = hostExtensions().nodeType(type);
		if (extension) return extension;
		const [packageName, nodeName = type] = type.split('.');
		throw new UnrecognizedNodeTypeError(packageName, nodeName);
	}

	getByNameAndVersion(type: string, version?: number): INodeType {
		const key = `${type}@${version ?? 'default'}`;
		const cached = this.versions.get(key);
		if (cached) return cached;

		let nodeType: INodeType;
		const synthetic = type.endsWith('Tool') && this.find(type) === undefined && !this.extra[type];
		if (synthetic) {
			const base = NodeHelpers.getVersionedNodeType(this.getByName(type.slice(0, -4)), version);
			if (!base.description.usableAsTool) {
				throw new NodeTypeLoadError(`The node ${type.slice(0, -4)} cannot be used as a tool`);
			}
			this.addRoutingExecute(base);
			nodeType = toolVariant(base);
		} else {
			nodeType = NodeHelpers.getVersionedNodeType(this.getByName(type), version);
			this.addRoutingExecute(nodeType);
		}
		this.versions.set(key, nodeType);
		return nodeType;
	}

	getKnownTypes() {
		return {};
	}

	/** The version a step gets when it names none: the default version of the node. */
	defaultVersion(type: string): number {
		const synthetic = type.endsWith('Tool') && this.find(type) === undefined && !this.extra[type];
		const nodeType = this.getByName(synthetic ? type.slice(0, -4) : type);
		if ('nodeVersions' in nodeType) return nodeType.currentVersion;
		const { version } = nodeType.description;
		return Array.isArray(version) ? Math.max(...version) : version;
	}

	/** n8n's CLI gives a declarative node an `execute` that runs its routing. */
	private addRoutingExecute(nodeType: INodeType): void {
		if (!needsRoutingExecute(nodeType)) return;
		nodeType.execute = async function (this: ExecuteContext) {
			const routing = new RoutingNode(this, nodeType);
			return (await routing.runNode()) ?? [];
		};
	}

	private cache(
		type: string,
		make: () => INodeType | IVersionedNodeType,
	): INodeType | IVersionedNodeType {
		const instance = make();
		this.loaded.set(type, instance);
		return instance;
	}

	private find(type: string): { pkg: NodePackage; entry: KnownNode } | undefined {
		for (const pkg of this.packages) {
			if (!type.startsWith(pkg.prefix)) continue;
			const entry = this.knownNodes(pkg)[type.slice(pkg.prefix.length)];
			if (isKnownNode(entry)) return { pkg, entry };
		}
		return undefined;
	}

	private load(pkg: NodePackage, entry: KnownNode): INodeType | IVersionedNodeType {
		const exported: unknown = load(join(pkg.root, entry.sourcePath));
		const ctor: unknown =
			typeof exported === 'object' && exported !== null
				? Reflect.get(exported, entry.className)
				: undefined;
		if (!isConstructor(ctor))
			throw new NodeTypeLoadError(`Node class ${entry.className} not found`);
		const instance = new ctor();
		if (!isNodeType(instance)) {
			throw new NodeTypeLoadError(`${entry.className} is not a node type`);
		}
		return instance;
	}

	private knownNodes(pkg: NodePackage): Record<string, unknown> {
		if (pkg.known === undefined) {
			const index: unknown = load(join(pkg.root, 'dist/known/nodes.json'));
			pkg.known = isJsonObject(index) ? index : {};
		}
		return pkg.known;
	}
}
