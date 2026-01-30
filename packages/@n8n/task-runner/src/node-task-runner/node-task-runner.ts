import type { INodeType, IVersionedNodeType, INodeExecutionData, NodeOutput } from 'n8n-workflow';
import { ApplicationError, getVersionedNodeType } from 'n8n-workflow';
import { createContext, runInContext } from 'node:vm';

import type { MainConfig } from '@/config/main-config';
import type { DataRequestResponse, TaskResultData } from '@/runner-types';
import { TaskRunner } from '@/task-runner';
import type { TaskParams } from '@/task-runner';

import { RemoteExecuteContext } from './remote-execute-context';

export interface NodeExecSettings {
	nodeType: string;
	nodeVersion: number;
	nodeParameters: Record<string, unknown>;
	/** Bundled node code (sent over wire) */
	bundle: {
		code: string;
		hash: string;
	};
}

/**
 * Task runner that executes n8n nodes in a separate process.
 *
 * Node source code is bundled and sent over the wire - this runner has
 * NO filesystem access to the main n8n process.
 */
export class NodeTaskRunner extends TaskRunner {
	/** Cache loaded node types by bundle hash */
	private loadedNodeTypes: Map<string, INodeType | IVersionedNodeType> = new Map();

	constructor(config: MainConfig) {
		super({
			taskType: 'node',
			name: 'Node Task Runner',
			...config.baseRunnerConfig,
		});
		console.log('[NodeTaskRunner] Initialized with taskType=node');
	}

	async executeTask(
		taskParams: TaskParams<NodeExecSettings>,
		signal: AbortSignal,
	): Promise<TaskResultData> {
		const { taskId, settings } = taskParams;
		const { bundle, nodeParameters } = settings;

		console.log('[NodeTaskRunner] Executing task', {
			taskId,
			nodeType: settings.nodeType,
			nodeVersion: settings.nodeVersion,
			bundleHash: bundle.hash,
		});

		// 1. Request full task data from main process
		console.log('[NodeTaskRunner] Requesting task data from main process', { taskId });
		const taskData = await this.requestData<DataRequestResponse>(taskId, {
			dataOfNodes: 'all',
			prevNode: true,
			input: { include: true },
			env: true,
		});
		console.log('[NodeTaskRunner] Task data received', {
			taskId,
			nodeName: taskData.node?.name,
			inputDataKeys: Object.keys(taskData.inputData || {}),
		});

		// 2. Load node type from bundle (no filesystem access needed!)
		console.log('[NodeTaskRunner] Loading node from bundle', { bundleHash: bundle.hash });
		const loadedNode = this.loadNodeFromBundle(bundle, settings.nodeType);

		// Handle VersionedNodeType - get the specific version's implementation
		const nodeTypeInstance = getVersionedNodeType(loadedNode, settings.nodeVersion);
		console.log('[NodeTaskRunner] Resolved node type', {
			requestedVersion: settings.nodeVersion,
			resolvedVersion: nodeTypeInstance.description?.version,
			isVersioned: 'nodeVersions' in loadedNode,
		});

		// 3. Create remote execution context
		console.log('[NodeTaskRunner] Creating remote execution context', { taskId });
		const context = new RemoteExecuteContext(taskId, this, taskData, nodeParameters, signal);

		// 4. Execute the node
		console.log('[NodeTaskRunner] Executing node', {
			taskId,
			nodeType: settings.nodeType,
			hasExecuteMethod: !!nodeTypeInstance.execute,
		});
		let result: NodeOutput;
		if (nodeTypeInstance.execute) {
			const startTime = Date.now();
			result = await nodeTypeInstance.execute.call(context);
			const executionTimeMs = Date.now() - startTime;
			console.log('[NodeTaskRunner] Node execution complete', {
				taskId,
				executionTimeMs,
				resultType: result ? (Array.isArray(result) ? 'array' : typeof result) : 'null',
			});
		} else {
			throw new ApplicationError(`Node type ${settings.nodeType} does not have an execute method`);
		}

		// EngineRequest is not supported in sandboxed execution
		if (result && 'actions' in result) {
			throw new ApplicationError('EngineRequest is not supported in sandboxed node execution');
		}

		console.log('[NodeTaskRunner] Task complete', { taskId });
		return {
			result: result ?? [],
			customData: context.getCustomData(),
		};
	}

	private loadNodeFromBundle(
		bundle: { code: string; hash: string },
		nodeType: string,
	): INodeType | IVersionedNodeType {
		// Check cache first
		const cached = this.loadedNodeTypes.get(bundle.hash);
		if (cached) {
			console.log('[NodeTaskRunner] Using cached node type', { bundleHash: bundle.hash });
			return cached;
		}

		console.log('[NodeTaskRunner] Loading new node type from bundle', {
			bundleHash: bundle.hash,
			codeSize: bundle.code.length,
		});

		// Create isolated VM context
		// IMPORTANT: In CommonJS, `exports` and `module.exports` must point to the same object initially
		const exportsObj = {};
		const vmContext = createContext({
			module: { exports: exportsObj },
			exports: exportsObj, // Same reference as module.exports
			require: this.createSandboxedRequire(),
			console,
			Buffer,
			setTimeout,
			setInterval,
			clearTimeout,
			clearInterval,
			process: { env: {} },
			global: {}, // Some bundles reference global
		});

		// Execute the bundle
		console.log('[NodeTaskRunner] Executing bundle in VM context');
		runInContext(bundle.code, vmContext);

		// Get the exported node class
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const moduleExports = vmContext.module.exports;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const directExports = vmContext.exports;

		const exportedKeys = Object.keys(moduleExports || directExports || {});
		console.log('[NodeTaskRunner] Bundle exports inspection', {
			bundleHash: bundle.hash,
			moduleExportsKeys: Object.keys(moduleExports || {}),
			directExportsKeys: Object.keys(directExports || {}),
			moduleExportsType: typeof moduleExports,
			hasDefault: !!(moduleExports && moduleExports.default),
		});

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const exported = moduleExports || directExports;

		// Find the node class from exports
		// Priority: 1. default export, 2. export matching node type name, 3. first function export
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		let NodeClass = exported.default;

		if (!NodeClass) {
			// Extract expected class name from nodeType (e.g., "n8n-nodes-base.html" -> "Html")
			const expectedClassName = nodeType.split('.').pop()?.replace(/^[a-z]/, (c) => c.toUpperCase());

			// Try to find export matching the expected class name
			for (const key of exportedKeys) {
				if (key === expectedClassName || key.toLowerCase() === expectedClassName?.toLowerCase()) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					NodeClass = exported[key];
					console.log('[NodeTaskRunner] Found node class by name match', {
						exportKey: key,
						expectedClassName,
					});
					break;
				}
			}

			// Fallback: find first function that looks like a class constructor
			if (!NodeClass) {
				for (const key of exportedKeys) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const candidate = exported[key];
					if (typeof candidate === 'function' && /^[A-Z]/.test(key)) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						NodeClass = candidate;
						console.log('[NodeTaskRunner] Using first capitalized function export', {
							exportKey: key,
						});
						break;
					}
				}
			}

			// Last resort: first export
			if (!NodeClass) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				NodeClass = exported[exportedKeys[0]];
				console.log('[NodeTaskRunner] Falling back to first export', {
					exportKey: exportedKeys[0],
				});
			}
		}

		if (!NodeClass) {
			const errorMsg = `Bundle did not export a node class. Expected "${nodeType}" but found exports: [${exportedKeys.join(', ')}]`;
			console.error('[NodeTaskRunner] ' + errorMsg, {
				bundleHash: bundle.hash,
				exportedKeys,
				nodeType,
			});
			throw new Error(errorMsg);
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		const instance = new NodeClass() as INodeType | IVersionedNodeType;
		this.loadedNodeTypes.set(bundle.hash, instance);
		console.log('[NodeTaskRunner] Node type loaded and cached', {
			bundleHash: bundle.hash,
			nodeDescription: instance.description?.name,
			isVersioned: 'nodeVersions' in instance,
		});
		return instance;
	}

	private createSandboxedRequire() {
		// Allow only specific modules that we control
		const allowedModules: Record<string, unknown> = {
			// Provide n8n-workflow from runner's own installation
			'n8n-workflow': require('n8n-workflow'),
			'n8n-core': require('n8n-core'),
		};

		return (moduleName: string): unknown => {
			if (moduleName in allowedModules) {
				return allowedModules[moduleName];
			}
			throw new Error(`Module "${moduleName}" is not allowed in sandboxed node execution`);
		};
	}
}
