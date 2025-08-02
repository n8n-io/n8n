import { Service } from '@n8n/di';
import type {
	ICredentialType,
	INodeType,
	IVersionedNodeType,
	KnownNodesAndCredentials,
	LoadedClass,
	LoadedNodesAndCredentials,
	LoadingDetails,
} from 'n8n-workflow';
import path from 'node:path';

import { UnrecognizedCredentialTypeError, UnrecognizedNodeTypeError } from '../dist/errors';
import { LazyPackageDirectoryLoader } from '../dist/nodes-loader/lazy-package-directory-loader';

/** This rewrites the nodes/credentials source path to load the typescript code instead of the compiled javascript code */
const fixSourcePath = (loadInfo: LoadingDetails) => {
	if (!loadInfo) return;
	loadInfo.sourcePath = loadInfo.sourcePath.replace(/^dist\//, './').replace(/\.js$/, '.ts');
};

@Service()
export class LoadNodesAndCredentials {
	private loaders: Record<string, LazyPackageDirectoryLoader> = {};

	readonly known: KnownNodesAndCredentials = { nodes: {}, credentials: {} };

	readonly loaded: LoadedNodesAndCredentials = { nodes: {}, credentials: {} };

	constructor(packagePaths: string[]) {
		for (const packagePath of packagePaths) {
			const loader = new LazyPackageDirectoryLoader(packagePath);
			this.loaders[loader.packageName] = loader;
		}
	}

	async init() {
		for (const [packageName, loader] of Object.entries(this.loaders)) {
			await loader.loadAll();
			const { known, directory } = loader;

			for (const type in known.nodes) {
				const { className, sourcePath } = known.nodes[type];
				this.known.nodes[`${packageName}.${type}`] = {
					className,
					sourcePath: path.join(directory, sourcePath),
				};
			}

			for (const type in known.credentials) {
				const {
					className,
					sourcePath,
					supportedNodes,
					extends: extendsArr,
				} = known.credentials[type];
				this.known.credentials[type] = {
					className,
					sourcePath: path.join(directory, sourcePath),
					supportedNodes: supportedNodes?.map((nodeName) => `${loader.packageName}.${nodeName}`),
					extends: extendsArr,
				};
			}
		}
	}

	recognizesCredential(credentialType: string): boolean {
		return credentialType in this.known.credentials;
	}

	getCredential(credentialType: string): LoadedClass<ICredentialType> {
		for (const loader of Object.values(this.loaders)) {
			if (credentialType in loader.known.credentials) {
				const loaded = loader.getCredential(credentialType);
				this.loaded.credentials[credentialType] = loaded;
				fixSourcePath(loader.known.credentials[credentialType]);
			}
		}

		if (credentialType in this.loaded.credentials) {
			return this.loaded.credentials[credentialType];
		}

		throw new UnrecognizedCredentialTypeError(credentialType);
	}

	getNode(fullNodeType: string): LoadedClass<INodeType | IVersionedNodeType> {
		const [packageName, nodeType] = fullNodeType.split('.');
		const { loaders } = this;
		const loader = loaders[packageName];
		if (!loader) {
			throw new UnrecognizedNodeTypeError(packageName, nodeType);
		}
		fixSourcePath(loader.known.nodes[nodeType]);
		return loader.getNode(nodeType);
	}
}
