import uniq from 'lodash.uniq';
import glob from 'fast-glob';
import type { DirectoryLoader, Types } from 'n8n-core';
import {
	CUSTOM_EXTENSION_ENV,
	UserSettings,
	CustomDirectoryLoader,
	PackageDirectoryLoader,
	LazyPackageDirectoryLoader,
} from 'n8n-core';
import type {
	ICredentialTypes,
	ILogger,
	INodesAndCredentials,
	KnownNodesAndCredentials,
	INodeTypeDescription,
	LoadedNodesAndCredentials,
} from 'n8n-workflow';
import { LoggerProxy, ErrorReporterProxy as ErrorReporter } from 'n8n-workflow';

import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import config from '@/config';
import type { InstalledPackages } from '@db/entities/InstalledPackages';
import { executeCommand } from '@/CommunityNodes/helpers';
import {
	GENERATED_STATIC_DIR,
	RESPONSE_ERROR_MESSAGES,
	CUSTOM_API_CALL_KEY,
	CUSTOM_API_CALL_NAME,
	inTest,
	CLI_DIR,
} from '@/constants';
import { CredentialsOverwrites } from '@/CredentialsOverwrites';
import { Service } from 'typedi';

@Service()
export class LoadNodesAndCredentials implements INodesAndCredentials {
	known: KnownNodesAndCredentials = { nodes: {}, credentials: {} };

	loaded: LoadedNodesAndCredentials = { nodes: {}, credentials: {} };

	types: Types = { nodes: [], credentials: [] };

	loaders: Record<string, DirectoryLoader> = {};

	excludeNodes = config.getEnv('nodes.exclude');

	includeNodes = config.getEnv('nodes.include');

	credentialTypes: ICredentialTypes;

	logger: ILogger;

	private downloadFolder: string;

	async init() {
		// Make sure the imported modules can resolve dependencies fine.
		const delimiter = process.platform === 'win32' ? ';' : ':';
		process.env.NODE_PATH = module.paths.join(delimiter);

		// @ts-ignore
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		if (!inTest) module.constructor._initPaths();

		this.downloadFolder = UserSettings.getUserN8nFolderDownloadedNodesPath();

		// Load nodes from `n8n-nodes-base` and any other `n8n-nodes-*` package in the main `node_modules`
		const pathsToScan = [
			// In case "n8n" package is in same node_modules folder.
			path.join(CLI_DIR, '..'),
			// In case "n8n" package is the root and the packages are
			// in the "node_modules" folder underneath it.
			path.join(CLI_DIR, 'node_modules'),
			// Path where all community nodes are installed
			path.join(this.downloadFolder, 'node_modules'),
		];

		for (const nodeModulesDir of pathsToScan) {
			await this.loadNodesFromNodeModules(nodeModulesDir);
		}

		await this.loadNodesFromCustomDirectories();
		await this.postProcessLoaders();
		this.injectCustomApiCallOptions();
	}

	async generateTypesForFrontend() {
		const credentialsOverwrites = CredentialsOverwrites().getAll();
		for (const credential of this.types.credentials) {
			const overwrittenProperties = [];
			this.credentialTypes
				.getParentTypes(credential.name)
				.reverse()
				.map((name) => credentialsOverwrites[name])
				.forEach((overwrite) => {
					if (overwrite) overwrittenProperties.push(...Object.keys(overwrite));
				});

			if (credential.name in credentialsOverwrites) {
				overwrittenProperties.push(...Object.keys(credentialsOverwrites[credential.name]));
			}

			if (overwrittenProperties.length) {
				credential.__overwrittenProperties = uniq(overwrittenProperties);
			}
		}

		// pre-render all the node and credential types as static json files
		await mkdir(path.join(GENERATED_STATIC_DIR, 'types'), { recursive: true });

		const writeStaticJSON = async (name: string, data: object[]) => {
			const filePath = path.join(GENERATED_STATIC_DIR, `types/${name}.json`);
			const stream = createWriteStream(filePath, 'utf-8');
			stream.write('[\n');
			data.forEach((entry, index) => {
				stream.write(JSON.stringify(entry));
				if (index !== data.length - 1) stream.write(',');
				stream.write('\n');
			});
			stream.write(']\n');
			stream.end();
		};

		await writeStaticJSON('nodes', this.types.nodes);
		await writeStaticJSON('credentials', this.types.credentials);
	}

	private async loadNodesFromNodeModules(nodeModulesDir: string): Promise<void> {
		const globOptions = { cwd: nodeModulesDir, onlyDirectories: true };
		const installedPackagePaths = [
			...(await glob('n8n-nodes-*', { ...globOptions, deep: 1 })),
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

	private async installOrUpdateNpmModule(
		packageName: string,
		options: { version?: string } | { installedPackage: InstalledPackages },
	) {
		const isUpdate = 'installedPackage' in options;
		const command = isUpdate
			? `npm update ${packageName}`
			: `npm install ${packageName}${options.version ? `@${options.version}` : ''}`;

		try {
			await executeCommand(command);
		} catch (error) {
			if (error instanceof Error && error.message === RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND) {
				throw new Error(`The npm package "${packageName}" could not be found.`);
			}
			throw error;
		}

		const finalNodeUnpackedPath = path.join(this.downloadFolder, 'node_modules', packageName);

		let loader: PackageDirectoryLoader;
		try {
			loader = await this.runDirectoryLoader(PackageDirectoryLoader, finalNodeUnpackedPath);
		} catch (error) {
			// Remove this package since loading it failed
			const removeCommand = `npm remove ${packageName}`;
			try {
				await executeCommand(removeCommand);
			} catch {}
			throw new Error(RESPONSE_ERROR_MESSAGES.PACKAGE_LOADING_FAILED, { cause: error });
		}

		if (loader.loadedNodes.length > 0) {
			// Save info to DB
			try {
				const { persistInstalledPackageData, removePackageFromDatabase } = await import(
					'@/CommunityNodes/packageModel'
				);
				if (isUpdate) await removePackageFromDatabase(options.installedPackage);
				const installedPackage = await persistInstalledPackageData(loader);
				await this.postProcessLoaders();
				await this.generateTypesForFrontend();
				return installedPackage;
			} catch (error) {
				LoggerProxy.error('Failed to save installed packages and nodes', {
					error: error as Error,
					packageName,
				});
				throw error;
			}
		} else {
			// Remove this package since it contains no loadable nodes
			const removeCommand = `npm remove ${packageName}`;
			try {
				await executeCommand(removeCommand);
			} catch {}

			throw new Error(RESPONSE_ERROR_MESSAGES.PACKAGE_DOES_NOT_CONTAIN_NODES);
		}
	}

	async installNpmModule(packageName: string, version?: string): Promise<InstalledPackages> {
		return this.installOrUpdateNpmModule(packageName, { version });
	}

	async removeNpmModule(packageName: string, installedPackage: InstalledPackages): Promise<void> {
		const command = `npm remove ${packageName}`;

		await executeCommand(command);

		const { removePackageFromDatabase } = await import('@/CommunityNodes/packageModel');
		await removePackageFromDatabase(installedPackage);

		if (packageName in this.loaders) {
			this.loaders[packageName].reset();
			delete this.loaders[packageName];
		}

		await this.postProcessLoaders();
		await this.generateTypesForFrontend();
	}

	async updateNpmModule(
		packageName: string,
		installedPackage: InstalledPackages,
	): Promise<InstalledPackages> {
		return this.installOrUpdateNpmModule(packageName, { installedPackage });
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
			const { types, directory } = loader;
			this.types.nodes = this.types.nodes.concat(types.nodes);
			this.types.credentials = this.types.credentials.concat(types.credentials);

			// Nodes and credentials that have been loaded immediately
			for (const nodeTypeName in loader.nodeTypes) {
				this.loaded.nodes[nodeTypeName] = loader.nodeTypes[nodeTypeName];
			}

			for (const credentialTypeName in loader.credentialTypes) {
				this.loaded.credentials[credentialTypeName] = loader.credentialTypes[credentialTypeName];
			}

			// Nodes and credentials that will be lazy loaded
			if (loader instanceof PackageDirectoryLoader) {
				const { packageName, known } = loader;

				for (const type in known.nodes) {
					const { className, sourcePath } = known.nodes[type];
					this.known.nodes[type] = {
						className,
						sourcePath: path.join(directory, sourcePath),
					};
				}

				for (const type in known.credentials) {
					const { className, sourcePath, nodesToTestWith } = known.credentials[type];
					this.known.credentials[type] = {
						className,
						sourcePath: path.join(directory, sourcePath),
						nodesToTestWith: nodesToTestWith?.map((nodeName) => `${packageName}.${nodeName}`),
					};
				}
			}
		}
	}
}
