import { getBrowserUsePrompt } from '../browser-use-prompt';
import type { BrowserUseState } from '../../types';

const UNAVAILABLE: BrowserUseState = { status: 'unavailable' };
const DISCONNECTED: BrowserUseState = { status: 'disconnected' };
const CONNECTED: BrowserUseState = { status: 'connected' };

describe('getBrowserUsePrompt', () => {
	describe('when the state is undefined', () => {
		it('returns an empty string, so a caller that forgets it advertises nothing', () => {
			expect(getBrowserUsePrompt({ state: undefined })).toBe('');
		});
	});

	describe('when Browser Use is not available to the user', () => {
		it('returns an empty string', () => {
			expect(getBrowserUsePrompt({ state: UNAVAILABLE })).toBe('');
		});
	});

	describe('when Browser Use is available but not connected', () => {
		const result = getBrowserUsePrompt({ state: DISCONNECTED });

		it('includes the Browser Use intro section', () => {
			expect(result).toContain('## Browser Use');
		});

		it('tells the agent not to use browser tools', () => {
			expect(result).toContain('do NOT attempt to use browser tools');
		});

		it('provides UI connection instructions', () => {
			expect(result).toContain('+ button beside the chat input');
			expect(result).toContain('"Connect browser"');
		});

		it('names the Chrome extension', () => {
			expect(result).toContain('chromewebstore.google.com');
			expect(result).toContain('n8n Browser Use');
		});

		it('lists the use-case categories in compact form', () => {
			expect(result).toContain('credential/OAuth/API-key setup');
			expect(result).toContain('authenticated web research');
			expect(result).toContain('form/frontend testing');
		});

		it('does not include the full browser automation rules', () => {
			expect(result).not.toContain('end your turn');
		});
	});

	describe('when browser tools are live', () => {
		const result = getBrowserUsePrompt({ state: CONNECTED });

		it('includes the browser automation rules', () => {
			expect(result).toContain('### Browser Use - Browser Automation rules');
		});

		it('includes handoff instructions', () => {
			expect(result).toContain('end your turn');
			expect(result).toContain('Authentication');
			expect(result).toContain('CAPTCHAs');
		});

		it('includes the secrets guardrail', () => {
			expect(result).toContain('NEVER include passwords, API keys');
		});

		it('reports that Browser Use is connected', () => {
			expect(result).toContain('Browser Use is connected.');
		});
	});

	describe('proactive suggestion guidance', () => {
		it('is included for a connected session', () => {
			expect(getBrowserUsePrompt({ state: CONNECTED })).toContain(
				'When to suggest or use Browser Use',
			);
		});

		it('is included when available but not connected', () => {
			expect(getBrowserUsePrompt({ state: DISCONNECTED })).toContain(
				'Proactively suggest connecting',
			);
		});

		it('is absent when the state is undefined', () => {
			expect(getBrowserUsePrompt({ state: undefined })).not.toContain(
				'When to suggest or use Browser Use',
			);
		});

		it('is absent when Browser Use is unavailable', () => {
			expect(getBrowserUsePrompt({ state: UNAVAILABLE })).not.toContain(
				'When to suggest or use Browser Use',
			);
		});

		it('lists the browser signals for a connected session', () => {
			const result = getBrowserUsePrompt({ state: CONNECTED });

			expect(result).toContain('Credential / OAuth setup');
			expect(result).toContain('Authenticated web research');
			expect(result).toContain('Form / frontend testing');
		});

		it('does not list signals that need the local computer', () => {
			const result = getBrowserUsePrompt({ state: CONNECTED });

			expect(result).not.toContain('Local file as context');
			expect(result).not.toContain('Shell / environment');
			expect(result).not.toContain('Platform migration');
		});
	});

	describe('credential creation guidance', () => {
		it('includes the credential-creation section', () => {
			expect(getBrowserUsePrompt({ state: CONNECTED })).toContain(
				'#### Creating credentials from the browser',
			);
		});

		it('names both credential-flow tools', () => {
			const result = getBrowserUsePrompt({ state: CONNECTED });

			expect(result).toContain('browser_capture_secret');
			expect(result).toContain('browser_create_credential');
		});

		it('routes detailed setup guidance through the Browser Use credential skill', () => {
			expect(getBrowserUsePrompt({ state: CONNECTED })).toMatch(
				/load\s+the `credential-setup-with-browser-use` skill and follow it/,
			);
		});

		it('is absent when browser tools are not live', () => {
			expect(getBrowserUsePrompt({ state: DISCONNECTED })).not.toContain(
				'Creating credentials from the browser',
			);
		});
	});

	describe('redaction marker guidance', () => {
		it('mentions the [REDACTED:...] marker format', () => {
			expect(getBrowserUsePrompt({ state: CONNECTED })).toContain('[REDACTED:');
		});

		it('tells the agent to switch to browser_snapshot when visual tools refuse with sensitive_context', () => {
			const result = getBrowserUsePrompt({ state: CONNECTED });

			expect(result).toContain('sensitive_context');
			expect(result).toContain('browser_snapshot');
		});
	});

	describe('handoff triggers', () => {
		// Regression: redaction replaces visible secrets with opaque markers, so
		// "Sensitive content on screen" is no longer a reason to hand off control.
		it('does not list visible secrets as a handoff trigger', () => {
			expect(getBrowserUsePrompt({ state: CONNECTED })).not.toContain(
				'Sensitive content on screen',
			);
		});
	});

	describe('browser runtime-failure guidance', () => {
		it('tells the agent that browser_navigate needs an open tab and to fall back to browser_tab_open', () => {
			const result = getBrowserUsePrompt({ state: CONNECTED });

			const line = result
				.split('\n')
				.find((l) => l.includes('browser_navigate') && l.includes('browser_tab_open'));
			expect(line).toBeDefined();
			expect(line).toContain('requires a connected tab');
		});

		it('is absent when browser tools are not live', () => {
			expect(getBrowserUsePrompt({ state: DISCONNECTED })).not.toContain('browser_tab_open');
		});
	});
});
