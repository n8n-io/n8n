import type { MockedFunction } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/utils/eval-agents', () => ({ createEvalAgent: vi.fn() }));

import { createEvalAgent } from '../../src/utils/eval-agents';
import { createAgentUserProxy, type AgentUserContext } from '../utils/user-proxy/agent-user';

const mockCreateEvalAgent = createEvalAgent as MockedFunction<typeof createEvalAgent>;

function answering(generate: () => Promise<unknown>): void {
	const structuredOutput = vi.fn().mockReturnValue({ generate });
	mockCreateEvalAgent.mockReturnValue({ structuredOutput } as unknown as ReturnType<
		typeof createEvalAgent
	>);
}

const context: AgentUserContext = {
	goal: 'Get the order sent express',
	dataSetup: 'Order #123 ships tomorrow.',
	transcript: [],
	earlierSessions: [],
};

describe('createAgentUserProxy', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns the next message the simulated user writes', async () => {
		answering(async () => ({
			structuredOutput: { action: 'send_message', message: '  Make it express  ' },
		}));

		expect(await createAgentUserProxy().nextMessage(context)).toEqual({
			kind: 'message',
			message: 'Make it express',
		});
	});

	it('returns done when the simulated user declares done', async () => {
		answering(async () => ({ structuredOutput: { action: 'declare_done' } }));

		expect(await createAgentUserProxy().nextMessage(context)).toEqual({ kind: 'done' });
	});

	it('returns an error, not done, when the model call rejects', async () => {
		answering(async () => await Promise.reject(new Error('rate limited')));

		expect(await createAgentUserProxy().nextMessage(context)).toEqual({
			kind: 'error',
			error: expect.stringContaining('rate limited'),
		});
	});

	it('returns an error when the model gives no usable decision', async () => {
		answering(async () => ({ structuredOutput: { action: 'send_message' } }));

		expect(await createAgentUserProxy().nextMessage(context)).toMatchObject({ kind: 'error' });
	});

	it('returns an error for an empty message', async () => {
		answering(async () => ({ structuredOutput: { action: 'send_message', message: '   ' } }));

		expect(await createAgentUserProxy().nextMessage(context)).toMatchObject({ kind: 'error' });
	});
});
