/**
 * SharedWorker Coordinator
 *
 * This SharedWorker coordinates which tab is "active" and routes all queries
 * to the active tab's dedicated worker. Based on Notion's architecture.
 *
 * Architecture:
 * - Each tab creates both a connection to this SharedWorker AND its own dedicated data worker
 * - Only ONE tab's dedicated worker actually accesses the database at a time
 * - This SharedWorker manages which tab is "active" using Web Locks
 * - All queries from any tab are routed through here to the active tab's dedicated worker
 */

/// <reference lib="webworker" />

declare const self: SharedWorkerGlobalScope;

import * as Comlink from 'comlink';
import type { CoordinatorState } from './types';
import type { SQLiteParam } from '../data/types';
import {
	registerTab as registerTabOp,
	unregisterTab as unregisterTabOp,
	handleTabDisconnect,
} from './tabs';
import {
	exec as execOp,
	query as queryOp,
	queryWithParams as queryWithParamsOp,
	isInitialized as isInitializedOp,
	getActiveTabId as getActiveTabIdOp,
	getTabCount as getTabCountOp,
} from './operations/query';
import { loadNodeTypes as loadNodeTypesOp } from './operations/loadNodeTypes';
import {
	storeVersion as storeVersionOp,
	getStoredVersion as getStoredVersionOp,
} from './operations/storeVersion';
import { initializeCrdtSubscription, cleanupCrdtSubscription } from './operations/crdt';
import { executeWorkflow as executeWorkflowOp } from './operations/execute';
import { ensurePushConnection as ensurePushConnectionOp } from './operations/executionPush';
import { initialize as initializeOp } from './initialize';
import {
	resolveExpressionForAutocomplete,
	getRunDataFromExecDoc,
	getPinDataFromWorkflowDoc,
} from './operations/resolveExpressions';

// Create nodeTypes promise that will be resolved when loadNodeTypes completes
let nodeTypesResolver: (() => void) | null = null;
const nodeTypesPromise = new Promise<void>((resolve) => {
	nodeTypesResolver = resolve;
});

const state: CoordinatorState = {
	tabs: new Map(),
	activeTabId: null,
	initialized: false,
	version: null,
	baseUrl: null,
	// CRDT state
	crdtSubscriptions: new Map(),
	crdtDocuments: new Map(),
	crdtExecutionDocuments: new Map(),
	crdtProvider: null,
	nodeTypes: null,
	nodeTypesPromise,
	nodeTypesResolver,
};

// ============================================================================
// Public API exposed to tabs
// ============================================================================

const coordinatorApi = {
	/**
	 * Register a tab and its dedicated data worker with the coordinator.
	 * Also accepts a CRDT port for binary CRDT messages.
	 *
	 * @param dataWorkerPort - Port to communicate with the tab's data worker
	 * @param crdtPort - Port for CRDT binary messages (established once per tab)
	 */
	async registerTab(dataWorkerPort: MessagePort, crdtPort: MessagePort): Promise<string> {
		const tabId = registerTabOp(state, dataWorkerPort);
		// Initialize CRDT subscription with the provided port
		initializeCrdtSubscription(state, tabId, crdtPort);
		return tabId;
	},

	/**
	 * Unregister a tab when it closes
	 */
	async unregisterTab(tabId: string): Promise<void> {
		// Clean up CRDT subscriptions first (unsubscribes from all documents)
		cleanupCrdtSubscription(state, tabId);
		unregisterTabOp(state, tabId);
	},

	/**
	 * Initialize the database (routes to active tab's worker)
	 *
	 * @param options.version - The current n8n version from settings
	 * @param options.baseUrl - The base URL for REST API calls (e.g., http://localhost:5678)
	 */
	async initialize({ version, baseUrl }: { version: string; baseUrl: string }): Promise<void> {
		await initializeOp(state, { version, baseUrl });
	},

	/**
	 * Execute a SQL statement (routes to active tab's worker)
	 */
	async exec(sql: string): Promise<void> {
		await execOp(state, sql);
	},

	/**
	 * Execute a SQL query (routes to active tab's worker)
	 */
	async query(sql: string) {
		return await queryOp(state, sql);
	},

	/**
	 * Execute a SQL query with parameters (routes to active tab's worker)
	 */
	async queryWithParams(sql: string, params: SQLiteParam[] = []) {
		return await queryWithParamsOp(state, sql, params);
	},

	/**
	 * Check if the coordinator is initialized
	 */
	isInitialized(): boolean {
		return isInitializedOp(state);
	},

	/**
	 * Get the current active tab ID
	 */
	getActiveTabId(): string | null {
		return getActiveTabIdOp(state);
	},

	/**
	 * Get the number of connected tabs
	 */
	getTabCount(): number {
		return getTabCountOp(state);
	},

	/**
	 * Load node types from the server (routes to active tab's worker)
	 */
	async loadNodeTypes(baseUrl: string): Promise<void> {
		await loadNodeTypesOp(state, baseUrl);
	},

	/**
	 * Store the n8n version (routes to active tab's worker)
	 */
	async storeVersion(version: string): Promise<void> {
		await storeVersionOp(state, version);
	},

	/**
	 * Get the stored n8n version (routes to active tab's worker)
	 */
	async getStoredVersion(): Promise<string | null> {
		return await getStoredVersionOp(state);
	},

	/**
	 * Execute a workflow using the Coordinator's synced Workflow instance.
	 *
	 * Flow:
	 * 1. Ensure push connection exists (shared across all executions)
	 * 2. Call execution API with pushRef in header
	 * 3. Receive execution updates via push (logged to console)
	 *
	 * @param workflowId - The workflow ID to execute
	 * @param baseUrl - The base URL for API and push endpoints
	 * @param triggerNodeName - Optional trigger node to start from
	 * @returns The execution ID if successful, null otherwise
	 */
	async executeWorkflow(
		workflowId: string,
		baseUrl: string,
		triggerNodeName?: string,
	): Promise<string | null> {
		try {
			// Ensure single push connection exists (shared across all executions)
			// Pass state so push handler can access CRDT documents
			const pushRef = await ensurePushConnectionOp(baseUrl, state);

			// Execute workflow with that pushRef
			const executionId = await executeWorkflowOp(state, workflowId, pushRef, triggerNodeName);

			return executionId;
		} catch {
			return null;
		}
	},

	/**
	 * Resolve an arbitrary expression for autocomplete purposes.
	 * Uses the coordinator's synced Workflow instance and execution data.
	 *
	 * @param workflowId - The workflow ID
	 * @param expression - The expression to resolve (e.g., "={{ $json }}")
	 * @param nodeName - The node context for resolution
	 * @returns The resolved value, or null if resolution fails
	 */
	async resolveExpression(
		workflowId: string,
		expression: string,
		nodeName: string,
	): Promise<unknown> {
		const docState = state.crdtDocuments.get(workflowId);
		const execDocState = state.crdtExecutionDocuments.get(`exec-${workflowId}`);

		if (!docState?.workflow) {
			return null;
		}

		try {
			const runData = execDocState ? getRunDataFromExecDoc(execDocState) : null;
			const pinData = getPinDataFromWorkflowDoc(docState.doc);

			return resolveExpressionForAutocomplete(
				docState.workflow,
				nodeName,
				expression,
				runData,
				pinData,
			);
		} catch {
			return null;
		}
	},
};

export type CoordinatorApi = typeof coordinatorApi;

// ============================================================================
// SharedWorker connection handling
// ============================================================================

const ports = new Set<MessagePort>();

self.onconnect = (e: MessageEvent) => {
	const port = e.ports[0];
	ports.add(port);

	// Track which tab this port belongs to
	let connectedTabId: string | null = null;

	// Create a wrapped API that tracks the tab ID on registration
	const wrappedApi = {
		...coordinatorApi,
		async registerTab(dataWorkerPort: MessagePort, crdtPort: MessagePort): Promise<string> {
			connectedTabId = await coordinatorApi.registerTab(dataWorkerPort, crdtPort);
			return connectedTabId;
		},
	};

	// Handle port close/disconnect
	port.onmessageerror = () => {
		ports.delete(port);
		if (connectedTabId) {
			// Clean up CRDT subscriptions first
			cleanupCrdtSubscription(state, connectedTabId);
			handleTabDisconnect(state, connectedTabId);
		}
	};

	Comlink.expose(wrappedApi, port);
};
