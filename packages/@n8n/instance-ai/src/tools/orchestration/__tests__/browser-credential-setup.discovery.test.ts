/**
 * Browser-credential-setup *discovery intent* asserts.
 *
 * The browser sub-agent's job is to navigate the external service, identify
 * where each credential value lives, and only then hand control back to the
 * user for private entry. If a future edit reframes the goal toward "ask the
 * user to enter values" without the navigation step, the sub-agent stops
 * doing discovery — which is the regression these tests guard against.
 *
 * The complementary `credential-guardrails.prompt.test.ts` pins the privacy
 * end of the contract (no copy/paste secrets in chat). These tests pin the
 * other end (the agent must navigate and find the values).
 */

import { buildBrowserAgentPrompt } from '../browser-credential-setup.prompt';

describe('buildBrowserAgentPrompt — discovery intent', () => {
	describe.each(['gateway', 'chrome-devtools-mcp'] as const)('source = %s', (source) => {
		const prompt = buildBrowserAgentPrompt(source);

		it('frames the goal around identifying where credential values live', () => {
			expect(prompt).toMatch(/identify where the required credential values live/i);
		});

		it('instructs the agent to navigate the external service', () => {
			expect(prompt).toMatch(/Navigate the browser to the external service/i);
		});

		it('forbids stopping at intermediate steps (read docs, navigated, enabled API, etc.)', () => {
			expect(prompt).toContain('you are NOT done. Keep going');
			expect(prompt).toContain('intermediate steps');
		});

		it('instructs the agent to take action rather than narrate plans', () => {
			expect(prompt).toMatch(/Do NOT narrate what you plan to do — just DO it/);
		});

		it('directs the user to enter secret values privately in the n8n credential form', () => {
			// Privacy end of the contract — must not regress when discovery framing is added.
			expect(prompt).toContain('enter the required values in the dedicated n8n credential form');
			expect(prompt).toMatch(/Never ask the user to paste secret values into chat/i);
		});

		it('does not reframe the agent into a passive "ask the user to fill the form" role', () => {
			expect(prompt).not.toMatch(/^Your only job is to ask/im);
			expect(prompt).not.toMatch(/do not navigate/i);
			expect(prompt).not.toMatch(/skip the browser session/i);
		});
	});

	describe('gateway source — session lifecycle', () => {
		const prompt = buildBrowserAgentPrompt('gateway');

		it('opens a browser session at the start of the process', () => {
			expect(prompt).toContain('browser_open');
			expect(prompt).toContain('sessionId');
		});

		it('closes the browser session at the end of the process', () => {
			expect(prompt).toContain('browser_close');
		});
	});
});
