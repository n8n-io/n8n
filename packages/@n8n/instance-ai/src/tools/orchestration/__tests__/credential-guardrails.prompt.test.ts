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

	it('keeps inbound trigger authentication disabled unless explicitly requested', () => {
		const prompt = createSandboxBuilderAgentPrompt('/tmp/workspace');

		expect(prompt).toContain(
			'The credential-selection guidance above applies to outbound service calls.',
		);
		expect(prompt).toContain(
			'keep authentication at its default `none` unless the user explicitly asks to authenticate inbound traffic',
		);
	});

	it('tells the planner not to block planning on credential selection', () => {
		expect(PLANNER_AGENT_PROMPT).toContain('Handle credentials without blocking planning');
		expect(PLANNER_AGENT_PROMPT).toContain('If the user already named a credential');
		expect(PLANNER_AGENT_PROMPT).toContain('If there is exactly one matching credential');
		expect(PLANNER_AGENT_PROMPT).toContain('auto-select it, do not ask');
		expect(PLANNER_AGENT_PROMPT).toContain('If there are no matching credentials, do not ask');
		expect(PLANNER_AGENT_PROMPT).toContain(
			'Do not offer a choice like "build now and set up credentials later"',
		);
		expect(PLANNER_AGENT_PROMPT).toContain('builder will use a mocked or unresolved credential');
		expect(PLANNER_AGENT_PROMPT).toContain(
			'If `credentials(action="list")` proves there is more than one existing credential',
		);
		expect(PLANNER_AGENT_PROMPT).toContain('credentials(action="list")` proves');
		expect(PLANNER_AGENT_PROMPT).toContain('ask once with a single-select');
		expect(PLANNER_AGENT_PROMPT).toContain('cannot be discovered, only chosen');
		expect(PLANNER_AGENT_PROMPT).toContain('Do not ask this question speculatively');
		expect(PLANNER_AGENT_PROMPT).toContain(
			'do not ask for an account email or auth detail as a substitute',
		);
		expect(PLANNER_AGENT_PROMPT).toContain('credential-backed resource investigation');
		expect(PLANNER_AGENT_PROMPT).toContain('Do not turn that into a credential-choice question');
		expect(PLANNER_AGENT_PROMPT).toContain('Record the chosen credential name in `assumptions`');
	});

	it('tells the planner not to ask for account or auth selectors during planning', () => {
		expect(PLANNER_AGENT_PROMPT).toContain(
			'Never ask for service accounts, account emails, auth choices, API keys, tokens',
		);
		expect(PLANNER_AGENT_PROMPT).toContain(
			'Do not ask for credential names except in the multiple-existing-credentials case below',
		);
		expect(PLANNER_AGENT_PROMPT).toContain(
			'keep the plan generic and let the builder/setup flow collect or mock the unresolved value',
		);
	});

	it('tells the planner to use the contextual timezone before asking', () => {
		expect(PLANNER_AGENT_PROMPT).toContain(
			"Never ask for the user's timezone when `<user-timezone>` is present",
		);
		expect(PLANNER_AGENT_PROMPT).toContain('use `<current-datetime>` / `<user-timezone>`');
		expect(PLANNER_AGENT_PROMPT).toContain(
			'Only ask if timezone is missing and a date or schedule cannot be interpreted safely',
		);
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

	it('keeps builder prompts grounded in the inline setup card', () => {
		for (const prompt of [
			BUILDER_AGENT_PROMPT,
			createSandboxBuilderAgentPrompt('/tmp/workspace'),
		]) {
			expect(prompt).toContain('inline setup card in the AI Assistant panel');
			expect(prompt).not.toMatch(/setup wizard/i);
		}
	});

	it('does not inline bulky static node guides in builder prompts', () => {
		for (const prompt of [
			BUILDER_AGENT_PROMPT,
			createSandboxBuilderAgentPrompt('/tmp/workspace'),
		]) {
			expect(prompt).toContain('## Node Configuration Safety Rules');
			expect(prompt).not.toContain('nodes(action="guide")');
			expect(prompt).not.toContain('### Set Node Updates - Comprehensive Type Handling Guide');
			expect(prompt).not.toContain('#### Complete Operator Reference');
			expect(prompt).not.toContain('## IMPORTANT: ResourceLocator Parameter Handling');
		}
	});

	it('does not instruct the sandbox builder about publishing when publish is not on its tool surface', () => {
		const prompt = createSandboxBuilderAgentPrompt('/tmp/workspace');

		expect(prompt).not.toContain('workflows(action="publish")');
		expect(prompt).not.toContain('Do NOT publish');
	});
});
