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

	it('leaves the history as it was when no call is open', () => {
		const history = [message('e1:assistant', waitingRun())];

		expect(withOpenSuspensions(history, null).messages).toEqual(history);
	});
});

describe('withOpenSuspensions and the raw checkpoint values', () => {
	it('keeps the recorded input of the waiting call in place of the raw checkpoint input', () => {
		const apiKey = randomUUID();
		const history = [
			message('e1:assistant', {
				...waitingRun({ apiKey: '[REDACTED]', action: 'run' }),
				state: undefined,
			}),
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
