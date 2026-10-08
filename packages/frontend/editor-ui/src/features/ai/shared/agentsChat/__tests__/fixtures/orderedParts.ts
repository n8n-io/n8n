import fc from 'fast-check';
import type {
	AgentPersistedMessageContentPart,
	AgentPersistedMessageDto,
	AgentSseEvent,
} from '@n8n/api-types';

import { isAssistantGroup, type DisplayGroup } from '../../displayGroups';

/**
 * One step of an assistant turn, in the order the agent produced it. Tests
 * build the persisted history and the live stream of the same turn from it.
 */
export type OrderedPart =
	| { kind: 'text'; text: string }
	| { kind: 'tool'; toolCallId: string; toolName: string }
	| { kind: 'reasoning'; text: string };

export const text = (value: string): OrderedPart => ({ kind: 'text', text: value });
export const tool = (toolCallId: string, toolName = 'read_file'): OrderedPart => ({
	kind: 'tool',
	toolCallId,
	toolName,
});
export const reasoning = (value: string): OrderedPart => ({ kind: 'reasoning', text: value });

/** text → 3 tools → text → 2 tools: the turn from the reported reload bug. */
export const READ_THEN_EDIT_TURN: OrderedPart[] = [
	text("I'll read the instructions first."),
	tool('read-1'),
	tool('read-2'),
	tool('read-3'),
	text('Now I will update the two files.'),
	tool('edit-1', 'edit_file'),
	tool('edit-2', 'edit_file'),
];

type PartShape = 'text' | 'blank' | 'tool' | 'reasoning';

const partShapeArb = fc.oneof(
	{ arbitrary: fc.constant<PartShape>('text'), weight: 3 },
	{ arbitrary: fc.constant<PartShape>('blank'), weight: 1 },
	{ arbitrary: fc.constant<PartShape>('tool'), weight: 4 },
	{ arbitrary: fc.constant<PartShape>('reasoning'), weight: 1 },
);
const blankTextArb = fc.constantFrom(' ', '\n', '\n\n');

/**
 * Generated turns. Each text holds a unique marker and each tool call a unique
 * id, so a test can check order. Blank text shows that whitespace between tool
 * calls does not split a tool run.
 */
export const orderedPartsArb: fc.Arbitrary<OrderedPart[]> = fc
	.array(fc.tuple(partShapeArb, blankTextArb), { minLength: 1, maxLength: 12 })
	.map((shapes) =>
		shapes.map(([shape, blank], index): OrderedPart => {
			if (shape === 'text') return text(`Text ${index}.`);
			if (shape === 'blank') return text(blank);
			if (shape === 'tool') return tool(`call-${index}`);
			return reasoning(`Thought ${index}.`);
		}),
	);

export function isBlankText(part: OrderedPart): boolean {
	return part.kind === 'text' && !part.text.trim();
}

function toPersistedPart(part: OrderedPart): AgentPersistedMessageContentPart {
	if (part.kind === 'tool') {
		return {
			type: 'tool-call',
			toolName: part.toolName,
			toolCallId: part.toolCallId,
			input: { path: `${part.toolCallId}.md` },
			state: 'resolved',
			output: { ok: true },
		};
	}
	return { type: part.kind, text: part.text };
}

/** The assistant message that history returns for the turn: one message for each execution. */
export function toPersistedMessage(
	parts: OrderedPart[],
	overrides: Partial<AgentPersistedMessageDto> = {},
): AgentPersistedMessageDto {
	return {
		id: 'exec-1:assistant',
		role: 'assistant',
		content: parts.map(toPersistedPart),
		executionId: 'exec-1',
		executionStatus: 'success',
		...overrides,
	};
}

function partEvents(part: OrderedPart, index: number): AgentSseEvent[] {
	if (part.kind === 'text') return [{ type: 'text-delta', id: `text-${index}`, delta: part.text }];
	if (part.kind === 'reasoning') {
		const id = `reasoning-${index}`;
		return [
			{ type: 'reasoning-start', id },
			{ type: 'reasoning-delta', id, delta: part.text },
			{ type: 'reasoning-end', id },
		];
	}
	const { toolCallId, toolName } = part;
	return [
		{ type: 'tool-input-start', toolCallId, toolName },
		{ type: 'tool-call', toolCallId, toolName, input: { path: `${toolCallId}.md` } },
	];
}

function toolResults(toolCallIds: string[]): AgentSseEvent[] {
	return toolCallIds.map((toolCallId) => ({
		type: 'tool-result',
		toolCallId,
		toolName: 'read_file',
		output: { ok: true },
	}));
}

/**
 * The live stream of the turn. `stepEnds[i]` ends the LLM step after a tool
 * call at index i, as the runtime does before it runs the tools. Without a step
 * end, the next output comes in the same step.
 */
export function toStreamEvents(parts: OrderedPart[], stepEnds: boolean[] = []): AgentSseEvent[] {
	const events: AgentSseEvent[] = [{ type: 'start-step' }];
	let pendingToolCallIds: string[] = [];
	for (const [index, part] of parts.entries()) {
		events.push(...partEvents(part, index));
		if (part.kind !== 'tool') continue;
		pendingToolCallIds.push(part.toolCallId);
		if (!stepEnds[index] || index === parts.length - 1) continue;
		events.push({ type: 'finish-step' }, ...toolResults(pendingToolCallIds), {
			type: 'start-step',
		});
		pendingToolCallIds = [];
	}
	events.push({ type: 'finish-step' }, ...toolResults(pendingToolCallIds));
	events.push({ type: 'done', executionId: 'exec-1' });
	return events;
}

/** One visible block of the chat: a run of text, or one "N tool calls" step list. */
export type RenderItem = { kind: 'text'; text: string } | { kind: 'tools'; toolCallIds: string[] };

/**
 * The visible blocks of display groups, in the order that AgentChatMessageList
 * renders them: the step list of a group comes before its text.
 */
export function toRenderItems(groups: DisplayGroup[]): RenderItem[] {
	return groups.flatMap((group): RenderItem[] => {
		if (group.kind === 'backgroundJobSignal') return [];
		const toolCalls = group.kind === 'toolRun' ? group.toolCalls : (group.message.toolCalls ?? []);
		const content =
			group.kind === 'toolRun' ? (group.finalMessage?.content ?? '') : group.message.content;
		const items: RenderItem[] = [];
		if (toolCalls.length > 0) {
			items.push({ kind: 'tools', toolCallIds: toolCalls.map((call) => call.toolCallId) });
		}
		if (content.trim()) items.push({ kind: 'text', text: content });
		return items;
	});
}

/**
 * What the chat shows for each assistant group. Ids, statuses and timings
 * differ between the live stream and history by design, so they are left out.
 * Text is compared without edge whitespace, which markdown does not render.
 */
export function toGroupShapes(groups: DisplayGroup[]) {
	return groups.filter(isAssistantGroup).map((group) => {
		const isRun = group.kind === 'toolRun';
		const toolCalls = isRun ? group.toolCalls : (group.message.toolCalls ?? []);
		const content = isRun ? (group.finalMessage?.content ?? '') : group.message.content;
		return {
			kind: group.kind,
			toolCallIds: toolCalls.map((call) => call.toolCallId),
			text: content.trim(),
			thinking: group.thinkingSegments.map((segment) => segment.content).join(''),
		};
	});
}
