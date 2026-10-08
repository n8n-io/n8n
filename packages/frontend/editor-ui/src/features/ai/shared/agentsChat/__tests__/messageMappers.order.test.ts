import fc from 'fast-check';
import {
	APPROVAL_TOOL_NAME,
	WAIT_TOOL_NAME,
	WORKFLOW_WAIT_SUSPEND_TYPE,
	type AgentPersistedMessageContentPart,
	type AgentPersistedMessageDto,
} from '@n8n/api-types';

import { buildDisplayGroups } from '../displayGroups';
import {
	applyOpenSuspensions,
	convertDbMessages,
	findTailOpenInteractive,
	findTailSteerableInteractive,
} from '../messageMappers';
import {
	READ_THEN_EDIT_TURN,
	isBlankText,
	orderedPartsArb,
	reasoning,
	text,
	toPersistedMessage,
	toRenderItems,
	tool,
	withToolIdPrefix,
	type OrderedPart,
} from './fixtures/orderedParts';

function renderHistory(parts: OrderedPart[]) {
	return toRenderItems(buildDisplayGroups(convertDbMessages([toPersistedMessage(parts)])));
}

describe('convertDbMessages — order of text and tool calls', () => {
	it('renders text → 3 tools → text → 2 tools as 4 items in that order', () => {
		expect(renderHistory(READ_THEN_EDIT_TURN)).toEqual([
			{ kind: 'text', text: "I'll read the instructions first." },
			{ kind: 'tools', toolCallIds: ['read-1', 'read-2', 'read-3'] },
			{ kind: 'text', text: 'Now I will update the two files.' },
			{ kind: 'tools', toolCallIds: ['edit-1', 'edit-2'] },
		]);
	});

	it('shows the closing text after the last tool calls', () => {
		const items = renderHistory([...READ_THEN_EDIT_TURN, text('Both files are updated.')]);

		expect(items).toHaveLength(5);
		expect(items.at(-2)).toEqual({ kind: 'tools', toolCallIds: ['edit-1', 'edit-2'] });
		expect(items.at(-1)).toEqual({ kind: 'text', text: 'Both files are updated.' });
	});

	it('maps each run of text or tool calls to its own message with a stable id', () => {
		const messages = convertDbMessages([toPersistedMessage(READ_THEN_EDIT_TURN)]);

		expect(messages.map((message) => message.id)).toEqual([
			'exec-1:assistant',
			'exec-1:assistant:segment-1',
			'exec-1:assistant:segment-2',
			'exec-1:assistant:segment-3',
		]);
		expect(messages.map((message) => message.content)).toEqual([
			"I'll read the instructions first.",
			'',
			'Now I will update the two files.',
			'',
		]);
		expect(messages.map((message) => message.toolCalls?.length ?? 0)).toEqual([0, 3, 0, 2]);
		for (const message of messages) {
			expect(message).toMatchObject({ role: 'assistant', executionId: 'exec-1' });
		}
	});

	it('keeps blank text between tool calls in one tool run', () => {
		const items = renderHistory([tool('call-1'), text('\n\n'), tool('call-2'), text('Done.')]);

		expect(items).toEqual([
			{ kind: 'tools', toolCallIds: ['call-1', 'call-2'] },
			{ kind: 'text', text: 'Done.' },
		]);
	});

	it('keeps the reasoning ids of the persisted parts and shows the reasoning once, at the end', () => {
		const messages = convertDbMessages([
			toPersistedMessage([
				reasoning('Plan.'),
				text('Reading.'),
				tool('call-1'),
				reasoning('Next.'),
			]),
		]);
		const groups = buildDisplayGroups(messages);

		expect(messages.flatMap((message) => message.thinkingSegments ?? []).map((s) => s.id)).toEqual([
			'exec-1:assistant:reasoning:0',
			'exec-1:assistant:reasoning:3',
		]);
		expect(groups.map((group) => group.kind)).toEqual(['message', 'toolRun']);
		expect(
			groups.flatMap((group) => ('thinkingSegments' in group ? group.thinkingSegments : [])),
		).toHaveLength(2);
		expect(groups[0]).toMatchObject({ kind: 'message', thinkingSegments: [] });
	});

	it('keeps the background signal on the first message only, so its card renders once', () => {
		const messages = convertDbMessages([
			toPersistedMessage(READ_THEN_EDIT_TURN, {
				backgroundTaskSignal: {
					tasks: [{ id: 'job-1', title: 'Research', kind: 'subagent', status: 'completed' }],
				},
			}),
		]);
		const groups = buildDisplayGroups(messages);

		expect(messages.filter((message) => message.backgroundJobSignal)).toHaveLength(1);
		expect(messages[0].backgroundJobSignal).toBeDefined();
		expect(groups.filter((group) => group.kind === 'backgroundJobSignal')).toHaveLength(1);
		expect(new Set(groups.map((group) => group.id)).size).toBe(groups.length);
	});

	it('renders the run error after the last message of the turn', () => {
		const messages = convertDbMessages([
			toPersistedMessage(READ_THEN_EDIT_TURN, {
				executionStatus: 'error',
				executionError: 'The model stream stalled.',
			}),
		]);

		expect(messages).toHaveLength(5);
		expect(messages.at(-1)).toMatchObject({
			id: 'exec-1:assistant:error',
			content: 'The model stream stalled.',
			status: 'error',
		});
		for (const message of messages) expect(message.status).toBe('error');
	});

	it('marks only the message with the open card as waiting, and keeps it at the tail', () => {
		// A parked run has no final status yet.
		const dbMessage = toPersistedMessage([text('I need your approval to delete it.')], {
			executionStatus: undefined,
		});
		dbMessage.content.push({
			type: 'tool-call',
			toolName: 'delete_file',
			toolCallId: 'call-approval',
			input: { path: 'a.md' },
			suspendPayload: { type: 'approval', toolName: 'delete_file', args: { path: 'a.md' } },
		});

		const messages = applyOpenSuspensions(convertDbMessages([dbMessage]), [
			{ toolCallId: 'call-approval', runId: 'run-1' },
		]);

		expect(messages).toHaveLength(2);
		expect(messages[0].status).toBeUndefined();
		expect(messages[1].status).toBe('awaitingUser');
		expect(findTailOpenInteractive(messages)).toMatchObject({
			toolCallId: 'call-approval',
			runId: 'run-1',
		});
	});

	it('does not split a user message, so each input stays one message', () => {
		const messages = convertDbMessages([
			{
				id: 'user-1',
				role: 'user',
				content: [
					{ type: 'text', text: 'Summarise this file.' },
					{ type: 'file', fileId: 'file-1', fileName: 'notes.md', mimeType: 'text/markdown' },
					{ type: 'text', text: ' Keep it short.' },
				],
			},
		]);

		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatchObject({
			id: 'user-1',
			content: 'Summarise this file. Keep it short.',
			attachments: [{ fileId: 'file-1', fileName: 'notes.md' }],
		});
	});
});

const approvalCall: AgentPersistedMessageContentPart = {
	type: 'tool-call',
	toolName: 'delete_file',
	toolCallId: 'call-card',
	input: { path: 'a.md' },
	suspendPayload: { type: 'approval', toolName: 'delete_file', args: { path: 'a.md' } },
};
const waitCall: AgentPersistedMessageContentPart = {
	type: 'tool-call',
	toolName: 'collect_feedback',
	toolCallId: 'call-card',
	input: {},
	suspendPayload: {
		type: WORKFLOW_WAIT_SUSPEND_TYPE,
		title: 'Waiting for the form',
		components: [{ type: 'button', label: 'Cancel', value: 'cancel' }],
	},
};
const readCall: AgentPersistedMessageContentPart = {
	type: 'tool-call',
	toolName: 'read_file',
	toolCallId: 'call-read',
	input: { path: 'b.md' },
	state: 'resolved',
	output: { ok: true },
};

/**
 * A run parked on a card, as a reload restores it from the open checkpoint:
 * one assistant message without an execution id or status.
 */
function parkedOutput(content: AgentPersistedMessageContentPart[]): AgentPersistedMessageDto {
	return { id: 'checkpoint-1', role: 'assistant', content };
}

function reload(dbMessages: AgentPersistedMessageDto[]) {
	return applyOpenSuspensions(convertDbMessages(dbMessages), [
		{ toolCallId: 'call-card', runId: 'run-1' },
	]);
}

describe('convertDbMessages — a card that text follows in the same output', () => {
	it.each([
		{ name: 'text → card → text', after: [{ type: 'text', text: 'Waiting for you.' }] },
		{
			name: 'text → card → text → tool',
			after: [{ type: 'text', text: 'Reading the next file.' }, readCall],
		},
	] satisfies Array<{ name: string; after: AgentPersistedMessageContentPart[] }>)(
		'finds the open approval of $name as the card of the last turn',
		({ after }) => {
			const messages = reload([
				parkedOutput([{ type: 'text', text: 'I will delete a.md.' }, approvalCall, ...after]),
			]);

			expect(messages.length).toBeGreaterThan(2);
			expect(messages[1].status).toBe('awaitingUser');
			for (const segment of messages.slice(1)) expect(segment.segmentOf).toBe('checkpoint-1');
			const expected = { toolName: APPROVAL_TOOL_NAME, toolCallId: 'call-card', runId: 'run-1' };
			expect(findTailOpenInteractive(messages)).toMatchObject(expected);
			expect(findTailSteerableInteractive(messages)).toMatchObject(expected);
		},
	);

	it('finds the card of a recorded turn whose text comes after it', () => {
		const messages = reload([
			toPersistedMessage([], {
				executionStatus: undefined,
				content: [
					{ type: 'text', text: 'I will delete a.md.' },
					approvalCall,
					{ type: 'text', text: 'Waiting for you.' },
				],
			}),
		]);

		expect(messages.map((message) => message.id)).toEqual([
			'exec-1:assistant',
			'exec-1:assistant:segment-1',
			'exec-1:assistant:segment-2',
		]);
		expect(findTailOpenInteractive(messages)).toMatchObject({ toolCallId: 'call-card' });
	});

	it('finds a waiting card, but never offers it to steering', () => {
		const messages = reload([
			parkedOutput([
				{ type: 'text', text: 'I started the form workflow.' },
				waitCall,
				{ type: 'text', text: 'It waits for the form.' },
			]),
		]);

		expect(findTailOpenInteractive(messages)).toMatchObject({
			toolName: WAIT_TOOL_NAME,
			runId: 'run-1',
		});
		expect(findTailSteerableInteractive(messages)).toBeUndefined();
	});

	it.each([
		{ name: 'a user message', next: { id: 'user-2', role: 'user', content: [] } },
		{ name: 'a later output', next: { id: 'exec-2:assistant', role: 'assistant', content: [] } },
	] satisfies Array<{ name: string; next: AgentPersistedMessageDto }>)(
		'leaves the card to history once $name follows the output',
		({ next }) => {
			const card = parkedOutput([
				{ type: 'text', text: 'I will delete a.md.' },
				approvalCall,
				{ type: 'text', text: 'Waiting for you.' },
			]);
			const messages = reload([card, { ...next, content: [{ type: 'text', text: 'Go on.' }] }]);

			expect(findTailOpenInteractive(messages)).toBeUndefined();
			expect(findTailSteerableInteractive(messages)).toBeUndefined();
		},
	);

	it('finds the open approval wherever it sits in the last output', () => {
		fc.assert(
			fc.property(orderedPartsArb, orderedPartsArb, (before, after) => {
				const content = [
					...toPersistedMessage(withToolIdPrefix(before, 'before-')).content,
					approvalCall,
					...toPersistedMessage(withToolIdPrefix(after, 'after-')).content,
				];
				const messages = reload([parkedOutput(content)]);

				expect(findTailOpenInteractive(messages)).toMatchObject({
					toolCallId: 'call-card',
					runId: 'run-1',
				});
			}),
		);
	});
});

/** Maximal runs of visible output in the persisted parts. */
function expectedKinds(parts: OrderedPart[]): Array<'text' | 'tools'> {
	const kinds: Array<'text' | 'tools'> = [];
	for (const part of parts) {
		if (part.kind === 'reasoning' || isBlankText(part)) continue;
		const kind = part.kind === 'tool' ? 'tools' : 'text';
		if (kinds.at(-1) !== kind) kinds.push(kind);
	}
	return kinds;
}

const withoutSpace = (value: string) => value.replace(/\s/g, '');

describe('convertDbMessages — order properties', () => {
	it('keeps the order of text parts', () => {
		fc.assert(
			fc.property(orderedPartsArb, (parts) => {
				const rendered = renderHistory(parts).flatMap((item) =>
					item.kind === 'text' ? [item.text] : [],
				);
				const persisted = parts.flatMap((part) => (part.kind === 'text' ? [part.text] : []));
				expect(withoutSpace(rendered.join(''))).toBe(withoutSpace(persisted.join('')));
			}),
		);
	});

	it('keeps the relative order of tool calls and shows each call once', () => {
		fc.assert(
			fc.property(orderedPartsArb, (parts) => {
				const rendered = renderHistory(parts).flatMap((item) =>
					item.kind === 'tools' ? item.toolCallIds : [],
				);
				const persisted = parts.flatMap((part) => (part.kind === 'tool' ? [part.toolCallId] : []));
				expect(rendered).toEqual(persisted);
			}),
		);
	});

	it('groups adjacent tool calls, and text between tool calls splits the group', () => {
		fc.assert(
			fc.property(orderedPartsArb, (parts) => {
				const items = renderHistory(parts);
				expect(items.map((item) => item.kind)).toEqual(expectedKinds(parts));

				const groupOf = new Map<string, number>();
				for (const [index, item] of items.entries()) {
					if (item.kind === 'tools') for (const id of item.toolCallIds) groupOf.set(id, index);
				}
				let previousTool: string | undefined;
				let textSincePreviousTool = false;
				for (const part of parts) {
					if (part.kind === 'text' && !isBlankText(part)) textSincePreviousTool = true;
					if (part.kind !== 'tool') continue;
					if (previousTool !== undefined) {
						const sameGroup = groupOf.get(previousTool) === groupOf.get(part.toolCallId);
						expect(sameGroup).toBe(!textSincePreviousTool);
					}
					previousTool = part.toolCallId;
					textSincePreviousTool = false;
				}
			}),
		);
	});
});
