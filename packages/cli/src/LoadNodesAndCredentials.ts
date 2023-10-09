import glob from 'fast-glob';
import { Container, Service } from 'typedi';
import path from 'path';
import fsPromises from 'fs/promises';

import type { DirectoryLoader, Types } from 'n8n-core';
import {
	CUSTOM_EXTENSION_ENV,
	UserSettings,
	CustomDirectoryLoader,
	PackageDirectoryLoader,
	LazyPackageDirectoryLoader,
} from 'n8n-core';
import type {
	KnownNodesAndCredentials,
	INodeTypeDescription,
	INodeTypeData,
	ICredentialTypeData,
} from 'n8n-workflow';
import { LoggerProxy, ErrorReporterProxy as ErrorReporter } from 'n8n-workflow';

import config from '@/config';
import {
	CUSTOM_API_CALL_KEY,
	CUSTOM_API_CALL_NAME,
	inTest,
	CLI_DIR,
	inE2ETests,
} from '@/constants';

interface LoadedNodesAndCredentials {
	nodes: INodeTypeData;
	credentials: ICredentialTypeData;
}

@Service()
export class LoadNodesAndCredentials {
	private known: KnownNodesAndCredentials = { nodes: {}, credentials: {} };

	loaded: LoadedNodesAndCredentials = { nodes: {}, credentials: {} };

	types: Types = { nodes: [], credentials: [] };

	loaders: Record<string, DirectoryLoader> = {};

	excludeNodes = config.getEnv('nodes.exclude');

	includeNodes = config.getEnv('nodes.include');

	private downloadFolder: string;

	private postProcessors: Array<() => Promise<void>> = [];

	async init() {
		if (inTest) throw new Error('Not available in tests');

		// Make sure the imported modules can resolve dependencies fine.
		const delimiter = process.platform === 'win32' ? ';' : ':';
		process.env.NODE_PATH = module.paths.join(delimiter);

		// @ts-ignore
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		module.constructor._initPaths();

		if (!inE2ETests) {
			this.excludeNodes = this.excludeNodes ?? [];
			this.excludeNodes.push('n8n-nodes-base.e2eTest');
		}

		this.downloadFolder = UserSettings.getUserN8nFolderDownloadedNodesPath();

		// Load nodes from `n8n-nodes-base`
		const basePathsToScan = [
			// In case "n8n" package is in same node_modules folder.
			path.join(CLI_DIR, '..'),
			// In case "n8n" package is the root and the packages are
			// in the "node_modules" folder underneath it.
			path.join(CLI_DIR, 'node_modules'),
		];

		for (const nodeModulesDir of basePathsToScan) {
			await this.loadNodesFromNodeModules(nodeModulesDir, 'n8n-nodes-base');
		}

		// Load nodes from any other `n8n-nodes-*` packages in the download directory
		// This includes the community nodes
		await this.loadNodesFromNodeModules(path.join(this.downloadFolder, 'node_modules'));

		await this.loadNodesFromCustomDirectories();
		await this.postProcessLoaders();
	}

	addPostProcessor(fn: () => Promise<void>) {
		this.postProcessors.push(fn);
	}

	isKnownNode(type: string) {
		return type in this.known.nodes;
	}

	get loadedCredentials() {
		return this.loaded.credentials;
	}

	get loadedNodes() {
		return this.loaded.nodes;
	}

	get knownCredentials() {
		return this.known.credentials;
	}

	get knownNodes() {
		return this.known.nodes;
	}

	private async loadNodesFromNodeModules(
		nodeModulesDir: string,
		packageName?: string,
	): Promise<void> {
		const globOptions = {
			cwd: nodeModulesDir,
			onlyDirectories: true,
			deep: 1,
		};
		const installedPackagePaths = packageName
			? await glob(packageName, globOptions)
			: [
					...(await glob('n8n-nodes-*', globOptions)),
					...(await glob('@*/n8n-nodes-*', { ...globOptions, deep: 2 })),
			  ];

		for (const packagePath of installedPackagePaths) {
			try {
				await this.runDirectoryLoader(
					LazyPackageDirectoryLoader,
					path.join(nodeModulesDir, packagePath),
				);
			} catch (error) {
				ErrorReporter.error(error);
			}
		}
	}

	resolveIcon(packageName: string, url: string): string | undefined {
		const loader = this.loaders[packageName];
		if (loader) {
			const pathPrefix = `/icons/${packageName}/`;
			const filePath = path.resolve(loader.directory, url.substring(pathPrefix.length));
			if (!path.relative(loader.directory, filePath).includes('..')) {
				return filePath;
			}
		}
		return undefined;
	}

	getCustomDirectories(): string[] {
		const customDirectories = [UserSettings.getUserN8nFolderCustomExtensionPath()];

		if (process.env[CUSTOM_EXTENSION_ENV] !== undefined) {
			const customExtensionFolders = process.env[CUSTOM_EXTENSION_ENV].split(';');
			customDirectories.push(...customExtensionFolders);
		}

		return customDirectories;
	}

	private async loadNodesFromCustomDirectories(): Promise<void> {
		for (const directory of this.getCustomDirectories()) {
			await this.runDirectoryLoader(CustomDirectoryLoader, directory);
		}
	}

	async loadPackage(packageName: string) {
		const finalNodeUnpackedPath = path.join(this.downloadFolder, 'node_modules', packageName);
		return this.runDirectoryLoader(PackageDirectoryLoader, finalNodeUnpackedPath);
	}

	async unloadPackage(packageName: string) {
		if (packageName in this.loaders) {
			this.loaders[packageName].reset();
			delete this.loaders[packageName];
		}
	}

	/**
	 * Whether any of the node's credential types may be used to
	 * make a request from a node other than itself.
	 */
	private supportsProxyAuth(description: INodeTypeDescription) {
		if (!description.credentials) return false;

		return description.credentials.some(({ name }) => {
			const credType = this.types.credentials.find((t) => t.name === name);
			if (!credType) {
				LoggerProxy.warn(
					`Failed to load Custom API options for the node "${description.name}": Unknown credential name "${name}"`,
				);
				return false;
			}
			if (credType.authenticate !== undefined) return true;

			return (
				Array.isArray(credType.extends) &&
				credType.extends.some((parentType) =>
					['oAuth2Api', 'googleOAuth2Api', 'oAuth1Api'].includes(parentType),
				)
			);
		});
	}

	/**
	 * Inject a `Custom API Call` option into `resource` and `operation`
	 * parameters in a latest-version node that supports proxy auth.
	 */
	private injectCustomApiCallOptions() {
		this.types.nodes.forEach((node: INodeTypeDescription) => {
			const isLatestVersion =
				node.defaultVersion === undefined || node.defaultVersion === node.version;

			if (isLatestVersion) {
				if (!this.supportsProxyAuth(node)) return;

				node.properties.forEach((p) => {
					if (
						['resource', 'operation'].includes(p.name) &&
						Array.isArray(p.options) &&
						p.options[p.options.length - 1].name !== CUSTOM_API_CALL_NAME
					) {
						p.options.push({
							name: CUSTOM_API_CALL_NAME,
							value: CUSTOM_API_CALL_KEY,
						});
					}
				});
			}
		});
	}

	/**
	 * Run a loader of source files of nodes and credentials in a directory.
	 */
	private async runDirectoryLoader<T extends DirectoryLoader>(
		constructor: new (...args: ConstructorParameters<typeof DirectoryLoader>) => T,
		dir: string,
	) {
		const loader = new constructor(dir, this.excludeNodes, this.includeNodes);
		await loader.loadAll();
		this.loaders[loader.packageName] = loader;
		return loader;
	}

	async postProcessLoaders() {
		this.known = { nodes: {}, credentials: {} };
		this.loaded = { nodes: {}, credentials: {} };
		this.types = { nodes: [], credentials: [] };

		for (const loader of Object.values(this.loaders)) {
			// list of node & credential types that will be sent to the frontend
			const { known, types, directory } = loader;
			this.types.nodes = this.types.nodes.concat(types.nodes);
			this.types.credentials = this.types.credentials.concat(types.credentials);

			// Nodes and credentials that have been loaded immediately
			for (const nodeTypeName in loader.nodeTypes) {
				this.loaded.nodes[nodeTypeName] = loader.nodeTypes[nodeTypeName];
			}

			for (const credentialTypeName in loader.credentialTypes) {
				this.loaded.credentials[credentialTypeName] = loader.credentialTypes[credentialTypeName];
			}

			for (const type in known.nodes) {
				const { className, sourcePath } = known.nodes[type];
				this.known.nodes[type] = {
					className,
					sourcePath: path.join(directory, sourcePath),
				};
			}

			for (const type in known.credentials) {
				const {
					className,
					sourcePath,
					nodesToTestWith,
					extends: extendsArr,
				} = known.credentials[type];
				this.known.credentials[type] = {
					className,
					sourcePath: path.join(directory, sourcePath),
					nodesToTestWith:
						loader instanceof PackageDirectoryLoader
							? nodesToTestWith?.map((nodeName) => `${loader.packageName}.${nodeName}`)
							: undefined,
					extends: extendsArr,
				};
			}
		}

		this.injectCustomApiCallOptions();

		for (const postProcessor of this.postProcessors) {
			await postProcessor();
		}
	}

	async setupHotReload() {
		const { default: debounce } = await import('lodash/debounce');
		// eslint-disable-next-line import/no-extraneous-dependencies
		const { watch } = await import('chokidar');
		// eslint-disable-next-line @typescript-eslint/naming-convention
		const { Push } = await import('@/push');
		const push = Container.get(Push);

		Object.values(this.loaders).forEach(async (loader) => {
			try {
				await fsPromises.access(loader.directory);
			} catch {
				// If directory doesn't exist, there is nothing to watch
				return;
			}

			const realModulePath = path.join(await fsPromises.realpath(loader.directory), path.sep);
			const reloader = debounce(async () => {
				const modulesToUnload = Object.keys(require.cache).filter((filePath) =>
					filePath.startsWith(realModulePath),
				);
				modulesToUnload.forEach((filePath) => {
					delete require.cache[filePath];
				});

				loader.reset();
				await loader.loadAll();
				await this.postProcessLoaders();
				push.send('nodeDescriptionUpdated', undefined);
			}, 100);

			const toWatch = loader.isLazyLoaded
				? ['**/nodes.json', '**/credentials.json']
				: ['**/*.js', '**/*.json'];
			watch(toWatch, { cwd: realModulePath }).on('change', reloader);
		});
	}
}
