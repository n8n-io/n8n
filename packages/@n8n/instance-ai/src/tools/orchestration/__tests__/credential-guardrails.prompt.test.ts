import { buildBrowserAgentPrompt } from '../browser-credential-setup.prompt';
import {
	BUILDER_AGENT_PROMPT,
	createSandboxBuilderAgentPrompt,
} from '../build-workflow-agent.prompt';

describe('credential guardrail prompts', () => {
	it('does not frame API keys as acceptable ask-user inputs in builder prompts', () => {
		expect(BUILDER_AGENT_PROMPT).not.toContain('a chat ID, API key, external resource name');
		expect(createSandboxBuilderAgentPrompt('/tmp/workspace')).not.toContain(
			'a chat ID, API key, external resource name',
		);
	});

	it('directs browser credential setup toward private credential entry', () => {
		const prompt = buildBrowserAgentPrompt('gateway');

		expect(prompt).toContain('enter the required values in the dedicated n8n credential form');
		expect(prompt).toContain('Never ask the user to paste secret values into chat');
		expect(prompt).not.toContain('ready to copy');
		expect(prompt).not.toContain('copied and ready to paste into n8n');
	});
});
