import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext, OrchestrationContext } from '../../../types';
import { createGetSessionTool } from '../get-session.tool';

interface GetSessionOutput {
	ok: boolean;
	title?: string;
	sessionNumber?: number;
	transcript?: string;
	error?: string;
}

function makeContext(
	overrides: {
		agentPreviewSession?: InstanceAiContext['agentPreviewSession'];
		resolvePreviewSession?: InstanceAiContext['resolvePreviewSession'];
	} = {},
): OrchestrationContext {
	const domainContext = mock<InstanceAiContext>();
	domainContext.agentPreviewSession = overrides.agentPreviewSession;
	domainContext.resolvePreviewSession = overrides.resolvePreviewSession;

	const context = mock<OrchestrationContext>();
	context.domainContext = domainContext;
	return context;
}

describe('get-session tool', () => {
	it('returns the transcript for the bound preview session', async () => {
		const resolvePreviewSession = vi.fn().mockResolvedValue({
			title: 'Support triage test',
			sessionNumber: 3,
			transcript: '## Turn\nUser: Hello agent',
		});
		const context = makeContext({
			agentPreviewSession: { agentId: 'agent-1', threadId: 'preview-thread-1' },
			resolvePreviewSession,
		});

		const tool = createGetSessionTool(context);
		const output = await executeTool<GetSessionOutput>(tool, {});

		expect(output.ok).toBe(true);
		expect(output.title).toBe('Support triage test');
		expect(output.sessionNumber).toBe(3);
		expect(output.transcript).toContain('Hello agent');
		expect(resolvePreviewSession).toHaveBeenCalledWith({
			agentId: 'agent-1',
			threadId: 'preview-thread-1',
		});
	});

	it('scopes to a single turn when executionId is provided', async () => {
		const resolvePreviewSession = vi.fn().mockResolvedValue({
			title: 'Turn',
			sessionNumber: 1,
			transcript: 'turn transcript',
		});
		const context = makeContext({
			agentPreviewSession: { agentId: 'agent-1', threadId: 'preview-thread-1' },
			resolvePreviewSession,
		});

		const tool = createGetSessionTool(context);
		const output = await executeTool<GetSessionOutput>(tool, { executionId: 'exec-9' });

		expect(output.ok).toBe(true);
		expect(resolvePreviewSession).toHaveBeenCalledWith({
			agentId: 'agent-1',
			threadId: 'preview-thread-1',
			executionId: 'exec-9',
		});
	});

	it('returns an error when no preview session is bound', async () => {
		const context = makeContext({});

		const tool = createGetSessionTool(context);
		const output = await executeTool<GetSessionOutput>(tool, {});

		expect(output.ok).toBe(false);
		expect(output.error).toBeDefined();
	});

	it('returns an error when the resolver cannot find the session', async () => {
		const resolvePreviewSession = vi.fn().mockResolvedValue(null);
		const context = makeContext({
			agentPreviewSession: { agentId: 'agent-1', threadId: 'preview-thread-1' },
			resolvePreviewSession,
		});

		const tool = createGetSessionTool(context);
		const output = await executeTool<GetSessionOutput>(tool, {});

		expect(output.ok).toBe(false);
		expect(output.error).toBe('Preview session not found.');
	});
});
