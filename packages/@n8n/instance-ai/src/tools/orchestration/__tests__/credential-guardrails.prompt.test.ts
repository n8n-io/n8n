import { buildBrowserAgentPrompt } from '../browser-credential-setup.prompt';
import {
	BUILDER_AGENT_PROMPT,
	createSandboxBuilderAgentPrompt,
} from '../build-workflow-agent.prompt';
import { PLANNER_AGENT_PROMPT } from '../plan-agent-prompt';

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

	it('tells the planner to ask when a required service has more than one credential of the same type', () => {
		expect(PLANNER_AGENT_PROMPT).toContain(
			'Do ask when a required service has more than one credential of the same type',
		);
		expect(PLANNER_AGENT_PROMPT).toContain('cannot be discovered, only chosen');
		expect(PLANNER_AGENT_PROMPT).toContain('Record the chosen credential name in `assumptions`');
	});

	it('tells the builder to wrap ambiguous resource matches with placeholder()', () => {
		// Both prompts inline PLACEHOLDERS_RULE, which now covers the multi-match case.
		const sharedRule = '**Resource IDs with more than one candidate**';
		expect(BUILDER_AGENT_PROMPT).toContain(sharedRule);
		expect(createSandboxBuilderAgentPrompt('/tmp/workspace')).toContain(sharedRule);

		// The sandbox builder additionally repeats the rule at resource-discovery time,
		// so it cannot be missed in the step-by-step process.
		expect(createSandboxBuilderAgentPrompt('/tmp/workspace')).toContain(
			"If `explore-resources` returns more than one match and the user did not name a specific one, use `placeholder('Select <resource>')`",
		);
	});
});
