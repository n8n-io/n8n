/**
 * Browser/computer-use *discoverability* asserts on the assembled system prompt.
 *
 * These tests pin the orchestrator-level wiring that connects discovery
 * signals (OAuth setup, local files, screenshots, platform migration, shell
 * commands) to the right tool. They are intentionally semantic — they assert
 * the protected concept survives, not exact wording — so that copy edits do
 * not churn them but intent-shifting edits fail loudly.
 */

import type { LocalGatewayStatus } from '../../types';
import { getSystemPrompt } from '../system-prompt';

const browserCapableOptions: {
	browserAvailable: boolean;
	localGateway: LocalGatewayStatus;
} = {
	browserAvailable: true,
	localGateway: { status: 'connected', capabilities: ['browser', 'filesystem'] },
};

describe('getSystemPrompt — browser/computer-use discoverability', () => {
	describe('orchestrator → browser-credential-setup dispatch', () => {
		it('routes needsBrowserSetup=true credential responses to the browser-credential-setup tool', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toContain('needsBrowserSetup=true');
			expect(prompt).toContain('browser-credential-setup');
			expect(prompt).toMatch(/call `browser-credential-setup` directly/);
		});

		it('does not route browser credential setup through delegate', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).toMatch(/call `browser-credential-setup` directly \(not `delegate`\)/);
		});
	});

	describe('Computer Use proactive suggestions are reachable from the orchestrator prompt', () => {
		it('includes the Computer Use section when the gateway is connected with browser available', () => {
			const prompt = getSystemPrompt(browserCapableOptions);

			expect(prompt).toContain('## Computer Use');
			expect(prompt).toContain('When to suggest or use Computer Use');
		});

		it('omits the Computer Use section when computer use is disabled globally', () => {
			const prompt = getSystemPrompt({ localGateway: { status: 'disabledGlobally' } });

			expect(prompt).not.toContain('## Computer Use');
			expect(prompt).not.toContain('When to suggest or use Computer Use');
		});

		it('still includes proactive suggestions when computer use is set up but disconnected', () => {
			const prompt = getSystemPrompt({ localGateway: { status: 'disconnected' } });

			expect(prompt).toContain('When to suggest or use Computer Use');
			expect(prompt).toContain('Credential / OAuth setup');
		});

		it('still includes proactive suggestions when computer use has not been set up', () => {
			const prompt = getSystemPrompt({ localGateway: { status: 'disabled' } });

			expect(prompt).toContain('When to suggest or use Computer Use');
			expect(prompt).toContain('Credential / OAuth setup');
		});
	});

	describe('discovery-signal pairings — each signal routes to the right tool', () => {
		const findSignalLine = (prompt: string, signal: string): string => {
			const lines = prompt.split('\n');
			const line = lines.find((l) => l.includes(signal));
			if (!line) {
				throw new Error(`Signal "${signal}" not found in prompt`);
			}
			return line;
		};

		it('pairs Credential / OAuth setup with the browser tool', () => {
			const prompt = getSystemPrompt(browserCapableOptions);
			const line = findSignalLine(prompt, 'Credential / OAuth setup');

			expect(line).toContain('browser');
		});

		it('pairs Local file as context with the filesystem tool', () => {
			const prompt = getSystemPrompt(browserCapableOptions);
			const line = findSignalLine(prompt, 'Local file as context');

			expect(line).toContain('filesystem');
		});

		it('pairs Authenticated web research with the browser tool', () => {
			const prompt = getSystemPrompt(browserCapableOptions);
			const line = findSignalLine(prompt, 'Authenticated web research');

			expect(line).toContain('browser');
		});

		it('pairs Form / frontend testing with the browser tool', () => {
			const prompt = getSystemPrompt(browserCapableOptions);
			const line = findSignalLine(prompt, 'Form / frontend testing');

			expect(line).toContain('browser');
		});

		it('pairs Shell / environment with the shell tool', () => {
			const prompt = getSystemPrompt(browserCapableOptions);
			const line = findSignalLine(prompt, 'Shell / environment');

			expect(line).toContain('shell');
		});

		it('pairs Platform migration with both browser and filesystem tools', () => {
			const prompt = getSystemPrompt(browserCapableOptions);
			const line = findSignalLine(prompt, 'Platform migration');

			expect(line).toContain('browser');
			expect(line).toContain('filesystem');
		});

		it('pairs Documentation / output to files with the filesystem tool', () => {
			const prompt = getSystemPrompt(browserCapableOptions);
			const line = findSignalLine(prompt, 'Documentation / output to files');

			expect(line).toContain('filesystem');
		});
	});

	describe('proactive framing is preserved (not narrowed to passive responses)', () => {
		it('keeps the "Proactively suggest" instruction so the orchestrator initiates discovery', () => {
			const prompt = getSystemPrompt(browserCapableOptions);

			expect(prompt).toMatch(/Proactively suggest Computer Use/);
		});

		it('does not instruct the orchestrator to wait for the user to ask first', () => {
			const prompt = getSystemPrompt(browserCapableOptions);

			expect(prompt).not.toMatch(/only suggest Computer Use when the user asks/i);
			expect(prompt).not.toMatch(/wait for the user to request browser/i);
		});
	});

	describe('browser availability state propagates to the prompt', () => {
		it('includes browser automation rules when browser is available', () => {
			const prompt = getSystemPrompt({
				browserAvailable: true,
				localGateway: { status: 'connected', capabilities: ['browser'] },
			});

			expect(prompt).toContain('Browser Automation rules');
		});

		it('shows the browser-disabled notice when computer use is connected without browser', () => {
			const prompt = getSystemPrompt({
				browserAvailable: false,
				localGateway: { status: 'connected', capabilities: ['filesystem'] },
			});

			expect(prompt).toContain('Browser Automation (Disabled in Computer Use)');
		});
	});
});
