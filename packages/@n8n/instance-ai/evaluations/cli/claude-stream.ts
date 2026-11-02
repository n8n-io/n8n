// ---------------------------------------------------------------------------
// `claude -p --output-format stream-json --verbose` parsing
//
// Turns the NDJSON event stream of one `claude` turn into the final session
// summary plus transcript steps in the harness format, so MCP builds carry the
// same transcript shape as Instance AI builds.
// ---------------------------------------------------------------------------

import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import type { TranscriptStep } from '../types';

export const claudeSessionSchema = z
	.object({
		result: z.string().optional(),
		num_turns: z.number().optional(),
		total_cost_usd: z.number().optional(),
		duration_ms: z.number().optional(),
		subtype: z.string().optional(),
		session_id: z.string().optional(),
	})
	.passthrough();
export type ClaudeSession = z.infer<typeof claudeSessionSchema>;

const streamEventSchema = z
	.object({
		type: z.string(),
		subtype: z.string().optional(),
		session_id: z.string().optional(),
		message: z
			.object({ content: z.array(z.unknown()) })
			.passthrough()
			.optional(),
	})
	.passthrough();

const textBlockSchema = z.object({ type: z.literal('text'), text: z.string() });
const toolUseBlockSchema = z.object({
	type: z.literal('tool_use'),
	id: z.string(),
	name: z.string(),
	input: z.unknown().optional(),
});
const toolResultBlockSchema = z.object({
	type: z.literal('tool_result'),
	tool_use_id: z.string(),
	content: z.unknown().optional(),
	is_error: z.boolean().optional(),
});

const CREATE_WORKFLOW_TOOL = 'create_workflow_from_code';
const CREATE_AGENT_TOOL = 'create_agent';
const UPDATE_WORKFLOW_TOOL = 'update_workflow';
const MUTATE_AGENT_TOOL = 'mutate_agent';

const createAgentResultSchema = z.object({
	ok: z.literal(true),
	agent: z.object({ id: z.string(), projectId: z.string().optional() }),
});

export interface CreatedAgent {
	id: string;
	projectId?: string;
}

export interface ClaudeTurnCapture {
	/** The closing `result` event, or undefined when the stream never finished. */
	session: ClaudeSession | undefined;
	sessionId: string | undefined;
	/** Narration and tool calls in stream order. Thinking blocks are left out. */
	steps: TranscriptStep[];
	/** All assistant text of the turn, joined in order. */
	agentText: string;
	/** Ids returned by successful `create_workflow_from_code` calls, in order. */
	createdWorkflowIds: string[];
	/** Agents returned by successful `create_agent` calls, in order. */
	createdAgents: CreatedAgent[];
	/** Existing workflows changed by successful `update_workflow` calls, in order. */
	updatedWorkflowIds: string[];
	/** Existing Agents changed by successful `mutate_agent` calls, in order. */
	updatedAgentIds: string[];
}

function toolResultText(content: unknown): string {
	if (typeof content === 'string') return content;
	if (Array.isArray(content)) {
		return content
			.map((item) => {
				const block = textBlockSchema.safeParse(item);
				return block.success ? block.data.text : '';
			})
			.filter((text) => text.length > 0)
			.join('\n');
	}
	return content === undefined ? '' : JSON.stringify(content);
}

function parseMaybeJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

function parseLine(line: string): unknown {
	try {
		return JSON.parse(line);
	} catch {
		return undefined;
	}
}

/**
 * Parse one turn of `claude` stream-json output. `serverName` is the sanitized
 * MCP server name, used to strip the `mcp__<server>__` tool-name prefix.
 */
export function parseClaudeStream(stdout: string, serverName: string): ClaudeTurnCapture {
	const toolPrefix = `mcp__${serverName}__`;
	const capture: ClaudeTurnCapture = {
		session: undefined,
		sessionId: undefined,
		steps: [],
		agentText: '',
		createdWorkflowIds: [],
		createdAgents: [],
		updatedWorkflowIds: [],
		updatedAgentIds: [],
	};
	const textParts: string[] = [];
	const toolCallsById = new Map<string, Extract<TranscriptStep, { kind: 'tool-call' }>>();

	for (const line of stdout.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		const event = streamEventSchema.safeParse(parseLine(trimmed));
		if (!event.success) continue;
		const { type, session_id: sessionId, message } = event.data;
		if (sessionId) capture.sessionId = sessionId;

		if (type === 'result') {
			const session = claudeSessionSchema.safeParse(event.data);
			if (session.success) capture.session = session.data;
			continue;
		}
		if (!message) continue;

		for (const rawBlock of message.content) {
			if (type === 'assistant') {
				const text = textBlockSchema.safeParse(rawBlock);
				if (text.success) {
					if (text.data.text.trim().length === 0) continue;
					textParts.push(text.data.text);
					capture.steps.push({ kind: 'agent-text', text: text.data.text });
					continue;
				}
				const toolUse = toolUseBlockSchema.safeParse(rawBlock);
				if (toolUse.success) {
					const name = toolUse.data.name;
					const step: Extract<TranscriptStep, { kind: 'tool-call' }> = {
						kind: 'tool-call',
						toolName: name.startsWith(toolPrefix) ? name.slice(toolPrefix.length) : name,
						toolCallId: toolUse.data.id,
						...(isRecord(toolUse.data.input) ? { args: toolUse.data.input } : {}),
					};
					toolCallsById.set(toolUse.data.id, step);
					capture.steps.push(step);
				}
			} else if (type === 'user') {
				const toolResult = toolResultBlockSchema.safeParse(rawBlock);
				if (!toolResult.success) continue;
				const step = toolCallsById.get(toolResult.data.tool_use_id);
				if (!step) continue;
				const text = toolResultText(toolResult.data.content);
				if (toolResult.data.is_error) {
					step.error = text;
					continue;
				}
				step.result = parseMaybeJson(text);
				if (
					step.toolName === CREATE_WORKFLOW_TOOL &&
					isRecord(step.result) &&
					typeof step.result.workflowId === 'string'
				) {
					capture.createdWorkflowIds.push(step.result.workflowId);
				}
				// An update whose operations were all skipped changed nothing. A result
				// without the count (a post-save recovery) still saved the workflow.
				const appliedNothing = isRecord(step.result) && step.result.appliedOperations === 0;
				if (
					step.toolName === UPDATE_WORKFLOW_TOOL &&
					typeof step.args?.workflowId === 'string' &&
					!appliedNothing
				) {
					capture.updatedWorkflowIds.push(step.args.workflowId);
				}
				if (step.toolName === MUTATE_AGENT_TOOL && typeof step.args?.agentId === 'string') {
					capture.updatedAgentIds.push(step.args.agentId);
				}
				if (step.toolName === CREATE_AGENT_TOOL) {
					const created = createAgentResultSchema.safeParse(step.result);
					if (created.success) capture.createdAgents.push(created.data.agent);
				}
			}
		}
	}

	capture.agentText = textParts.join('\n\n');
	return capture;
}
