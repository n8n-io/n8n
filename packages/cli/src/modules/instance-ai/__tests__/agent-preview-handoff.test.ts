import type { AgentExecutionThread } from '../../agents/entities/agent-execution-thread.entity';
import type { AgentExecution } from '../../agents/entities/agent-execution.entity';
import { resolveAgentPreviewHandoff } from '../agent-preview-handoff';
import {
	AGENT_PREVIEW_CONTEXT_OPEN_TAG,
	AGENT_PREVIEW_CONTEXT_CLOSE_TAG,
} from '../internal-messages';

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
	it('builds a reference-only agent-preview context block (no transcript)', async () => {
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
		expect(result.block.endsWith(AGENT_PREVIEW_CONTEXT_CLOSE_TAG)).toBe(true);
		expect(result.block).toContain('"source":"agent-preview"');
		expect(result.block).toContain('"agentId":"agent-1"');
		// The orchestrator must read the transcript on demand via get-session.
		expect(result.block).toContain('`get-session`');
		// Review/analysis must not auto-route to build-agent.
		expect(result.block).toContain('do NOT modify the agent');
		// The transcript itself is NOT injected upfront.
		expect(result.block).not.toContain('User: Hello agent');
	});

	it('round-trips carried agentName/agentIcon/sessionTitle through the reference JSON', async () => {
		const result = await resolveAgentPreviewHandoff(
			{ ...handoff, agentName: 'SEO Auditor', agentIcon: 'search', sessionTitle: 'Help with tone' },
			{
				projectId: 'project-1',
				getThreadDetail: vi.fn().mockResolvedValue({
					thread: makeThread(),
					executions: [makeExecution()],
				}),
			},
		);

		expect(result.block).toContain('"agentName":"SEO Auditor"');
		expect(result.block).toContain('"agentIcon":"search"');
		expect(result.block).toContain('"sessionTitle":"Help with tone"');
	});

	it('omits agentName/sessionTitle from the reference JSON when not provided', async () => {
		const result = await resolveAgentPreviewHandoff(handoff, {
			projectId: 'project-1',
			getThreadDetail: vi.fn().mockResolvedValue({
				thread: makeThread(),
				executions: [makeExecution()],
			}),
		});

		expect(result.block).not.toContain('agentName');
		expect(result.block).not.toContain('sessionTitle');
		expect(result.block).not.toContain('agentIcon');
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
});
