// ---------------------------------------------------------------------------
// Stub InstanceAiContext for isolated sub-agent evaluation
//
// Provides minimal service implementations so domain tools can be created
// without a running n8n instance. The workflow service captures
// createFromWorkflowJSON calls so we can evaluate the built workflow.
// ---------------------------------------------------------------------------

import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import * as fs from 'fs';
import * as path from 'path';

import type { CapturedWorkflow } from './types';
// Direct relative import — works at eval time via tsx, avoids adding cli as a dependency
import {
	resolveNodeTypeDefinition,
	listNodeDiscriminators,
	resolveBuiltinNodeDefinitionDirs,
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore — cli is not a declared dependency but the resolver is pure filesystem code
} from '../../../../cli/src/modules/instance-ai/node-definition-resolver';
import type {
	InstanceAiContext,
	InstanceAiWorkflowService,
	InstanceAiExecutionService,
	InstanceAiCredentialService,
	InstanceAiNodeService,
	InstanceAiDataTableService,
	NodeDescription,
	NodeSummary,
	SearchableNodeDescription,
	WorkflowDetail,
} from '../../src/types';

// ---------------------------------------------------------------------------
// Captured workflow accumulator
// ---------------------------------------------------------------------------

export interface WorkflowCapture {
	workflows: CapturedWorkflow[];
}

// ---------------------------------------------------------------------------
// Stub workflow service
// ---------------------------------------------------------------------------

// Stub methods implement async interfaces but don't need await
/* eslint-disable @typescript-eslint/require-await */
function createStubWorkflowService(capture: WorkflowCapture): InstanceAiWorkflowService {
	let nextId = 1;

	return {
		async list() {
			return [];
		},
		async get(workflowId) {
			throw new Error(`[stub] Workflow ${workflowId} not found`);
		},
		async getAsWorkflowJSON(workflowId) {
			throw new Error(`[stub] Workflow ${workflowId} not found`);
		},
		async createFromWorkflowJSON(json: WorkflowJSON) {
			const id = `eval-wf-${String(nextId++)}`;
			capture.workflows.push({ json, success: true });
			return makeWorkflowDetail(id, json);
		},
		async updateFromWorkflowJSON(workflowId: string, json: WorkflowJSON) {
			capture.workflows.push({ json, success: true });
			return makeWorkflowDetail(workflowId, json);
		},
		async archive() {},
		async delete() {},
		async publish(workflowId) {
			return { activeVersionId: `v-${workflowId}` };
		},
		async unpublish() {},
	};
}

function makeWorkflowDetail(id: string, json: WorkflowJSON): WorkflowDetail {
	return {
		id,
		name: json.name ?? 'Eval Workflow',
		versionId: 'v1',
		activeVersionId: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		nodes: (json.nodes ?? []).map((n) => ({
			name: n.name ?? '',
			type: n.type,
			parameters: n.parameters as Record<string, unknown> | undefined,
			position: (n.position as number[]) ?? [0, 0],
		})) as WorkflowDetail['nodes'],
		connections: (json.connections ?? {}) as Record<string, unknown>,
	};
}

// ---------------------------------------------------------------------------
// Stub services (return empty / no-op)
// ---------------------------------------------------------------------------

function createStubExecutionService(): InstanceAiExecutionService {
	return {
		async list() {
			return [];
		},
		async run() {
			return { executionId: 'exec-stub', status: 'success' };
		},
		async getStatus() {
			return { executionId: 'exec-stub', status: 'success' };
		},
		async getResult() {
			return { executionId: 'exec-stub', status: 'success' };
		},
		async stop() {
			return { success: true, message: 'stopped' };
		},
		async getDebugInfo() {
			return { executionId: 'exec-stub', nodeErrors: [], rawData: {} } as unknown as Awaited<
				ReturnType<InstanceAiExecutionService['getDebugInfo']>
			>;
		},
		async getNodeOutput() {
			return { data: [] } as unknown as Awaited<
				ReturnType<InstanceAiExecutionService['getNodeOutput']>
			>;
		},
	};
}

function createStubCredentialService(): InstanceAiCredentialService {
	return {
		async list() {
			return [];
		},
		async get() {
			throw new Error('[stub] No credentials');
		},
		async delete() {},
		async test() {
			return { success: true };
		},
	};
}

// ---------------------------------------------------------------------------
// Optional nodes.json — place at evaluations/data/nodes.json to enable
// real node search in evals (same format as production's static cache).
// Generate via: curl http://localhost:5678/rest/node-types > evaluations/data/nodes.json
// ---------------------------------------------------------------------------

const NODES_JSON_PATH = path.resolve(__dirname, '../nodes.json');

interface RawNodeType {
	name: string;
	displayName: string;
	description?: string;
	group?: string[];
	version: number | number[];
	inputs: unknown[];
	outputs: unknown[];
	properties: Array<{
		displayName: string;
		name: string;
		type: string;
		required?: boolean;
		description?: string;
		default?: unknown;
		options?: Array<{ name?: string; value?: unknown }>;
	}>;
	credentials?: Array<{ name: string; required?: boolean }>;
	codex?: { alias?: string[] };
	builderHint?: {
		message?: string;
		inputs?: Record<string, { required: boolean; displayOptions?: Record<string, unknown> }>;
	};
	webhooks?: unknown[];
	polling?: boolean;
	triggerPanel?: unknown;
}

let cachedNodes: RawNodeType[] | undefined;

function loadNodes(): RawNodeType[] {
	if (cachedNodes) return cachedNodes;
	if (!fs.existsSync(NODES_JSON_PATH)) {
		cachedNodes = [];
		return cachedNodes;
	}
	try {
		cachedNodes = JSON.parse(fs.readFileSync(NODES_JSON_PATH, 'utf-8')) as RawNodeType[];
	} catch {
		cachedNodes = [];
	}
	return cachedNodes;
}

function toStringArray(value: unknown[] | string): string[] | string {
	if (typeof value === 'string') return value;
	return (value ?? []).map((v) => (typeof v === 'string' ? v : (v as { type: string }).type));
}

function createStubNodeService(): InstanceAiNodeService {
	const nodeDefinitionDirs = resolveBuiltinNodeDefinitionDirs();

	return {
		async listAvailable(options) {
			const nodes = loadNodes();
			let filtered = nodes;
			if (options?.query) {
				const q = options.query.toLowerCase();
				filtered = nodes.filter(
					(n) =>
						n.displayName.toLowerCase().includes(q) ||
						n.name.toLowerCase().includes(q) ||
						(n.description ?? '').toLowerCase().includes(q),
				);
			}
			return filtered.map(
				(n): NodeSummary => ({
					name: n.name,
					displayName: n.displayName,
					description: n.description ?? '',
					group: n.group ?? [],
					version: Array.isArray(n.version) ? n.version[n.version.length - 1] : n.version,
				}),
			);
		},

		async getDescription(nodeType, version?) {
			const nodes = loadNodes();
			let desc: RawNodeType | undefined;
			if (version !== undefined) {
				desc = nodes.find((n) => {
					if (n.name !== nodeType) return false;
					if (Array.isArray(n.version)) return n.version.includes(version);
					return n.version === version;
				});
			}
			desc ??= nodes.find((n) => n.name === nodeType);
			if (!desc) {
				return {
					name: nodeType,
					displayName: nodeType,
					description: '',
					group: [],
					version: 1,
					properties: [],
					inputs: [],
					outputs: [],
				} satisfies NodeDescription;
			}
			return {
				name: desc.name,
				displayName: desc.displayName,
				description: desc.description ?? '',
				group: desc.group ?? [],
				version: Array.isArray(desc.version) ? desc.version[desc.version.length - 1] : desc.version,
				properties: desc.properties.map((p) => ({
					displayName: p.displayName,
					name: p.name,
					type: p.type,
					required: p.required,
					description: p.description,
					default: p.default,
					options: p.options
						?.filter(
							(o): o is { name: string; value: string | number | boolean } =>
								typeof o === 'object' && o !== null && 'name' in o && 'value' in o,
						)
						.map((o) => ({ name: String(o.name), value: o.value })),
				})),
				credentials: desc.credentials?.map((c) => ({ name: c.name, required: c.required })),
				inputs: Array.isArray(desc.inputs) ? desc.inputs.map(String) : [],
				outputs: Array.isArray(desc.outputs) ? desc.outputs.map(String) : [],
				...(desc.webhooks ? { webhooks: desc.webhooks } : {}),
				...(desc.polling ? { polling: desc.polling } : {}),
				...(desc.triggerPanel !== undefined ? { triggerPanel: desc.triggerPanel } : {}),
			} satisfies NodeDescription;
		},

		async listSearchable() {
			const nodes = loadNodes();
			return nodes.map((n): SearchableNodeDescription => {
				const result: SearchableNodeDescription = {
					name: n.name,
					displayName: n.displayName,
					description: n.description ?? '',
					version: n.version,
					inputs: toStringArray(n.inputs),
					outputs: toStringArray(n.outputs),
				};
				if (n.codex?.alias) {
					result.codex = { alias: n.codex.alias };
				}
				if (n.builderHint) {
					result.builderHint = {};
					if (n.builderHint.message) result.builderHint.message = n.builderHint.message;
					if (n.builderHint.inputs) result.builderHint.inputs = n.builderHint.inputs;
				}
				return result;
			});
		},

		getNodeTypeDefinition: async (nodeType, options) => {
			const result = resolveNodeTypeDefinition(nodeType, nodeDefinitionDirs, options);
			if (result.error) {
				return { content: '', error: result.error };
			}
			return { content: result.content, version: result.version };
		},
		listDiscriminators: async (nodeType) => {
			return listNodeDiscriminators(nodeType, nodeDefinitionDirs);
		},
	};
}

interface StoredTable {
	id: string;
	name: string;
	columns: Array<{ id: string; name: string; type: string }>;
}

function createStubDataTableService(): InstanceAiDataTableService {
	const tables = new Map<string, StoredTable>();
	let nextTableId = 1;
	let nextColId = 1;

	return {
		async list() {
			return [...tables.values()].map((t) => ({
				id: t.id,
				name: t.name,
				columns: t.columns,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			}));
		},
		async create(name, columns) {
			const id = `dt-${String(nextTableId++)}`;
			const storedColumns = columns.map((c) => ({
				id: `col-${String(nextColId++)}`,
				name: c.name,
				type: c.type,
			}));
			tables.set(id, { id, name, columns: storedColumns });
			return {
				id,
				name,
				columns: storedColumns,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};
		},
		async delete(dataTableId) {
			tables.delete(dataTableId);
		},
		async getSchema(dataTableId) {
			const table = tables.get(dataTableId);
			if (!table) return [];
			return table.columns.map((c, i) => ({
				id: c.id,
				name: c.name,
				type: c.type as 'string' | 'number' | 'boolean' | 'date',
				index: i,
			}));
		},
		async addColumn(dataTableId, col) {
			const table = tables.get(dataTableId);
			const colId = `col-${String(nextColId++)}`;
			const newCol = { id: colId, name: col.name, type: col.type };
			if (table) {
				table.columns.push(newCol);
			}
			return {
				id: colId,
				name: col.name,
				type: col.type,
				index: table ? table.columns.length - 1 : 0,
			};
		},
		async deleteColumn() {},
		async renameColumn() {},
		async queryRows() {
			return { count: 0, data: [] };
		},
		async insertRows(dataTableId, rows) {
			return { insertedCount: rows.length, dataTableId, tableName: 'stub', projectId: 'stub' };
		},
		async updateRows(dataTableId) {
			return { updatedCount: 0, dataTableId, tableName: 'stub', projectId: 'stub' };
		},
		async deleteRows(dataTableId) {
			return { deletedCount: 0, dataTableId, tableName: 'stub', projectId: 'stub' };
		},
	};
}

/* eslint-enable @typescript-eslint/require-await */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface StubContextResult {
	context: InstanceAiContext;
	capture: WorkflowCapture;
}

/**
 * Create a minimal InstanceAiContext with stubbed services.
 *
 * The workflow service captures `createFromWorkflowJSON` / `updateFromWorkflowJSON`
 * calls into `capture.workflows` so the eval harness can inspect the built workflows.
 * All other services return empty/no-op results.
 */
export function createStubContext(): StubContextResult {
	const capture: WorkflowCapture = { workflows: [] };

	// Allow all tool actions without HITL approval gates
	const permissions = Object.fromEntries(
		Object.keys(DEFAULT_INSTANCE_AI_PERMISSIONS).map((k) => [k, 'always_allow' as const]),
	) as typeof DEFAULT_INSTANCE_AI_PERMISSIONS;

	const context: InstanceAiContext = {
		userId: 'eval-user',
		workflowService: createStubWorkflowService(capture),
		executionService: createStubExecutionService(),
		credentialService: createStubCredentialService(),
		nodeService: createStubNodeService(),
		dataTableService: createStubDataTableService(),
		permissions,
	};

	return { context, capture };
}
