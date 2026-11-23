import {
	SHARED_BUILDER_TOOL_NAMES,
	WORKFLOW_BUILDER_TOOL_NAMES,
	resolveBuilderToolName,
	type InstanceAiAgentNode,
	type InstanceAiToolCallState,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import type { INodeTypeDescription } from 'n8n-workflow';

import { GRID_SIZE } from '@/app/utils/nodeViewUtils';

import type { WorkflowDraft } from './instanceAi.workflowDrafts';

/**
 * A new workflow before its first draft: the node types the agent has read,
 * shown on the draft canvas while the agent still researches and writes.
 */
export interface WorkflowStaging {
	runId: string;
	nodes: WorkflowStagingNode[];
}

export interface WorkflowStagingNode {
	/** `staging:<nodeType>[:discriminators]`, stable while the run goes on. */
	id: string;
	nodeType: string;
	version?: number;
	resource?: string;
	operation?: string;
	mode?: string;
}

const STAGING_FILE_PREFIX = 'staging:';
const WORKFLOW_BUILDER_SKILL = 'workflow-builder';
const LOAD_SKILL_TOOL = 'load_skill';
const EDIT_TOOLS = new Set<string>([
	WORKFLOW_BUILDER_TOOL_NAMES.GET_WORKFLOW,
	WORKFLOW_BUILDER_TOOL_NAMES.GET_WORKFLOW_AS_CODE,
]);
const STAGING_COLUMNS = 4;
// Room for a wide configurable node, and for a label with a two-line subtitle.
const STAGING_COLUMN_STEP = 20 * GRID_SIZE;
const STAGING_ROW_STEP = 14 * GRID_SIZE;

function collectToolCalls(node: InstanceAiAgentNode): InstanceAiToolCallState[] {
	return [...node.toolCalls, ...node.children.flatMap(collectToolCalls)];
}

function toolName(toolCall: InstanceAiToolCallState): string {
	return resolveBuilderToolName(toolCall.toolName, toolCall.args.action);
}

function stringArg(args: Record<string, unknown>, key: string): string | undefined {
	const value = args[key];
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function skillName(args: Record<string, unknown>): string | undefined {
	return stringArg(args, 'name') ?? stringArg(args, 'skillId');
}

function isWorkflowBuilderLoad(toolCall: InstanceAiToolCallState): boolean {
	return (
		toolName(toolCall) === LOAD_SKILL_TOOL && skillName(toolCall.args) === WORKFLOW_BUILDER_SKILL
	);
}

function isEditCall(toolCall: InstanceAiToolCallState): boolean {
	const name = toolName(toolCall);
	if (EDIT_TOOLS.has(name)) return true;
	return (
		name === WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW &&
		stringArg(toolCall.args, 'workflowId') !== undefined
	);
}

/** The workflow that a build saved. From then on the saved canvas owns the tab. */
function savedWorkflowId(toolCall: InstanceAiToolCallState): string | undefined {
	if (toolName(toolCall) !== WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW) return undefined;
	const { result } = toolCall;
	if (!isRecord(result) || result.success !== true) return undefined;
	return typeof result.workflowId === 'string' ? result.workflowId : undefined;
}

/** The saved workflow of a call: the one it reads or builds on, or the one its build saved. */
function workflowOfCall(toolCall: InstanceAiToolCallState): string | undefined {
	const saved = savedWorkflowId(toolCall);
	if (saved) return saved;
	return isEditCall(toolCall) ? stringArg(toolCall.args, 'workflowId') : undefined;
}

function toVersion(value: unknown): number | undefined {
	if (typeof value === 'number') return value;
	if (typeof value !== 'string') return undefined;
	const version = Number(value);
	return Number.isFinite(version) ? version : undefined;
}

function toStagingNode(request: unknown): WorkflowStagingNode | undefined {
	if (typeof request === 'string') return { id: `staging:${request}`, nodeType: request };
	if (!isRecord(request)) return undefined;
	const nodeType = stringArg(request, 'nodeType');
	if (!nodeType) return undefined;
	const resource = stringArg(request, 'resource');
	const operation = stringArg(request, 'operation');
	const mode = stringArg(request, 'mode');
	const version = toVersion(request.version);
	const id = ['staging', nodeType, resource, operation, mode].filter(Boolean).join(':');
	return {
		id,
		nodeType,
		...(version !== undefined ? { version } : {}),
		...(resource ? { resource } : {}),
		...(operation ? { operation } : {}),
		...(mode ? { mode } : {}),
	};
}

function requestedNodes(toolCall: InstanceAiToolCallState): WorkflowStagingNode[] {
	if (toolName(toolCall) !== SHARED_BUILDER_TOOL_NAMES.GET_NODE_TYPES) return [];
	const { nodeTypes } = toolCall.args;
	if (!Array.isArray(nodeTypes)) return [];
	return nodeTypes.flatMap((request: unknown) => toStagingNode(request) ?? []);
}

/**
 * The staging state of a run, or undefined when the run does not build a new
 * workflow: the workflow builder skill has not loaded, or the agent works on a
 * saved workflow.
 */
export function getWorkflowStaging(
	tree: InstanceAiAgentNode,
	options: { hasNodeType: (nodeType: string) => boolean },
): WorkflowStaging | undefined {
	const toolCalls = collectToolCalls(tree);
	if (!toolCalls.some(isWorkflowBuilderLoad)) return undefined;
	if (toolCalls.some(isEditCall)) return undefined;
	// The run's drafts go away once the saved canvas loads, so the save itself ends staging.
	if (toolCalls.some((toolCall) => savedWorkflowId(toolCall) !== undefined)) return undefined;

	const nodes = new Map<string, WorkflowStagingNode>();
	for (const node of toolCalls.flatMap(requestedNodes)) {
		if (!nodes.has(node.id) && options.hasNodeType(node.nodeType)) nodes.set(node.id, node);
	}
	return { runId: tree.runId ?? tree.agentId, nodes: [...nodes.values()] };
}

export function loadsWorkflowBuilder(tree: InstanceAiAgentNode): boolean {
	return collectToolCalls(tree).some(isWorkflowBuilderLoad);
}

/** The newest saved workflow that the run reads, builds on or saves. */
export function workflowOfRun(tree: InstanceAiAgentNode): string | undefined {
	return collectToolCalls(tree)
		.flatMap((toolCall) => workflowOfCall(toolCall) ?? [])
		.at(-1);
}

type StagingDraftNode = WorkflowDraft['workflow']['nodes'][number];

export interface StagingNodeTypeInfo {
	displayName: string;
	defaultVersion: number;
	isTrigger?: boolean;
}

/** The staging canvas of a run, as a draft. Its file path is not a source file. */
export function stagingFilePath(runId: string): string {
	return `${STAGING_FILE_PREFIX}${runId}`;
}

export function isStagingDraft(draft: WorkflowDraft): boolean {
	return draft.filePath.startsWith(STAGING_FILE_PREFIX);
}

export function toStagingNodeTypeInfo(
	description: Pick<
		INodeTypeDescription,
		'displayName' | 'version' | 'defaultVersion' | 'group'
	> | null,
): StagingNodeTypeInfo | undefined {
	if (!description) return undefined;
	const { displayName, version, defaultVersion, group } = description;
	const newest = Array.isArray(version) ? Math.max(...version) : version;
	return {
		displayName,
		defaultVersion: defaultVersion ?? newest,
		isTrigger: group.includes('trigger'),
	};
}

function uniqueName(name: string, used: Map<string, number>): string {
	const count = (used.get(name) ?? 0) + 1;
	used.set(name, count);
	return count === 1 ? name : `${name} ${count}`;
}

/** The staged node types as canvas nodes, in a grid, without connections. */
export function toStagingWorkflowNodes(
	staging: WorkflowStaging,
	describeType: (nodeType: string) => StagingNodeTypeInfo | undefined,
): StagingDraftNode[] {
	const known = staging.nodes.flatMap((node) => {
		const info = describeType(node.nodeType);
		return info ? [{ node, info }] : [];
	});
	// Triggers start a workflow, so they go to the top left.
	const ordered = [
		...known.filter(({ info }) => info.isTrigger),
		...known.filter(({ info }) => !info.isTrigger),
	];
	const usedNames = new Map<string, number>();
	return ordered.map(({ node, info }, index) => ({
		id: node.id,
		name: uniqueName(info.displayName, usedNames),
		type: node.nodeType,
		typeVersion: node.version ?? info.defaultVersion,
		position: [
			(index % STAGING_COLUMNS) * STAGING_COLUMN_STEP,
			Math.floor(index / STAGING_COLUMNS) * STAGING_ROW_STEP,
		],
		parameters: {
			...(node.resource ? { resource: node.resource } : {}),
			...(node.operation ? { operation: node.operation } : {}),
			...(node.mode ? { mode: node.mode } : {}),
		},
	}));
}
