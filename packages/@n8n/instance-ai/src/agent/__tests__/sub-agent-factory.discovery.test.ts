/**
 * Browser/computer-use *discoverability* asserts on the sub-agent protocol.
 *
 * The protocol is injected into every sub-agent. If a future copy edit
 * accidentally tells sub-agents "ask the user to fill the form" instead of
 * letting browser-credential-setup do its discovery work, those sub-agents
 * will silently stop reaching for browser tools. These asserts pin the
 * surviving guardrails (we keep the secret-handling rule) without acquiring
 * new ones that suppress active discovery.
 */

import { SUB_AGENT_PROTOCOL, buildSubAgentPrompt } from '../sub-agent-factory';

describe('SUB_AGENT_PROTOCOL — browser-tool discovery preservation', () => {
	it('keeps the secret-handling guardrail (route through credential setup, not chat)', () => {
		expect(SUB_AGENT_PROTOCOL).toContain('Never ask the user to paste passwords');
		expect(SUB_AGENT_PROTOCOL).toContain(
			'credential setup, browser credential setup, or existing credential selection',
		);
	});

	it('does not blanket-instruct sub-agents to ask the user to fill the credential form', () => {
		// The orchestrator routes credential setup through `browser-credential-setup`,
		// which actively navigates and identifies where the values live. A protocol-level
		// "ask the user to fill the form" instruction would short-circuit that discovery.
		expect(SUB_AGENT_PROTOCOL).not.toMatch(/ask the user to fill (in )?the (credential )?form/i);
		expect(SUB_AGENT_PROTOCOL).not.toMatch(/tell the user to enter (their )?credentials/i);
	});

	it('does not forbid sub-agents from using browser tools', () => {
		// Anti-regression: a future edit must not add a blanket "do not use browser tools"
		// or "browser automation is unavailable to sub-agents" rule.
		expect(SUB_AGENT_PROTOCOL).not.toMatch(/do not use browser tools/i);
		expect(SUB_AGENT_PROTOCOL).not.toMatch(/browser tools are not available/i);
		expect(SUB_AGENT_PROTOCOL).not.toMatch(/never use browser_/i);
	});
});

describe('buildSubAgentPrompt', () => {
	it('embeds the role and task instructions in the assembled prompt', () => {
		const prompt = buildSubAgentPrompt(
			'browser-credential-setup',
			'Help the user set up a Slack credential.',
		);

		expect(prompt).toContain('browser-credential-setup');
		expect(prompt).toContain('Help the user set up a Slack credential.');
	});

	it('includes the protocol so its guardrails reach every sub-agent', () => {
		const prompt = buildSubAgentPrompt('any-role', 'do thing');

		expect(prompt).toContain(SUB_AGENT_PROTOCOL);
	});
});
