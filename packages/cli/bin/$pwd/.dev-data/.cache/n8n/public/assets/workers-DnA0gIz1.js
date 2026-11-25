import { A as wrap, k as transfer } from "./vendor-Hx42-oQF.js";
//#region src/app/workers/coordinator/index.ts
/**
* Coordinator Module
*
* This module provides the main thread API to communicate with the
* SharedWorker coordinator that manages tab coordination and routes
* queries to the active data worker.
*/
var sharedWorker = new SharedWorker(new URL(
	/* @vite-ignore */
	"/assets/worker-CSM9nUhX.js",
	"" + import.meta.url
), {
	type: "module",
	name: "n8n-coordinator"
});
sharedWorker.port.start();
var dataWorker = new Worker(new URL(
	/* @vite-ignore */
	"/assets/worker-YYoHY7yu.js",
	"" + import.meta.url
), {
	type: "module",
	name: "n8n-data"
});
var coordinator = wrap(sharedWorker.port);
var tabState = {
	tabId: null,
	isRegistered: false
};
/**
* Register this tab with the coordinator
* This should be called once when the app initializes
*/
async function registerTab() {
	if (tabState.isRegistered && tabState.tabId) return tabState.tabId;
	console.log("[Coordinator] Registering tab...");
	const channel = new MessageChannel();
	dataWorker.postMessage({
		type: "connect",
		port: channel.port1
	}, [channel.port1]);
	const newTabId = await coordinator.registerTab(transfer(channel.port2, [channel.port2]));
	tabState.tabId = newTabId;
	tabState.isRegistered = true;
	console.log(`[Coordinator] Registered as tab: ${newTabId}`);
	setupCleanupHandlers();
	return newTabId;
}
/**
* Unregister the current tab and reset state
*/
function unregisterCurrentTab() {
	if (tabState.tabId) {
		coordinator.unregisterTab(tabState.tabId).catch(console.error);
		tabState.isRegistered = false;
		tabState.tabId = null;
	}
}
/**
* Set up cleanup handlers for when the page unloads
*/
function setupCleanupHandlers() {
	window.addEventListener("beforeunload", unregisterCurrentTab);
	window.addEventListener("pagehide", unregisterCurrentTab);
	window.addEventListener("pageshow", (event) => {
		if (event.persisted && !tabState.isRegistered) {
			console.log("[Coordinator] Page restored from bfcache, re-registering...");
			registerTab().catch(console.error);
		}
	});
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "visible" && !tabState.isRegistered) {
			console.log("[Coordinator] Page became visible, re-registering...");
			registerTab().catch(console.error);
		}
	});
}
//#endregion
//#region src/app/workers/index.ts
/**
* Ensure the tab is registered before performing operations
*/
async function ensureRegistered() {
	await registerTab();
}
/**
* Initialize the database
* This will route to the active tab's data worker
*
* @param options.version - The current n8n version from settings
*/
async function initialize({ version }) {
	await ensureRegistered();
	await coordinator.initialize({ version });
}
/**
* Execute a SQL statement (INSERT, UPDATE, DELETE, CREATE, etc.)
*/
async function exec(sql) {
	await ensureRegistered();
	await coordinator.exec(sql);
}
/**
* Execute a SQL query and return results
*/
async function query(sql) {
	await ensureRegistered();
	return await coordinator.query(sql);
}
/**
* Execute a SQL query with bound parameters
*/
async function queryWithParams(sql, params) {
	await ensureRegistered();
	return await coordinator.queryWithParams(sql, params);
}
/**
* Check if the database is initialized
*/
async function isInitialized() {
	return await coordinator.isInitialized();
}
/**
* Load node types from the server
*/
async function loadNodeTypes(baseUrl) {
	await ensureRegistered();
	await coordinator.loadNodeTypes(baseUrl);
}
/**
* Get all node types from the local database
*/
async function getAllNodeTypes() {
	await ensureRegistered();
	return await coordinator.getAllNodeTypes();
}
/**
* Get a single node type from the local database
*/
async function getNodeType(name, version) {
	await ensureRegistered();
	return await coordinator.getNodeType(name, version);
}
/**
* Store the n8n version in the database
*/
async function storeVersion(version) {
	await ensureRegistered();
	await coordinator.storeVersion(version);
}
/**
* Get the stored n8n version from the database
*/
async function getStoredVersion() {
	await ensureRegistered();
	return await coordinator.getStoredVersion();
}
//#endregion
export { exec, getAllNodeTypes, getNodeType, getStoredVersion, initialize, isInitialized, loadNodeTypes, query, queryWithParams, storeVersion };
