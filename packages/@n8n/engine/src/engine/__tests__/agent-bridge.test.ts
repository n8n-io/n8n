import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { AgentBridgeService } from '../agent-bridge.service';
import type { AgentInvocation } from '../agent-bridge.service';

// Mock agent that completes immediately
function createMockAgent(result: Record<string, unknown> = {}) {
	return {
		name: 'test-agent',
		generate: vi.fn().mockResolvedValue({
			messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Hello!' }] }],
			usage: { promptTokens: 10, completionTokens: 5 },
			toolCalls: [],
			...result,
		}),
		resume: vi.fn().mockResolvedValue({
			messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Resumed!' }] }],
			usage: { promptTokens: 5, completionTokens: 3 },
			toolCalls: [],
			...result,
		}),
		getState: vi.fn().mockReturnValue({ resourceId: 'r1', threadId: 't1', status: 'idle' }),
		abort: vi.fn(),
		stream: vi.fn(),
		on: vi.fn(),
		asTool: vi.fn(),
	};
}

// Mock agent that suspends
function createSuspendingAgent() {
	return createMockAgent({
		pendingSuspend: {
			runId: 'run-123',
			toolCallId: 'tc-456',
			toolName: 'approval_tool',
			input: { question: 'Approve?' },
			suspendPayload: { message: 'Please approve this action' },
		},
	});
}

describe('AgentBridgeService', () => {
	let stateDir: string;
	let bridge: AgentBridgeService;

	beforeEach(async () => {
		stateDir = join(tmpdir(), `agent-bridge-test-${Date.now()}`);
		await mkdir(stateDir, { recursive: true });
		bridge = new AgentBridgeService(stateDir);
	});

	afterEach(async () => {
		await rm(stateDir, { recursive: true, force: true });
	});

	describe('first invocation — agent completes', () => {
		it('returns completed status with output', async () => {
			const agent = createMockAgent();
			const invocation: AgentInvocation = {
				executionId: 'exec-1',
				stepId: 'step-1',
				agent: agent as AgentInvocation['agent'],
				input: 'What is 2+2?',
			};

			const result = await bridge.invoke(invocation);

			expect(result.status).toBe('completed');
			expect(result.output).toBe('Hello!');
			expect(result.usage).toEqual({
				promptTokens: 10,
				completionTokens: 5,
				totalTokens: 15,
			});
			expect(agent.generate).toHaveBeenCalledWith('What is 2+2?');
		});

		it('cleans up state file on completion', async () => {
			const agent = createMockAgent();
			const invocation: AgentInvocation = {
				executionId: 'exec-1',
				stepId: 'step-1',
				agent: agent as AgentInvocation['agent'],
				input: 'hello',
			};

			// Pre-create a state file to verify cleanup
			await bridge.saveState('exec-1', 'step-1', { old: 'data' });
			expect(existsSync(join(stateDir, 'exec-1', 'step-1.json'))).toBe(true);

			await bridge.invoke(invocation);

			expect(existsSync(join(stateDir, 'exec-1', 'step-1.json'))).toBe(false);
		});
	});

	describe('first invocation — agent suspends', () => {
		it('returns suspended status with suspend payload', async () => {
			const agent = createSuspendingAgent();
			const invocation: AgentInvocation = {
				executionId: 'exec-2',
				stepId: 'step-2',
				agent: agent as AgentInvocation['agent'],
				input: 'Do something that needs approval',
			};

			const result = await bridge.invoke(invocation);

			expect(result.status).toBe('suspended');
			expect(result.suspendPayload).toEqual({ message: 'Please approve this action' });
			expect(result.resumeCondition).toEqual({ type: 'approval' });
			expect(result.snapshot).toEqual({
				runId: 'run-123',
				toolCallId: 'tc-456',
			});
		});

		it('saves state file on suspension', async () => {
			const agent = createSuspendingAgent();
			const invocation: AgentInvocation = {
				executionId: 'exec-2',
				stepId: 'step-2',
				agent: agent as AgentInvocation['agent'],
				input: 'Do something',
			};

			await bridge.invoke(invocation);

			const statePath = join(stateDir, 'exec-2', 'step-2.json');
			expect(existsSync(statePath)).toBe(true);

			const state = await bridge.loadState('exec-2', 'step-2');
			expect(state).toEqual({
				runId: 'run-123',
				toolCallId: 'tc-456',
			});
		});
	});

	describe('resume invocation — agent completes', () => {
		it('resumes with saved state and completes', async () => {
			const agent = createMockAgent();
			// Override resume to return a completed result
			agent.resume.mockResolvedValue({
				messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Done after resume' }] }],
				usage: { promptTokens: 5, completionTokens: 3 },
				toolCalls: [{ tool: 'approval_tool', input: {}, output: { approved: true } }],
			});

			// Pre-save state
			await bridge.saveState('exec-3', 'step-3', {
				runId: 'run-123',
				toolCallId: 'tc-456',
			});

			const invocation: AgentInvocation = {
				executionId: 'exec-3',
				stepId: 'step-3',
				agent: agent as AgentInvocation['agent'],
				input: 'original input',
				resumeState: { runId: 'run-123', toolCallId: 'tc-456' },
				resumeData: { approved: true },
			};

			const result = await bridge.invoke(invocation);

			expect(result.status).toBe('completed');
			expect(result.output).toBe('Done after resume');
			expect(agent.resume).toHaveBeenCalledWith(
				'generate',
				{ approved: true },
				{
					runId: 'run-123',
					toolCallId: 'tc-456',
				},
			);
		});

		it('cleans up state file after successful resume', async () => {
			const agent = createMockAgent();
			agent.resume.mockResolvedValue({
				messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Done' }] }],
				usage: { promptTokens: 5, completionTokens: 3 },
			});

			await bridge.saveState('exec-4', 'step-4', {
				runId: 'run-1',
				toolCallId: 'tc-1',
			});

			const invocation: AgentInvocation = {
				executionId: 'exec-4',
				stepId: 'step-4',
				agent: agent as AgentInvocation['agent'],
				input: 'original',
				resumeState: { runId: 'run-1', toolCallId: 'tc-1' },
				resumeData: { approved: true },
			};

			await bridge.invoke(invocation);

			expect(existsSync(join(stateDir, 'exec-4', 'step-4.json'))).toBe(false);
		});
	});

	describe('resume invocation — agent suspends again', () => {
		it('updates state file when agent suspends again after resume', async () => {
			const agent = createMockAgent();
			agent.resume.mockResolvedValue({
				messages: [],
				usage: { promptTokens: 5, completionTokens: 3 },
				pendingSuspend: {
					runId: 'run-new',
					toolCallId: 'tc-new',
					toolName: 'another_tool',
					input: {},
					suspendPayload: { message: 'Need more input' },
				},
			});

			await bridge.saveState('exec-5', 'step-5', {
				runId: 'run-old',
				toolCallId: 'tc-old',
			});

			const invocation: AgentInvocation = {
				executionId: 'exec-5',
				stepId: 'step-5',
				agent: agent as AgentInvocation['agent'],
				input: 'original',
				resumeState: { runId: 'run-old', toolCallId: 'tc-old' },
				resumeData: { answer: 'partial' },
			};

			const result = await bridge.invoke(invocation);

			expect(result.status).toBe('suspended');
			expect(result.snapshot).toEqual({
				runId: 'run-new',
				toolCallId: 'tc-new',
			});

			// State file should be updated with new run/toolCall IDs
			const state = (await bridge.loadState('exec-5', 'step-5')) as Record<string, unknown>;
			expect(state.runId).toBe('run-new');
			expect(state.toolCallId).toBe('tc-new');
		});
	});

	describe('state persistence', () => {
		it('saves and loads state correctly', async () => {
			const testState = { runId: 'r1', toolCallId: 'tc1', extra: { nested: true } };
			await bridge.saveState('e1', 's1', testState);

			const loaded = await bridge.loadState('e1', 's1');
			expect(loaded).toEqual(testState);
		});

		it('deletes state correctly', async () => {
			await bridge.saveState('e2', 's2', { data: true });
			expect(existsSync(join(stateDir, 'e2', 's2.json'))).toBe(true);

			await bridge.deleteState('e2', 's2');
			expect(existsSync(join(stateDir, 'e2', 's2.json'))).toBe(false);
		});

		it('deleteState does not throw for non-existent file', async () => {
			await expect(bridge.deleteState('nonexistent', 'nope')).resolves.toBeUndefined();
		});
	});
});
