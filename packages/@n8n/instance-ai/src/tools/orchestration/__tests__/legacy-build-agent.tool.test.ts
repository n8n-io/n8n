import type { InterruptibleToolContext } from '@n8n/agents';

import { createLegacyBuildAgentTool } from '../legacy-build-agent.tool';

function resumeContext(overrides: Partial<InterruptibleToolContext>): InterruptibleToolContext {
	return {
		suspend: vi.fn(),
		resumeData: undefined,
		...overrides,
	} as unknown as InterruptibleToolContext;
}

describe('createLegacyBuildAgentTool', () => {
	it('resolves the stored names without being offered to the model', () => {
		const tool = createLegacyBuildAgentTool();

		expect(tool.name).toBe('agent_builder_build_agent');
		expect(tool.legacyNames).toContain('build-agent');
		expect(tool.inputSchema).toBeUndefined();
		expect(tool.suspendSchema).toBeDefined();
	});

	it('points a copied call to the current builder tools', async () => {
		const tool = createLegacyBuildAgentTool();

		const result = await tool.handler!(
			{ message: 'add a Gmail tool', agentRef: 'support' },
			resumeContext({}),
		);

		expect(result).toEqual({
			ok: false,
			error: expect.stringContaining('agent_builder_select_agent'),
		});
	});

	it('returns the answer and the suspended target when a stored card is answered', async () => {
		const tool = createLegacyBuildAgentTool();
		const answers = [{ questionId: 'q1', selectedOptions: ['Gmail'] }];

		const result = await tool.handler!(
			{ message: 'build it' },
			resumeContext({
				resumeData: { answers },
				suspendPayload: {
					questions: [],
					builderCheckpoint: {
						runId: 'builder-run',
						toolCallId: 'tc-1',
						configUpdated: false,
						target: { agentId: 'agent-1', projectId: 'project-1', name: 'Support' },
					},
				},
			}),
		);

		expect(result).toEqual({
			ok: false,
			error: expect.stringContaining('agent_builder_select_agent'),
			userResponse: { answers },
			agentId: 'agent-1',
			agentName: 'Support',
		});
	});

	it('returns the answer without a target for a card saved before the target existed', async () => {
		const tool = createLegacyBuildAgentTool();

		const result = await tool.handler!(
			{},
			resumeContext({
				resumeData: { approved: true },
				suspendPayload: {
					builderCheckpoint: { runId: 'builder-run', toolCallId: 'tc-1', configUpdated: false },
				},
			}),
		);

		expect(result).toEqual({
			ok: false,
			error: expect.any(String),
			userResponse: { approved: true },
		});
	});
});
