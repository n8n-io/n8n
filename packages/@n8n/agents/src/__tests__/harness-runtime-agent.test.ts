import type { HarnessV1SandboxProvider } from '@ai-sdk/harness';
import type {
	HarnessAgentAdapter,
	HarnessAgentContinueTurnState,
	HarnessAgentResumeSessionState,
} from '@ai-sdk/harness/agent';
import type { TextStreamPart, ToolSet } from 'ai';

import { HarnessRuntimeAgent } from '../harness/harness-runtime-agent';
import type { HarnessSessionClaim, HarnessSessionStore } from '../harness/session-store';

const harness = vi.hoisted(() => ({
	createSession: vi.fn(),
	continueStream: vi.fn(),
	stream: vi.fn(),
}));

vi.mock('@ai-sdk/harness/agent', () => ({
	HarnessAgent: class {
		createSession = harness.createSession;
		continueStream = harness.continueStream;
		stream = harness.stream;
	},
}));

function streamOf(
	...parts: Array<TextStreamPart<ToolSet>>
): ReadableStream<TextStreamPart<ToolSet>> {
	return new ReadableStream({
		start(controller) {
			for (const part of parts) controller.enqueue(part);
			controller.close();
		},
	});
}

async function readAll<T>(stream: ReadableStream<T>): Promise<T[]> {
	const result: T[] = [];
	for await (const value of stream) result.push(value);
	return result;
}

const continueFrom = {
	type: 'continue-turn',
	specificationVersion: 'harness-v1',
	harnessId: 'claude-code',
	data: {},
} as HarnessAgentContinueTurnState;

const resumeFrom = {
	type: 'resume-session',
	specificationVersion: 'harness-v1',
	harnessId: 'claude-code',
	data: {},
} as HarnessAgentResumeSessionState;

function makeClaim(state: HarnessSessionClaim['state'] = { sessionId: 'sandbox-1', continueFrom }) {
	return {
		state,
		fence: { ownershipEpoch: 1, claimToken: 'claim-1' },
		abortSignal: new AbortController().signal,
		renew: vi.fn().mockResolvedValue(undefined),
		save: vi.fn().mockResolvedValue(undefined),
		clear: vi.fn().mockResolvedValue(undefined),
		release: vi.fn().mockResolvedValue(undefined),
	};
}

describe('HarnessRuntimeAgent', () => {
	beforeEach(() => vi.clearAllMocks());

	it('continues a suspended turn and then submits the fresh user prompt', async () => {
		const claim = makeClaim();
		const session = {
			sessionId: 'sandbox-1',
			hasUnfinishedTurn: vi.fn(() => false),
			detach: vi.fn().mockResolvedValue(resumeFrom),
			stop: vi.fn().mockResolvedValue(resumeFrom),
			suspendTurn: vi.fn().mockResolvedValue(continueFrom),
			destroy: vi.fn().mockResolvedValue(undefined),
		};
		harness.createSession.mockResolvedValue(session);
		harness.continueStream.mockResolvedValue({
			stream: streamOf(
				{ type: 'text-delta', id: 'old', text: 'previous' } as TextStreamPart<ToolSet>,
				{ type: 'finish', finishReason: 'stop' } as TextStreamPart<ToolSet>,
			),
		});
		harness.stream.mockResolvedValue({
			stream: streamOf(
				{ type: 'text-delta', id: 'new', text: 'fresh' } as TextStreamPart<ToolSet>,
				{ type: 'finish', finishReason: 'stop' } as TextStreamPart<ToolSet>,
			),
		});
		const sessionStore: HarnessSessionStore = { claim: vi.fn().mockResolvedValue(claim) };
		const agent = new HarnessRuntimeAgent({
			name: 'Harness agent',
			model: 'anthropic/claude-sonnet-4-6',
			instructions: 'Help the user',
			projectId: 'project-1',
			agentId: 'agent-1',
			runtimeIdentity: 'identity-1',
			adapter: 'claude-code',
			harness: {} as HarnessAgentAdapter,
			createSandboxProvider: () => ({}) as HarnessV1SandboxProvider,
			sessionStore,
			sessionEndMode: 'stop',
		});

		const result = await agent.stream('new request', {
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		});
		const chunks = await readAll(result.stream);

		expect(harness.continueStream).toHaveBeenCalledOnce();
		expect(harness.stream).toHaveBeenCalledWith(
			expect.objectContaining({ session, prompt: 'new request' }),
		);
		expect(harness.continueStream.mock.invocationCallOrder[0]).toBeLessThan(
			harness.stream.mock.invocationCallOrder[0],
		);
		expect(chunks.filter((chunk) => chunk.type === 'finish')).toHaveLength(1);
		expect(session.stop).toHaveBeenCalledOnce();
		expect(session.detach).not.toHaveBeenCalled();
		expect(claim.save).toHaveBeenCalledWith({ sessionId: 'sandbox-1', resumeFrom });
	});

	it('preserves continuation state and rejects the prompt if the previous turn stays unfinished', async () => {
		const claim = makeClaim();
		const session = {
			sessionId: 'sandbox-1',
			hasUnfinishedTurn: vi.fn(() => true),
			detach: vi.fn(),
			suspendTurn: vi.fn().mockResolvedValue(continueFrom),
			destroy: vi.fn().mockResolvedValue(undefined),
		};
		harness.createSession.mockResolvedValue(session);
		harness.continueStream.mockResolvedValue({ stream: streamOf() });
		const agent = new HarnessRuntimeAgent({
			name: 'Harness agent',
			model: 'anthropic/claude-sonnet-4-6',
			instructions: 'Help the user',
			projectId: 'project-1',
			agentId: 'agent-1',
			runtimeIdentity: 'identity-1',
			adapter: 'claude-code',
			harness: {} as HarnessAgentAdapter,
			createSandboxProvider: () => ({}) as HarnessV1SandboxProvider,
			sessionStore: { claim: vi.fn().mockResolvedValue(claim) },
		});

		const result = await agent.stream('new request', {
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		});
		await expect(readAll(result.stream)).rejects.toThrow('previous agent turn is still finishing');
		expect(harness.stream).not.toHaveBeenCalled();
		expect(claim.save).toHaveBeenCalledWith({ sessionId: 'sandbox-1', continueFrom });
	});

	it('destroys an aborted session and persists a visible reset boundary', async () => {
		const claim = makeClaim({ sessionId: 'sandbox-1' });
		const session = {
			sessionId: 'sandbox-1',
			hasUnfinishedTurn: vi.fn(() => false),
			detach: vi.fn().mockResolvedValue(resumeFrom),
			suspendTurn: vi.fn().mockResolvedValue(continueFrom),
			destroy: vi.fn().mockResolvedValue(undefined),
		};
		harness.createSession.mockResolvedValue(session);
		harness.stream.mockResolvedValue({ stream: streamOf() });
		const abortController = new AbortController();
		const agent = new HarnessRuntimeAgent({
			name: 'Harness agent',
			model: 'anthropic/claude-sonnet-4-6',
			instructions: 'Help the user',
			projectId: 'project-1',
			agentId: 'agent-1',
			runtimeIdentity: 'identity-1',
			adapter: 'claude-code',
			harness: {} as HarnessAgentAdapter,
			createSandboxProvider: () => ({}) as HarnessV1SandboxProvider,
			sessionStore: { claim: vi.fn().mockResolvedValue(claim) },
		});

		const result = await agent.stream('new request', {
			persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
			abortSignal: abortController.signal,
		});
		abortController.abort();
		await readAll(result.stream);

		expect(session.destroy).toHaveBeenCalledOnce();
		expect(claim.save).toHaveBeenCalledWith({
			sessionId: 'sandbox-1',
			resetReason: 'aborted',
		});
	});
});
