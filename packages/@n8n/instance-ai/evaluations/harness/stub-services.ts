// ---------------------------------------------------------------------------
// Stub InstanceAiContext services for in-process workflow-build evals.
//
// The goal is to run createInstanceAgent without a running n8n instance.
// Services return minimal data — just enough for the `build-workflow` tool
// path to succeed. The workflow JSON is captured via
// `workflowService.createFromWorkflowJSON` and exposed on the capture array
// returned from `createStubServices`.
// ---------------------------------------------------------------------------

import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type {
	InstanceAiContext,
	InstanceAiCredentialService,
	InstanceAiDataTableService,
	InstanceAiExecutionService,
	InstanceAiNodeService,
	InstanceAiWorkflowService,
	SearchableNodeDescription,
	WorkflowDetail,
} from '../../src/types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface StubServiceHandle {
	context: InstanceAiContext;
	/** Every WorkflowJSON passed to `workflowService.createFromWorkflowJSON`. */
	capturedWorkflows: WorkflowJSON[];
}

export interface CreateStubServicesOptions {
	/**
	 * Absolute path to the nodes.json file produced by
	 * `ai-workflow-builder.ee/pnpm export:nodes`. Required — the agent's
	 * builder sub-agent needs a non-empty node catalogue.
	 */
	nodesJsonPath: string;
	/** Optional user id. */
	userId?: string;
}

export async function createStubServices(
	options: CreateStubServicesOptions,
): Promise<StubServiceHandle> {
	const searchableNodes = await loadSearchableNodes(options.nodesJsonPath);
	const capturedWorkflows: WorkflowJSON[] = [];

	const workflowService: InstanceAiWorkflowService = {
		async list() {
			return [];
		},
		async get(workflowId: string) {
			return emptyWorkflowDetail(workflowId);
		},
		async getAsWorkflowJSON(workflowId: string) {
			const latest = capturedWorkflows[capturedWorkflows.length - 1];
			return latest ?? { id: workflowId, name: 'empty', nodes: [], connections: {} };
		},
		async createFromWorkflowJSON(json: WorkflowJSON) {
			capturedWorkflows.push(json);
			return {
				...emptyWorkflowDetail('eval-' + nanoid()),
				name: json.name,
			};
		},
		async updateFromWorkflowJSON(workflowId: string, json: WorkflowJSON) {
			capturedWorkflows.push(json);
			return {
				...emptyWorkflowDetail(workflowId),
				name: json.name,
			};
		},
		async archive() {},
		async delete() {},
		async clearAiTemporary() {},
		async archiveIfAiTemporary() {
			return false;
		},
		async publish() {
			return { activeVersionId: 'eval-version' };
		},
		async unpublish() {},
	};

	const credentialService: InstanceAiCredentialService = {
		async list() {
			return [];
		},
		async get(credentialId: string) {
			return { id: credentialId, name: credentialId, type: 'unknown' };
		},
		async delete() {},
		async test() {
			return { success: false, message: 'stub: credentials unavailable in eval' };
		},
		async searchCredentialTypes() {
			return [];
		},
	};

	const nodeService: InstanceAiNodeService = {
		async listAvailable() {
			return searchableNodes.map((node) => ({
				name: node.name,
				displayName: node.displayName,
				description: node.description,
				group: [],
				// Version arrays list supported versions in ascending order; the
				// latest is the last entry. Returning [0] would surface a stale
				// version to the agent.
				version: Array.isArray(node.version)
					? (node.version[node.version.length - 1] ?? 1)
					: node.version,
			}));
		},
		async getDescription(nodeType: string) {
			return {
				name: nodeType,
				displayName: nodeType,
				description: '',
				group: [],
				version: 1,
				properties: [],
				inputs: ['main'],
				outputs: ['main'],
			};
		},
		async listSearchable() {
			return searchableNodes;
		},
	};

	const executionService: InstanceAiExecutionService = {
		async list() {
			return [];
		},
		async run() {
			return stubExecutionResult('stub: execution disabled in eval');
		},
		async getStatus() {
			return stubExecutionResult('stub: execution disabled in eval');
		},
		async getResult() {
			return stubExecutionResult('stub: execution disabled in eval');
		},
		async stop() {
			return { success: false, message: 'stub: execution disabled in eval' };
		},
		async getDebugInfo() {
			return {
				...stubExecutionResult('stub: execution disabled in eval'),
				nodeTrace: [],
			};
		},
		async getNodeOutput(_executionId: string, nodeName: string) {
			return {
				nodeName,
				items: [],
				totalItems: 0,
				returned: { from: 0, to: 0 },
			};
		},
	};

	const dataTableService: InstanceAiDataTableService = {
		async list() {
			return [];
		},
		async create(name: string) {
			return {
				id: 'eval-dt-' + nanoid(),
				name,
				columns: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};
		},
		async delete() {},
		async getSchema() {
			return [];
		},
		async addColumn(_dataTableId: string, column) {
			return { id: 'col-' + nanoid(), name: column.name, type: column.type, index: 0 };
		},
		async deleteColumn() {},
		async renameColumn() {},
		async queryRows() {
			return { count: 0, data: [] };
		},
		async insertRows(dataTableId: string) {
			return {
				insertedCount: 0,
				dataTableId,
				tableName: 'stub-table',
				projectId: 'stub-project',
			};
		},
		async updateRows(dataTableId: string) {
			return {
				updatedCount: 0,
				dataTableId,
				tableName: 'stub-table',
				projectId: 'stub-project',
			};
		},
		async deleteRows(dataTableId: string) {
			return {
				deletedCount: 0,
				dataTableId,
				tableName: 'stub-table',
				projectId: 'stub-project',
			};
		},
	};

	const context: InstanceAiContext = {
		userId: options.userId ?? 'eval-user',
		workflowService,
		executionService,
		credentialService,
		nodeService,
		dataTableService,
	};

	return { context, capturedWorkflows };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadSearchableNodes(jsonPath: string): Promise<SearchableNodeDescription[]> {
	let content: string;
	try {
		content = await fs.readFile(jsonPath, 'utf8');
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Could not read node catalogue at ${jsonPath}: ${message}\n` +
				'Run `pnpm export:nodes` in packages/@n8n/ai-workflow-builder.ee to generate it, ' +
				'or pass --nodes-json <path> to point at an existing file.',
		);
	}

	const parsed: unknown = JSON.parse(content);
	if (!Array.isArray(parsed)) {
		throw new Error(`Expected ${jsonPath} to contain a JSON array of node descriptions.`);
	}

	return parsed.map((entry) => coerceSearchableNode(entry));
}

function coerceSearchableNode(entry: unknown): SearchableNodeDescription {
	if (!isRecord(entry)) {
		throw new Error(`Invalid node entry in catalogue: ${JSON.stringify(entry)}`);
	}

	const name = typeof entry.name === 'string' ? entry.name : undefined;
	const displayName =
		typeof entry.displayName === 'string' ? entry.displayName : (name ?? 'Unknown node');
	const description = typeof entry.description === 'string' ? entry.description : '';
	const version = coerceVersion(entry.version);
	const inputs = coerceStringList(entry.inputs) ?? ['main'];
	const outputs = coerceStringList(entry.outputs) ?? ['main'];

	if (!name) {
		throw new Error(`Node entry missing name: ${JSON.stringify(entry)}`);
	}

	const codex = coerceCodex(entry.codex);
	const builderHint = coerceBuilderHint(entry.builderHint);

	return {
		name,
		displayName,
		description,
		version,
		inputs,
		outputs,
		// Preserve fields used by NodeSearchEngine relevance scoring and
		// builder hints so eval runs see the same metadata as production.
		...(codex ? { codex } : {}),
		...(builderHint ? { builderHint } : {}),
	};
}

function coerceCodex(value: unknown): SearchableNodeDescription['codex'] | undefined {
	if (!isRecord(value)) return undefined;
	const aliases = coerceStringList(value.alias);
	if (!aliases) return undefined;
	return { alias: aliases };
}

function coerceBuilderHint(value: unknown): SearchableNodeDescription['builderHint'] | undefined {
	if (!isRecord(value)) return undefined;
	const hint: NonNullable<SearchableNodeDescription['builderHint']> = {};
	if (typeof value.message === 'string') hint.message = value.message;
	const inputs = coerceHintPortMap(value.inputs);
	if (inputs) hint.inputs = inputs;
	const outputs = coerceHintPortMap(value.outputs);
	if (outputs) hint.outputs = outputs;
	return Object.keys(hint).length > 0 ? hint : undefined;
}

function coerceHintPortMap(
	value: unknown,
): Record<string, { required: boolean; displayOptions?: Record<string, unknown> }> | undefined {
	if (!isRecord(value)) return undefined;
	const result: Record<string, { required: boolean; displayOptions?: Record<string, unknown> }> =
		{};
	for (const [key, raw] of Object.entries(value)) {
		if (!isRecord(raw)) continue;
		const required = typeof raw.required === 'boolean' ? raw.required : false;
		const entry: { required: boolean; displayOptions?: Record<string, unknown> } = { required };
		if (isRecord(raw.displayOptions)) entry.displayOptions = raw.displayOptions;
		result[key] = entry;
	}
	return Object.keys(result).length > 0 ? result : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function coerceVersion(value: unknown): number | number[] {
	if (typeof value === 'number') return value;
	if (Array.isArray(value)) {
		const numbers = value.filter((v): v is number => typeof v === 'number');
		if (numbers.length > 0) return numbers;
	}
	return 1;
}

function coerceStringList(value: unknown): string[] | undefined {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) {
		const strings = value.filter((v): v is string => typeof v === 'string');
		if (strings.length === value.length) return strings;
	}
	return undefined;
}

function emptyWorkflowDetail(id: string): WorkflowDetail {
	const now = new Date().toISOString();
	return {
		id,
		name: 'eval-workflow',
		versionId: 'v1',
		activeVersionId: null,
		createdAt: now,
		updatedAt: now,
		nodes: [],
		connections: {},
	};
}

function stubExecutionResult(message: string) {
	const now = new Date().toISOString();
	return {
		executionId: 'eval-exec-' + nanoid(),
		status: 'error' as const,
		error: message,
		startedAt: now,
		finishedAt: now,
	};
}

// ---------------------------------------------------------------------------
// Resolve nodes.json path from sibling package
// ---------------------------------------------------------------------------

/**
 * Resolve the default node-catalogue path inside
 * `packages/@n8n/ai-workflow-builder.ee/evaluations/`. Pass `--nodes-json
 * <path>` (or `nodesJsonPath`) to point at a different file.
 */
export function defaultNodesJsonPath(): string {
	const siblingPackage = path.resolve(
		__dirname,
		'..',
		'..',
		'..',
		'ai-workflow-builder.ee',
		'evaluations',
	);
	return path.join(siblingPackage, 'nodes.json');
}
