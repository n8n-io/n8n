/**
 * Tests for the response_matches_workflow_changes binary check.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import { responseMatchesWorkflowChanges } from '../../evaluators/binary-checks/llm-checks/response-matches-workflow-changes';

describe('response_matches_workflow_changes', () => {
	it('should have correct name and kind', () => {
		expect(responseMatchesWorkflowChanges.name).toBe('response_matches_workflow_changes');
		expect(responseMatchesWorkflowChanges.kind).toBe('llm');
	});

	it('should skip when no LLM is provided', async () => {
		const result = await responseMatchesWorkflowChanges.run(
			{ name: 'Test', nodes: [], connections: {} },
			{ prompt: 'test', nodeTypes: [] },
		);
		expect(result.pass).toBe(true);
		expect(result.comment).toContain('Skipped: no LLM');
	});

	it('should skip when no agent text response', async () => {
		const mockLlm = {} as BaseChatModel;
		const result = await responseMatchesWorkflowChanges.run(
			{ name: 'Test', nodes: [], connections: {} },
			{ prompt: 'test', nodeTypes: [], llm: mockLlm },
		);
		expect(result.pass).toBe(true);
		expect(result.comment).toContain('Skipped: no agent text response');
	});

	it('should skip when agent text response is empty string', async () => {
		const mockLlm = {} as BaseChatModel;
		const result = await responseMatchesWorkflowChanges.run(
			{ name: 'Test', nodes: [], connections: {} },
			{ prompt: 'test', nodeTypes: [], llm: mockLlm, agentTextResponse: '' },
		);
		expect(result.pass).toBe(true);
		expect(result.comment).toContain('Skipped: no agent text response');
	});
});
