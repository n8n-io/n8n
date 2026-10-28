import {
	AGENT_BUILDER_TOOL_NAMES,
	REMOVED_BUILDER_TOOL_NAMES,
	SHARED_BUILDER_TOOL_NAMES,
	WORKFLOW_BUILDER_TOOL_NAMES,
	isFormerWorkflowsTool,
	resolveBuilderToolName,
} from '@n8n/api-types';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

export interface ExecutionResult {
	executionId: string;
	status: 'success' | 'error';
	/** ISO timestamp from the run-workflow tool result. Used to detect stale executions. */
	finishedAt?: string;
	/**
	 * Nodes whose output in this execution was simulated (fabricated fixture
	 * data) during n8n Assistant verification. Used to label that data in the
	 * editor and guard against pinning it as if it were real.
	 */
	simulatedNodeNames?: string[];
}

/**
 * A user-triggered (non-agent) preview run remembered on the thread runtime so it
 * survives the preview canvas remounting on a tab switch and is re-seeded on remount.
 */
export interface RememberedManualExecution {
	executionId: string;
	// Agent run shown when the user took over; a different current one means the agent ran again since.
	agentExecutionId: string | undefined;
}

export interface BuildResult {
	workflowId: string;
	/** Unique per build — changes even when the same workflow is rebuilt. */
	toolCallId: string;
}

export interface BuilderTarget {
	/** Unique per spawn — changes even when a new builder targets the same workflow. */
	agentId: string;
	workflowId: string;
}

export interface WorkflowSetupResult {
	workflowId: string;
	/** Unique per operation — changes even when the same workflow is set up again. */
	toolCallId: string;
}

export interface DataTableResult {
	dataTableId: string;
	/** Unique per operation — changes even when the same table is modified again. */
	toolCallId: string;
}

export interface AgentArtifactResult {
	agentId: string;
	projectId?: string;
	/** Unique per operation — changes even when the same agent is modified again. */
	toolCallId: string;
	/** `selected` is an existing Agent that the build is about to change. */
	kind: 'created' | 'selected' | 'mutated';
}

type AgentArtifactTarget = Pick<AgentArtifactResult, 'agentId' | 'projectId'>;

/**
 * Walks an agent tree depth-first (most recent last) and returns the workflowId
 * and toolCallId from the latest successful workflow_builder_build_workflow / submit-workflow tool result.
 */
export function getLatestBuildResult(node: InstanceAiAgentNode): BuildResult | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const childResult = getLatestBuildResult(node.children[i]);
		if (childResult) return childResult;
	}
	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const tc = node.toolCalls[i];
		if (
			(tc.toolName === WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW ||
				tc.toolName === REMOVED_BUILDER_TOOL_NAMES.SUBMIT_WORKFLOW) &&
			!tc.isLoading &&
			tc.result &&
			typeof tc.result === 'object'
		) {
			const result = tc.result as Record<string, unknown>;
			if (result.success === true && typeof result.workflowId === 'string') {
				return { workflowId: result.workflowId, toolCallId: tc.toolCallId };
			}
		}
	}
	return undefined;
}

/** A workflow-builder sub-agent node, identified by kind or role. */
function isBuilderNode(node: InstanceAiAgentNode): boolean {
	return node.kind === 'builder' || node.role === 'workflow-builder';
}

/**
 * Walks an agent tree depth-first (most recent last) and returns the agentId
 * and workflowId of the latest workflow-builder sub-agent that was spawned
 * with a concrete `targetResource.id` — i.e. an edit-mode builder that
 * already knows which existing workflow it is modifying. Used to open the
 * canvas preview at spawn time, before the first workflow_builder_build_workflow tool call
 * returns a result.
 */
export function getLatestBuilderTarget(node: InstanceAiAgentNode): BuilderTarget | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const child = node.children[i];
		const nested = getLatestBuilderTarget(child);
		if (nested) return nested;
		if (
			isBuilderNode(child) &&
			child.targetResource?.type === 'workflow' &&
			typeof child.targetResource.id === 'string'
		) {
			return { agentId: child.agentId, workflowId: child.targetResource.id };
		}
	}
	return undefined;
}

export interface AgentBuilderTarget {
	/** The builder sub-agent node id (`agent-builder:<targetAgentId>`). */
	agentId: string;
	targetAgentId: string;
	activity?: InstanceAiAgentNode['activity'];
}

/**
 * Walks an agent tree depth-first (most recent last) and returns the agentId
 * (node id) and targetAgentId of the latest agent-builder sub-agent that was
 * spawned with a concrete `targetResource.id`. Used to open the canvas
 * preview at spawn time in threads from before the builder ran inline —
 * mirrors getLatestBuilderTarget for workflows.
 */
export function getLatestAgentBuilderTarget(
	node: InstanceAiAgentNode,
): AgentBuilderTarget | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const child = node.children[i];
		const nested = getLatestAgentBuilderTarget(child);
		if (nested) return nested;
		if (
			child.kind === 'agent-builder' &&
			child.targetResource?.type === 'agent' &&
			typeof child.targetResource.id === 'string'
		) {
			return {
				agentId: child.agentId,
				targetAgentId: child.targetResource.id,
				activity: child.activity,
			};
		}
	}
	return undefined;
}

const WORKFLOW_SETUP_TOOLS = new Set<string>([
	'setup-workflow',
	WORKFLOW_BUILDER_TOOL_NAMES.APPLY_WORKFLOW_CREDENTIALS,
]);

/**
 * Walks an agent tree depth-first (most recent last) and returns the workflowId
 * (from args) and toolCallId from the latest successful setup-workflow /
 * workflow_builder_apply_workflow_credentials tool result. These tools modify the workflow
 * (credentials, parameters) but don't return workflowId in the result.
 */
export function getLatestWorkflowSetupResult(
	node: InstanceAiAgentNode,
): WorkflowSetupResult | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const childResult = getLatestWorkflowSetupResult(node.children[i]);
		if (childResult) return childResult;
	}
	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const tc = node.toolCalls[i];
		if (
			WORKFLOW_SETUP_TOOLS.has(tc.toolName) &&
			!tc.isLoading &&
			tc.result &&
			typeof tc.result === 'object'
		) {
			const result = tc.result as Record<string, unknown>;
			const args = tc.args as Record<string, unknown> | undefined;
			if (result.success === true && typeof args?.workflowId === 'string') {
				return { workflowId: args.workflowId, toolCallId: tc.toolCallId };
			}
		}
	}
	return undefined;
}

const WORKFLOW_MUTATING_TOOLS = new Set<string>([
	WORKFLOW_BUILDER_TOOL_NAMES.RESTORE_WORKFLOW_VERSION,
	WORKFLOW_BUILDER_TOOL_NAMES.SETUP_WORKFLOW,
]);

/** Stored calls of the former multi-action workflows tool also count, including its removed `update`. */
function isWorkflowMutatingCall(tc: InstanceAiToolCallState): boolean {
	if (isFormerWorkflowsTool(tc.toolName) && tc.args?.action === 'update') return true;
	return WORKFLOW_MUTATING_TOOLS.has(resolveBuilderToolName(tc.toolName, tc.args?.action));
}

/**
 * Walks an agent tree depth-first (most recent last) and returns the workflowId
 * (from args) and toolCallId from the latest successful tool call that mutated
 * the workflow definition (restore_workflow_version / setup_workflow). These
 * modify an existing workflow but are invisible to getLatestBuildResult, and
 * don't reliably return the workflowId in the result, so it is read from the
 * call args. `setup_workflow` is the current path for credential/parameter
 * configuration (the inline setup card); the legacy setup-workflow /
 * workflow_builder_apply_workflow_credentials tools are handled by
 * getLatestWorkflowSetupResult.
 */
export function getLatestWorkflowUpdateResult(
	node: InstanceAiAgentNode,
): WorkflowSetupResult | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const childResult = getLatestWorkflowUpdateResult(node.children[i]);
		if (childResult) return childResult;
	}
	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const tc = node.toolCalls[i];
		const args = tc.args as Record<string, unknown> | undefined;
		if (isWorkflowMutatingCall(tc) && !tc.isLoading && tc.result && typeof tc.result === 'object') {
			const result = tc.result as Record<string, unknown>;
			if (result.success === true && typeof args?.workflowId === 'string') {
				return { workflowId: args.workflowId, toolCallId: tc.toolCallId };
			}
		}
	}
	return undefined;
}

const WORKFLOW_LOCKING_TOOLS = new Set<string>([
	WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW,
	REMOVED_BUILDER_TOOL_NAMES.BUILD_WORKFLOW_WITH_AGENT,
	WORKFLOW_BUILDER_TOOL_NAMES.APPLY_WORKFLOW_CREDENTIALS,
	'setup-workflow',
	WORKFLOW_BUILDER_TOOL_NAMES.VERIFY_BUILT_WORKFLOW,
]);

/**
 * Whether the agent is actively working on `workflowId` somewhere in this agent
 * tree — used to lock the artifact canvas while a build/edit/verification is in
 * flight so the user can't execute or edit into a mid-stream conflict. Any
 * of these signals is enough:
 *   1. The active agent tree has already built/updated/setup this workflow.
 *      This covers short gaps between tool calls while the agent run is still
 *      ongoing.
 *   2. An active workflow-builder sub-agent targeting the workflow (covers the
 *      whole build window: read file → edit → submit-workflow → verify).
 *   3. An in-flight workflow-affecting tool call targeting the workflow — the
 *      build/setup/verify tools, `executions.run`, `restore_workflow_version` or
 *      `setup_workflow`. Read-only workflow tools (including
 *      historical get-json events, get, list, …) don't lock.
 */
export function isAgentEditingWorkflow(
	node: InstanceAiAgentNode,
	workflowId: string,
	announcement = node.latestSetupAnnouncement,
): boolean {
	const announcedBuild =
		announcement?.workflowId === workflowId &&
		node.toolCalls.some(
			(call) =>
				call.isLoading &&
				call.toolName === WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW &&
				!call.args?.workflowId &&
				announcement.agentId === node.agentId &&
				call.startedAt &&
				announcement.timestamp >= call.startedAt,
		);
	if (
		node.status === 'active' &&
		(getLatestBuildResult(node)?.workflowId === workflowId ||
			getLatestWorkflowSetupResult(node)?.workflowId === workflowId ||
			getLatestWorkflowUpdateResult(node)?.workflowId === workflowId ||
			node.toolCalls.some(
				(call) =>
					resolveBuilderToolName(call.toolName, call.args?.action) ===
						SHARED_BUILDER_TOOL_NAMES.SETUP_CREDENTIALS &&
					isRecord(call.result) &&
					call.result.announced === true &&
					call.result.preBuild === true &&
					call.result.workflowId === workflowId,
			) ||
			announcedBuild)
	) {
		return true;
	}

	// Signal 2: workflow-builder sub-agent active with our workflow id
	if (
		isBuilderNode(node) &&
		node.status === 'active' &&
		node.targetResource?.type === 'workflow' &&
		node.targetResource.id === workflowId
	) {
		return true;
	}

	// Signal 3: in-flight workflow-affecting tool call targeting our workflow id
	for (const tc of node.toolCalls) {
		if (!tc.isLoading) continue;
		const args = tc.args as { workflowId?: string; action?: string } | undefined;
		if (args?.workflowId !== workflowId) continue;
		if (WORKFLOW_LOCKING_TOOLS.has(tc.toolName)) return true;
		if (tc.toolName === WORKFLOW_BUILDER_TOOL_NAMES.EXECUTIONS && args.action === 'run')
			return true;
		if (isWorkflowMutatingCall(tc)) return true;
	}

	for (const child of node.children) {
		if (isAgentEditingWorkflow(child, workflowId, announcement)) return true;
	}
	return false;
}

/** The agent a successful `agent_builder_select_agent` call selected, if any. */
function getSelectedAgentId(tc: InstanceAiToolCallState): string | undefined {
	if (tc.toolName !== AGENT_BUILDER_TOOL_NAMES.SELECT_AGENT || tc.isLoading) return undefined;
	if (!isRecord(tc.result) || tc.result.ok !== true) return undefined;
	return typeof tc.result.agentId === 'string' ? tc.result.agentId : undefined;
}

/**
 * The agent the node's latest successful `agent_builder_select_agent` call
 * selected. An earlier selection no longer counts once the node selects another agent.
 */
function getLatestSelectedAgentId(node: InstanceAiAgentNode): string | undefined {
	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const agentId = getSelectedAgentId(node.toolCalls[i]);
		if (agentId) return agentId;
	}
	return undefined;
}

/** Ids of the agents that active nodes selected last with `agent_builder_select_agent`. */
export function getActiveSelectedAgentIds(node: InstanceAiAgentNode): Set<string> {
	const ids = new Set<string>();
	const visit = (current: InstanceAiAgentNode) => {
		if (current.status === 'active') {
			const agentId = getLatestSelectedAgentId(current);
			if (agentId) ids.add(agentId);
		}
		for (const child of current.children) visit(child);
	};
	visit(node);
	return ids;
}

/**
 * Whether the AI is actively working on agent `agentId` somewhere in this
 * agent tree — used to lock the agent artifact editor while a build is in
 * flight so user edits can't race builder config writes (the post-build
 * refetch would clobber them). Any signal is enough:
 *   1. The active run selected this agent last with `agent_builder_select_agent` —
 *      covers the whole orchestrator build, including the reads and questions
 *      before the first config write.
 *   2. The active agent tree has already created/mutated this agent.
 *   3. An active agent-builder sub-agent targeting the agent — threads from
 *      before the builder ran in the orchestrator.
 */
export function isAgentEditingAgent(node: InstanceAiAgentNode, agentId: string): boolean {
	if (node.status === 'active') {
		if (getLatestSelectedAgentId(node) === agentId) return true;
		if (getLatestAgentArtifactResult(node)?.agentId === agentId) return true;
	}

	if (
		node.kind === 'agent-builder' &&
		node.status === 'active' &&
		node.targetResource?.type === 'agent' &&
		node.targetResource.id === agentId
	) {
		return true;
	}

	for (const child of node.children) {
		if (isAgentEditingAgent(child, agentId)) return true;
	}
	return false;
}

const DATA_TABLE_PREVIEW_ACTIONS = new Set([
	'schema',
	'query',
	'create',
	'insert-rows',
	'update-rows',
	'delete-rows',
	'add-column',
	'delete-column',
	'rename-column',
]);

/** Per-action check that the result contains a table reference worth previewing. */
const RESULT_VALIDATORS: Record<string, (result: Record<string, unknown>) => boolean> = {
	schema: (r) => Array.isArray(r.columns),
	query: (r) => Array.isArray(r.data),
	'insert-rows': (r) => typeof r.insertedCount === 'number',
	'update-rows': (r) => typeof r.updatedCount === 'number',
	'add-column': (r) => r.column !== null && r.column !== undefined && typeof r.column === 'object',
	'delete-rows': (r) => r.success === true,
	'delete-column': (r) => r.success === true,
	'rename-column': (r) => r.success === true,
};

function extractDataTableId(
	action: string,
	result: Record<string, unknown>,
	args: Record<string, unknown> | undefined,
): string | undefined {
	if (action === 'create') {
		if (result.table && typeof result.table === 'object') {
			const table = result.table as Record<string, unknown>;
			if (typeof table.id === 'string') return table.id;
		}
		return undefined;
	}

	const isValid = RESULT_VALIDATORS[action];
	if (isValid?.(result)) {
		if (typeof result.dataTableId === 'string') return result.dataTableId;
		if (typeof args?.dataTableId === 'string') return args.dataTableId;
	}

	return undefined;
}

/**
 * Walks an agent tree depth-first (most recent last) and returns the dataTableId
 * from the latest successful delete-data-table tool result.
 */
export function getLatestDeletedDataTableId(node: InstanceAiAgentNode): string | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const childResult = getLatestDeletedDataTableId(node.children[i]);
		if (childResult) return childResult;
	}
	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const tc = node.toolCalls[i];
		const args = tc.args as Record<string, unknown> | undefined;
		if (
			tc.toolName === SHARED_BUILDER_TOOL_NAMES.DATA_TABLES &&
			args?.action === 'delete' &&
			!tc.isLoading &&
			tc.result &&
			typeof tc.result === 'object'
		) {
			const result = tc.result as Record<string, unknown>;
			if (result.success === true && typeof args?.dataTableId === 'string') {
				return args.dataTableId;
			}
		}
	}
	return undefined;
}

export function getLatestDataTableResult(node: InstanceAiAgentNode): DataTableResult | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const childResult = getLatestDataTableResult(node.children[i]);
		if (childResult) return childResult;
	}
	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const tc = node.toolCalls[i];
		const args = tc.args as Record<string, unknown> | undefined;
		const action = typeof args?.action === 'string' ? args.action : '';
		if (
			tc.toolName === SHARED_BUILDER_TOOL_NAMES.DATA_TABLES &&
			DATA_TABLE_PREVIEW_ACTIONS.has(action) &&
			!tc.isLoading &&
			tc.result &&
			typeof tc.result === 'object'
		) {
			const result = tc.result as Record<string, unknown>;
			const dataTableId = extractDataTableId(action, result, args);
			if (dataTableId) {
				return { dataTableId, toolCallId: tc.toolCallId };
			}
		}
	}
	return undefined;
}

/** Name of the n8n Assistant tool that manages skills in the skills hub. */
export const SKILLS_TOOL_NAME = 'skills';

const SKILL_WRITE_ACTIONS = new Set(['create', 'update']);

const UNTRUSTED_DATA_PATTERN = /^<untrusted_data\b[^>]*>\n([\s\S]*)\n<\/untrusted_data>$/;

function unwrapUntrustedToolResult(result: unknown): unknown {
	if (!isRecord(result) || result.type !== 'content' || !Array.isArray(result.value)) {
		return result;
	}
	const [part]: unknown[] = result.value;
	if (!isRecord(part) || part.type !== 'text' || typeof part.text !== 'string') return result;
	const json = UNTRUSTED_DATA_PATTERN.exec(part.text)?.[1];
	if (json === undefined) return result;
	try {
		const parsed: unknown = JSON.parse(json);
		return parsed;
	} catch {
		return result;
	}
}

/** The Skills Hub deep link that opens one skill. */
export function skillsHubHref(skillId: string): string {
	return `/settings/context/skills?skillId=${encodeURIComponent(skillId)}`;
}

export interface SkillArtifact {
	skillId: string;
	name?: string;
}

export interface SkillArtifactResult extends SkillArtifact {
	/** Unique per operation — changes even when the same skill is saved again. */
	toolCallId: string;
}

/**
 * The skill that a finished `skills` call created or saved. Only a successful
 * create or update counts: a list, a get, a delete, a denied or a refused call
 * does not make the skill an artifact.
 */
export function getSkillArtifactFromToolCall(
	tc: InstanceAiToolCallState,
): SkillArtifact | undefined {
	if (tc.toolName !== SKILLS_TOOL_NAME || tc.isLoading) return undefined;
	const action = tc.args?.action;
	if (typeof action !== 'string' || !SKILL_WRITE_ACTIONS.has(action)) return undefined;
	const result = unwrapUntrustedToolResult(tc.result);
	if (!isRecord(result) || result.success !== true) return undefined;

	// create: { success, skill: { id, name, ... } }. update: { success, saved: { id, name? } }.
	const written = action === 'create' ? result.skill : result.saved;
	if (!isRecord(written)) return undefined;
	const skillId =
		typeof written.id === 'string'
			? written.id
			: typeof tc.args?.skillId === 'string'
				? tc.args.skillId
				: undefined;
	if (!skillId) return undefined;
	const name =
		typeof written.name === 'string' && written.name.trim() !== '' ? written.name : undefined;
	return { skillId, ...(name ? { name } : {}) };
}

/**
 * Walks an agent tree depth-first (most recent last) and returns the latest
 * skill that the assistant created or saved with the `skills` tool.
 */
export function getLatestSkillArtifactResult(
	node: InstanceAiAgentNode,
): SkillArtifactResult | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const childResult = getLatestSkillArtifactResult(node.children[i]);
		if (childResult) return childResult;
	}
	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const tc = node.toolCalls[i];
		const skill = getSkillArtifactFromToolCall(tc);
		if (skill) return { ...skill, toolCallId: tc.toolCallId };
	}
	return undefined;
}

function getAgentTarget(node: InstanceAiAgentNode): AgentArtifactTarget | undefined {
	if (node.targetResource?.type !== 'agent' || typeof node.targetResource.id !== 'string') {
		return undefined;
	}
	return {
		agentId: node.targetResource.id,
		...(typeof node.targetResource.projectId === 'string'
			? { projectId: node.targetResource.projectId }
			: {}),
	};
}

interface AgentTargetedWalk<T> {
	result?: T;
	/**
	 * Most specific agent target found in this subtree: this node's own
	 * targetResource, or one bubbled up from a child. Lets an orchestrator's
	 * own tool call (which carries no agentId in its result) resolve identity
	 * from the builder sub-agent it just spawned, whose targetResource
	 * carries the agentId via the `agent-spawned` event.
	 */
	target?: AgentArtifactTarget;
}

/**
 * Walks an agent tree depth-first (most recent last), threading the nearest
 * agent target down to descendants and back up to callers, and returns the
 * first `match` hit among a node's own tool calls (also most recent last).
 * Shared by artifact discovery and config-mutation preview refresh so their
 * identical target-resolution/traversal logic can't drift between the two.
 */
function walkAgentTargetedResult<T>(
	node: InstanceAiAgentNode,
	fallbackTarget: AgentArtifactTarget | undefined,
	match: (
		toolCall: InstanceAiToolCallState,
		callTarget: AgentArtifactTarget | undefined,
	) => T | undefined,
): AgentTargetedWalk<T> {
	const ownTarget = getAgentTarget(node);
	const target = ownTarget ?? fallbackTarget;

	let childTarget: AgentArtifactTarget | undefined;
	for (let i = node.children.length - 1; i >= 0; i--) {
		const childWalk = walkAgentTargetedResult(node.children[i], target, match);
		if (childWalk.result) return childWalk;
		if (childTarget === undefined) childTarget = childWalk.target;
	}

	// Identity for this node's own tool calls: prefer its own targetResource,
	// then one discovered on a child (e.g. a builder sub-agent it spawned),
	// then the fallback threaded down from an ancestor.
	const callTarget = ownTarget ?? childTarget ?? fallbackTarget;

	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const result = match(node.toolCalls[i], callTarget);
		if (result !== undefined) return { result, target: callTarget };
	}

	return { target: callTarget };
}

function matchAgentArtifactToolCall(
	tc: InstanceAiToolCallState,
	callTarget: AgentArtifactTarget | undefined,
): AgentArtifactResult | undefined {
	if (tc.isLoading || !isRecord(tc.result)) return undefined;
	const result = tc.result;

	// The orchestrator runs the builder tools itself, so their results carry the agent identity.
	if (typeof result.agentId === 'string') {
		const ownTarget: AgentArtifactTarget = {
			agentId: result.agentId,
			...(typeof result.projectId === 'string' ? { projectId: result.projectId } : {}),
		};
		if (tc.toolName === AGENT_BUILDER_TOOL_NAMES.SELECT_AGENT) {
			if (result.ok !== true) return undefined;
			return {
				...ownTarget,
				toolCallId: tc.toolCallId,
				kind: result.agentChange === 'created' ? 'created' : 'selected',
			};
		}
		if (result.configMutated === true) {
			return { ...ownTarget, toolCallId: tc.toolCallId, kind: 'mutated' };
		}
	}

	if (tc.toolName !== AGENT_BUILDER_TOOL_NAMES.BUILD_AGENT || !callTarget) return undefined;
	if (result.agentChange === 'created') {
		return { ...callTarget, toolCallId: tc.toolCallId, kind: 'created' };
	}
	if (result.agentChange === 'updated') {
		return { ...callTarget, toolCallId: tc.toolCallId, kind: 'mutated' };
	}
	// Keep old stored threads working until all results include agentChange.
	const args = tc.args as Record<string, unknown> | undefined;
	if (result.agentChange === undefined && result.ok === true && typeof args?.name === 'string') {
		return { ...callTarget, toolCallId: tc.toolCallId, kind: 'created' };
	}
	if (result.agentChange === undefined && result.configUpdated === true) {
		return { ...callTarget, toolCallId: tc.toolCallId, kind: 'mutated' };
	}
	return undefined;
}

export function getLatestAgentArtifactResult(
	node: InstanceAiAgentNode,
	fallbackTarget?: AgentArtifactTarget,
): AgentArtifactResult | undefined {
	return walkAgentTargetedResult(node, fallbackTarget, matchAgentArtifactToolCall).result;
}

/** Builder tool calls whose success means the persisted agent changed in a panel-visible way. */
export interface AgentConfigMutationResult {
	agentId: string;
	/** Unique per mutation — a later mutation in the same build re-fires watchers. */
	toolCallId: string;
}

/**
 * Walks an agent tree depth-first (most recent last) and returns the latest
 * resolved tool call stamped with `configMutated: true` by the backend.
 */
export function getLatestAgentConfigMutation(
	node: InstanceAiAgentNode,
): AgentConfigMutationResult | undefined {
	for (let i = node.children.length - 1; i >= 0; i--) {
		const childResult = getLatestAgentConfigMutation(node.children[i]);
		if (childResult) return childResult;
	}
	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const tc = node.toolCalls[i];
		if (
			!tc.isLoading &&
			isRecord(tc.result) &&
			tc.result.configMutated === true &&
			typeof tc.result.agentId === 'string'
		) {
			return { agentId: tc.result.agentId, toolCallId: tc.toolCallId };
		}
	}
	return undefined;
}

/**
 * Walks an agent tree and collects the latest completed run-workflow result
 * per workflowId. Used to restore execution status from historical messages
 * after page refresh.
 */
export function getExecutionResultsByWorkflow(
	node: InstanceAiAgentNode,
): Map<string, ExecutionResult> {
	const results = new Map<string, ExecutionResult>();
	collectExecutionResults(node, results);
	return results;
}

function collectExecutionResults(node: InstanceAiAgentNode, results: Map<string, ExecutionResult>) {
	// Process parent's own toolCalls first, then children — children's results
	// are more recent (the orchestrator delegates to children) and should win.
	for (const tc of node.toolCalls) {
		const tcArgs = tc.args as Record<string, unknown> | undefined;
		const isExecutionRun =
			tc.toolName === WORKFLOW_BUILDER_TOOL_NAMES.EXECUTIONS && tcArgs?.action === 'run';
		const isVerificationRun = tc.toolName === WORKFLOW_BUILDER_TOOL_NAMES.VERIFY_BUILT_WORKFLOW;
		if ((!isExecutionRun && !isVerificationRun) || tc.isLoading) continue;
		const result = tc.result;
		const args = tc.args;
		if (
			typeof result === 'object' &&
			result !== null &&
			typeof args === 'object' &&
			args !== null &&
			'workflowId' in args &&
			typeof args.workflowId === 'string' &&
			'executionId' in result &&
			typeof result.executionId === 'string' &&
			'status' in result &&
			(result.status === 'success' || result.status === 'error')
		) {
			const simulatedNodeNames = getSimulatedNodeNames(result);
			results.set(args.workflowId, {
				executionId: result.executionId,
				status: result.status,
				...('finishedAt' in result && typeof result.finishedAt === 'string'
					? { finishedAt: result.finishedAt }
					: {}),
				...(simulatedNodeNames.length > 0 ? { simulatedNodeNames } : {}),
			});
		}
	}
	for (const child of node.children) {
		collectExecutionResults(child, results);
	}
}

/** Simulated node names from a workflow_builder_verify_built_workflow result (`simulatedNodes: [{nodeName, reason}]`). */
function getSimulatedNodeNames(result: object): string[] {
	if (!('simulatedNodes' in result) || !Array.isArray(result.simulatedNodes)) return [];
	return result.simulatedNodes
		.map((entry) =>
			isRecord(entry) && typeof entry.nodeName === 'string' ? entry.nodeName : undefined,
		)
		.filter((name): name is string => name !== undefined);
}
