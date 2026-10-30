import {
	WORKFLOW_BUILDER_TOOL_NAMES,
	resolveBuilderToolName,
	workflowDraftPayloadSchema,
	type InstanceAiEvent,
	type InstanceAiWorkflowDraftPayload,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { parseWorkflowSource, type WorkflowJSON } from '@n8n/workflow-sdk';

import { prepareWorkflowForSave } from './prepare-workflow-for-save';
import { getWorkflowSourceFileBinding } from './workflow-file-bindings';
import { isTypeScriptWorkflowSource, isWorkflowJsonSourceFile } from './workflow-source-compiler';
import type { InstanceAiEventBus } from '../../event-bus/event-bus.interface';
import type { Logger } from '../../logger';
import type { InstanceAiContext } from '../../types';
import { readWorkspaceFile } from '../../workspace/workspace-files';

/** Where the previewer reads a source file and the saved workflow it belongs to. */
export interface WorkflowDraftSources {
	readSource(filePath: string): Promise<string | null>;
	findBoundWorkflowId(filePath: string): Promise<string | undefined>;
	/** Runs the save's own preparation, so the draft matches what the save will store. */
	prepareLikeSave(json: WorkflowJSON, workflowId: string | undefined): Promise<void>;
}

/** Reads through the run's workspace, file bindings and saved workflows. */
export function createContextWorkflowDraftSources(
	context: InstanceAiContext,
): WorkflowDraftSources {
	return {
		async readSource(filePath) {
			if (!context.workspace) return null;
			return await readWorkspaceFile(context.workspace, filePath, { logger: context.logger });
		},
		async findBoundWorkflowId(filePath) {
			return (await getWorkflowSourceFileBinding(context, filePath))?.workflowId;
		},
		// Identity, groups and layout all go through the same passes as the save,
		// so the saved workflow does not differ from the draft the user watched.
		async prepareLikeSave(json, workflowId) {
			await prepareWorkflowForSave(json, workflowId, context);
		},
	};
}

export interface WorkflowDraftPreviewer {
	/** Watch a run event. Publishes a `workflow-draft` after a workflow source is written. */
	observe(event: InstanceAiEvent): void;
}

interface PendingWrite {
	filePath: string;
	/** Full content when the tool call carries it, so no read is needed. */
	content?: string;
}

const WRITE_TOOL_NAMES = new Set(['workspace_write_file', 'workspace_str_replace_file']);

function isWorkflowSourcePath(filePath: string): boolean {
	return isTypeScriptWorkflowSource(filePath) || isWorkflowJsonSourceFile(filePath);
}

function nonEmptyString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function toPendingWrite(toolName: string, args: Record<string, unknown>): PendingWrite | undefined {
	if (!WRITE_TOOL_NAMES.has(toolName)) return undefined;
	const filePath = nonEmptyString(args.path);
	if (!filePath || !isWorkflowSourcePath(filePath)) return undefined;
	return { filePath, content: typeof args.content === 'string' ? args.content : undefined };
}

function toInlineBuildWrite(toolName: string, args: Record<string, unknown>) {
	if (resolveBuilderToolName(toolName) !== WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW) return;
	const filePath = nonEmptyString(args.filePath);
	const content = nonEmptyString(args.sourceCode);
	return filePath && content && isWorkflowSourcePath(filePath) ? { filePath, content } : undefined;
}

function isSuccessfulResult(result: unknown): boolean {
	return !isRecord(result) || result.success !== false;
}

function isWorkflowJsonShape(value: unknown): value is WorkflowJSON {
	return (
		isRecord(value) &&
		typeof value.name === 'string' &&
		Array.isArray(value.nodes) &&
		isRecord(value.connections)
	);
}

function parseSource(filePath: string, content: string): WorkflowJSON | undefined {
	if (!isWorkflowJsonSourceFile(filePath)) return parseWorkflowSource(content);
	const json: unknown = JSON.parse(content);
	return isWorkflowJsonShape(json) ? json : undefined;
}

/**
 * Turns each successful write of a workflow source file into a `workflow-draft`
 * event, so the canvas can show the workflow before the sandbox build saves it.
 * Never blocks the tool path and never reports an error to the agent: a source
 * that does not parse simply produces no draft.
 */
export function createWorkflowDraftPreviewer(options: {
	eventBus: Pick<InstanceAiEventBus, 'publish'>;
	threadId: string;
	runId: string;
	agentId: string;
	logger: Logger;
	sources: WorkflowDraftSources;
}): WorkflowDraftPreviewer {
	const { eventBus, threadId, runId, agentId, logger, sources } = options;
	const pendingWrites = new Map<string, PendingWrite>();
	const revisions = new Map<string, number>();

	async function buildPayload(
		write: PendingWrite,
		revision: number,
	): Promise<InstanceAiWorkflowDraftPayload | undefined> {
		const content = write.content ?? (await sources.readSource(write.filePath));
		if (content === null) return undefined;
		const json = parseSource(write.filePath, content);
		if (!json) return undefined;
		const workflowId = await sources.findBoundWorkflowId(write.filePath);
		await sources.prepareLikeSave(json, workflowId);
		const parsed = workflowDraftPayloadSchema.safeParse({
			filePath: write.filePath,
			...(workflowId ? { workflowId } : {}),
			revision,
			workflow: json,
		});
		return parsed.success ? parsed.data : undefined;
	}

	async function publishDraft(write: PendingWrite) {
		const revision = (revisions.get(write.filePath) ?? 0) + 1;
		revisions.set(write.filePath, revision);
		try {
			const payload = await buildPayload(write, revision);
			// A newer write of the same file started while this one ran.
			if (!payload || revisions.get(write.filePath) !== revision) return;
			eventBus.publish(threadId, { type: 'workflow-draft', runId, agentId, payload });
		} catch (error) {
			logger.debug('Skipped workflow draft preview', {
				filePath: write.filePath,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	function onToolCall(payload: {
		toolCallId: string;
		toolName: string;
		args: Record<string, unknown>;
	}) {
		const inline = toInlineBuildWrite(payload.toolName, payload.args);
		if (inline) {
			// Fire and forget: the draft must never delay the tool path.
			publishDraft(inline).catch(() => {});
			return;
		}
		const write = toPendingWrite(payload.toolName, payload.args);
		if (write) pendingWrites.set(payload.toolCallId, write);
	}

	function onToolResult(toolCallId: string, result: unknown) {
		const write = pendingWrites.get(toolCallId);
		pendingWrites.delete(toolCallId);
		if (write && isSuccessfulResult(result)) void publishDraft(write);
	}

	return {
		observe(event) {
			if (event.type === 'tool-call') onToolCall(event.payload);
			else if (event.type === 'tool-result')
				onToolResult(event.payload.toolCallId, event.payload.result);
			else if (event.type === 'tool-error') pendingWrites.delete(event.payload.toolCallId);
		},
	};
}
