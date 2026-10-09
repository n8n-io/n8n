import type { SerializableAgentState } from '@n8n/agents';
import type { AgentPersistedMessageContentPart, AgentPersistedMessageDto } from '@n8n/api-types';
import { randomUUID } from 'node:crypto';

import { withOpenSuspensions } from '../utils/messages-envelope';

// Some models count their tool call ids from 1 in each response, so one id can name several
// calls of the same tool in a thread. Only the call that waits may show as open.
const REUSED_ID = 'toolu_1';
const TOOL = 'executions';

type Part = AgentPersistedMessageContentPart;

const settledRun = (output: unknown): Part => ({
	type: 'tool-call',
	toolName: TOOL,
	toolCallId: REUSED_ID,
	input: { action: 'run' },
	state: 'resolved',
	output,
});

const waitingRun = (input: Record<string, unknown> = { action: 'run' }): Part => ({
	type: 'tool-call',
	toolName: TOOL,
	toolCallId: REUSED_ID,
	input,
	state: 'pending',
});

const rejectedRun: Part = { ...waitingRun(), state: 'rejected', error: 'INTERRUPTED' };

const message = (id: string, ...content: Part[]): AgentPersistedMessageDto => ({
	id,
	role: id.includes('user') ? 'user' : 'assistant',
	content,
});

const userMessage = (id: string): AgentPersistedMessageDto => ({
	id,
	role: 'user',
	content: [{ type: 'text', text: id }],
});

function checkpointOf(messages: AgentPersistedMessageDto[], toolName = TOOL) {
	return {
		status: 'suspended',
		pendingToolCalls: {
			[REUSED_ID]: { toolCallId: REUSED_ID, toolName, runId: 'run-open', suspended: true },
		},
		messageList: { messages },
	} as unknown as SerializableAgentState;
}

const ids = (messages: AgentPersistedMessageDto[]) => messages.map(({ id }) => id);

describe('withOpenSuspensions with a tool call id that repeats for the same tool', () => {
	it('adds the waiting call when the memory holds only the earlier settled call', () => {
		const history = [userMessage('m-user-1'), message('m-asst-1', settledRun('first'))];
		const checkpoint = checkpointOf([
			...structuredClone(history),
			userMessage('m-user-2'),
			message('m-asst-2', waitingRun()),
		]);

		const result = withOpenSuspensions(history, checkpoint);

		expect(ids(result.messages)).toEqual(['m-user-1', 'm-asst-1', 'm-user-2', 'm-asst-2']);
		expect(result.messages[1].content).toEqual([settledRun('first')]);
		expect(result.messages[3].content).toEqual([waitingRun()]);
		expect(result.openSuspensions).toEqual([{ toolCallId: REUSED_ID, runId: 'run-open' }]);
	});

	it('adds the waiting call when the execution history holds only the earlier settled call', () => {
		const history = [message('e1:assistant', settledRun('first'))];
		const checkpoint = checkpointOf([
			message('sdk-1', settledRun('first')),
			message('sdk-2', waitingRun()),
		]);

		const result = withOpenSuspensions(history, checkpoint, {
			appendInactiveCheckpointMessages: false,
		});

		expect(ids(result.messages)).toEqual(['e1:assistant', 'sdk-2']);
		expect(result.messages[0].content).toEqual([settledRun('first')]);
		expect(result.messages[1].content).toEqual([waitingRun()]);
	});

	it('does not open the call again when the history holds its answer', () => {
		// The answer is recorded, but the checkpoint is not removed yet.
		const history = [
			message('e1:assistant', settledRun('first')),
			message('e2:assistant', settledRun('second')),
		];
		const checkpoint = checkpointOf([
			userMessage('sdk-user-1'),
			message('sdk-1', settledRun('first')),
			userMessage('sdk-user-2'),
			message('sdk-2', waitingRun()),
		]);

		const result = withOpenSuspensions(history, checkpoint);

		expect(ids(result.messages)).toEqual(['e1:assistant', 'e2:assistant']);
		expect(result.messages[1].content).toEqual([settledRun('second')]);
	});

	it('does not open the call again when the memory holds its answer', () => {
		const history = [
			message('m-asst-1', settledRun('first')),
			message('m-asst-2', settledRun('second')),
		];
		const checkpoint = checkpointOf([
			message('m-asst-1', settledRun('first')),
			message('m-asst-2', waitingRun()),
		]);

		const result = withOpenSuspensions(history, checkpoint);

		expect(result.messages).toEqual(history);
	});

	it('fills in the waiting call that the history holds after the earlier settled call', () => {
		const history = [
			message('e1:assistant', settledRun('first')),
			message('e2:assistant', { ...waitingRun(), state: undefined }),
		];
		const checkpoint = checkpointOf([
			message('sdk-1', settledRun('first')),
			message('sdk-2', waitingRun()),
		]);

		const result = withOpenSuspensions(history, checkpoint);

		expect(ids(result.messages)).toEqual(['e1:assistant', 'e2:assistant']);
		expect(result.messages[1].content).toEqual([waitingRun()]);
	});
});

describe('withOpenSuspensions with an earlier call that never got its result', () => {
	it('cancels a stopped card with the id and tool of the waiting card in the execution history', () => {
		const history = [
			message('stopped:assistant', waitingRun({ workflowId: 'wf-A' })),
			message('proposed:assistant', waitingRun({ workflowId: 'wf-B' })),
		];
		const checkpoint = checkpointOf([
			message('sdk-stopped', { ...rejectedRun, input: { workflowId: 'wf-A' } }),
			message('sdk-proposed', waitingRun({ workflowId: 'wf-B' })),
		]);

		const result = withOpenSuspensions(history, checkpoint, {
			appendInactiveCheckpointMessages: false,
		});

		expect(ids(result.messages)).toEqual(['stopped:assistant', 'proposed:assistant']);
		expect(result.messages[0].content).toEqual([
			{ ...waitingRun({ workflowId: 'wf-A' }), canceled: true },
		]);
		expect(result.messages[1].content).toEqual([waitingRun({ workflowId: 'wf-B' })]);
	});

	it('cancels a stopped card in the memory and adds the waiting card that the memory does not hold yet', () => {
		const history = [message('m-asst-1', waitingRun({ workflowId: 'wf-A' }))];
		// The run settles the stopped call when it loads the memory.
		const checkpoint = checkpointOf([
			message('m-asst-1', { ...rejectedRun, input: { workflowId: 'wf-A' } }),
			userMessage('m-user-2'),
			message('m-asst-2', waitingRun({ workflowId: 'wf-B' })),
		]);

		const result = withOpenSuspensions(history, checkpoint);

		expect(ids(result.messages)).toEqual(['m-asst-1', 'm-user-2', 'm-asst-2']);
		expect(result.messages[0].content).toEqual([
			{ ...waitingRun({ workflowId: 'wf-A' }), canceled: true },
		]);
		expect(result.messages[2].content).toEqual([waitingRun({ workflowId: 'wf-B' })]);
	});

	it('cancels an open call of another tool with the open id and leaves its settled calls as they were', () => {
		const interrupted: Part = {
			type: 'tool-call',
			toolName: 'build-workflow',
			toolCallId: REUSED_ID,
			input: { name: 'Digest' },
		};
		const otherCall: Part = { ...interrupted, toolCallId: 'toolu_2' };
		const history = [
			message('e1:assistant', interrupted, otherCall),
			message('e2:assistant', settledRun('first')),
			message('e3:assistant', { ...waitingRun(), state: undefined }),
		];
		const checkpoint = checkpointOf([
			message('sdk-1', { ...interrupted, state: 'rejected', error: 'INTERRUPTED' }, otherCall),
			message('sdk-2', settledRun('first')),
			message('sdk-3', waitingRun()),
		]);

		const result = withOpenSuspensions(history, checkpoint);

		expect(result.messages[0].content).toEqual([{ ...interrupted, canceled: true }, otherCall]);
		expect(result.messages[1].content).toEqual([settledRun('first')]);
		expect(result.messages[2].content).toEqual([waitingRun()]);
	});

	it('replaces the stored copy of the waiting message that lacks the call, not an older open call', () => {
		// The memory holds an old stopped call that the checkpoint window does not hold, and the
		// message of the waiting call without the call.
		const history = [
			message('m-old', waitingRun({ workflowId: 'wf-A' })),
			{ id: 'm-asst-2', role: 'assistant', content: [{ type: 'text', text: 'Proposing' }] },
		];
		const checkpoint = checkpointOf([message('m-asst-2', waitingRun({ workflowId: 'wf-B' }))]);

		const result = withOpenSuspensions(history, checkpoint);

		expect(ids(result.messages)).toEqual(['m-old', 'm-asst-2']);
		expect(result.messages[0].content).toEqual([
			{ ...waitingRun({ workflowId: 'wf-A' }), canceled: true },
		]);
		expect(result.messages[1].content).toEqual([waitingRun({ workflowId: 'wf-B' })]);
	});

	it('leaves the history as it was when no call is open', () => {
		const history = [message('e1:assistant', waitingRun())];

		expect(withOpenSuspensions(history, null).messages).toEqual(history);
	});
});

describe('withOpenSuspensions and the raw checkpoint values', () => {
	it('keeps the complete recorded input when it is the input of the checkpoint call', () => {
		const apiKey = randomUUID();
		// Deeper than the redaction walks: the redaction withholds the object at this depth.
		const deep = { l1: { l2: { l3: { l4: { l5: { l6: { l7: { value: 'kept' } } } } } } } };
		const history = [
			message('e1:assistant', {
				...waitingRun({ apiKey: '[REDACTED]', action: 'run', deep }),
				state: undefined,
			}),
		];
		const checkpoint = checkpointOf([
			message('sdk-1', waitingRun({ apiKey, action: 'run', deep: structuredClone(deep) })),
		]);

		const result = withOpenSuspensions(history, checkpoint);

		expect(result.messages[0].content).toEqual([
			waitingRun({ apiKey: '[REDACTED]', action: 'run', deep }),
		]);
		expect(JSON.stringify(result)).not.toContain(apiKey);
	});

	it('shows the checkpoint input when the persisted open call is an earlier call with another input', () => {
		const apiKey = randomUUID();
		// The user stopped the card for "A". The history does not hold the card for "B" yet.
		const history = [
			message('stopped:assistant', { ...waitingRun({ workflowId: 'A' }), state: undefined }),
		];
		const checkpoint = checkpointOf([
			message('sdk-stopped', { ...rejectedRun, input: { workflowId: 'A' } }),
			message('sdk-proposed', waitingRun({ workflowId: 'B', apiKey })),
		]);

		const result = withOpenSuspensions(history, checkpoint, {
			appendInactiveCheckpointMessages: false,
		});

		const openParts = result.messages
			.flatMap(({ content }) => content)
			.filter((part) => part.toolCallId === REUSED_ID && part.canceled !== true);
		expect(openParts).toEqual([waitingRun({ workflowId: 'B', apiKey: '[REDACTED]' })]);
		expect(result.openSuspensions).toEqual([{ toolCallId: REUSED_ID, runId: 'run-open' }]);
		expect(JSON.stringify(result)).not.toContain(apiKey);
	});

	describe('shows the checkpoint input when the inputs differ only in withheld values', () => {
		// The user stopped the card for "A". The checkpoint waits on the card for "B" with the
		// same id and tool, and the history does not hold that card yet.
		function openInputFor(recordedA: Record<string, unknown>, rawA: unknown, rawB: unknown) {
			const history = [
				message('stopped:assistant', { ...waitingRun(recordedA), state: undefined }),
			];
			const checkpoint = checkpointOf([
				message('sdk-stopped', { ...rejectedRun, input: rawA }),
				message('sdk-proposed', waitingRun(rawB as Record<string, unknown>)),
			]);
			const result = withOpenSuspensions(history, checkpoint, {
				appendInactiveCheckpointMessages: false,
			});
			const open = result.messages
				.flatMap(({ content }) => content)
				.filter((part) => part.toolCallId === REUSED_ID && part.canceled !== true);
			expect(open).toHaveLength(1);
			return { input: open[0].input, response: JSON.stringify(result) };
		}

		const deepInput = (value: string) => ({
			deep: { l1: { l2: { l3: { l4: { l5: { l6: { l7: { value } } } } } } } },
		});

		it('for a value deeper than the redaction walks', () => {
			const { input, response } = openInputFor(
				deepInput('value-of-A'),
				deepInput('value-of-A'),
				deepInput('value-of-B'),
			);

			expect(input).toHaveProperty('deep');
			expect(response).not.toContain('value-of-A');
		});

		it('for secret-shaped text that the memory holds raw', () => {
			const tokenOf = () => `sk-${randomUUID().replaceAll('-', '')}`;
			const tokenA = tokenOf();
			const tokenB = tokenOf();

			const { input, response } = openInputFor(
				{ note: `use ${tokenA}` },
				{ note: `use ${tokenA}` },
				{ note: `use ${tokenB}` },
			);

			expect(input).toEqual({ note: expect.stringMatching(/^use /) });
			expect(response).not.toContain(tokenA);
			expect(response).not.toContain(tokenB);
		});

		it('keeps the recorded input when it is the sanitised form of the checkpoint input', () => {
			const token = `sk-${randomUUID().replaceAll('-', '')}`;
			const deep = deepInput('kept');
			const history = [
				message('e1:assistant', {
					...waitingRun({ note: 'use [REDACTED]', ...deep }),
					state: undefined,
				}),
			];
			const checkpoint = checkpointOf([
				message('sdk-1', waitingRun({ note: `use ${token}`, ...structuredClone(deep) })),
			]);

			const result = withOpenSuspensions(history, checkpoint);

			expect(result.messages[0].content).toEqual([waitingRun({ note: 'use [REDACTED]', ...deep })]);
			expect(JSON.stringify(result)).not.toContain(token);
		});
	});

	it('replaces sensitive values in the checkpoint input when the recorded call has no input', () => {
		const apiKey = randomUUID();
		const history = [
			message('e1:assistant', { ...waitingRun(), input: undefined, state: undefined }),
		];
		const checkpoint = checkpointOf([message('sdk-1', waitingRun({ apiKey, action: 'run' }))]);

		const result = withOpenSuspensions(history, checkpoint);

		expect(result.messages[0].content).toEqual([
			waitingRun({ apiKey: '[REDACTED]', action: 'run' }),
		]);
		expect(JSON.stringify(result)).not.toContain(apiKey);
	});

	it('replaces sensitive values in the checkpoint messages that the history does not hold yet', () => {
		const apiKey = randomUUID();
		const password = randomUUID();
		const checkpoint = checkpointOf([
			message('sdk-1', { ...settledRun({ password, rows: 2 }) }),
			message('sdk-2', waitingRun({ apiKey, action: 'run' })),
		]);

		const result = withOpenSuspensions([], checkpoint);

		expect(result.messages[0].content).toEqual([settledRun({ password: '[REDACTED]', rows: 2 })]);
		expect(result.messages[1].content).toEqual([
			waitingRun({ apiKey: '[REDACTED]', action: 'run' }),
		]);
		expect(JSON.stringify(result)).not.toContain(apiKey);
		expect(JSON.stringify(result)).not.toContain(password);
	});

	it('does not change the checkpoint state that it reads', () => {
		const apiKey = randomUUID();
		const checkpoint = checkpointOf([message('sdk-1', waitingRun({ apiKey }))]);

		withOpenSuspensions([], checkpoint);

		expect(JSON.stringify(checkpoint)).toContain(apiKey);
	});
});
