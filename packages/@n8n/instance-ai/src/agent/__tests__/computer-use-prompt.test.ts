import { getComputerUsePrompt } from '../computer-use-prompt';

describe('getComputerUsePrompt', () => {
	describe('when localGateway is undefined', () => {
		it('returns an empty string', () => {
			expect(getComputerUsePrompt({ browserAvailable: undefined, localGateway: undefined })).toBe(
				'',
			);
		});
	});

	describe('when Computer Use is disabled globally', () => {
		it('returns an empty string', () => {
			expect(
				getComputerUsePrompt({
					browserAvailable: undefined,
					localGateway: { status: 'disabledGlobally' },
				}),
			).toBe('');
		});
	});

	describe('when Computer Use has not been set up (disabled)', () => {
		it('includes the Computer Use intro section', () => {
			const result = getComputerUsePrompt({
				browserAvailable: undefined,
				localGateway: { status: 'disabled' },
			});

			expect(result).toContain('## Computer Use');
		});

		it('tells the agent not to use Computer Use tools', () => {
			const result = getComputerUsePrompt({
				browserAvailable: undefined,
				localGateway: { status: 'disabled' },
			});

			expect(result).toContain('Do NOT attempt to use Computer Use tools');
		});

		it('provides UI setup instructions', () => {
			const result = getComputerUsePrompt({
				browserAvailable: undefined,
				localGateway: { status: 'disabled' },
			});

			expect(result).toContain('Setup computer use');
		});
	});

	describe('when Computer Use is disconnected', () => {
		it('includes the Computer Use intro section', () => {
			const result = getComputerUsePrompt({
				browserAvailable: undefined,
				localGateway: { status: 'disconnected' },
			});

			expect(result).toContain('## Computer Use');
		});

		it('tells the agent not to use Computer Use tools', () => {
			const result = getComputerUsePrompt({
				browserAvailable: undefined,
				localGateway: { status: 'disconnected' },
			});

			expect(result).toContain('Do NOT attempt to use Computer Use tools');
		});

		it('provides UI connection instructions', () => {
			const result = getComputerUsePrompt({
				browserAvailable: undefined,
				localGateway: { status: 'disconnected' },
			});

			expect(result).toContain('"Connect"');
		});
	});

	describe('when Computer Use is connected with no capabilities enabled', () => {
		it('reports that no capabilities are enabled', () => {
			const result = getComputerUsePrompt({
				browserAvailable: undefined,
				localGateway: { status: 'connected', capabilities: [] },
			});

			expect(result).toContain('did not enable any capabilities');
		});

		it('does not include the filesystem exploration section', () => {
			const result = getComputerUsePrompt({
				browserAvailable: undefined,
				localGateway: { status: 'connected', capabilities: [] },
			});

			expect(result).not.toContain('Filesystem Exploration');
		});
	});

	describe('when Computer Use is connected with filesystem capability', () => {
		it('includes the filesystem exploration guidance', () => {
			const result = getComputerUsePrompt({
				browserAvailable: undefined,
				localGateway: { status: 'connected', capabilities: ['filesystem'] },
			});

			expect(result).toContain('### Computer Use - Filesystem Exploration');
			expect(result).toContain('start at depth 1');
			expect(result).toContain('prefer `search` over browsing');
			expect(result).toContain('read specific files rather than whole directories');
		});
	});

	describe('when Computer Use is connected without filesystem capability', () => {
		it('does not include the filesystem exploration section', () => {
			const result = getComputerUsePrompt({
				browserAvailable: true,
				localGateway: { status: 'connected', capabilities: ['browser'] },
			});

			expect(result).not.toContain('Filesystem Exploration');
		});
	});

	describe('when Computer Use is connected with browser available', () => {
		it('includes the browser automation rules', () => {
			const result = getComputerUsePrompt({
				browserAvailable: true,
				localGateway: { status: 'connected', capabilities: ['browser'] },
			});

			expect(result).toContain('### Computer Use - Browser Automation rules');
		});

		it('includes handoff instructions', () => {
			const result = getComputerUsePrompt({
				browserAvailable: true,
				localGateway: { status: 'connected', capabilities: ['browser'] },
			});

			expect(result).toContain('end your turn');
			expect(result).toContain('Authentication');
			expect(result).toContain('CAPTCHAs');
		});

		it('includes the secrets guardrail', () => {
			const result = getComputerUsePrompt({
				browserAvailable: true,
				localGateway: { status: 'connected', capabilities: ['browser'] },
			});

			expect(result).toContain('NEVER include passwords, API keys');
		});
	});

	describe('when Computer Use is connected but browser is not available', () => {
		it('includes the browser-disabled notice', () => {
			const result = getComputerUsePrompt({
				browserAvailable: false,
				localGateway: { status: 'connected', capabilities: ['browser'] },
			});

			expect(result).toContain('Browser Automation (Disabled in Computer Use)');
		});

		it('does not include the full browser automation rules', () => {
			const result = getComputerUsePrompt({
				browserAvailable: false,
				localGateway: { status: 'connected', capabilities: ['browser'] },
			});

			expect(result).not.toContain('end your turn');
		});
	});

	describe('when Computer Use is connected with both filesystem and browser', () => {
		it('includes both the filesystem exploration section and browser rules', () => {
			const result = getComputerUsePrompt({
				browserAvailable: true,
				localGateway: { status: 'connected', capabilities: ['filesystem', 'browser'] },
			});

			expect(result).toContain('Filesystem Exploration');
			expect(result).toContain('Browser Automation rules');
		});
	});

	describe('proactive suggestion guidance', () => {
		it('is included for a connected gateway', () => {
			const result = getComputerUsePrompt({
				browserAvailable: true,
				localGateway: { status: 'connected', capabilities: ['browser'] },
			});

			expect(result).toContain('When to suggest or use Computer Use');
		});

		it('is included for a disconnected gateway', () => {
			const result = getComputerUsePrompt({
				browserAvailable: undefined,
				localGateway: { status: 'disconnected' },
			});

			expect(result).toContain('When to suggest or use Computer Use');
		});

		it('is included for a disabled (not set up) gateway', () => {
			const result = getComputerUsePrompt({
				browserAvailable: undefined,
				localGateway: { status: 'disabled' },
			});

			expect(result).toContain('When to suggest or use Computer Use');
		});

		it('is absent when localGateway is undefined', () => {
			const result = getComputerUsePrompt({ browserAvailable: undefined, localGateway: undefined });

			expect(result).not.toContain('When to suggest or use Computer Use');
		});

		it('is absent when Computer Use is disabled globally', () => {
			const result = getComputerUsePrompt({
				browserAvailable: undefined,
				localGateway: { status: 'disabledGlobally' },
			});

			expect(result).not.toContain('When to suggest or use Computer Use');
		});

		it('lists all 7 use-case categories', () => {
			const result = getComputerUsePrompt({
				browserAvailable: undefined,
				localGateway: { status: 'disconnected' },
			});

			expect(result).toContain('Credential / OAuth setup');
			expect(result).toContain('Local file as context');
			expect(result).toContain('Documentation / output to files');
			expect(result).toContain('Authenticated web research');
			expect(result).toContain('Form / frontend testing');
			expect(result).toContain('Shell / environment');
			expect(result).toContain('Platform migration');
		});
	});
});
