'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.LoadNodesAndCredentials = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const fast_glob_1 = __importDefault(require('fast-glob'));
const promises_1 = __importDefault(require('fs/promises'));
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const path_1 = __importDefault(require('path'));
const picocolors_1 = __importDefault(require('picocolors'));
const constants_1 = require('@/constants');
const community_packages_config_1 = require('./community-packages/community-packages.config');
let LoadNodesAndCredentials = class LoadNodesAndCredentials {
	constructor(logger, errorReporter, instanceSettings, globalConfig) {
		this.logger = logger;
		this.errorReporter = errorReporter;
		this.instanceSettings = instanceSettings;
		this.globalConfig = globalConfig;
		this.known = { nodes: {}, credentials: {} };
		this.loaded = { nodes: {}, credentials: {} };
		this.types = { nodes: [], credentials: [] };
		this.loaders = {};
		this.excludeNodes = this.globalConfig.nodes.exclude;
		this.includeNodes = this.globalConfig.nodes.include;
		this.postProcessors = [];
	}
	async init() {
		if (backend_common_1.inTest) throw new n8n_workflow_1.UnexpectedError('Not available in tests');
		const delimiter = process.platform === 'win32' ? ';' : ':';
		process.env.NODE_PATH = module.paths.join(delimiter);
		module.constructor._initPaths();
		if (!constants_1.inE2ETests) {
			this.excludeNodes = this.excludeNodes ?? [];
			this.excludeNodes.push('n8n-nodes-base.e2eTest');
		}
		const basePathsToScan = [
			path_1.default.join(constants_1.CLI_DIR, '..'),
			path_1.default.join(constants_1.CLI_DIR, 'node_modules'),
		];
		for (const nodeModulesDir of basePathsToScan) {
			await this.loadNodesFromNodeModules(nodeModulesDir, 'n8n-nodes-base');
			await this.loadNodesFromNodeModules(nodeModulesDir, '@n8n/n8n-nodes-langchain');
		}
		if (!di_1.Container.get(community_packages_config_1.CommunityPackagesConfig).preventLoading) {
			await this.loadNodesFromNodeModules(
				path_1.default.join(this.instanceSettings.nodesDownloadDir, 'node_modules'),
			);
		}
		await this.loadNodesFromCustomDirectories();
		await this.postProcessLoaders();
	}
	addPostProcessor(fn) {
		this.postProcessors.push(fn);
	}
	isKnownNode(type) {
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
	async loadNodesFromNodeModules(nodeModulesDir, packageName) {
		const globOptions = {
			cwd: nodeModulesDir,
			onlyDirectories: true,
			deep: 1,
		};
		const installedPackagePaths = packageName
			? await (0, fast_glob_1.default)(packageName, globOptions)
			: [
					...(await (0, fast_glob_1.default)('n8n-nodes-*', globOptions)),
					...(await (0, fast_glob_1.default)('@*/n8n-nodes-*', { ...globOptions, deep: 2 })),
				];
		for (const packagePath of installedPackagePaths) {
			try {
				await this.runDirectoryLoader(
					n8n_core_1.LazyPackageDirectoryLoader,
					path_1.default.join(nodeModulesDir, packagePath),
				);
			} catch (error) {
				this.logger.error(error.message);
				this.errorReporter.error(error);
			}
		}
	}
	resolveIcon(packageName, url) {
		const loader = this.loaders[packageName];
		if (!loader) {
			return undefined;
		}
		const pathPrefix = `/icons/${packageName}/`;
		const filePath = path_1.default.resolve(loader.directory, url.substring(pathPrefix.length));
		return (0, backend_common_1.isContainedWithin)(loader.directory, filePath)
			? filePath
			: undefined;
	}
	resolveSchema({ node, version, resource, operation }) {
		const nodePath = this.known.nodes[node]?.sourcePath;
		if (!nodePath) {
			return undefined;
		}
		const nodeParentPath = path_1.default.dirname(nodePath);
		const schemaPath = ['__schema__', `v${version}`, resource, operation].filter(Boolean).join('/');
		const filePath = path_1.default.resolve(nodeParentPath, schemaPath + '.json');
		return (0, backend_common_1.isContainedWithin)(nodeParentPath, filePath) ? filePath : undefined;
	}
	getCustomDirectories() {
		const customDirectories = [this.instanceSettings.customExtensionDir];
		if (process.env[n8n_core_1.CUSTOM_EXTENSION_ENV] !== undefined) {
			const customExtensionFolders = process.env[n8n_core_1.CUSTOM_EXTENSION_ENV].split(';');
			customDirectories.push(...customExtensionFolders);
		}
		return customDirectories;
	}
	async loadNodesFromCustomDirectories() {
		for (const directory of this.getCustomDirectories()) {
			await this.runDirectoryLoader(n8n_core_1.CustomDirectoryLoader, directory);
		}
	}
	async loadPackage(packageName) {
		const finalNodeUnpackedPath = path_1.default.join(
			this.instanceSettings.nodesDownloadDir,
			'node_modules',
			packageName,
		);
		return await this.runDirectoryLoader(n8n_core_1.PackageDirectoryLoader, finalNodeUnpackedPath);
	}
	async unloadPackage(packageName) {
		if (packageName in this.loaders) {
			this.loaders[packageName].reset();
			delete this.loaders[packageName];
		}
	}
	supportsProxyAuth(description) {
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
	injectCustomApiCallOptions() {
		this.types.nodes.forEach((node) => {
			const isLatestVersion =
				node.defaultVersion === undefined || node.defaultVersion === node.version;
			if (isLatestVersion) {
				if (!this.supportsProxyAuth(node)) return;
				node.properties.forEach((p) => {
					if (
						['resource', 'operation'].includes(p.name) &&
						Array.isArray(p.options) &&
						p.options[p.options.length - 1].name !== constants_1.CUSTOM_API_CALL_NAME
					) {
						p.options.push({
							name: constants_1.CUSTOM_API_CALL_NAME,
							value: constants_1.CUSTOM_API_CALL_KEY,
						});
					}
				});
			}
		});
	}
	async runDirectoryLoader(constructor, dir) {
		const loader = new constructor(dir, this.excludeNodes, this.includeNodes);
		if (loader instanceof n8n_core_1.PackageDirectoryLoader && loader.packageName in this.loaders) {
			throw new n8n_workflow_1.UserError(
				picocolors_1.default.red(
					`nodes package ${loader.packageName} is already loaded.\n Please delete this second copy at path ${dir}`,
				),
			);
		}
		await loader.loadAll();
		this.loaders[loader.packageName] = loader;
		return loader;
	}
	createAiTools() {
		const usableNodes = this.types.nodes.filter((nodeType) => nodeType.usableAsTool);
		for (const usableNode of usableNodes) {
			const description =
				typeof usableNode.usableAsTool === 'object'
					? {
							...(0, n8n_workflow_1.deepCopy)(usableNode),
							...usableNode.usableAsTool?.replacements,
						}
					: (0, n8n_workflow_1.deepCopy)(usableNode);
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
			const { known, types, directory, packageName } = loader;
			this.types.nodes = this.types.nodes.concat(
				types.nodes.map(({ name, ...rest }) => ({
					...rest,
					name: `${packageName}.${name}`,
				})),
			);
			this.types.credentials = this.types.credentials.concat(
				types.credentials.map(({ supportedNodes, ...rest }) => ({
					...rest,
					supportedNodes:
						loader instanceof n8n_core_1.PackageDirectoryLoader
							? supportedNodes?.map((nodeName) => `${loader.packageName}.${nodeName}`)
							: undefined,
				})),
			);
			for (const nodeTypeName in loader.nodeTypes) {
				this.loaded.nodes[`${packageName}.${nodeTypeName}`] = loader.nodeTypes[nodeTypeName];
			}
			for (const credentialTypeName in loader.credentialTypes) {
				this.loaded.credentials[credentialTypeName] = loader.credentialTypes[credentialTypeName];
			}
			for (const type in known.nodes) {
				const { className, sourcePath } = known.nodes[type];
				this.known.nodes[`${packageName}.${type}`] = {
					className,
					sourcePath: path_1.default.join(directory, sourcePath),
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
					sourcePath: path_1.default.join(directory, sourcePath),
					supportedNodes:
						loader instanceof n8n_core_1.PackageDirectoryLoader
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
	recognizesNode(fullNodeType) {
		const [packageName, nodeType] = fullNodeType.split('.');
		const { loaders } = this;
		const loader = loaders[packageName];
		return !!loader && nodeType in loader.known.nodes;
	}
	getNode(fullNodeType) {
		const [packageName, nodeType] = fullNodeType.split('.');
		const { loaders } = this;
		const loader = loaders[packageName];
		if (!loader) {
			throw new n8n_core_1.UnrecognizedNodeTypeError(packageName, nodeType);
		}
		return loader.getNode(nodeType);
	}
	getCredential(credentialType) {
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
		throw new n8n_core_1.UnrecognizedCredentialTypeError(credentialType);
	}
	convertNodeToAiTool(item) {
		function isFullDescription(obj) {
			return typeof obj === 'object' && obj !== null && 'properties' in obj;
		}
		if (isFullDescription(item.description)) {
			item.description.name += 'Tool';
			item.description.inputs = [];
			item.description.outputs = [n8n_workflow_1.NodeConnectionTypes.AiTool];
			item.description.displayName += ' Tool';
			delete item.description.usableAsTool;
			const hasResource = item.description.properties.some((prop) => prop.name === 'resource');
			const hasOperation = item.description.properties.some((prop) => prop.name === 'operation');
			if (!item.description.properties.map((prop) => prop.name).includes('toolDescription')) {
				const descriptionType = {
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
				const descProp = {
					displayName: 'Description',
					name: 'toolDescription',
					type: 'string',
					default: item.description.description,
					required: true,
					typeOptions: { rows: 2 },
					description:
						'Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often',
				};
				item.description.properties.unshift(descProp);
				if (hasResource || hasOperation) {
					item.description.properties.unshift(descriptionType);
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
		const { default: debounce } = await Promise.resolve().then(() =>
			__importStar(require('lodash/debounce')),
		);
		const { watch } = await Promise.resolve().then(() => __importStar(require('chokidar')));
		const { Push } = await Promise.resolve().then(() => __importStar(require('@/push')));
		const push = di_1.Container.get(Push);
		Object.values(this.loaders).forEach(async (loader) => {
			const { directory } = loader;
			try {
				await promises_1.default.access(directory);
			} catch {
				return;
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
			const watchPath = loader.isLazyLoaded ? path_1.default.join(directory, 'dist') : directory;
			const watchOptions = {
				ignoreInitial: true,
				cwd: directory,
				ignored: (filePath, stats) => {
					if (!stats) return false;
					if (stats.isDirectory()) return false;
					if (filePath.includes('node_modules')) return true;
					if (loader.isLazyLoaded) {
						const basename = path_1.default.basename(filePath);
						return basename !== 'nodes.json' && basename !== 'credentials.json';
					}
					return !filePath.endsWith('.js') && !filePath.endsWith('.json');
				},
			};
			const watcher = watch(watchPath, watchOptions);
			watcher.on('change', reloader);
			watcher.on('add', reloader);
		});
	}
};
exports.LoadNodesAndCredentials = LoadNodesAndCredentials;
exports.LoadNodesAndCredentials = LoadNodesAndCredentials = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			n8n_core_1.ErrorReporter,
			n8n_core_1.InstanceSettings,
			config_1.GlobalConfig,
		]),
	],
	LoadNodesAndCredentials,
);
//# sourceMappingURL=load-nodes-and-credentials.js.map
