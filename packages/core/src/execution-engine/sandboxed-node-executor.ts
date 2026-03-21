import type { INodeExecutionData, INodeType, NodePermissionDescriptor } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { loadSecureExec } from './load-secure-exec';
import type { ExecuteContext } from './node-execution-context';
import { nodeSourceRegistry } from '../nodes-loader/load-class-in-isolation';

interface SecureExecPermissions {
	fs?: (req: { op: string; path: string }) => { allow: boolean };
	network?: (req: { hostname?: string; url?: string; op?: string }) => { allow: boolean };
	childProcess?: (req: { command: string }) => { allow: boolean };
	env?: (req: { key: string }) => { allow: boolean };
}

const DEFAULT_MEMORY_LIMIT_MB = 64;
const DEFAULT_CPU_TIME_LIMIT_MS = 10_000;
const RESULT_MARKER = '__N8N_SANDBOX_RESULT__:';

const INTERNAL_FS_PATHS = ['/root/app/', '/root/node_modules/'];
const READ_OPS = new Set(['read', 'stat', 'readdir', 'readlink', 'exists']);

function buildSecureExecPermissions(
	descriptor: NodePermissionDescriptor | undefined,
): SecureExecPermissions {
	const permissions: SecureExecPermissions = {};

	if (descriptor?.network) {
		if (descriptor.network === true) {
			permissions.network = () => ({ allow: true });
		} else {
			const hosts = descriptor.network.allowedHosts ?? [];
			permissions.network = (req) => {
				if (hosts.length === 0) return { allow: true };
				let hostname = req.hostname;
				if (!hostname && req.url) {
					try {
						hostname = new URL(req.url).hostname;
					} catch {
						return { allow: false };
					}
				}
				return { allow: hostname !== null && hostname !== undefined && hosts.includes(hostname) };
			};
		}
	}

	if (descriptor?.filesystem) {
		if (descriptor.filesystem === true) {
			permissions.fs = () => ({ allow: true });
		} else {
			const paths = [...INTERNAL_FS_PATHS, ...(descriptor.filesystem.paths ?? [])];
			const readOnly = descriptor.filesystem.readonly ?? false;
			permissions.fs = (req) => {
				if (readOnly && req.op === 'write') return { allow: false };
				return { allow: paths.some((p) => req.path.startsWith(p)) };
			};
		}
	} else {
		permissions.fs = (req) => ({
			allow: READ_OPS.has(req.op) && INTERNAL_FS_PATHS.some((p) => req.path.startsWith(p)),
		});
	}

	if (descriptor?.childProcess) {
		if (descriptor.childProcess === true) {
			permissions.childProcess = () => ({ allow: true });
		} else {
			const cmds = descriptor.childProcess.allowedCommands ?? [];
			permissions.childProcess = (req) => ({ allow: cmds.includes(req.command) });
		}
	}

	if (descriptor?.env) {
		if (descriptor.env === true) {
			permissions.env = () => ({ allow: true });
		} else {
			const keys = descriptor.env.allowedKeys ?? [];
			permissions.env = (req) => ({ allow: keys.includes(req.key) });
		}
	}

	return permissions;
}

function findPackageRoot(sourcePath: string): string | undefined {
	let dir = dirname(sourcePath);
	for (let i = 0; i < 10; i++) {
		if (existsSync(join(dir, 'package.json'))) return dir;
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return undefined;
}

function collectBridgeData(context: ExecuteContext) {
	const inputData = context.getInputData();
	const serializedInput: INodeExecutionData[] = inputData.map((item) => ({
		json: deepCopy(item.json),
		...(item.pairedItem !== null && item.pairedItem !== undefined
			? { pairedItem: item.pairedItem }
			: {}),
	}));

	const node = context.getNode();
	const paramKeys = Object.keys(node.parameters ?? {});
	const nodeParams: Array<Record<string, unknown>> = [];
	for (let i = 0; i < serializedInput.length; i++) {
		const params: Record<string, unknown> = {};
		for (const key of paramKeys) {
			try {
				params[key] = context.getNodeParameter(key, i, undefined);
			} catch {
				// param may not resolve for this item
			}
		}
		nodeParams.push(params);
	}

	return { inputData: serializedInput, nodeParams, nodeName: node.name, nodeType: node.type };
}

export async function executeSandboxed(
	nodeType: INodeType,
	context: ExecuteContext,
	permissions?: NodePermissionDescriptor,
): Promise<INodeExecutionData[][] | null> {
	const sourceInfo = nodeSourceRegistry.get(nodeType as object);

	if (!sourceInfo) {
		throw new Error(
			'Cannot sandbox node: source path not available. ' +
				'The node was not loaded via loadClassInIsolation.',
		);
	}

	const { sourcePath, className } = sourceInfo;

	const packageRoot = findPackageRoot(sourcePath);
	const bridgeData = collectBridgeData(context);
	const securePermissions = buildSecureExecPermissions(permissions);
	const hasNetwork = !!permissions?.network;

	const {
		NodeRuntime,
		createNodeDriver,
		createNodeRuntimeDriverFactory,
		createInMemoryFileSystem,
	} = await loadSecureExec();

	const nodeSource = readFileSync(sourcePath, 'utf-8');

	const filesystem = createInMemoryFileSystem();
	await filesystem.writeFile('/root/app/node.js', nodeSource);

	let resultJson = '';
	const stderrMessages: string[] = [];

	const onStdio = (event: { channel: string; message: string }) => {
		if (event.channel === 'stdout' && event.message.startsWith(RESULT_MARKER)) {
			resultJson = event.message.slice(RESULT_MARKER.length);
		} else if (event.channel === 'stderr') {
			stderrMessages.push(event.message);
		}
	};

	const runtime = new NodeRuntime({
		systemDriver: createNodeDriver({
			filesystem,
			permissions: securePermissions,
			useDefaultNetwork: hasNetwork,
			...(packageRoot ? { moduleAccess: { cwd: packageRoot } } : {}),
		}),
		runtimeDriverFactory: createNodeRuntimeDriverFactory(),
		memoryLimit: DEFAULT_MEMORY_LIMIT_MB,
		cpuTimeLimitMs: DEFAULT_CPU_TIME_LIMIT_MS,
	});

	try {
		const code = generateIsolateCode(className, bridgeData);
		const execResult = await runtime.exec(code, { onStdio });

		if (execResult.code !== 0) {
			const detail = execResult.errorMessage || stderrMessages.join('\n') || 'unknown error';
			throw new Error(
				`Sandboxed node "${bridgeData.nodeName}" failed (exit ${execResult.code}): ${detail}`,
			);
		}

		if (!resultJson) return null;
		return JSON.parse(resultJson) as INodeExecutionData[][];
	} finally {
		runtime.dispose();
	}
}

function generateIsolateCode(
	className: string,
	bridgeData: {
		inputData: INodeExecutionData[];
		nodeParams: Array<Record<string, unknown>>;
		nodeName: string;
		nodeType: string;
	},
): string {
	const dataJson = JSON.stringify(bridgeData);

	return `
var __bridge = ${dataJson};

var __nodeModule = require('/root/app/node.js');
var __NodeClass = __nodeModule.${className} || __nodeModule.default;
var __nodeInstance = new __NodeClass();

var __context = {
	getInputData: function() {
		return __bridge.inputData;
	},

	getNodeParameter: function(name, itemIndex, fallbackValue) {
		var params = __bridge.nodeParams[itemIndex] || {};
		return params[name] !== undefined ? params[name] : fallbackValue;
	},

	getNode: function() {
		return { name: __bridge.nodeName, type: __bridge.nodeType, parameters: {} };
	},

	continueOnFail: function() { return false; },

	getCredentials: function() {
		return Promise.resolve({});
	},

	helpers: {
		returnJsonArray: function(jsonData) {
			if (Array.isArray(jsonData)) {
				return jsonData.map(function(item) {
					return { json: (item !== null && Object(item) === item) ? item : { data: item } };
				});
			}
			return [{ json: jsonData }];
		},

		constructExecutionMetaData: function(inputData) {
			return inputData;
		},

		httpRequest: function(requestOptions) {
			var http = require('http');
			var https = require('https');
			var urlObj = new (require('url').URL)(requestOptions.url);
			var mod = urlObj.protocol === 'https:' ? https : http;

			return new Promise(function(resolve, reject) {
				var opts = {
					method: requestOptions.method || 'GET',
					hostname: urlObj.hostname,
					port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
					path: urlObj.pathname + urlObj.search,
					headers: requestOptions.headers || {},
				};

				var req = mod.request(opts, function(res) {
					var body = '';
					res.on('data', function(chunk) { body += chunk; });
					res.on('end', function() {
						try { resolve(JSON.parse(body)); }
						catch(e) { resolve(body); }
					});
				});

				req.on('error', reject);

				if (requestOptions.body) {
					var bodyStr = typeof requestOptions.body === 'string'
						? requestOptions.body
						: JSON.stringify(requestOptions.body);
					req.write(bodyStr);
				}
				req.end();
			});
		},

		prepareBinaryData: function(buffer, fileName, mimeType) {
			return Promise.resolve({
				data: buffer.toString('base64'),
				fileName: fileName || 'file',
				mimeType: mimeType || 'application/octet-stream',
			});
		},
	},
};

__nodeInstance.execute.call(__context).then(function(result) {
	console.log('${RESULT_MARKER}' + JSON.stringify(result));
}).catch(function(err) {
	process.exitCode = 1;
	console.error(err && err.message ? err.message : String(err));
})
`;
}
