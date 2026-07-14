import { PREVIEW_CONTEXT_OPEN_TAG } from '../../agents/builder/format-preview-context';
import type { AgentExecutionThread } from '../../agents/entities/agent-execution-thread.entity';
import type { AgentExecution } from '../../agents/entities/agent-execution.entity';
import { resolveAgentPreviewHandoff } from '../agent-preview-handoff';
import { AGENT_PREVIEW_CONTEXT_OPEN_TAG } from '../internal-messages';

function makeThread(overrides: Partial<AgentExecutionThread> = {}): AgentExecutionThread {
	return {
		id: 'preview-thread-1',
		title: 'Support triage test',
		sessionNumber: 3,
		...overrides,
	} as AgentExecutionThread;
}

function makeExecution(overrides: Partial<AgentExecution> = {}): AgentExecution {
	return {
		id: 'exec-1',
		threadId: 'preview-thread-1',
		status: 'success',
		userMessage: 'Hello agent',
		model: 'gpt-test',
		duration: 1200,
		totalTokens: 42,
		error: null,
		timeline: [],
		...overrides,
	} as AgentExecution;
}

const handoff = {
	source: 'agent-preview' as const,
	agentId: 'agent-1',
	threadId: 'preview-thread-1',
};

describe('resolveAgentPreviewHandoff', () => {
	it('builds an agent-preview context block with the formatted transcript', async () => {
		const getThreadDetail = vi.fn().mockResolvedValue({
			thread: makeThread(),
			executions: [makeExecution()],
		});

		const result = await resolveAgentPreviewHandoff(handoff, {
			projectId: 'project-1',
			getThreadDetail,
		});

		expect(getThreadDetail).toHaveBeenCalledWith('preview-thread-1', 'project-1', 'agent-1');
		expect(result.titleFallback).toBe('Support triage test');
		expect(result.target).toEqual({ agentId: 'agent-1', projectId: 'project-1' });
		expect(result.block.startsWith(AGENT_PREVIEW_CONTEXT_OPEN_TAG)).toBe(true);
		expect(result.block).toContain(PREVIEW_CONTEXT_OPEN_TAG);
		expect(result.block).toContain('"source":"agent-preview"');
		expect(result.block).toContain('"agentId":"agent-1"');
		expect(result.block).toContain('User: Hello agent');
		expect(result.block).toContain('call `build-agent`');
	});

	it('uses Session #N as titleFallback when the preview session is untitled', async () => {
		const result = await resolveAgentPreviewHandoff(handoff, {
			projectId: 'project-1',
			getThreadDetail: vi.fn().mockResolvedValue({
				thread: makeThread({ title: null, sessionNumber: 7 }),
				executions: [makeExecution()],
			}),
		});

		expect(result.titleFallback).toBe('Session #7');
		expect(result.target).toEqual({ agentId: 'agent-1', projectId: 'project-1' });
	});

	it('uses Session #N as titleFallback when the preview session title is blank', async () => {
		const result = await resolveAgentPreviewHandoff(handoff, {
			projectId: 'project-1',
			getThreadDetail: vi.fn().mockResolvedValue({
				thread: makeThread({ title: '   ', sessionNumber: 2 }),
				executions: [makeExecution()],
			}),
		});

		expect(result.titleFallback).toBe('Session #2');
	});

	it('throws when the preview session is missing', async () => {
		await expect(
			resolveAgentPreviewHandoff(handoff, {
				projectId: 'project-1',
				getThreadDetail: vi.fn().mockResolvedValue(null),
			}),
		).rejects.toThrow('Preview session not found');
	});

	it('throws when the executionId is not in the thread', async () => {
		await expect(
			resolveAgentPreviewHandoff(
				{ ...handoff, executionId: 'missing' },
				{
					projectId: 'project-1',
					getThreadDetail: vi.fn().mockResolvedValue({
						thread: makeThread(),
						executions: [makeExecution()],
					}),
				},
			),
		).rejects.toThrow('Preview session turn not found');
	});
});
