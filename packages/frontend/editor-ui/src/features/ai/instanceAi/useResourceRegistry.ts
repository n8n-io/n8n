import { reactive, watch } from 'vue';
import type {
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
} from '@n8n/api-types';

export type ResourceEntry = {
	type: 'workflow' | 'credential' | 'data-table' | 'agent';
	id: string;
	name: string;
	createdAt?: string;
	updatedAt?: string;
	projectId?: string;
	/**
	 * Set to true when the run-finish reap archived this workflow — a
	 * stepping-stone the agent created but never promoted to the main
	 * deliverable. The artifacts panel renders these as dimmed with an
	 * "Archived" label.
	 */
	archived?: boolean;
};

// ---------------------------------------------------------------------------
// Internal helpers (defined before use to satisfy no-use-before-define)
// ---------------------------------------------------------------------------

interface Collections {
	/** Resources produced/mutated by the agent in this thread, keyed by resource ID. */
	produced: Map<string, ResourceEntry>;
	/** Every resource seen in any tool call, keyed by lowercased name. */
	byName: Map<string, ResourceEntry>;
	/** Produced resources keyed by lowercased name; safe for markdown auto-linking. */
	linkableByName: Map<string, ResourceEntry>;
}

function optionalString(val: unknown): string | undefined {
	return typeof val === 'string' ? val : undefined;
}

type RecordProducedOptions = {
	linkable?: boolean;
};

type AgentBuilderTargetMetadata = {
	agentId: string;
	projectId: string;
	name?: string;
};

/**
 * Upsert a produced artifact. When an entry for the same `id` already exists,
 * optional fields provided by the new call win; fields it omits are preserved
 * from the existing entry. Callers are responsible for resolving `name` using
 * the existing entry as a fallback so partial updates (e.g. a patch
 * `build-workflow` call that carries only a `workflowId`) don't regress a
 * known name to 'Untitled'.
 */
function recordProduced(
	col: Collections,
	entry: ResourceEntry,
	options: RecordProducedOptions = {},
): void {
	const existing = col.produced.get(entry.id);
	const existingLinkKey = existing?.name.toLowerCase();
	const wasLinkable =
		existingLinkKey !== undefined && col.linkableByName.get(existingLinkKey)?.id === entry.id;
	const shouldLink = options.linkable !== false || wasLinkable;
	const merged: ResourceEntry = existing
		? {
				type: entry.type,
				id: entry.id,
				name: entry.name,
				createdAt: entry.createdAt ?? existing.createdAt,
				updatedAt: entry.updatedAt ?? existing.updatedAt,
				projectId: entry.projectId ?? existing.projectId,
			}
		: entry;
	col.produced.set(entry.id, merged);
	if (existing && existing.name.toLowerCase() !== merged.name.toLowerCase()) {
		col.byName.delete(existing.name.toLowerCase());
		if (wasLinkable) col.linkableByName.delete(existing.name.toLowerCase());
	}
	col.byName.set(merged.name.toLowerCase(), merged);
	if (shouldLink) col.linkableByName.set(merged.name.toLowerCase(), merged);
}

function indexByName(col: Collections, entry: ResourceEntry): void {
	col.byName.set(entry.name.toLowerCase(), entry);
}

function entryFromListItem(
	type: ResourceEntry['type'],
	obj: Record<string, unknown>,
): ResourceEntry | undefined {
	if (typeof obj.name !== 'string' || typeof obj.id !== 'string') return undefined;
	const entry: ResourceEntry = { type, id: obj.id, name: obj.name };
	const createdAt = optionalString(obj.createdAt);
	const updatedAt = optionalString(obj.updatedAt);
	const projectId = optionalString(obj.projectId);
	if (createdAt !== undefined) entry.createdAt = createdAt;
	if (updatedAt !== undefined) entry.updatedAt = updatedAt;
	if (projectId !== undefined) entry.projectId = projectId;
	return entry;
}

/** Tools whose results may contain resource info (workflows, credentials, data tables). */
const ARTIFACT_TOOLS = new Set([
	'build-workflow',
	'build-workflow-with-agent',
	'build-agent',
	'submit-workflow',
	'apply-workflow-credentials',
	'workflows',
	'credentials',
	'data-tables',
	'insert-data-table-rows',
	'update-data-table-rows',
	'delete-data-table-rows',
]);
const WORKFLOW_MUTATING_ACTIONS = new Set(['update', 'restore-version', 'setup']);
function entryFromAgentBuilderTarget(
	target: InstanceAiAgentNode['targetResource'],
	existing?: ResourceEntry,
	fallbackName = 'Untitled',
): ResourceEntry | undefined {
	if (target?.type !== 'agent' || !target.id) return undefined;
	const entry: ResourceEntry = {
		type: 'agent',
		id: target.id,
		name: optionalString(target.name) ?? existing?.name ?? fallbackName,
	};
	const projectId = optionalString(target.projectId) ?? existing?.projectId;
	if (projectId !== undefined) entry.projectId = projectId;
	return entry;
}

function extractFromToolCall(tc: InstanceAiToolCallState, col: Collections): void {
	if (!ARTIFACT_TOOLS.has(tc.toolName)) return;
	if (!tc.result || typeof tc.result !== 'object') return;
	const result = tc.result as Record<string, unknown>;

	// --- Workflows --------------------------------------------------------
	// List result: { workflows: [{ id, name }, ...] } — index by name only.
	if (Array.isArray(result.workflows)) {
		for (const wf of result.workflows as Array<Record<string, unknown>>) {
			const entry = entryFromListItem('workflow', wf);
			if (entry) indexByName(col, entry);
		}
	}

	// build-workflow / build-workflow-with-agent / submit-workflow:
	// { workflowId, workflowName? } — produced. Patch calls may omit the name,
	// so fall back to the existing entry before regressing to 'Untitled'.
	if (typeof result.workflowId === 'string') {
		const existing = col.produced.get(result.workflowId);
		const name =
			optionalString(result.workflowName) ??
			optionalString(tc.args?.name) ??
			existing?.name ??
			'Untitled';
		recordProduced(col, { type: 'workflow', id: result.workflowId, name });
	}

	if (
		tc.toolName === 'workflows' &&
		result.success === true &&
		typeof tc.args?.workflowId === 'string' &&
		typeof tc.args.action === 'string' &&
		WORKFLOW_MUTATING_ACTIONS.has(tc.args.action)
	) {
		const workflowId = tc.args.workflowId;
		const existing = col.produced.get(workflowId);
		const name =
			optionalString(result.workflowName) ??
			optionalString(tc.args.name) ??
			existing?.name ??
			'Untitled';
		recordProduced(col, { type: 'workflow', id: workflowId, name });
	}

	// workflows action=get-json returns the workflow document itself, not under
	// a `workflow` key. Surface it so existing workflows loaded for editing can
	// be previewed even before a later update result is observed.
	if (tc.toolName === 'workflows' && Array.isArray(result.nodes)) {
		const entry = entryFromListItem('workflow', result);
		if (entry) recordProduced(col, entry);
	}

	// Single workflow object: { workflow: { id, name, ... } } — produced.
	if (result.workflow && typeof result.workflow === 'object') {
		const obj = result.workflow as Record<string, unknown>;
		if (typeof obj.id === 'string') {
			const existing = col.produced.get(obj.id);
			const name = optionalString(obj.name) ?? existing?.name ?? 'Untitled';
			const entry: ResourceEntry = { type: 'workflow', id: obj.id, name };
			const createdAt = optionalString(obj.createdAt);
			const updatedAt = optionalString(obj.updatedAt);
			const projectId = optionalString(obj.projectId);
			if (createdAt !== undefined) entry.createdAt = createdAt;
			if (updatedAt !== undefined) entry.updatedAt = updatedAt;
			if (projectId !== undefined) entry.projectId = projectId;
			recordProduced(col, entry);
		}
	}

	// --- Agents ------------------------------------------------------------
	// build-agent: { agentId, agentName? } — produced. Follow-up calls may omit
	// the name, so fall back to the existing entry before regressing to
	// 'Untitled'. projectId is preserved from the agent-spawned entry by
	// recordProduced's merge.
	if (tc.toolName === 'build-agent' && typeof result.agentId === 'string') {
		const existing = col.produced.get(result.agentId);
		recordProduced(col, {
			type: 'agent',
			id: result.agentId,
			name: optionalString(result.agentName) ?? existing?.name ?? 'Untitled',
		});
	}

	// --- Credentials -----------------------------------------------------
	// Credentials never show in the panel; only needed for name linking.
	if (Array.isArray(result.credentials)) {
		for (const cred of result.credentials as Array<Record<string, unknown>>) {
			const entry = entryFromListItem('credential', cred);
			if (entry) indexByName(col, entry);
		}
	}

	// --- Data tables -----------------------------------------------------
	// List results — index by name only.
	if (Array.isArray(result.tables)) {
		for (const table of result.tables as Array<Record<string, unknown>>) {
			const entry = entryFromListItem('data-table', table);
			if (entry) indexByName(col, entry);
		}
	}
	if (Array.isArray(result.dataTables)) {
		for (const table of result.dataTables as Array<Record<string, unknown>>) {
			const entry = entryFromListItem('data-table', table);
			if (entry) indexByName(col, entry);
		}
	}

	// Singular data table (e.g. data-tables action=create) — produced.
	if (result.table && typeof result.table === 'object') {
		const obj = result.table as Record<string, unknown>;
		if (typeof obj.id === 'string') {
			const existing = col.produced.get(obj.id);
			const name = optionalString(obj.name) ?? existing?.name ?? obj.id;
			const entry: ResourceEntry = { type: 'data-table', id: obj.id, name };
			const createdAt = optionalString(obj.createdAt);
			const updatedAt = optionalString(obj.updatedAt);
			const projectId = optionalString(obj.projectId);
			if (createdAt !== undefined) entry.createdAt = createdAt;
			if (updatedAt !== undefined) entry.updatedAt = updatedAt;
			if (projectId !== undefined) entry.projectId = projectId;
			recordProduced(col, entry);
		}
	}

	// Data table metadata results (schema/query and row mutations):
	// { dataTableId, projectId, tableName? | dataTableName? } — produced.
	// Preserves an existing name if the result doesn't carry a name.
	if (typeof result.dataTableId === 'string' && typeof result.projectId === 'string') {
		const existing = col.produced.get(result.dataTableId);
		const name =
			optionalString(result.tableName) ??
			optionalString(result.dataTableName) ??
			existing?.name ??
			result.dataTableId;
		const dataTableAction = optionalString(tc.args?.action);
		const isReadOnlyLookup =
			tc.toolName === 'data-tables' &&
			(dataTableAction === 'schema' || dataTableAction === 'query');
		recordProduced(
			col,
			{
				type: 'data-table',
				id: result.dataTableId,
				name,
				projectId: result.projectId,
			},
			{ linkable: !isReadOnlyLookup },
		);
	}
}

/**
 * Register the agent's `targetResource` as a produced artifact when it carries
 * a concrete resource id (e.g. a workflow-builder spawned to edit an existing
 * workflow). Surfacing this at spawn time — before the first build-workflow
 * tool result arrives — lets the artifacts panel show the workflow as soon as
 * the sub-agent starts, instead of waiting for the first edit.
 */
function extractFromTargetResource(node: InstanceAiAgentNode, col: Collections): void {
	const target = node.targetResource;
	if (!target?.id) return;
	if (target.type !== 'workflow' && target.type !== 'data-table' && target.type !== 'agent') return;

	const existing = col.produced.get(target.id);
	const name = optionalString(target.name) ?? existing?.name ?? 'Untitled';
	if (target.type === 'agent') {
		const entry = entryFromAgentBuilderTarget(target, existing, name);
		if (entry) recordProduced(col, entry);
		return;
	}
	recordProduced(col, { type: target.type, id: target.id, name });
}

function collectFromAgentNode(node: InstanceAiAgentNode, col: Collections): void {
	extractFromTargetResource(node, col);
	for (const tc of node.toolCalls) {
		extractFromToolCall(tc, col);
	}
	for (const child of node.children) {
		collectFromAgentNode(child, col);
	}
}

/**
 * Register resource attachments on a (user) message as produced artifacts —
 * e.g. the editor hand-off attaches the current workflow or agent, which then
 * shows as an artifact tab even before the agent acts on it.
 */
function collectFromMessageAttachments(message: InstanceAiMessage, col: Collections): void {
	for (const attachment of message.attachments ?? []) {
		if (attachment.type === 'workflow') {
			recordProduced(col, {
				type: 'workflow',
				id: attachment.id,
				name: attachment.name ?? 'Untitled',
			});
		} else if (attachment.type === 'agent') {
			recordProduced(col, {
				type: 'agent',
				id: attachment.id,
				name: attachment.name ?? 'Untitled',
				projectId: attachment.projectId,
			});
		}
	}
}

function enrichAgentFromBuilderTarget(
	col: Collections,
	target: AgentBuilderTargetMetadata | undefined,
): void {
	if (!target) return;
	const existing = col.produced.get(target.agentId);
	if (existing && existing.type !== 'agent') return;
	// Event-derived names are canonical; the persisted metadata name only fills
	// in when no run event carried one (e.g. historical threads whose events
	// aren't loaded). The 'Untitled' placeholder is not a real name.
	const eventName = existing && existing.name !== 'Untitled' ? existing.name : undefined;
	recordProduced(
		col,
		{
			type: 'agent',
			id: target.agentId,
			name: eventName ?? target.name ?? 'Untitled',
			projectId: target.projectId,
		},
		{ linkable: existing !== undefined },
	);
}

function enrichWorkflowNames(
	col: Collections,
	workflowNameLookup: (id: string) => string | undefined,
): void {
	for (const entry of col.produced.values()) {
		if (entry.type !== 'workflow') continue;
		const storeName = workflowNameLookup(entry.id);
		if (storeName && storeName !== entry.name) {
			col.byName.delete(entry.name.toLowerCase());
			col.linkableByName.delete(entry.name.toLowerCase());
			entry.name = storeName;
			col.byName.set(storeName.toLowerCase(), entry);
			col.linkableByName.set(storeName.toLowerCase(), entry);
		}
	}
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * Scans tool-call results in the conversation and returns two collections:
 *
 * - `producedArtifacts` (keyed by resource id) — things the agent built,
 *   submitted, created, or mutated. Powers the Artifacts panel and the
 *   canvas preview tabs. Repeated writes to the same resource update the
 *   existing entry instead of creating a duplicate.
 *
 * - `resourceNameIndex` (keyed by lowercased name) — every named resource
 *   seen in any tool call, including list results. Used for resource metadata
 *   lookups after explicit links have rendered.
 *
 * - `linkableResourceNameIndex` (keyed by lowercased name) — only resources
 *   produced or mutated by the agent. Used for markdown name→link replacement
 *   so passive list/search results cannot rewrite ordinary prose.
 */
export function useResourceRegistry(
	messages: () => InstanceAiMessage[],
	workflowNameLookup?: (id: string) => string | undefined,
	archivedWorkflowIds?: () => ReadonlySet<string>,
	agentBuilderTarget?: () => AgentBuilderTargetMetadata | undefined,
) {
	// Long-lived reactive maps, reconciled in place: rebuilds that change
	// nothing trigger nothing.
	const producedArtifacts = reactive(new Map<string, ResourceEntry>());
	const resourceNameIndex = reactive(new Map<string, ResourceEntry>());
	const linkableResourceNameIndex = reactive(new Map<string, ResourceEntry>());

	// Derived from `messages` so every state-arrival path (hydration, run-sync
	// replacement, rollback, reset) self-heals on the next derivation. Must
	// stay a watch: the handler reads the target maps, so a watchEffect would
	// re-trigger itself.
	watch(
		(): Collections => {
			const col: Collections = {
				produced: new Map<string, ResourceEntry>(),
				byName: new Map<string, ResourceEntry>(),
				linkableByName: new Map<string, ResourceEntry>(),
			};

			for (const msg of messages()) {
				collectFromMessageAttachments(msg, col);
				if (msg.agentTree) collectFromAgentNode(msg.agentTree, col);
			}
			enrichAgentFromBuilderTarget(col, agentBuilderTarget?.());

			if (workflowNameLookup) {
				enrichWorkflowNames(col, workflowNameLookup);
			}

			const archived = archivedWorkflowIds?.();
			if (archived && archived.size > 0) {
				for (const entry of col.produced.values()) {
					if (entry.type === 'workflow' && archived.has(entry.id)) {
						entry.archived = true;
					}
				}
			}

			return col;
		},
		(col) => {
			reconcileMap(producedArtifacts, col.produced);
			reconcileMap(resourceNameIndex, col.byName);
			reconcileMap(linkableResourceNameIndex, col.linkableByName);
		},
		{ immediate: true },
	);

	return { producedArtifacts, resourceNameIndex, linkableResourceNameIndex };
}

/** Sync `target` to `next` with minimal writes — unchanged entries trigger no subscribers. */
function reconcileMap(target: Map<string, ResourceEntry>, next: Map<string, ResourceEntry>): void {
	for (const key of [...target.keys()]) {
		if (!next.has(key)) target.delete(key);
	}
	for (const [key, entry] of next) {
		const existing = target.get(key);
		if (existing) {
			reconcileEntryFields(existing, entry);
		} else {
			target.set(key, entry);
		}
	}
}

/**
 * Per-field sync: `Object.assign` writes through the proxy (equal values
 * trigger nothing), the sweep deletes fields the new entry no longer carries.
 */
function reconcileEntryFields(
	existing: Record<string, unknown>,
	next: Record<string, unknown>,
): void {
	for (const key of Object.keys(existing)) {
		if (!(key in next)) Reflect.deleteProperty(existing, key);
	}
	Object.assign(existing, next);
}
