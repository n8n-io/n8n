//#region ../../../node_modules/.pnpm/comlink@4.4.1/node_modules/comlink/dist/esm/comlink.mjs
/**
* @license
* Copyright 2019 Google LLC
* SPDX-License-Identifier: Apache-2.0
*/
const proxyMarker = Symbol("Comlink.proxy");
const createEndpoint = Symbol("Comlink.endpoint");
const releaseProxy = Symbol("Comlink.releaseProxy");
const finalizer = Symbol("Comlink.finalizer");
const throwMarker = Symbol("Comlink.thrown");
const isObject = (val) => typeof val === "object" && val !== null || typeof val === "function";
/**
* Allows customizing the serialization of certain values.
*/
const transferHandlers = /* @__PURE__ */ new Map([["proxy", {
	canHandle: (val) => isObject(val) && val[proxyMarker],
	serialize(obj) {
		const { port1, port2 } = new MessageChannel();
		expose(obj, port1);
		return [port2, [port2]];
	},
	deserialize(port) {
		port.start();
		return wrap(port);
	}
}], ["throw", {
	canHandle: (value) => isObject(value) && throwMarker in value,
	serialize({ value }) {
		let serialized;
		if (value instanceof Error) serialized = {
			isError: true,
			value: {
				message: value.message,
				name: value.name,
				stack: value.stack
			}
		};
		else serialized = {
			isError: false,
			value
		};
		return [serialized, []];
	},
	deserialize(serialized) {
		if (serialized.isError) throw Object.assign(new Error(serialized.value.message), serialized.value);
		throw serialized.value;
	}
}]]);
function isAllowedOrigin(allowedOrigins, origin) {
	for (const allowedOrigin of allowedOrigins) {
		if (origin === allowedOrigin || allowedOrigin === "*") return true;
		if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) return true;
	}
	return false;
}
function expose(obj, ep = globalThis, allowedOrigins = ["*"]) {
	ep.addEventListener("message", function callback(ev) {
		if (!ev || !ev.data) return;
		if (!isAllowedOrigin(allowedOrigins, ev.origin)) {
			console.warn(`Invalid origin '${ev.origin}' for comlink proxy`);
			return;
		}
		const { id, type, path } = Object.assign({ path: [] }, ev.data);
		const argumentList = (ev.data.argumentList || []).map(fromWireValue);
		let returnValue;
		try {
			const parent = path.slice(0, -1).reduce((obj, prop) => obj[prop], obj);
			const rawValue = path.reduce((obj, prop) => obj[prop], obj);
			switch (type) {
				case "GET":
					returnValue = rawValue;
					break;
				case "SET":
					parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
					returnValue = true;
					break;
				case "APPLY":
					returnValue = rawValue.apply(parent, argumentList);
					break;
				case "CONSTRUCT":
					returnValue = proxy(new rawValue(...argumentList));
					break;
				case "ENDPOINT":
					{
						const { port1, port2 } = new MessageChannel();
						expose(obj, port2);
						returnValue = transfer(port1, [port1]);
					}
					break;
				case "RELEASE":
					returnValue = void 0;
					break;
				default: return;
			}
		} catch (value) {
			returnValue = {
				value,
				[throwMarker]: 0
			};
		}
		Promise.resolve(returnValue).catch((value) => {
			return {
				value,
				[throwMarker]: 0
			};
		}).then((returnValue) => {
			const [wireValue, transferables] = toWireValue(returnValue);
			ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
			if (type === "RELEASE") {
				ep.removeEventListener("message", callback);
				closeEndPoint(ep);
				if (finalizer in obj && typeof obj[finalizer] === "function") obj[finalizer]();
			}
		}).catch((error) => {
			const [wireValue, transferables] = toWireValue({
				value: /* @__PURE__ */ new TypeError("Unserializable return value"),
				[throwMarker]: 0
			});
			ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
		});
	});
	if (ep.start) ep.start();
}
function isMessagePort(endpoint) {
	return endpoint.constructor.name === "MessagePort";
}
function closeEndPoint(endpoint) {
	if (isMessagePort(endpoint)) endpoint.close();
}
function wrap(ep, target) {
	return createProxy(ep, [], target);
}
function throwIfProxyReleased(isReleased) {
	if (isReleased) throw new Error("Proxy has been released and is not useable");
}
function releaseEndpoint(ep) {
	return requestResponseMessage(ep, { type: "RELEASE" }).then(() => {
		closeEndPoint(ep);
	});
}
const proxyCounter = /* @__PURE__ */ new WeakMap();
const proxyFinalizers = "FinalizationRegistry" in globalThis && new FinalizationRegistry((ep) => {
	const newCount = (proxyCounter.get(ep) || 0) - 1;
	proxyCounter.set(ep, newCount);
	if (newCount === 0) releaseEndpoint(ep);
});
function registerProxy(proxy, ep) {
	const newCount = (proxyCounter.get(ep) || 0) + 1;
	proxyCounter.set(ep, newCount);
	if (proxyFinalizers) proxyFinalizers.register(proxy, ep, proxy);
}
function unregisterProxy(proxy) {
	if (proxyFinalizers) proxyFinalizers.unregister(proxy);
}
function createProxy(ep, path = [], target = function() {}) {
	let isProxyReleased = false;
	const proxy = new Proxy(target, {
		get(_target, prop) {
			throwIfProxyReleased(isProxyReleased);
			if (prop === releaseProxy) return () => {
				unregisterProxy(proxy);
				releaseEndpoint(ep);
				isProxyReleased = true;
			};
			if (prop === "then") {
				if (path.length === 0) return { then: () => proxy };
				const r = requestResponseMessage(ep, {
					type: "GET",
					path: path.map((p) => p.toString())
				}).then(fromWireValue);
				return r.then.bind(r);
			}
			return createProxy(ep, [...path, prop]);
		},
		set(_target, prop, rawValue) {
			throwIfProxyReleased(isProxyReleased);
			const [value, transferables] = toWireValue(rawValue);
			return requestResponseMessage(ep, {
				type: "SET",
				path: [...path, prop].map((p) => p.toString()),
				value
			}, transferables).then(fromWireValue);
		},
		apply(_target, _thisArg, rawArgumentList) {
			throwIfProxyReleased(isProxyReleased);
			const last = path[path.length - 1];
			if (last === createEndpoint) return requestResponseMessage(ep, { type: "ENDPOINT" }).then(fromWireValue);
			if (last === "bind") return createProxy(ep, path.slice(0, -1));
			const [argumentList, transferables] = processArguments(rawArgumentList);
			return requestResponseMessage(ep, {
				type: "APPLY",
				path: path.map((p) => p.toString()),
				argumentList
			}, transferables).then(fromWireValue);
		},
		construct(_target, rawArgumentList) {
			throwIfProxyReleased(isProxyReleased);
			const [argumentList, transferables] = processArguments(rawArgumentList);
			return requestResponseMessage(ep, {
				type: "CONSTRUCT",
				path: path.map((p) => p.toString()),
				argumentList
			}, transferables).then(fromWireValue);
		}
	});
	registerProxy(proxy, ep);
	return proxy;
}
function myFlat(arr) {
	return Array.prototype.concat.apply([], arr);
}
function processArguments(argumentList) {
	const processed = argumentList.map(toWireValue);
	return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
}
const transferCache = /* @__PURE__ */ new WeakMap();
function transfer(obj, transfers) {
	transferCache.set(obj, transfers);
	return obj;
}
function proxy(obj) {
	return Object.assign(obj, { [proxyMarker]: true });
}
function toWireValue(value) {
	for (const [name, handler] of transferHandlers) if (handler.canHandle(value)) {
		const [serializedValue, transferables] = handler.serialize(value);
		return [{
			type: "HANDLER",
			name,
			value: serializedValue
		}, transferables];
	}
	return [{
		type: "RAW",
		value
	}, transferCache.get(value) || []];
}
function fromWireValue(value) {
	switch (value.type) {
		case "HANDLER": return transferHandlers.get(value.name).deserialize(value.value);
		case "RAW": return value.value;
	}
}
function requestResponseMessage(ep, msg, transfers) {
	return new Promise((resolve) => {
		const id = generateUUID();
		ep.addEventListener("message", function l(ev) {
			if (!ev.data || !ev.data.id || ev.data.id !== id) return;
			ep.removeEventListener("message", l);
			resolve(ev.data);
		});
		if (ep.start) ep.start();
		ep.postMessage(Object.assign({ id }, msg), transfers);
	});
}
function generateUUID() {
	return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
}
//#endregion
//#region src/app/workers/coordinator/tabs.ts
/**
* Tab Management Operations
*
* This module provides operations for managing tab connections
* in the coordinator SharedWorker.
*/
/**
* Generate a unique tab ID
*/
function generateTabId() {
	return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
/**
* Get the active tab's data worker
*
* @param state - The coordinator state
* @returns The active tab's data worker or null if no active tab
*/
function getActiveDataWorker(state) {
	if (!state.activeTabId) return null;
	return state.tabs.get(state.activeTabId)?.dataWorker ?? null;
}
/**
* Get the active data worker, throwing if not available
*
* @param state - The coordinator state
* @returns The active tab's data worker
* @throws Error if no active data worker is available
*/
function getRequiredActiveDataWorker(state) {
	const worker = getActiveDataWorker(state);
	if (!worker) throw new Error("[Coordinator] No active data worker available");
	return worker;
}
/**
* Select a new active tab when the current one disconnects
*
* @param state - The coordinator state
*/
async function selectNewActiveTab(state) {
	for (const [tabId, tab] of state.tabs) if (tab.dataWorker) {
		console.log("[Coordinator] Selecting new active tab:", tabId);
		state.activeTabId = tabId;
		tab.isActive = true;
		try {
			if (!state.version) throw new Error("[Coordinator] Cannot initialize without version");
			await tab.dataWorker.initialize({ version: state.version });
			state.initialized = true;
			console.log(`[Coordinator] New active tab ${tabId} initialized`);
		} catch (error) {
			console.error("[Coordinator] Failed to initialize new active tab:", error);
			tab.isActive = false;
			state.activeTabId = null;
			continue;
		}
		return;
	}
	console.log("[Coordinator] No tabs available to become active");
	state.activeTabId = null;
	state.initialized = false;
}
/**
* Handle tab disconnection
*
* @param state - The coordinator state
* @param tabId - The ID of the disconnected tab
*/
function handleTabDisconnect(state, tabId) {
	console.log(`[Coordinator] Tab disconnected: ${tabId}`);
	if (state.tabs.get(tabId)) {
		state.tabs.delete(tabId);
		if (state.activeTabId === tabId) {
			state.activeTabId = null;
			state.initialized = false;
			selectNewActiveTab(state).catch(console.error);
		}
	}
}
/**
* Register a tab and its dedicated data worker with the coordinator
*
* @param state - The coordinator state
* @param dataWorkerPort - The MessagePort for communicating with the data worker
* @returns The generated tab ID
*/
function registerTab(state, dataWorkerPort) {
	const tabId = generateTabId();
	console.log(`[Coordinator] Registering tab: ${tabId}`);
	const tabConnection = {
		id: tabId,
		port: dataWorkerPort,
		dataWorker: wrap(dataWorkerPort),
		isActive: false
	};
	state.tabs.set(tabId, tabConnection);
	if (!state.activeTabId) {
		console.log(`[Coordinator] Making tab ${tabId} the active tab`);
		state.activeTabId = tabId;
		tabConnection.isActive = true;
	}
	return tabId;
}
/**
* Unregister a tab when it closes
*
* @param state - The coordinator state
* @param tabId - The ID of the tab to unregister
*/
function unregisterTab(state, tabId) {
	handleTabDisconnect(state, tabId);
}
//#endregion
//#region src/app/workers/coordinator/initialize.ts
/**
* Ensure the coordinator is initialized before performing operations
*
* Uses the stored version from state if already initialized, otherwise
* requires the version to be provided.
*
* @param state - The coordinator state
*/
async function ensureInitialized(state) {
	if (!state.initialized) {
		if (!state.version) throw new Error("[Coordinator] Cannot auto-initialize without version. Call initialize({ version }) first.");
		await initialize(state, { version: state.version });
	}
}
/**
* Initialize the database (routes to active tab's worker)
*
* Promise caching is handled by the data worker itself, so concurrent
* calls are deduplicated at that level. The coordinator just tracks
* whether it has successfully initialized with the current active worker.
*
* @param state - The coordinator state
* @param options.version - The current n8n version from settings
*/
async function initialize(state, { version }) {
	console.log("[Coordinator] Initialize requested");
	state.version = version;
	if (state.initialized) {
		console.log("[Coordinator] Already initialized");
		return;
	}
	await getRequiredActiveDataWorker(state).initialize({ version });
	state.initialized = true;
	console.log("[Coordinator] Initialization complete");
}
//#endregion
//#region src/app/workers/coordinator/utils.ts
/**
* Creates a function that ensures initialization and routes to the active worker.
*
* The order of operations is:
* 1. Ensure coordinator is initialized (calls initialize if needed)
* 2. Get the active data worker (AFTER initialization, as active tab may change)
* 3. Execute the provided action on the worker
*
* @param action - Callback that receives the worker and performs the operation
* @returns A function that handles init/routing, then calls the action
*/
function withActiveWorker(action) {
	return async (state, ...args) => {
		await ensureInitialized(state);
		return await action(getRequiredActiveDataWorker(state), ...args);
	};
}
//#endregion
//#region src/app/workers/coordinator/operations/query.ts
/**
* Execute a SQL statement (routes to active tab's worker)
*
* @param state - The coordinator state
* @param sql - The SQL statement to execute
*/
const exec = withActiveWorker(async (worker, sql) => await worker.exec(sql));
/**
* Execute a SQL query (routes to active tab's worker)
*
* @param state - The coordinator state
* @param sql - The SQL query to execute
* @returns Query result with columns and rows
*/
const query = withActiveWorker(async (worker, sql) => await worker.query(sql));
/**
* Execute a SQL query with parameters (routes to active tab's worker)
*
* @param state - The coordinator state
* @param sql - The SQL query to execute
* @param params - The parameters to bind to the query
* @returns Query result with columns and rows
*/
const queryWithParams = withActiveWorker(async (worker, sql, params = []) => await worker.queryWithParams(sql, params));
/**
* Check if the coordinator is initialized
*
* @param state - The coordinator state
* @returns Whether the coordinator is initialized
*/
function isInitialized(state) {
	return state.initialized;
}
/**
* Get the current active tab ID
*
* @param state - The coordinator state
* @returns The active tab ID or null
*/
function getActiveTabId(state) {
	return state.activeTabId;
}
/**
* Get the number of connected tabs
*
* @param state - The coordinator state
* @returns The number of connected tabs
*/
function getTabCount(state) {
	return state.tabs.size;
}
//#endregion
//#region src/app/workers/coordinator/operations/loadNodeTypes.ts
/**
* Load Node Types Operation
*
* This module provides the operation for loading node types
* from the server through the coordinator to the active tab's data worker.
*/
/**
* Load node types from the server (routes to active tab's worker)
*
* @param worker - The active data worker
* @param state - The coordinator state
* @param baseUrl - The base URL for API requests
*/
const loadNodeTypes = withActiveWorker(async (worker, baseUrl) => {
	console.log("[Coordinator] loadNodeTypes");
	return await worker.loadNodeTypes(baseUrl);
});
/**
* Get all node types from the local database (routes to active tab's worker)
*/
const getAllNodeTypes = withActiveWorker(async (worker) => await worker.getAllNodeTypes());
/**
* Get a single node type from the local database (routes to active tab's worker)
*/
const getNodeType = withActiveWorker(async (worker, name, version) => await worker.getNodeType(name, version));
//#endregion
//#region src/app/workers/coordinator/operations/storeVersion.ts
/**
* Store Version Operation
*
* This module provides the operation for storing the n8n version
* through the coordinator to the active tab's data worker.
*/
/**
* Store the n8n version (routes to active tab's worker)
*
* @param state - The coordinator state
* @param version - The n8n version string
*/
const storeVersion = withActiveWorker(async (worker, version) => {
	console.log("[Coordinator] storeVersion:", version);
	return await worker.storeVersion(version);
});
/**
* Get the stored n8n version (routes to active tab's worker)
*
* @param state - The coordinator state
* @returns The stored version string or null if not found
*/
const getStoredVersion = withActiveWorker(async (worker) => {
	console.log("[Coordinator] getStoredVersion");
	return await worker.getStoredVersion();
});
//#endregion
//#region src/app/workers/coordinator/worker.ts
const state = {
	tabs: /* @__PURE__ */ new Map(),
	activeTabId: null,
	initialized: false,
	version: null
};
const coordinatorApi = {
	/**
	* Register a tab and its dedicated data worker with the coordinator
	*/
	async registerTab(dataWorkerPort) {
		return registerTab(state, dataWorkerPort);
	},
	/**
	* Unregister a tab when it closes
	*/
	async unregisterTab(tabId) {
		unregisterTab(state, tabId);
	},
	/**
	* Initialize the database (routes to active tab's worker)
	*
	* @param options.version - The current n8n version from settings
	*/
	async initialize({ version }) {
		await initialize(state, { version });
	},
	/**
	* Execute a SQL statement (routes to active tab's worker)
	*/
	async exec(sql) {
		await exec(state, sql);
	},
	/**
	* Execute a SQL query (routes to active tab's worker)
	*/
	async query(sql) {
		return await query(state, sql);
	},
	/**
	* Execute a SQL query with parameters (routes to active tab's worker)
	*/
	async queryWithParams(sql, params = []) {
		return await queryWithParams(state, sql, params);
	},
	/**
	* Check if the coordinator is initialized
	*/
	isInitialized() {
		return isInitialized(state);
	},
	/**
	* Get the current active tab ID
	*/
	getActiveTabId() {
		return getActiveTabId(state);
	},
	/**
	* Get the number of connected tabs
	*/
	getTabCount() {
		return getTabCount(state);
	},
	/**
	* Load node types from the server (routes to active tab's worker)
	*/
	async loadNodeTypes(baseUrl) {
		await loadNodeTypes(state, baseUrl);
	},
	/**
	* Get all node types from the local database (routes to active tab's worker)
	*/
	async getAllNodeTypes() {
		return await getAllNodeTypes(state);
	},
	/**
	* Get a single node type from the local database (routes to active tab's worker)
	*/
	async getNodeType(name, version) {
		return await getNodeType(state, name, version);
	},
	/**
	* Store the n8n version (routes to active tab's worker)
	*/
	async storeVersion(version) {
		await storeVersion(state, version);
	},
	/**
	* Get the stored n8n version (routes to active tab's worker)
	*/
	async getStoredVersion() {
		return await getStoredVersion(state);
	}
};
const ports = /* @__PURE__ */ new Set();
self.onconnect = (e) => {
	const port = e.ports[0];
	ports.add(port);
	let connectedTabId = null;
	const wrappedApi = {
		...coordinatorApi,
		async registerTab(dataWorkerPort) {
			connectedTabId = await coordinatorApi.registerTab(dataWorkerPort);
			return connectedTabId;
		}
	};
	port.onmessageerror = () => {
		ports.delete(port);
		if (connectedTabId) handleTabDisconnect(state, connectedTabId);
	};
	expose(wrappedApi, port);
};
//#endregion
