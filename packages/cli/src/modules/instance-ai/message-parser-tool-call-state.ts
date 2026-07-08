import { getRenderHint } from '@n8n/api-types';
import type { InstanceAiConfirmation, InstanceAiToolCallState } from '@n8n/api-types';
import type { MessageContent } from '@n8n/instance-ai';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

const toolCallContentPartSchema = z.object({
	type: z.literal('tool-call'),
	toolCallId: z.string(),
	toolName: z.string(),
	input: z.unknown().optional(),
	state: z.enum(['pending', 'resolved', 'rejected']).optional(),
	output: z.unknown().optional(),
	error: z.string().optional(),
});

const textContentPartSchema = z.object({ type: z.literal('text'), text: z.string() });
const reasoningContentPartSchema = z.object({ type: z.literal('reasoning'), text: z.string() });
const opaqueContentPartSchema = z
	.object({ type: z.enum(['invalid-tool-call', 'file', 'citation', 'provider']) })
	.passthrough();

const contentPartSchema = z.union([
	textContentPartSchema,
	reasoningContentPartSchema,
	toolCallContentPartSchema,
	opaqueContentPartSchema,
]);

export interface StoredToolInvocation {
	state: 'result' | 'call' | 'partial-call';
	toolCallId: string;
	toolName: string;
	args: Record<string, unknown>;
	result?: unknown;
	error?: string;
	confirmation?: InstanceAiConfirmation;
}

export type StoredContentPart = MessageContent;

export function extractParts(content: unknown): StoredContentPart[] | undefined {
	if (Array.isArray(content)) return content.filter(isStoredContentPart);
	return undefined;
}

function isStoredContentPart(value: unknown): value is StoredContentPart {
	return contentPartSchema.safeParse(value).success;
}

function toRecord(value: unknown): Record<string, unknown> {
	return isRecord(value) ? value : {};
}

function nativeToolPartToInvocation(part: StoredContentPart): StoredToolInvocation | undefined {
	if (part.type !== 'tool-call') return undefined;

	const parsed = toolCallContentPartSchema.safeParse(part);
	if (!parsed.success) return undefined;
	const toolCall = parsed.data;

	const args = toRecord(toolCall.input);
	if (toolCall.state === 'resolved') {
		return {
			state: 'result',
			toolCallId: toolCall.toolCallId,
			toolName: toolCall.toolName,
			args,
			result: toolCall.output,
		};
	}
	if (toolCall.state === 'rejected') {
		return {
			state: 'result',
			toolCallId: toolCall.toolCallId,
			toolName: toolCall.toolName,
			args,
			error: toolCall.error,
		};
	}
	return {
		state: 'call',
		toolCallId: toolCall.toolCallId,
		toolName: toolCall.toolName,
		args,
	};
}

export function extractToolInvocations(content: unknown): StoredToolInvocation[] {
	if (typeof content === 'string') return [];
	if (Array.isArray(content)) {
		return content.filter(isStoredContentPart).flatMap((part) => {
			const invocation = nativeToolPartToInvocation(part);
			return invocation ? [invocation] : [];
		});
	}
	return [];
}

export function buildToolCallState(
	invocation: StoredToolInvocation,
	confirmation?: InstanceAiConfirmation,
): InstanceAiToolCallState {
	const isCompleted = invocation.state === 'result';
	const pendingConfirmation = isCompleted ? undefined : (invocation.confirmation ?? confirmation);
	return {
		toolCallId: invocation.toolCallId,
		toolName: invocation.toolName,
		args: invocation.args,
		result: isCompleted ? invocation.result : undefined,
		error: isCompleted ? invocation.error : undefined,
		isLoading: !isCompleted,
		renderHint: getRenderHint(invocation.toolName),
		...(pendingConfirmation ? { confirmation: pendingConfirmation } : {}),
	};
}
