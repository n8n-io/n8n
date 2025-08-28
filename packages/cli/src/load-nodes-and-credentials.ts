import { inTest, isContainedWithin, Logger, ModuleRegistry } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import type ParcelWatcher from '@parcel/watcher';
import glob from 'fast-glob';
import fsPromises from 'fs/promises';
import type { Class, DirectoryLoader, Types } from 'n8n-core';
import {
	CUSTOM_EXTENSION_ENV,
	ErrorReporter,
	InstanceSettings,
	CustomDirectoryLoader,
	PackageDirectoryLoader,
	LazyPackageDirectoryLoader,
	UnrecognizedCredentialTypeError,
	UnrecognizedNodeTypeError,
} from 'n8n-core';
import type {
	KnownNodesAndCredentials,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	LoadedClass,
	ICredentialType,
	INodeType,
	IVersionedNodeType,
	INodeProperties,
	LoadedNodesAndCredentials,
} from 'n8n-workflow';
import { deepCopy, NodeConnectionTypes, UnexpectedError, UserError } from 'n8n-workflow';
import path from 'path';
import picocolors from 'picocolors';

import { CUSTOM_API_CALL_KEY, CUSTOM_API_CALL_NAME, CLI_DIR, inE2ETests } from '@/constants';

@Service()
export class LoadNodesAndCredentials {
	private known: KnownNodesAndCredentials = { nodes: {}, credentials: {} };

	// This contains the actually loaded objects, and their source paths
	loaded: LoadedNodesAndCredentials = { nodes: {}, credentials: {} };

	// For nodes, this only contains the descriptions, loaded from either the
	// actual file, or the lazy loaded json
	types: Types = { nodes: [], credentials: [] };

	loaders: Record<string, DirectoryLoader> = {};

	excludeNodes = this.globalConfig.nodes.exclude;

	includeNodes = this.globalConfig.nodes.include;

	private postProcessors: Array<() => Promise<void>> = [];

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	async init() {
		if (inTest) throw new UnexpectedError('Not available in tests');

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
			await this.loadNodesFromNodeModules(nodeModulesDir, '@n8n/n8n-nodes-langchain');
		}

		for (const dir of this.moduleRegistry.loadDirs) {
			await this.loadNodesFromNodeModules(dir);
		}

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
				this.logger.error((error as Error).message);
				this.errorReporter.error(error);
			}
		}
	}

	resolveIcon(packageName: string, url: string): string | undefined {
		const loader = this.loaders[packageName];
		if (!loader) {
			return undefined;
		}
		const pathPrefix = `/icons/${packageName}/`;
		const filePath = path.resolve(loader.directory, url.substring(pathPrefix.length));

		return isContainedWithin(loader.directory, filePath) ? filePath : undefined;
	}

	resolveSchema({
		node,
		version,
		resource,
		operation,
	}: {
		node: string;
		version: string;
		resource?: string;
		operation?: string;
	}): string | undefined {
		const nodePath = this.known.nodes[node]?.sourcePath;
		if (!nodePath) {
			return undefined;
		}

		const nodeParentPath = path.dirname(nodePath);
		const schemaPath = ['__schema__', `v${version}`, resource, operation].filter(Boolean).join('/');
		const filePath = path.resolve(nodeParentPath, schemaPath + '.json');

		return isContainedWithin(nodeParentPath, filePath) ? filePath : undefined;
	}

	findLastCalloutIndex(properties: INodeProperties[]): number {
		for (let i = properties.length - 1; i >= 0; i--) {
			if (properties[i].type === 'callout') return i;
		}

		return -1;
	}

	getCustomDirectories(): string[] {
		const customDirectories = [this.instanceSettings.customExtensionDir];

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
		const finalNodeUnpackedPath = path.join(
			this.instanceSettings.nodesDownloadDir,
			'node_modules',
			packageName,
		);
		return await this.runDirectoryLoader(PackageDirectoryLoader, finalNodeUnpackedPath);
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
				this.logger.warn(
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
		constructor: Class<T, ConstructorParameters<typeof DirectoryLoader>>,
		dir: string,
	) {
		const loader = new constructor(dir, this.excludeNodes, this.includeNodes);
		if (loader instanceof PackageDirectoryLoader && loader.packageName in this.loaders) {
			throw new UserError(
				picocolors.red(
					`nodes package ${loader.packageName} is already loaded.\n Please delete this second copy at path ${dir}`,
				),
			);
		}
		await loader.loadAll();
		this.loaders[loader.packageName] = loader;
		return loader;
	}

	/**
	 * This creates all AI Agent tools by duplicating the node descriptions for
	 * all nodes that are marked as `usableAsTool`. It basically modifies the
	 * description. The actual wrapping happens in the langchain code for getting
	 * the connected tools.
	 */
	createAiTools() {
		const usableNodes: Array<INodeTypeBaseDescription | INodeTypeDescription> =
			this.types.nodes.filter((nodeType) => nodeType.usableAsTool);

		for (const usableNode of usableNodes) {
			const description =
				typeof usableNode.usableAsTool === 'object'
					? ({
							...deepCopy(usableNode),
							...usableNode.usableAsTool?.replacements,
						} as INodeTypeBaseDescription)
					: deepCopy(usableNode);
			const wrapped = this.convertNodeToAiTool({ description }).description;

			this.types.nodes.push(wrapped);
			this.known.nodes[wrapped.name] = { ...this.known.nodes[usableNode.name] };

			const credentialNames = Object.entries(this.known.credentials)
				.filter(([_, credential]) => credential?.supportedNodes?.includes(usableNode.name))
				.map(([credentialName]) => credentialName);

			credentialNames.forEach((name) =>
				this.known.credentials[name]?.supportedNodes?.push(wrapped.name),
			);
		}
	}

	async postProcessLoaders() {
		this.known = { nodes: {}, credentials: {} };
		this.loaded = { nodes: {}, credentials: {} };
		this.types = { nodes: [], credentials: [] };

		for (const loader of Object.values(this.loaders)) {
			// list of node & credential types that will be sent to the frontend
			const { known, types, directory, packageName } = loader;
			this.types.nodes = this.types.nodes.concat(
				types.nodes.map(({ name, ...rest }) => ({
					...rest,
					name: `${packageName}.${name}`,
				})),
			);

			const processedCredentials = types.credentials.map((credential) => {
				if (this.shouldAddDomainRestrictions(credential)) {
					const clonedCredential = { ...credential };
					clonedCredential.properties = this.injectDomainRestrictionFields([
						...(clonedCredential.properties ?? []),
					]);
					return {
						...clonedCredential,
						supportedNodes:
							loader instanceof PackageDirectoryLoader
								? credential.supportedNodes?.map((nodeName) => `${loader.packageName}.${nodeName}`)
								: undefined,
					};
				}
				return {
					...credential,
					supportedNodes:
						loader instanceof PackageDirectoryLoader
							? credential.supportedNodes?.map((nodeName) => `${loader.packageName}.${nodeName}`)
							: undefined,
				};
			});

			this.types.credentials = this.types.credentials.concat(processedCredentials);

			// Add domain restriction fields to loaded credentials
			for (const credentialTypeName in loader.credentialTypes) {
				const credentialType = loader.credentialTypes[credentialTypeName];
				if (this.shouldAddDomainRestrictions(credentialType)) {
					// Access properties through the type field
					credentialType.type.properties = this.injectDomainRestrictionFields([
						...(credentialType.type.properties ?? []),
					]);
				}
			}

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
					supportedNodes:
						loader instanceof PackageDirectoryLoader
							? supportedNodes?.map((nodeName) => `${loader.packageName}.${nodeName}`)
							: undefined,
					extends: extendsArr,
				};
			}
		}

		this.createAiTools();

		this.injectCustomApiCallOptions();

		for (const postProcessor of this.postProcessors) {
			await postProcessor();
		}
	}

	recognizesNode(fullNodeType: string): boolean {
		const [packageName, nodeType] = fullNodeType.split('.');
		const { loaders } = this;
		const loader = loaders[packageName];
		return !!loader && nodeType in loader.known.nodes;
	}

	getNode(fullNodeType: string): LoadedClass<INodeType | IVersionedNodeType> {
		const [packageName, nodeType] = fullNodeType.split('.');
		const { loaders } = this;
		const loader = loaders[packageName];
		if (!loader) {
			throw new UnrecognizedNodeTypeError(packageName, nodeType);
		}
		return loader.getNode(nodeType);
	}

	getCredential(credentialType: string): LoadedClass<ICredentialType> {
		const { loadedCredentials } = this;

		for (const loader of Object.values(this.loaders)) {
			if (credentialType in loader.known.credentials) {
				const loaded = loader.getCredential(credentialType);
				loadedCredentials[credentialType] = loaded;
			}
		}

		if (credentialType in loadedCredentials) {
			return loadedCredentials[credentialType];
		}

		throw new UnrecognizedCredentialTypeError(credentialType);
	}

	/**
	 * Modifies the description of the passed in object, such that it can be used
	 * as an AI Agent Tool.
	 * Returns the modified item (not copied)
	 */
	convertNodeToAiTool<
		T extends object & { description: INodeTypeDescription | INodeTypeBaseDescription },
	>(item: T): T {
		// quick helper function for type-guard down below
		function isFullDescription(obj: unknown): obj is INodeTypeDescription {
			return typeof obj === 'object' && obj !== null && 'properties' in obj;
		}

		if (isFullDescription(item.description)) {
			item.description.name += 'Tool';
			item.description.inputs = [];
			item.description.outputs = [NodeConnectionTypes.AiTool];
			item.description.displayName += ' Tool';
			delete item.description.usableAsTool;

			const hasResource = item.description.properties.some((prop) => prop.name === 'resource');
			const hasOperation = item.description.properties.some((prop) => prop.name === 'operation');

			if (!item.description.properties.map((prop) => prop.name).includes('toolDescription')) {
				const descriptionType: INodeProperties = {
					displayName: 'Tool Description',
					name: 'descriptionType',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: 'Set Automatically',
							value: 'auto',
							description: 'Automatically set based on resource and operation',
						},
						{
							name: 'Set Manually',
							value: 'manual',
							description: 'Manually set the description',
						},
					],
					default: 'auto',
				};

				const descProp: INodeProperties = {
					displayName: 'Description',
					name: 'toolDescription',
					type: 'string',
					default: item.description.description,
					required: true,
					typeOptions: { rows: 2 },
					description:
						'Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often',
				};

				const lastCallout = this.findLastCalloutIndex(item.description.properties);

				item.description.properties.splice(lastCallout + 1, 0, descProp);

				// If node has resource or operation we can determine pre-populate tool description based on it
				// so we add the descriptionType property as the first property after possible callout param(s).
				if (hasResource || hasOperation) {
					item.description.properties.splice(lastCallout + 1, 0, descriptionType);

					descProp.displayOptions = {
						show: {
							descriptionType: ['manual'],
						},
					};
				}
			}
		}

		const resources = item.description.codex?.resources ?? {};

		item.description.codex = {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: item.description.codex?.subcategories?.Tools ?? ['Other Tools'],
			},
			resources,
		};
		return item;
	}

	async setupHotReload() {
		const { default: debounce } = await import('lodash/debounce');

		const { subscribe } = await import('@parcel/watcher');

		const { Push } = await import('@/push');
		const push = Container.get(Push);

		for (const loader of Object.values(this.loaders)) {
			const { directory } = loader;
			try {
				await fsPromises.access(directory);
			} catch {
				// If directory doesn't exist, there is nothing to watch
				continue;
			}

			const reloader = debounce(async () => {
				this.logger.info(`Hot reload triggered for ${loader.packageName}`);
				try {
					loader.reset();
					await loader.loadAll();
					await this.postProcessLoaders();
					push.broadcast({ type: 'nodeDescriptionUpdated', data: {} });
				} catch (error) {
					this.logger.error(`Hot reload failed for ${loader.packageName}`);
				}
			}, 100);

			// For lazy loaded packages, we need to watch the dist directory
			const watchPaths = loader.isLazyLoaded ? [path.join(directory, 'dist')] : [directory];
			const customNodesRoot = path.join(directory, 'node_modules');

			if (loader.packageName === 'CUSTOM') {
				const customNodeEntries = await fsPromises.readdir(customNodesRoot, {
					withFileTypes: true,
				});

				// Custom nodes are usually symlinked using npm link. Resolve symlinks to support file watching
				const realCustomNodesPaths = await Promise.all(
					customNodeEntries
						.filter(
							(entry) =>
								(entry.isDirectory() || entry.isSymbolicLink()) && !entry.name.startsWith('.'),
						)
						.map(
							async (entry) =>
								await fsPromises.realpath(path.join(customNodesRoot, entry.name)).catch(() => null),
						),
				);

				watchPaths.push.apply(
					watchPaths,
					realCustomNodesPaths.filter((path): path is string => !!path),
				);
			}

			this.logger.debug('Watching node folders for hot reload', {
				loader: loader.packageName,
				paths: watchPaths,
			});

			for (const watchPath of watchPaths) {
				const onFileEvent: ParcelWatcher.SubscribeCallback = async (_error, events) => {
					if (events.some((event) => event.type !== 'delete')) {
						const modules = Object.keys(require.cache).filter((module) =>
							module.startsWith(watchPath),
						);

						for (const module of modules) {
							delete require.cache[module];
						}
						await reloader();
					}
				};

				// Ignore nested node_modules folders
				const ignore = ['**/node_modules/**/node_modules/**'];

				await subscribe(watchPath, onFileEvent, { ignore });
			}
		}
	}

	private shouldAddDomainRestrictions(
		credential: ICredentialType | LoadedClass<ICredentialType>,
	): boolean {
		// Handle both credential types by extracting the actual ICredentialType
		const credentialType = 'type' in credential ? credential.type : credential;

		return (
			credentialType.authenticate !== undefined ||
			credentialType.genericAuth === true ||
			(Array.isArray(credentialType.extends) &&
				(credentialType.extends.includes('oAuth2Api') ||
					credentialType.extends.includes('oAuth1Api') ||
					credentialType.extends.includes('googleOAuth2Api')))
		);
	}

	private injectDomainRestrictionFields(properties: INodeProperties[]): INodeProperties[] {
		// Check if fields already exist to avoid duplicates
		if (properties.some((prop) => prop.name === 'allowedHttpRequestDomains')) {
			return properties;
		}
		const domainFields: INodeProperties[] = [
			{
				displayName: 'Allowed HTTP Request Domains',
				name: 'allowedHttpRequestDomains',
				type: 'options',
				options: [
					{
						name: 'All',
						value: 'all',
						description: 'Allow all requests when used in the HTTP Request node',
					},
					{
						name: 'Specific Domains',
						value: 'domains',
						description: 'Restrict requests to specific domains',
					},
					{
						name: 'None',
						value: 'none',
						description: 'Block all requests when used in the HTTP Request node',
					},
				],
				default: 'all',
				description: 'Control which domains this credential can be used with in HTTP Request nodes',
			},
			{
				displayName: 'Allowed Domains',
				name: 'allowedDomains',
				type: 'string',
				default: '',
				placeholder: 'example.com, *.subdomain.com',
				description: 'Comma-separated list of allowed domains (supports wildcards with *)',
				displayOptions: {
					show: {
						allowedHttpRequestDomains: ['domains'],
					},
				},
			},
		];
		return [...properties, ...domainFields];
	}
}
