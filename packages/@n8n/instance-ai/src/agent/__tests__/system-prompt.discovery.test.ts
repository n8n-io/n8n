/**
 * Browser Use *discoverability* asserts on the assembled system prompt
 * and the credentials tool description (which carries the needsBrowserSetup
 * routing that used to live in the orchestrator routing index).
 *
 * These tests pin the orchestrator-level wiring that connects discovery
 * signals (OAuth setup, authenticated research, frontend testing) to the
 * browser tools. They are intentionally semantic — they assert
 * the protected concept survives, not exact wording — so that copy edits do
 * not churn them but intent-shifting edits fail loudly.
 */

import { createCredentialsTool } from '../../tools/credentials.tool';
import type { BrowserUseState } from '../../types';
import { getSystemPrompt } from '../system-prompt';

const browserCapableOptions: { browserUseState: BrowserUseState } = {
	browserUseState: { status: 'connected' },
};

describe('getSystemPrompt — browser discoverability', () => {
	describe('credentials tool → Browser Use credential setup skill', () => {
		it('routes needsBrowserSetup=true credential responses to the Browser Use skill', () => {
			const tool = createCredentialsTool({} as never);

			expect(tool.description).toContain('needsBrowserSetup=true');
			expect(tool.description).toContain('credential-setup-with-browser-use');
			expect(tool.description).toMatch(/use Browser Use `browser_\*` tools directly/);
		});

		it('routes browser credential setup through Browser Use tools', () => {
			const tool = createCredentialsTool({} as never);

			expect(tool.description).toMatch(/use Browser Use `browser_\*` tools directly/);
		});
	});

	describe('Browser Use proactive suggestions are reachable from the orchestrator prompt', () => {
		it('includes the Browser Use section when the browser is connected', () => {
			const prompt = getSystemPrompt(browserCapableOptions);

			expect(prompt).toContain('## Browser Use');
			expect(prompt).toContain('When to suggest or use Browser Use');
		});

		it('omits the Browser Use section when browser use is unavailable', () => {
			const prompt = getSystemPrompt({ browserUseState: { status: 'unavailable' } });

			expect(prompt).not.toContain('## Browser Use');
			expect(prompt).not.toContain('When to suggest or use Browser Use');
			expect(prompt).not.toContain('+ button beside the chat input');
		});

		it('omits the Browser Use section when the state is not reported', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).not.toContain('## Browser Use');
		});

		it('still includes proactive suggestions when browser use is set up but disconnected', () => {
			const prompt = getSystemPrompt({ browserUseState: { status: 'disconnected' } });

			expect(prompt).toContain('Proactively suggest connecting');
			expect(prompt).toContain('credential/OAuth/API-key setup');
		});
	});

	describe('discovery-signal pairings — each signal is offered with the browser', () => {
		const findSignalLine = (prompt: string, signal: string): string => {
			const lines = prompt.split('\n');
			const line = lines.find((l) => l.includes(signal));
			if (!line) {
				throw new Error(`Signal "${signal}" not found in prompt`);
			}
			return line;
		};

		it.each(['Credential / OAuth setup', 'Authenticated web research', 'Form / frontend testing'])(
			'lists the %s signal',
			(signal) => {
				const prompt = getSystemPrompt(browserCapableOptions);

				expect(findSignalLine(prompt, signal)).toContain('user');
			},
		);
	});

	describe('proactive framing is preserved (not narrowed to passive responses)', () => {
		it('keeps the "Proactively suggest" instruction so the orchestrator initiates discovery', () => {
			const prompt = getSystemPrompt(browserCapableOptions);

			expect(prompt).toMatch(/Proactively suggest Browser Use/);
		});

		it('does not instruct the orchestrator to wait for the user to ask first', () => {
			const prompt = getSystemPrompt(browserCapableOptions);

			expect(prompt).not.toMatch(/only suggest Browser Use when the user asks/i);
			expect(prompt).not.toMatch(/wait for the user to request browser/i);
		});
	});

	describe('MCP server guidance belongs to the tool, not the prompt', () => {
		// Guidance lives on `mcp-servers`, which is never deferred, so its description
		// reaches every request the way a prompt section would — without a second copy.
		it('says nothing about MCP servers', () => {
			const prompt = getSystemPrompt({ toolSearchEnabled: true, mcpToolSearchEnabled: true });

			expect(prompt).not.toContain('mcp-servers');
			expect(prompt).not.toContain('## MCP Servers');
		});
	});

	// INS-749: n8n-docs is always loaded now, so telling the orchestrator to
	// discover it via search_tools is both wrong and a nudge away from the tool
	// it should reach for first on n8n questions.
	describe('n8n-docs is presented as already available, not as something to discover', () => {
		// The Tool Discovery section only renders with tool search on, which is where
		// the stale "search for n8n docs" example lived.
		const toolSearchOptions = { ...browserCapableOptions, toolSearchEnabled: true };

		it('does not offer n8n docs as a search_tools discovery example', () => {
			const prompt = getSystemPrompt(toolSearchOptions);

			expect(prompt).toContain('## Tool Discovery');
			expect(prompt).not.toMatch(/search "n8n docs"/i);
		});

		it('tells the orchestrator to answer n8n questions from n8n-docs rather than web search', () => {
			const prompt = getSystemPrompt(toolSearchOptions);

			expect(prompt).toMatch(/prefer[^.]{0,60}n8n-docs/i);
			expect(prompt).toMatch(/n8n-docs[^.]{0,120}already (loaded|available)/i);
		});
	});

	describe('browser availability state propagates to the prompt', () => {
		it('includes browser automation rules when the browser is connected', () => {
			const prompt = getSystemPrompt({ browserUseState: { status: 'connected' } });

			expect(prompt).toContain('Browser Automation rules');
		});

		it('leaves out browser automation rules when the browser is disconnected', () => {
			const prompt = getSystemPrompt({ browserUseState: { status: 'disconnected' } });

			expect(prompt).not.toContain('Browser Automation rules');
		});
	});
});
