import { UnexpectedError } from '@n8n/errors';
import type { ExecuteContext } from 'n8n-core';
import { LazyPackageDirectoryLoader, RoutingNode } from 'n8n-core';
import type { INodeType, INodeTypes, IVersionedNodeType } from 'n8n-workflow';
import { jsonParse, NodeConnectionTypes, NodeHelpers } from 'n8n-workflow';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const KNOWN_NODES_FILE = 'dist/known/nodes.json';

const BUNDLED_PACKAGES = ['n8n-nodes-base', '@n8n/n8n-nodes-langchain'];

interface PackageJson {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	n8n?: { nodes?: string[] };
}

class NodePackageLoader extends LazyPackageDirectoryLoader {
	constructor(directory: string) {
		super(directory);
		if (existsSync(this.resolvePath(KNOWN_NODES_FILE))) {
			this.known.nodes = this.readJSONSync(KNOWN_NODES_FILE);
			return;
		}
		for (const file of this.packageJson.n8n?.nodes ?? []) {
			this.loadNodeFromFile(file, this.packageJson.version);
		}
	}
}

let loaders: Map<string, NodePackageLoader> | undefined;

function nodePackages(): Map<string, NodePackageLoader> {
	loaders ??= new Map(
		packageDirectories()
			.map((directory) => new NodePackageLoader(directory))
			.map((loader) => [loader.packageName, loader]),
	);
	return loaders;
}

function packageDirectories(): string[] {
	const langchain = resolvePackageDirectory('@n8n/n8n-nodes-langchain');
	const langchainIsBuilt =
		langchain !== undefined && existsSync(path.join(langchain, KNOWN_NODES_FILE));
	return [
		path.dirname(require.resolve('n8n-nodes-base/package.json')),
		...(langchainIsBuilt ? [langchain] : []),
		...communityPackageDirectories(),
	];
}

function resolvePackageDirectory(name: string): string | undefined {
	try {
		return path.dirname(require.resolve(`${name}/package.json`));
	} catch {
		return undefined;
	}
}

function communityPackageDirectories(): string[] {
	const projectRoot = process.cwd();
	const project = readPackageJson(projectRoot);
	const names = Object.keys({ ...project?.dependencies, ...project?.devDependencies });
	return names
		.filter((name) => !BUNDLED_PACKAGES.includes(name))
		.map((name) => path.join(projectRoot, 'node_modules', name))
		.filter((directory) => readPackageJson(directory)?.n8n?.nodes !== undefined);
}

function readPackageJson(directory: string): PackageJson | undefined {
	const file = path.join(directory, 'package.json');
	if (!existsSync(file)) return undefined;
	return jsonParse<PackageJson>(readFileSync(file, 'utf8'));
}

function installedNodeType(fullType: string): INodeType | IVersionedNodeType | undefined {
	const separator = fullType.lastIndexOf('.');
	const loader = nodePackages().get(fullType.slice(0, separator));
	const name = fullType.slice(separator + 1);
	if (!loader || !(name in loader.known.nodes)) return undefined;
	return loader.getNode(name).type;
}

function hasVersion(nodeType: INodeType | IVersionedNodeType, version: number) {
	if ('nodeVersions' in nodeType) return version in nodeType.nodeVersions;
	return [nodeType.description.version].flat().includes(version);
}

export function isNodeTypeInstalled(type: string, version: number): boolean {
	const nodeType = installedNodeType(type);
	return nodeType !== undefined && hasVersion(nodeType, version);
}

export const nodeTypes: INodeTypes = {
	getByName: (type) => installedNodeType(type) ?? createStandInNodeType(type, 1),
	getByNameAndVersion: (type, version) => {
		const installed = installedNodeType(type);
		const versionIsInstalled =
			version === undefined || (installed && hasVersion(installed, version));
		if (!installed || !versionIsInstalled) return createStandInNodeType(type, version ?? 1);
		const nodeType = NodeHelpers.getVersionedNodeType(installed, version);
		// As on an n8n server: the engine calls evalNodeMockHandler only on the execute path.
		if (isDeclarativeWithoutExecute(nodeType)) nodeType.execute = createRoutingExecute(nodeType);
		return nodeType;
	},
	getKnownTypes: () =>
		Object.fromEntries(
			[...nodePackages().values()].flatMap((loader) =>
				Object.entries(loader.known.nodes).map(([type, known]) => [
					`${loader.packageName}.${type}`,
					known,
				]),
			),
		),
};

// The engine builds each node of a workflow, also a mocked one. checkNodeTypesInstalled
// lets only mocked nodes, and the sub-nodes of mocked nodes, reach this stand-in.
function createStandInNodeType(type: string, version: number): INodeType {
	return {
		description: {
			displayName: type,
			name: type,
			group: [],
			version,
			description: '',
			defaults: {},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			properties: [],
		},
		execute: async () => {
			throw new UnexpectedError(`The node type "${type}" version ${version} is not installed.`);
		},
	};
}

function isDeclarativeWithoutExecute(nodeType: INodeType) {
	const isDeclarative = nodeType.description.requestDefaults !== undefined;
	return (
		!nodeType.execute &&
		!nodeType.supplyData &&
		!nodeType.poll &&
		!nodeType.trigger &&
		(!nodeType.webhook || isDeclarative) &&
		(!nodeType.methods || isDeclarative)
	);
}

function createRoutingExecute(nodeType: INodeType) {
	return async function (this: ExecuteContext) {
		return (await new RoutingNode(this, nodeType).runNode()) ?? [];
	};
}
