import {
	createPage,
	escapeForScriptContext,
	getSanitizedCustomCss,
	getSanitizedInitialMessages,
	getSanitizedI18nConfig,
} from '../templates';

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

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
		initialMessages: '',
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

	describe('XSS Prevention in customCss', () => {
		it('should strip </style to prevent breakout with onload', () => {
			const result = createPage({
				...defaultParams,
				customCss: '</style><style onload=alert(origin)>',
			});

			// The </style sequence is stripped, so the payload stays trapped as CSS text
			expect(result).not.toContain('</style><style');
		});

		it('should strip </style to prevent breakout with script injection', () => {
			const result = createPage({
				...defaultParams,
				customCss: '</style><script>alert(1)</script>',
			});

			expect(result).not.toContain('</style><script');
		});

		it('should strip </style/> to prevent parser differential XSS', () => {
			const result = createPage({
				...defaultParams,
				customCss: '</style/><script>alert(1)</script>',
			});

			// </style/> is recognized as a closing tag by browsers but not sanitize-html
			expect(result).not.toContain('</style/>');
			expect(result).not.toContain('</style/');
		});

		it('should strip </style//> variant', () => {
			const result = createPage({
				...defaultParams,
				customCss: '</style//><img src=x onerror=alert(1)>',
			});

			expect(result).not.toContain('</style/');
		});

		it('should strip </style case-insensitively', () => {
			const result = createPage({
				...defaultParams,
				customCss: '</STYLE><script>alert(1)</script>',
			});

			expect(result).not.toContain('</STYLE>');
		});

		it('should preserve legitimate CSS', () => {
			const css = '.chat { color: red; font-size: 14px; }';
			const result = createPage({
				...defaultParams,
				customCss: css,
			});

			expect(result).toContain(css);
		});

		it('should preserve CSS with special characters', () => {
			const css = 'div > span + p ~ .class:hover { background: #fff; }';
			const result = createPage({
				...defaultParams,
				customCss: css,
			});

			expect(result).toContain(css);
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

	describe('webhookUrl rendering', () => {
		it('should encode single quotes and adjacent characters in the value', () => {
			const input = "https://test.com/webhook/abc', extra: fetch('https://other.test/x'), tail: '";

			const result = createPage({
				...defaultParams,
				webhookUrl: input,
			});

			expect(result).toContain(`webhookUrl: ${escapeForScriptContext(input)},`);
			expect(result).not.toContain(`webhookUrl: '${input}'`);
		});

		it('should encode angle brackets in the value', () => {
			const input = '</script><script>console.log(1)</script>';

			const result = createPage({
				...defaultParams,
				webhookUrl: input,
			});

			// The rendered HTML must contain exactly one closing </script> tag
			const scriptCloses = (result.match(/<\/script>/gi) ?? []).length;
			expect(scriptCloses).toBe(1);
		});

		it('should encode backslash sequences in the value', () => {
			const input = "https://test.com/\\', extra: 1, tail: '";

			const result = createPage({
				...defaultParams,
				webhookUrl: input,
			});

			expect(result).toContain(`webhookUrl: ${escapeForScriptContext(input)},`);
		});

		it('should encode U+2028 and U+2029 line separators in the value', () => {
			// JSON.stringify alone does not escape U+2028/U+2029; the helper must.
			const input = `https://test.com/${LINE_SEPARATOR}extra = 1`;

			const result = createPage({
				...defaultParams,
				webhookUrl: input,
			});

			expect(result.includes(LINE_SEPARATOR)).toBe(false);
			expect(result).toContain('\\u2028');
		});

		it('should preserve a typical webhook URL', () => {
			const url = 'https://example.com/webhook/0123abcd-ef45-6789-abcd-ef0123456789/chat';

			const result = createPage({
				...defaultParams,
				webhookUrl: url,
			});

			expect(result).toContain(url);
		});

		it('should render an empty string when webhookUrl is undefined', () => {
			// getNodeWebhookUrl can return undefined; the rendered JS must still be parseable
			// and the chat client must receive a string value, not the literal `undefined`.
			const result = createPage({
				...defaultParams,
				webhookUrl: undefined,
			});

			expect(result).toContain('webhookUrl: "",');
			expect(result).not.toContain('webhookUrl: undefined');
			expect(result).not.toContain("webhookUrl: 'undefined'");
		});
	});

	describe('escapeForScriptContext function', () => {
		it('should produce a JSON string literal for simple input', () => {
			expect(escapeForScriptContext('hello')).toBe('"hello"');
		});

		it('should escape angle brackets', () => {
			expect(escapeForScriptContext('</script>')).toBe('"\\u003c/script\\u003e"');
		});

		it('should escape ampersands', () => {
			expect(escapeForScriptContext('a&b')).toBe('"a\\u0026b"');
		});

		it('should escape U+2028 and U+2029 line separators', () => {
			expect(escapeForScriptContext(`a${LINE_SEPARATOR}b`)).toBe('"a\\u2028b"');
			expect(escapeForScriptContext(`a${PARAGRAPH_SEPARATOR}b`)).toBe('"a\\u2029b"');
		});

		it('should escape double quotes and backslashes', () => {
			expect(escapeForScriptContext('a"b')).toBe('"a\\"b"');
			expect(escapeForScriptContext('a\\b')).toBe('"a\\\\b"');
		});

		it('should round-trip via JSON.parse to the original value', () => {
			const inputs = [
				'simple',
				'with "double" quotes',
				"with 'single' quotes",
				'with </script> and <img onerror=x>',
				'with & ampersand',
				`with ${LINE_SEPARATOR} and ${PARAGRAPH_SEPARATOR} separators`,
				'with \\ backslash and \\n literal',
				'',
			];
			inputs.forEach((input) => {
				expect(JSON.parse(escapeForScriptContext(input))).toBe(input);
			});
		});
	});

	describe('XSS Prevention in allowedFilesMimeTypes', () => {
		it('should prevent script injection through allowedFilesMimeTypes', () => {
			const maliciousInput = '</script><script>alert(document.cookie)</script>';

			const result = createPage({
				...defaultParams,
				allowFileUploads: true,
				allowedFilesMimeTypes: maliciousInput,
			});

			expect(result).not.toContain('<script>alert(document.cookie)</script>');
			expect(result).not.toContain('</script><script>');
			expect(result).not.toContain('alert(document.cookie)');
		});

		it('should sanitize common XSS payloads in allowedFilesMimeTypes', () => {
			const xssPayloads = [
				{ input: '<img src=x onerror=alert(1)>', dangerous: ['onerror=', '<img'] },
				{ input: '<svg onload=alert(1)>', dangerous: ['onload=', '<svg'] },
				{ input: 'javascript:alert(1)', dangerous: ['javascript:'] },
			];

			xssPayloads.forEach(({ input, dangerous }) => {
				const result = createPage({
					...defaultParams,
					allowFileUploads: true,
					allowedFilesMimeTypes: input,
				});

				dangerous.forEach((dangerousContent) => {
					expect(result).not.toContain(dangerousContent);
				});
			});
		});

		it('should preserve legitimate MIME types', () => {
			const legitimateMimeTypes = 'image/*,text/plain,application/pdf';

			const result = createPage({
				...defaultParams,
				allowFileUploads: true,
				allowedFilesMimeTypes: legitimateMimeTypes,
			});

			expect(result).toContain(legitimateMimeTypes);
		});
	});

	describe('getSanitizedCustomCss function', () => {
		it('should strip </style to prevent breakout', () => {
			expect(getSanitizedCustomCss('</style><script>alert(1)</script>')).toBe(
				'><script>alert(1)</script>',
			);
		});

		it('should strip </style/> parser differential variant', () => {
			expect(getSanitizedCustomCss('</style/><script>alert(1)</script>')).toBe(
				'/><script>alert(1)</script>',
			);
		});

		it('should strip </style case-insensitively', () => {
			expect(getSanitizedCustomCss('</STYLE>')).toBe('>');
			expect(getSanitizedCustomCss('</Style>')).toBe('>');
			expect(getSanitizedCustomCss('</sTyLe>')).toBe('>');
		});

		it('should strip multiple </style occurrences', () => {
			expect(getSanitizedCustomCss('</style>x</style>')).toBe('>x>');
		});

		it('should strip partial </style without closing >', () => {
			expect(getSanitizedCustomCss('</style')).toBe('');
		});

		it('should handle empty string', () => {
			expect(getSanitizedCustomCss('')).toBe('');
		});

		it('should preserve legitimate CSS', () => {
			const css = '.chat { color: red; } div > span + p ~ .class:hover { background: #fff; }';
			expect(getSanitizedCustomCss(css)).toBe(css);
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
