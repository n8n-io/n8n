import { createPage, getSanitizedInitialMessages, getSanitizedI18nConfig } from '../templates';

describe('ChatTrigger Templates Security', () => {
	const defaultParams = {
		instanceId: 'test-instance',
		webhookUrl: 'http://test.com/webhook',
		showWelcomeScreen: false,
		loadPreviousSession: 'notSupported' as const,
		i18n: {
			en: {},
		},
		mode: 'test' as const,
		authentication: 'none' as const,
		allowFileUploads: false,
		allowedFilesMimeTypes: '',
		customCss: '',
		enableStreaming: false,
	};

	describe('XSS Prevention in initialMessages', () => {
		it('should prevent script injection through script context breakout', () => {
			const maliciousInput = '</script>"%09<script>alert(document.cookie)</script>';

			const result = createPage({
				...defaultParams,
				initialMessages: maliciousInput,
			});

			// Should not contain the malicious script
			expect(result).not.toContain('<script>alert(document.cookie)</script>');
			expect(result).not.toContain('</script>"%09<script>');
			expect(result).not.toContain('alert(document.cookie)');

			// Should contain initialMessages (the exact format is less important than security)
			expect(result).toContain('initialMessages:');
			// Should contain the tab character but not the dangerous script tags
			expect(result).toContain('%09');
		});

		it('should sanitize common XSS payloads', () => {
			const xssPayloads = [
				{ input: '<img src=x onerror=alert(1)>', dangerous: ['onerror=', '<img'] },
				{ input: '<svg onload=alert(1)>', dangerous: ['onload=', '<svg'] },
				{ input: 'javascript:alert(1)', dangerous: ['javascript:'] },
				{
					input: '<iframe src="javascript:alert(1)"></iframe>',
					dangerous: ['<iframe', 'javascript:'],
				},
			];

			xssPayloads.forEach(({ input, dangerous }) => {
				const result = createPage({
					...defaultParams,
					initialMessages: input,
				});

				// Should not contain dangerous HTML elements or protocols
				dangerous.forEach((dangerousContent) => {
					expect(result).not.toContain(dangerousContent);
				});
			});
		});

		it('should preserve legitimate messages', () => {
			const legitimateMessages = [
				'Hello, how can I help you?',
				'Welcome to our chat service!',
				'Please describe your issue.',
				'Multi-line\nmessage content\nwith breaks',
			];

			legitimateMessages.forEach((message) => {
				const result = createPage({
					...defaultParams,
					initialMessages: message,
				});

				// Should contain the sanitized legitimate content
				const expectedLines = message
					.split('\n')
					.filter((line) => line)
					.map((line) => line.trim());

				expect(result).toContain(`initialMessages: ${JSON.stringify(expectedLines)}`);
			});
		});

		it('should handle empty initialMessages', () => {
			const result = createPage({
				...defaultParams,
				initialMessages: '',
			});

			// Should not include initialMessages property when empty
			expect(result).not.toContain('initialMessages:');
		});

		it('should handle whitespace-only initialMessages', () => {
			const result = createPage({
				...defaultParams,
				initialMessages: '   \n\n\t  \n   ',
			});

			// Should not include initialMessages property when only whitespace
			expect(result).not.toContain('initialMessages:');
		});

		it('should filter empty lines and trim content', () => {
			const result = createPage({
				...defaultParams,
				initialMessages: '  First message  \n\n  \n  Second message  \n',
			});

			// Should only include non-empty, trimmed lines
			expect(result).toContain('initialMessages: ["First message","Second message"]');
		});
	});

	describe('General Security', () => {
		it('should not expose raw user input in HTML comments or other locations', () => {
			const maliciousInput = '</script><script>alert("XSS")</script>';

			const result = createPage({
				...defaultParams,
				initialMessages: maliciousInput,
			});

			// Should not appear anywhere in the HTML outside of the sanitized JSON
			const lines = result.split('\n');
			const unsafeLines = lines.filter(
				(line) =>
					line.includes('<script>alert("XSS")</script>') && !line.includes('initialMessages: ['),
			);

			expect(unsafeLines).toHaveLength(0);
		});
	});

	describe('I18n XSS Prevention', () => {
		it('should prevent script injection through i18n config values', () => {
			const maliciousInput = '</script><script>alert(document.cookie)</script>';

			const result = createPage({
				...defaultParams,
				initialMessages: '',
				i18n: {
					en: {
						title: maliciousInput,
						subtitle: maliciousInput,
						getStarted: maliciousInput,
						inputPlaceholder: maliciousInput,
					},
				},
			});

			// Should not contain the malicious script
			expect(result).not.toContain('<script>alert(document.cookie)</script>');
			expect(result).not.toContain('</script><script>');
			expect(result).not.toContain('alert(document.cookie)');

			// Should contain i18n config but sanitized
			expect(result).toContain('i18n:');
		});

		it('should sanitize individual i18n fields', () => {
			const xssPayload = '<img src=x onerror=alert(1)>';
			const fields = ['title', 'subtitle', 'getStarted', 'inputPlaceholder'];

			fields.forEach((field) => {
				const config = { [field]: xssPayload };

				const result = createPage({
					...defaultParams,
					initialMessages: '',
					i18n: { en: config },
				});

				// Should not contain dangerous HTML
				expect(result).not.toContain('onerror=');
				expect(result).not.toContain('<img');
				expect(result).not.toContain('alert(1)');
			});
		});

		it('should preserve legitimate i18n content', () => {
			const legitimateConfig = {
				title: 'Welcome to Chat',
				subtitle: 'How can we help you today?',
				getStarted: 'Start Conversation',
				inputPlaceholder: 'Type your message...',
			};

			const result = createPage({
				...defaultParams,
				initialMessages: '',
				i18n: { en: legitimateConfig },
			});

			// Should contain the legitimate content
			expect(result).toContain(JSON.stringify(legitimateConfig));
		});

		it('should handle empty i18n config', () => {
			const result = createPage({
				...defaultParams,
				initialMessages: '',
				i18n: { en: {} },
			});

			// Should still have i18n structure but no en property in the i18n config
			expect(result).toContain('i18n: {');
			expect(result).not.toContain('en: {');
		});
	});

	describe('getSanitizedInitialMessages function', () => {
		it('should sanitize XSS payloads', () => {
			const maliciousInput = '</script>"%09<script>alert(document.cookie)</script>';
			const result = getSanitizedInitialMessages(maliciousInput);

			expect(result).toEqual(['"%09']);
			expect(result.join('')).not.toContain('<script>');
			expect(result.join('')).not.toContain('alert');
		});

		it('should remove dangerous protocols', () => {
			const inputs = [
				'javascript:alert(1)',
				'data:text/html,<script>alert(1)</script>',
				'vbscript:msgbox(1)',
			];

			inputs.forEach((input) => {
				const result = getSanitizedInitialMessages(input);
				const joined = result.join('');
				expect(joined).not.toContain('javascript:');
				expect(joined).not.toContain('data:');
				expect(joined).not.toContain('vbscript:');
			});
		});

		it('should preserve legitimate content', () => {
			const input = 'Hello world!\nHow are you?\nGoodbye!';
			const result = getSanitizedInitialMessages(input);

			expect(result).toEqual(['Hello world!', 'How are you?', 'Goodbye!']);
		});

		it('should handle empty and whitespace-only input', () => {
			expect(getSanitizedInitialMessages('')).toEqual([]);
			expect(getSanitizedInitialMessages('   \n\n  \t  \n   ')).toEqual([]);
		});

		it('should trim and filter empty lines', () => {
			const input = '  First message  \n\n  \n  Second message  \n';
			const result = getSanitizedInitialMessages(input);

			expect(result).toEqual(['First message', 'Second message']);
		});
	});

	describe('getSanitizedI18nConfig function', () => {
		it('should sanitize XSS payloads in all values', () => {
			const maliciousInput = '</script><script>alert(document.cookie)</script>';
			const input = {
				title: maliciousInput,
				subtitle: maliciousInput,
				getStarted: maliciousInput,
				inputPlaceholder: maliciousInput,
			};

			const result = getSanitizedI18nConfig(input);

			Object.values(result).forEach((value) => {
				expect(value).not.toContain('<script>');
				expect(value).not.toContain('alert');
				expect(value).not.toContain('</script>');
			});
		});

		it('should remove dangerous protocols', () => {
			const input = {
				title: 'javascript:alert(1)',
				subtitle: 'data:text/html,<script>alert(1)</script>',
				getStarted: 'vbscript:msgbox(1)',
			};

			const result = getSanitizedI18nConfig(input);

			Object.values(result).forEach((value) => {
				expect(value).not.toContain('javascript:');
				expect(value).not.toContain('data:');
				expect(value).not.toContain('vbscript:');
			});
		});

		it('should preserve legitimate content', () => {
			const input = {
				title: 'Welcome to Chat',
				subtitle: 'How can we help you today?',
				getStarted: 'Start Conversation',
				inputPlaceholder: 'Type your message...',
			};

			const result = getSanitizedI18nConfig(input);

			expect(result).toEqual(input);
		});

		it('should handle empty object', () => {
			const result = getSanitizedI18nConfig({});
			expect(result).toEqual({});
		});

		it('should handle non-string values gracefully', () => {
			const input = {
				title: 'Valid title',
				count: 123,
				enabled: true,
				obj: { test: 1 },
			} as any;

			const result = getSanitizedI18nConfig(input);

			expect(result.title).toBe('Valid title');
			expect(result.count).toBe('123');
			expect(result.enabled).toBe('');
			expect(result.obj).toBe('');
		});
	});
});
