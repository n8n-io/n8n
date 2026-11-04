import {
	AGENT_BUILDER_TOOL_NAMES,
	REMOVED_BUILDER_TOOL_NAMES,
	SHARED_BUILDER_TOOL_NAMES,
	WORKFLOW_BUILDER_TOOL_NAMES,
	getDataTableCallAction,
	getExecutionCallAction,
	isFormerWorkflowsTool,
	resolveBuilderToolName,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import {
	artifactToolCalls,
	findLatestInTurns,
	type ArtifactToolCall,
	type ArtifactTurn,
} from './artifactTurns';

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

function successResultOf(tc: ArtifactToolCall): Record<string, unknown> | undefined {
	if (tc.isLoading || !isRecord(tc.result) || tc.result.success !== true) return undefined;
	return tc.result;
}

function getBuildResult(tc: ArtifactToolCall): BuildResult | undefined {
	if (
		tc.toolName !== WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW &&
		tc.toolName !== REMOVED_BUILDER_TOOL_NAMES.SUBMIT_WORKFLOW
	) {
		return undefined;
	}
	const result = successResultOf(tc);
	if (typeof result?.workflowId !== 'string') return undefined;
	return { workflowId: result.workflowId, toolCallId: tc.toolCallId };
}

/**
 * The workflowId and toolCallId of the latest successful
 * workflow_builder_build_workflow / submit-workflow tool result.
 */
export function getLatestBuildResult(turns: readonly ArtifactTurn[]): BuildResult | undefined {
	return findLatestInTurns(turns, getBuildResult);
}

const WORKFLOW_SETUP_TOOLS = new Set<string>([
	'setup-workflow',
	WORKFLOW_BUILDER_TOOL_NAMES.APPLY_WORKFLOW_CREDENTIALS,
]);

function getWorkflowSetupResult(tc: ArtifactToolCall): WorkflowSetupResult | undefined {
	if (!WORKFLOW_SETUP_TOOLS.has(tc.toolName) || !successResultOf(tc)) return undefined;
	const workflowId = tc.args?.workflowId;
	return typeof workflowId === 'string' ? { workflowId, toolCallId: tc.toolCallId } : undefined;
}

/**
 * The workflowId (from args) and toolCallId of the latest successful
 * setup-workflow / workflow_builder_apply_workflow_credentials tool result.
 * These tools modify the workflow (credentials, parameters) but don't return
 * workflowId in the result.
 */
export function getLatestWorkflowSetupResult(
	turns: readonly ArtifactTurn[],
): WorkflowSetupResult | undefined {
	return findLatestInTurns(turns, getWorkflowSetupResult);
}

const WORKFLOW_MUTATING_TOOLS = new Set<string>([
	WORKFLOW_BUILDER_TOOL_NAMES.RESTORE_WORKFLOW_VERSION,
	WORKFLOW_BUILDER_TOOL_NAMES.SETUP_WORKFLOW,
]);

/** Stored calls of the former multi-action workflows tool also count, including its removed `update`. */
function isWorkflowMutatingCall(tc: ArtifactToolCall): boolean {
	if (isFormerWorkflowsTool(tc.toolName) && tc.args?.action === 'update') return true;
	return WORKFLOW_MUTATING_TOOLS.has(resolveBuilderToolName(tc.toolName, tc.args?.action));
}

function getWorkflowUpdateResult(tc: ArtifactToolCall): WorkflowSetupResult | undefined {
	if (!isWorkflowMutatingCall(tc) || !successResultOf(tc)) return undefined;
	const workflowId = tc.args?.workflowId;
	return typeof workflowId === 'string' ? { workflowId, toolCallId: tc.toolCallId } : undefined;
}

/**
 * The workflowId (from args) and toolCallId of the latest successful tool call
 * that mutated the workflow definition (restore_workflow_version /
 * setup_workflow). These modify an existing workflow but are invisible to
 * getLatestBuildResult, and don't reliably return the workflowId in the
 * result, so it is read from the call args. `setup_workflow` is the current
 * path for credential/parameter configuration (the inline setup card); the
 * legacy setup-workflow / workflow_builder_apply_workflow_credentials tools
 * are handled by getLatestWorkflowSetupResult.
 */
export function getLatestWorkflowUpdateResult(
	turns: readonly ArtifactTurn[],
): WorkflowSetupResult | undefined {
	return findLatestInTurns(turns, getWorkflowUpdateResult);
}

const WORKFLOW_LOCKING_TOOLS = new Set<string>([
	WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW,
	REMOVED_BUILDER_TOOL_NAMES.BUILD_WORKFLOW_WITH_AGENT,
	WORKFLOW_BUILDER_TOOL_NAMES.APPLY_WORKFLOW_CREDENTIALS,
	'setup-workflow',
	WORKFLOW_BUILDER_TOOL_NAMES.VERIFY_BUILT_WORKFLOW,
]);

/** An in-flight build of a new workflow that started before the setup flow announced `workflowId`. */
function isAnnouncedBuild(turn: ArtifactTurn, workflowId: string): boolean {
	const announcement = turn.setupAnnouncement;
	if (announcement?.workflowId !== workflowId) return false;
	return turn.toolCalls.some(
		(call) =>
			call.isLoading &&
			call.toolName === WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW &&
			!call.args?.workflowId &&
			(announcement.timestamp === undefined ||
				(call.startedAt !== undefined && announcement.timestamp >= call.startedAt)),
	);
}

function isTurnEditingWorkflow(turn: ArtifactTurn, workflowId: string): boolean {
	const turns = [turn];
	if (
		turn.isLive &&
		(getLatestBuildResult(turns)?.workflowId === workflowId ||
			getLatestWorkflowSetupResult(turns)?.workflowId === workflowId ||
			getLatestWorkflowUpdateResult(turns)?.workflowId === workflowId ||
			turn.toolCalls.some(
				(call) =>
					resolveBuilderToolName(call.toolName, call.args?.action) ===
						SHARED_BUILDER_TOOL_NAMES.SETUP_CREDENTIALS &&
					isRecord(call.result) &&
					call.result.announced === true &&
					call.result.preBuild === true &&
					call.result.workflowId === workflowId,
			) ||
			isAnnouncedBuild(turn, workflowId))
	) {
		return true;
	}

	for (const tc of turn.toolCalls) {
		if (!tc.isLoading || tc.args?.workflowId !== workflowId) continue;
		if (WORKFLOW_LOCKING_TOOLS.has(tc.toolName)) return true;
		if (getExecutionCallAction(tc.toolName, tc.args.action) === 'run') return true;
		if (isWorkflowMutatingCall(tc)) return true;
	}
	return false;
}

/**
 * Whether the agent is actively working on `workflowId` — used to lock the
 * artifact canvas while a build/edit/verification is in flight so the user
 * can't execute or edit into a mid-stream conflict. Either signal is enough:
 *   1. A live turn has already built/updated/set up this workflow, or the
 *      setup flow announced it for an in-flight build. This covers short gaps
 *      between tool calls while the turn is still running.
 *   2. An in-flight workflow-affecting tool call targets the workflow — the
 *      build/setup/verify tools, `executions.run`, `restore_workflow_version`
 *      or `setup_workflow`. Read-only workflow tools (including historical
 *      get-json events, get, list, …) don't lock.
 */
export function isAgentEditingWorkflow(
	turns: readonly ArtifactTurn[],
	workflowId: string,
): boolean {
	return turns.some((turn) => isTurnEditingWorkflow(turn, workflowId));
}

/** The agent a successful `agent_builder_select_agent` call selected, if any. */
function getSelectedAgentId(tc: ArtifactToolCall): string | undefined {
	if (tc.toolName !== AGENT_BUILDER_TOOL_NAMES.SELECT_AGENT || tc.isLoading) return undefined;
	if (!isRecord(tc.result) || tc.result.ok !== true) return undefined;
	return typeof tc.result.agentId === 'string' ? tc.result.agentId : undefined;
}

/**
 * The agent the turn's latest successful `agent_builder_select_agent` call
 * selected. An earlier selection no longer counts once the turn selects another agent.
 */
function getLatestSelectedAgentId(turn: ArtifactTurn): string | undefined {
	return findLatestInTurns([turn], getSelectedAgentId);
}

/** Ids of the agents that live turns selected last with `agent_builder_select_agent`. */
export function getActiveSelectedAgentIds(turns: readonly ArtifactTurn[]): Set<string> {
	const ids = new Set<string>();
	for (const turn of turns) {
		if (!turn.isLive) continue;
		const agentId = getLatestSelectedAgentId(turn);
		if (agentId) ids.add(agentId);
	}
	return ids;
}

/**
 * Whether the AI is actively working on agent `agentId` — used to lock the
 * agent artifact editor while a build is in flight so user edits can't race
 * builder config writes (the post-build refetch would clobber them). A live
 * turn counts when either:
 *   1. It selected this agent last with `agent_builder_select_agent` — covers
 *      the whole build, including the reads and questions before the first
 *      config write.
 *   2. It has already created/mutated this agent.
 */
export function isAgentEditingAgent(turns: readonly ArtifactTurn[], agentId: string): boolean {
	return turns.some(
		(turn) =>
			turn.isLive &&
			(getLatestSelectedAgentId(turn) === agentId ||
				getLatestAgentArtifactResult([turn])?.agentId === agentId),
	);
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

function getDeletedDataTableId(tc: ArtifactToolCall): string | undefined {
	if (getDataTableCallAction(tc.toolName, tc.args?.action) !== 'delete') return undefined;
	if (!successResultOf(tc)) return undefined;
	return typeof tc.args?.dataTableId === 'string' ? tc.args.dataTableId : undefined;
}

/** The dataTableId of the latest successful delete-data-table tool result. */
export function getLatestDeletedDataTableId(turns: readonly ArtifactTurn[]): string | undefined {
	return findLatestInTurns(turns, getDeletedDataTableId);
}

function getDataTableResult(tc: ArtifactToolCall): DataTableResult | undefined {
	const action = getDataTableCallAction(tc.toolName, tc.args?.action) ?? '';
	if (!DATA_TABLE_PREVIEW_ACTIONS.has(action) || tc.isLoading || !isRecord(tc.result)) {
		return undefined;
	}
	const dataTableId = extractDataTableId(action, tc.result, tc.args);
	return dataTableId ? { dataTableId, toolCallId: tc.toolCallId } : undefined;
}

export function getLatestDataTableResult(
	turns: readonly ArtifactTurn[],
): DataTableResult | undefined {
	return findLatestInTurns(turns, getDataTableResult);
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

export interface SkillArtifact {
	skillId: string;
	name?: string;
}

export type SkillArtifactResult = ToolArtifactResult<SkillArtifact>;

/**
 * The skill that a finished `skills` call created or saved. Only a successful
 * create or update counts: a list, a get, a delete, a denied or a refused call
 * does not make the skill an artifact.
 */
export function getSkillArtifactFromToolCall(tc: ArtifactToolCall): SkillArtifact | undefined {
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

export type ToolArtifactResult<T> = T & {
	/** Unique per operation — changes even when the same artifact is saved again. */
	toolCallId: string;
};

/** The latest artifact that `extract` finds in a tool call. */
function getLatestToolArtifactResult<T extends object>(
	turns: readonly ArtifactTurn[],
	extract: (tc: ArtifactToolCall) => T | undefined,
): ToolArtifactResult<T> | undefined {
	return findLatestInTurns(turns, (tc) => {
		const artifact = extract(tc);
		return artifact ? { ...artifact, toolCallId: tc.toolCallId } : undefined;
	});
}

/** The latest skill that the assistant created or saved with the `skills` tool. */
export function getLatestSkillArtifactResult(
	turns: readonly ArtifactTurn[],
): SkillArtifactResult | undefined {
	return getLatestToolArtifactResult(turns, getSkillArtifactFromToolCall);
}

/** Name of the n8n Assistant tool that builds n8n Apps. */
export const APPS_TOOL_NAME = 'apps';

/** `get` and `open` only read the app. */
const APP_WRITE_ACTIONS = new Set(['create', 'commit']);

export interface AppArtifact {
	appId: string;
	name: string;
	projectId: string;
}

/** The app that a finished `apps` call created or committed. */
export function getAppArtifactFromToolCall(tc: ArtifactToolCall): AppArtifact | undefined {
	if (tc.toolName !== APPS_TOOL_NAME || tc.isLoading) return undefined;
	const action = tc.args?.action;
	if (typeof action !== 'string' || !APP_WRITE_ACTIONS.has(action)) return undefined;
	const result = unwrapUntrustedToolResult(tc.result);
	if (!isRecord(result) || !isRecord(result.app)) return undefined;
	const { id, name, projectId } = result.app;
	if (typeof id !== 'string' || typeof name !== 'string' || typeof projectId !== 'string') {
		return undefined;
	}
	return { appId: id, name, projectId };
}

/** The latest app that the assistant created or committed with the `apps` tool. */
export function getLatestAppArtifactResult(
	turns: readonly ArtifactTurn[],
): ToolArtifactResult<AppArtifact> | undefined {
	return getLatestToolArtifactResult(turns, getAppArtifactFromToolCall);
}

function agentTargetOf(tc: ArtifactToolCall): AgentArtifactTarget | undefined {
	const target = tc.subAgentTarget;
	if (target?.type !== 'agent' || typeof target.id !== 'string') return undefined;
	return {
		agentId: target.id,
		...(typeof target.projectId === 'string' ? { projectId: target.projectId } : {}),
	};
}

function matchAgentArtifactToolCall(
	tc: ArtifactToolCall,
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
	if (result.agentChange === undefined && result.ok === true && typeof tc.args?.name === 'string') {
		return { ...callTarget, toolCallId: tc.toolCallId, kind: 'created' };
	}
	if (result.agentChange === undefined && result.configUpdated === true) {
		return { ...callTarget, toolCallId: tc.toolCallId, kind: 'mutated' };
	}
	return undefined;
}

/**
 * The latest Agent that a tool call created, selected or changed. A
 * `agent_builder_build_agent` result of an old thread has no agent id: it
 * takes the id from the sub-agent target of the call, else `fallbackTarget`.
 */
export function getLatestAgentArtifactResult(
	turns: readonly ArtifactTurn[],
	fallbackTarget?: AgentArtifactTarget,
): AgentArtifactResult | undefined {
	return findLatestInTurns(turns, (tc) =>
		matchAgentArtifactToolCall(tc, agentTargetOf(tc) ?? fallbackTarget),
	);
}

/** Builder tool calls whose success means the persisted agent changed in a panel-visible way. */
export interface AgentConfigMutationResult {
	agentId: string;
	/** Unique per mutation — a later mutation in the same build re-fires watchers. */
	toolCallId: string;
}

function getAgentConfigMutation(tc: ArtifactToolCall): AgentConfigMutationResult | undefined {
	if (tc.isLoading || !isRecord(tc.result) || tc.result.configMutated !== true) return undefined;
	const { agentId } = tc.result;
	return typeof agentId === 'string' ? { agentId, toolCallId: tc.toolCallId } : undefined;
}

/** The latest resolved tool call stamped with `configMutated: true` by the backend. */
export function getLatestAgentConfigMutation(
	turns: readonly ArtifactTurn[],
): AgentConfigMutationResult | undefined {
	return findLatestInTurns(turns, getAgentConfigMutation);
}

/**
 * The latest completed run-workflow result per workflowId. Used to restore
 * execution status from historical messages after page refresh.
 */
export function getExecutionResultsByWorkflow(
	turns: readonly ArtifactTurn[],
): Map<string, ExecutionResult> {
	const results = new Map<string, ExecutionResult>();
	for (const tc of artifactToolCalls(turns)) {
		const isExecutionRun = getExecutionCallAction(tc.toolName, tc.args?.action) === 'run';
		const isVerificationRun = tc.toolName === WORKFLOW_BUILDER_TOOL_NAMES.VERIFY_BUILT_WORKFLOW;
		if ((!isExecutionRun && !isVerificationRun) || tc.isLoading) continue;
		const result = tc.result;
		const workflowId = tc.args?.workflowId;
		if (
			isRecord(result) &&
			typeof workflowId === 'string' &&
			typeof result.executionId === 'string' &&
			(result.status === 'success' || result.status === 'error')
		) {
			const simulatedNodeNames = getSimulatedNodeNames(result);
			results.set(workflowId, {
				executionId: result.executionId,
				status: result.status,
				...(typeof result.finishedAt === 'string' ? { finishedAt: result.finishedAt } : {}),
				...(simulatedNodeNames.length > 0 ? { simulatedNodeNames } : {}),
			});
		}
	}
	return results;
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
