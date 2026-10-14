import { getComputerUsePrompt } from '../computer-use-prompt';
import type { ComputerUseChannelState, ComputerUseState } from '../../types';

const UNAVAILABLE: ComputerUseChannelState = { status: 'unavailable' };
const DISCONNECTED: ComputerUseChannelState = { status: 'disconnected' };
const DISABLED_BY_USER: ComputerUseChannelState = { status: 'disabledByUser' };
const connected = (...toolCategories: string[]): ComputerUseChannelState => ({
	status: 'connected',
	toolCategories,
});

const state = (
	localComputer: ComputerUseChannelState,
	browser: ComputerUseChannelState,
): ComputerUseState => ({ localComputer, browser });

const bothDisconnected = state(DISCONNECTED, DISCONNECTED);
const browserLive = state(DISCONNECTED, connected('browser'));

describe('getComputerUsePrompt', () => {
	describe('when the state is undefined', () => {
		it('returns an empty string, so a caller that forgets it advertises nothing', () => {
			expect(getComputerUsePrompt({ state: undefined })).toBe('');
		});
	});

	describe('when neither channel is available to the user', () => {
		it('returns an empty string', () => {
			expect(getComputerUsePrompt({ state: state(UNAVAILABLE, UNAVAILABLE) })).toBe('');
		});
	});

	describe('when Computer Use is available but not connected', () => {
		it.each([
			['disconnected', bothDisconnected],
			['disabledByUser', state(DISABLED_BY_USER, DISCONNECTED)],
		] as const)('includes the Computer Use intro section (%s)', (_label, s) => {
			expect(getComputerUsePrompt({ state: s })).toContain('## Computer Use');
		});

		it('tells the agent not to use Computer Use tools', () => {
			expect(getComputerUsePrompt({ state: bothDisconnected })).toContain(
				'do NOT attempt to use Computer Use tools',
			);
		});

		it('provides UI connection instructions naming both entries', () => {
			const result = getComputerUsePrompt({ state: bothDisconnected });

			expect(result).toContain('+ button beside the chat input');
			expect(result).toContain('"Connect local computer"');
			expect(result).toContain('"Connect browser"');
		});

		it('lists all 7 use-case categories in compact form', () => {
			const result = getComputerUsePrompt({ state: bothDisconnected });

			expect(result).toContain('credential/OAuth/API-key setup');
			expect(result).toContain('local file (PDF, CSV, spec) as context');
			expect(result).toContain('docs/exports written to files');
			expect(result).toContain('authenticated web research');
			expect(result).toContain('form/frontend testing');
			expect(result).toContain('local commands');
			expect(result).toContain('migration from Make/Zapier');
		});
	});

	describe('when only the local-computer channel is available', () => {
		const result = getComputerUsePrompt({ state: state(DISCONNECTED, UNAVAILABLE) });

		it('offers the "Connect local computer" entry', () => {
			expect(result).toContain('"Connect local computer"');
		});

		it('does not offer the "Connect browser" entry or the Chrome extension', () => {
			expect(result).not.toContain('"Connect browser"');
			expect(result).not.toContain('chromewebstore.google.com');
		});
	});

	describe('when only the browser channel is available', () => {
		const result = getComputerUsePrompt({ state: state(UNAVAILABLE, DISCONNECTED) });

		it('offers the "Connect browser" entry', () => {
			expect(result).toContain('"Connect browser"');
		});

		it('does not offer the "Connect local computer" entry', () => {
			expect(result).not.toContain('"Connect local computer"');
		});

		it('does not advertise the local-only capabilities', () => {
			expect(result).not.toContain('*shell*');
			expect(result).not.toContain('*filesystem*');
		});
	});

	describe('when a channel is connected but serves no tool categories', () => {
		const result = getComputerUsePrompt({ state: state(connected(), DISCONNECTED) });

		it('reports that no capabilities are enabled', () => {
			expect(result).toContain('did not enable any capabilities');
		});

		it('does not include the filesystem exploration section', () => {
			expect(result).not.toContain('Filesystem Exploration');
		});
	});

	describe('the filesystem exploration section', () => {
		it('is included when a connected channel serves filesystem', () => {
			const result = getComputerUsePrompt({
				state: state(connected('filesystem'), DISCONNECTED),
			});

			expect(result).toContain('### Computer Use - Filesystem Exploration');
			expect(result).toContain('start at depth 1');
			expect(result).toContain('prefer `search` over browsing');
			expect(result).toContain('read specific files rather than whole directories');
		});

		it('is absent when no connected channel serves filesystem', () => {
			expect(getComputerUsePrompt({ state: browserLive })).not.toContain('Filesystem Exploration');
		});
	});

	describe('when browser tools are live', () => {
		it('includes the browser automation rules', () => {
			expect(getComputerUsePrompt({ state: browserLive })).toContain(
				'### Computer Use - Browser Automation rules',
			);
		});

		it('includes handoff instructions', () => {
			const result = getComputerUsePrompt({ state: browserLive });

			expect(result).toContain('end your turn');
			expect(result).toContain('Authentication');
			expect(result).toContain('CAPTCHAs');
		});

		it('includes the secrets guardrail', () => {
			expect(getComputerUsePrompt({ state: browserLive })).toContain(
				'NEVER include passwords, API keys',
			);
		});

		it('reads browser tools served through the local-computer channel', () => {
			// The daemon serves browser tools too, so the category can arrive
			// without the browser channel being connected.
			const result = getComputerUsePrompt({
				state: state(connected('filesystem', 'browser'), DISCONNECTED),
			});

			expect(result).toContain('### Computer Use - Browser Automation rules');
		});

		it('includes both the filesystem exploration section and the browser rules', () => {
			const result = getComputerUsePrompt({
				state: state(connected('filesystem'), connected('browser')),
			});

			expect(result).toContain('Filesystem Exploration');
			expect(result).toContain('Browser Automation rules');
		});
	});

	describe('when connected without browser tools', () => {
		it('offers "Connect browser" while the browser channel is available', () => {
			const result = getComputerUsePrompt({
				state: state(connected('filesystem'), DISCONNECTED),
			});

			expect(result).toContain('Browser Automation (Disabled in Computer Use)');
			expect(result).toContain('+ button beside the chat input');
			expect(result).toContain('"Connect browser"');
		});

		it('does not include the full browser automation rules', () => {
			const result = getComputerUsePrompt({
				state: state(connected('filesystem'), DISCONNECTED),
			});

			expect(result).not.toContain('end your turn');
		});

		it('says browser automation is unavailable when the channel is unavailable', () => {
			const result = getComputerUsePrompt({
				state: state(connected('filesystem'), UNAVAILABLE),
			});

			expect(result).toContain('Browser Automation (Unavailable)');
			expect(result).not.toContain('"Connect browser"');
		});
	});

	describe('the connected preamble is filtered by channel availability', () => {
		// A gateway-only session on a browser-use-disabled instance must not be
		// told about browser capabilities it can neither use nor connect.
		const result = getComputerUsePrompt({
			state: state(connected('filesystem', 'shell'), UNAVAILABLE),
		});

		it('does not advertise the browser capability', () => {
			expect(result).not.toContain('*browser*');
		});

		it('does not name the Chrome extension', () => {
			expect(result).not.toContain('chromewebstore.google.com');
			expect(result).not.toContain('n8n Browser Use');
		});

		it('does not list browser-only suggestion signals', () => {
			expect(result).not.toContain('Credential / OAuth setup');
			expect(result).not.toContain('Authenticated web research');
			expect(result).not.toContain('Form / frontend testing');
			expect(result).not.toContain('Platform migration');
		});

		it('still lists the local-computer suggestion signals', () => {
			expect(result).toContain('Local file as context');
			expect(result).toContain('Documentation / output to files');
			expect(result).toContain('Shell / environment');
		});

		it('keeps the browser signals when the browser channel is available', () => {
			const withBrowser = getComputerUsePrompt({
				state: state(connected('filesystem'), connected('browser')),
			});

			expect(withBrowser).toContain('Credential / OAuth setup');
			expect(withBrowser).toContain('Platform migration');
		});
	});

	describe('a live browser session alongside a connectable local computer', () => {
		// Inexpressible before: the two channels connect through independent
		// services, so this state occurs in production.
		const result = getComputerUsePrompt({ state: browserLive });

		it('uses the browser tools', () => {
			expect(result).toContain('Browser Automation rules');
		});

		it('offers to connect the local computer', () => {
			expect(result).toContain('"Connect local computer"');
		});

		it('does not claim filesystem is live', () => {
			expect(result).not.toContain('Filesystem Exploration');
		});

		it('never offers the local-computer entry when that channel is unavailable', () => {
			const localUnavailable = getComputerUsePrompt({
				state: state(UNAVAILABLE, connected('browser')),
			});

			expect(localUnavailable).not.toContain('"Connect local computer"');
			expect(localUnavailable).not.toContain('Local Computer (Not Connected)');
		});

		it('still offers the + menu entry when the user turned the local computer off', () => {
			// The client renders the entry regardless of the user's own preference, and
			// clicking it clears that preference, so the + menu is the way back.
			const withLocalOff = getComputerUsePrompt({
				state: state(DISABLED_BY_USER, connected('browser')),
			});

			expect(withLocalOff).toContain('"Connect local computer"');
			expect(withLocalOff).not.toContain('n8n Assistant settings');
		});
	});

	describe('the reported capability list', () => {
		it('names each tool category once when both channels serve browser', () => {
			// The daemon can serve browser tools alongside the extension session.
			const result = getComputerUsePrompt({
				state: state(connected('filesystem', 'browser'), connected('browser')),
			});

			const line = result
				.split('\n')
				.find((l) => l.includes('the user has enabled following capabilities'));
			expect(line).toBe(
				'Computer Use is connected, the user has enabled following capabilities: filesystem,browser',
			);
		});
	});

	describe('when a connected channel serves no tool categories', () => {
		it('still offers the other channel that is available but not connected', () => {
			const result = getComputerUsePrompt({ state: state(connected(), DISCONNECTED) });

			expect(result).toContain('did not enable any capabilities');
			expect(result).toContain('"Connect browser"');
		});
	});

	describe('proactive suggestion guidance', () => {
		it('is included for a connected channel', () => {
			expect(getComputerUsePrompt({ state: browserLive })).toContain(
				'When to suggest or use Computer Use',
			);
		});

		it('is included when available but not connected', () => {
			expect(getComputerUsePrompt({ state: bothDisconnected })).toContain(
				'Proactively suggest connecting',
			);
		});

		it('is absent when the state is undefined', () => {
			expect(getComputerUsePrompt({ state: undefined })).not.toContain(
				'When to suggest or use Computer Use',
			);
		});

		it('is absent when neither channel is available', () => {
			expect(getComputerUsePrompt({ state: state(UNAVAILABLE, UNAVAILABLE) })).not.toContain(
				'When to suggest or use Computer Use',
			);
		});
	});

	describe('signal → tool pairings', () => {
		// The label tests above only check that each signal *appears*. These tests pin
		// each signal to its tool on the same line, so a copy edit that drops the
		// "→ *browser*" / "→ *filesystem*" mapping fails loudly even if the label survives.
		const findSignalLine = (prompt: string, signal: string): string => {
			const line = prompt.split('\n').find((l) => l.includes(signal));
			if (!line) throw new Error(`Signal "${signal}" not found`);
			return line;
		};

		const promptWithBrowser = (): string =>
			getComputerUsePrompt({ state: state(connected('filesystem'), connected('browser')) });

		it('pairs Credential / OAuth setup with browser', () => {
			expect(findSignalLine(promptWithBrowser(), 'Credential / OAuth setup')).toContain('browser');
		});

		it('pairs Local file as context with filesystem', () => {
			expect(findSignalLine(promptWithBrowser(), 'Local file as context')).toContain('filesystem');
		});

		it('pairs Documentation / output to files with filesystem', () => {
			expect(findSignalLine(promptWithBrowser(), 'Documentation / output to files')).toContain(
				'filesystem',
			);
		});

		it('pairs Authenticated web research with browser', () => {
			expect(findSignalLine(promptWithBrowser(), 'Authenticated web research')).toContain(
				'browser',
			);
		});

		it('pairs Form / frontend testing with browser', () => {
			expect(findSignalLine(promptWithBrowser(), 'Form / frontend testing')).toContain('browser');
		});

		it('pairs Shell / environment with shell', () => {
			expect(findSignalLine(promptWithBrowser(), 'Shell / environment')).toContain('shell');
		});

		it('pairs Platform migration with both browser and filesystem', () => {
			const line = findSignalLine(promptWithBrowser(), 'Platform migration');
			expect(line).toContain('browser');
			expect(line).toContain('filesystem');
		});
	});

	describe('credential creation guidance', () => {
		it('includes the credential-creation section', () => {
			expect(getComputerUsePrompt({ state: browserLive })).toContain(
				'#### Creating credentials from the browser',
			);
		});

		it('names both credential-flow tools', () => {
			const result = getComputerUsePrompt({ state: browserLive });

			expect(result).toContain('browser_capture_secret');
			expect(result).toContain('browser_create_credential');
		});

		it('routes detailed setup guidance through the Computer Use credential skill', () => {
			expect(getComputerUsePrompt({ state: browserLive })).toMatch(
				/load\s+the `credential-setup-with-computer-use` skill and follow it/,
			);
		});

		it('is absent when browser tools are not live', () => {
			const result = getComputerUsePrompt({
				state: state(connected('filesystem'), DISCONNECTED),
			});

			expect(result).not.toContain('Creating credentials from the browser');
		});
	});

	describe('redaction marker guidance', () => {
		it('mentions the [REDACTED:...] marker format', () => {
			expect(getComputerUsePrompt({ state: browserLive })).toContain('[REDACTED:');
		});

		it('tells the agent to switch to browser_snapshot when visual tools refuse with sensitive_context', () => {
			const result = getComputerUsePrompt({ state: browserLive });

			expect(result).toContain('sensitive_context');
			expect(result).toContain('browser_snapshot');
		});
	});

	describe('handoff triggers', () => {
		// Regression: redaction replaces visible secrets with opaque markers, so
		// "Sensitive content on screen" is no longer a reason to hand off control.
		it('does not list visible secrets as a handoff trigger', () => {
			expect(getComputerUsePrompt({ state: browserLive })).not.toContain(
				'Sensitive content on screen',
			);
		});
	});

	describe('browser runtime-failure guidance', () => {
		it('tells the agent that browser_navigate needs an open tab and to fall back to browser_tab_open', () => {
			const result = getComputerUsePrompt({ state: browserLive });

			const line = result
				.split('\n')
				.find((l) => l.includes('browser_navigate') && l.includes('browser_tab_open'));
			expect(line).toBeDefined();
			expect(line).toContain('requires a connected tab');
		});

		it('is absent when browser tools are not live', () => {
			const result = getComputerUsePrompt({
				state: state(connected('filesystem'), DISCONNECTED),
			});

			expect(result).not.toContain('browser_tab_open');
		});
	});
});
