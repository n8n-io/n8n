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
		instanceBaseUrl: '/',
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

	describe('BasePath functionality', () => {
		it('should use custom instanceBaseUrl in redirect URL', () => {
			const customBasePath = '/custom/path/';
			const result = createPage({
				...defaultParams,
				instanceBaseUrl: customBasePath,
				authentication: 'n8nUserAuth',
			});

			// Should contain the custom instanceBaseUrl in the redirect URL
			expect(result).toContain(`window.location.href = '${customBasePath}signin?redirect='`);
		});

		it('should use default instanceBaseUrl when not provided', () => {
			// Create params without instanceBaseUrl to test default behavior
			const { instanceBaseUrl: _, ...paramsWithoutBaseUrl } = defaultParams;
			const result = createPage({
				...paramsWithoutBaseUrl,
				authentication: 'n8nUserAuth',
			});

			// When instanceBaseUrl is not provided, it should default to '/'
			expect(result).toContain(`window.location.href = '/signin?redirect='`);
		});

		it('should properly encode redirect URL', () => {
			const result = createPage({
				...defaultParams,
				authentication: 'n8nUserAuth',
			});

			// Should use encodeURIComponent for the redirect parameter
			expect(result).toContain('encodeURIComponent(window.location.href)');
		});
	});
});

describe('createPage inside the shell frame', () => {
	const params = {
		instanceId: 'test-instance',
		webhookUrl: 'http://test.com/webhook',
		showWelcomeScreen: false,
		loadPreviousSession: 'notSupported' as const,
		i18n: { en: {} },
		mode: 'production' as const,
		authentication: 'n8nUserAuth' as const,
		allowFileUploads: false,
		allowedFilesMimeTypes: '',
		customCss: '.chat-message { color: red; }',
		enableStreaming: false,
		initialMessages: '',
	};
	const visitor = {
		id: 'user-1',
		email: 'visitor@example.com',
		firstName: 'Vi',
		lastName: 'Sitor',
	};

	const inner = createPage({
		...params,
		frameIdentity: { visitor, authToken: 'signed.jwt.token' },
	});

	it('loads the widget from the published CDN bundle', () => {
		expect(inner).toContain('cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js');
		expect(inner).not.toContain('/chat-widget/');
	});

	it('stands in for localStorage before the widget loads', () => {
		expect(inner).toContain("Object.defineProperty(window, 'localStorage'");
		// A classic inline script runs before the deferred module script, so the shim
		// is in place by the time the widget touches storage.
		expect(inner.indexOf("Object.defineProperty(window, 'localStorage'")).toBeLessThan(
			inner.indexOf('<script type="module">'),
		);
	});

	it('takes the conversation session id from the shell', () => {
		expect(inner).toContain('window.location.hash.slice(1)');
		expect(inner).toContain('"n8n-chat/sessionId"');
		expect(inner).toContain('sessionId: window.__n8nChatSessionId || undefined,');
	});

	it('authenticates messages by request header', () => {
		expect(inner).toContain('headers[\'x-auth-token\'] = "signed.jwt.token"');
	});

	// `createChat` keeps this object by reference and the widget reads it on every
	// send, so a later in-place write is what makes a refreshed token take effect.
	it('hands the widget a header object it can keep mutating', () => {
		expect(inner).toContain('const headers = window.__n8nChatAuthHeaders || {};');
		expect(inner).toContain('headers: headers');
		expect(inner).toContain("headers['X-Instance-Id'] = 'test-instance';");
		// Guards the race where a refresh lands before this module script runs.
		expect(inner).toContain("if (!headers['x-auth-token'])");
	});

	// Not a window listener: a port belongs to this document's realm, so it dies with
	// this document. A replacement loaded by author script cannot obtain it, which is
	// what keeps the shell's next token away from it.
	it('opens a private channel to the shell instead of listening on window', () => {
		expect(inner).toContain('window.__n8nChatAuthHeaders = {};');
		expect(inner).toContain('var channel = new MessageChannel();');
		expect(inner).toContain('channel.port1.onmessage = function (event) {');
		expect(inner).toContain(
			"window.parent.postMessage({ type: 'n8n-chat-frame-ready' }, '*', [channel.port2]);",
		);
		expect(inner).toContain("data.type !== 'n8n-chat-auth-token'");
		expect(inner).toContain("window.__n8nChatAuthHeaders['x-auth-token'] = data.token;");

		// The page does have one window message listener - the credential gate reads the
		// shell's readiness signal, which the shell already broadcasts at this frame for
		// the widget's benefit, so listening adds no exposure. The token must never join
		// it: pinned by count and by content so neither can drift.
		const windowListeners = inner.split("addEventListener('message'").slice(1);
		expect(windowListeners).toHaveLength(1);
		expect(windowListeners[0]).toContain("'n8n-chat:credential-status'");
		expect(windowListeners[0]).not.toContain('n8n-chat-auth-token');
		expect(windowListeners[0]).not.toContain('data.token');
	});

	// Announcing with no port still closes the shell's latch, so a document loaded here
	// later cannot claim the channel this one failed to open.
	it('announces readiness without a port when the browser has no channel', () => {
		expect(inner).toContain(
			"try { window.parent.postMessage({ type: 'n8n-chat-frame-ready' }, '*'); } catch (postError) {}",
		);
	});

	// The refresh token lives only in an httpOnly cookie; it must appear in neither
	// document.
	it('carries no refresh token', () => {
		expect(inner).not.toContain('refreshToken');
		expect(inner).not.toContain('n8n-chat-oauth-refresh');
	});

	// Not merely skipped at runtime: the bootstrap is never emitted, so there is no
	// path from this document to a login endpoint it couldn't reach or a sign-in page it
	// couldn't render.
	it('takes the visitor from the server instead of fetching the login endpoint', () => {
		expect(inner).toContain('const metadata = { user: {"id":"user-1"');
		expect(inner).not.toContain("fetch('/rest/login'");
		expect(inner).not.toContain("'/signin?redirect='");
	});

	it('still renders the author own styling', () => {
		expect(inner).toContain('.chat-message { color: red; }');
	});

	describe('outside the shell', () => {
		const plain = createPage(params);

		it('is unchanged: no shim, no session handover, no token header', () => {
			expect(plain).not.toContain("Object.defineProperty(window, 'localStorage'");
			expect(plain).not.toContain('window.__n8nChatSessionId');
			expect(plain).not.toContain('x-auth-token');
			expect(plain).toContain('const injectedVisitor = null;');
		});

		// Nothing refreshes this render, so it keeps the inline header literal rather
		// than the mutable object the frame render needs.
		it('keeps the header literal inline', () => {
			expect(plain).toContain("'X-Instance-Id': 'test-instance',");
			expect(plain).not.toContain('window.__n8nChatAuthHeaders');
			expect(plain).not.toContain('headers: headers');
		});

		// The client-side bootstrap is what the flag-off n8nUserAuth render still relies on.
		it('keeps the login bootstrap the flag-off render depends on', () => {
			expect(plain).toContain("fetch('/rest/login'");
			expect(plain).toContain("'/signin?redirect='");
		});
	});

	// A frame render holding half an identity would silently serve an anonymous chat where
	// the single-document path redirects to sign-in, and the frame can resolve neither half
	// for itself. Both fields are required together, so that state can't be expressed —
	// this fails the build rather than the run if the shape ever loosens.
	it('cannot represent a frame render missing half its identity', () => {
		type FrameIdentity = Parameters<typeof createPage>[0]['frameIdentity'];

		// @ts-expect-error the visitor and their token only ever travel together
		const withoutVisitor: FrameIdentity = { authToken: 'signed.jwt.token' };
		// @ts-expect-error ...in both directions
		const withoutToken: FrameIdentity = { visitor };

		expect([withoutVisitor, withoutToken]).toHaveLength(2);
	});
});

describe('credential gate script', () => {
	const frameIdentity = {
		authToken: 'token-abc',
		expiresIn: 3600,
		visitor: { id: 'visitor-1', firstName: 'Ada', lastName: 'L', email: 'ada@example.com' },
	};

	const baseParams = {
		instanceId: 'test-instance',
		webhookUrl: 'http://test.com/webhook',
		showWelcomeScreen: false,
		loadPreviousSession: 'notSupported' as const,
		i18n: { en: {} },
		mode: 'production' as const,
		authentication: 'n8nUserAuth' as const,
		allowFileUploads: false,
		allowedFilesMimeTypes: '',
		customCss: '',
		initialMessages: '',
	};

	const NOTICE =
		'Not all required accounts are connected, so your message could not be processed. Connect them below, then send it again.';

	/** A send body shaped the way the widget builds one. */
	const sendBody = (chatInput: string) =>
		JSON.stringify({ action: 'sendMessage', sessionId: 's-1', chatInput });

	const GATE_BODY = {
		status: 'credential_connections_required',
		readyToExecute: false,
		credentials: [
			{ credentialId: 'cred-missing', credentialStatus: 'missing' },
			{ credentialId: 'cred-connected', credentialStatus: 'configured' },
		],
	};

	/** The gate script out of the rendered page, without its `<script>` wrapper. */
	function gateScriptOf(page: string): string {
		const script = page
			.split('<script>')
			.find((part) => part.includes('credential_connections_required'));
		if (!script) throw new Error('gate script not rendered');
		return script.slice(0, script.indexOf('</script>'));
	}

	/**
	 * Runs the rendered script against fakes. `window` and friends are parameters
	 * rather than globals, so the script under test sees them by those names.
	 */
	function runGateScript(options: {
		enableStreaming: boolean;
		response: Response;
		/** Seeds the textarea, to prove this page leaves it untouched. */
		inputValue?: string;
	}) {
		const page = createPage({
			...baseParams,
			enableStreaming: options.enableStreaming,
			frameIdentity,
		});

		const textarea = {
			value: options.inputValue ?? '',
			focused: false,
			events: [] as string[],
			dispatchEvent(event: Event) {
				this.events.push(event.type);
				return true;
			},
			focus() {
				this.focused = true;
			},
		};
		const posted: Array<{ message: unknown; options: unknown }> = [];
		const parent = {
			postMessage: (message: unknown, options: unknown) => posted.push({ message, options }),
		};
		const winListeners: Array<(event: unknown) => void> = [];
		const win = {
			parent,
			addEventListener: (type: string, fn: (event: unknown) => void) => {
				if (type === 'message') winListeners.push(fn);
			},
			fetch: async (_input?: unknown, _init?: unknown) => await Promise.resolve(options.response),
		};
		const docListeners: Record<string, Array<(event: unknown) => void>> = {};
		const doc = {
			querySelector: () => null,
			addEventListener: (type: string, fn: (event: unknown) => void) => {
				(docListeners[type] ??= []).push(fn);
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		new Function('window', 'document', 'Event', 'Response', 'FormData', gateScriptOf(page))(
			win,
			doc,
			Event,
			Response,
			FormData,
		);

		/** Replays the shell's readiness signal into the page. */
		function sendStatus(status: Record<string, unknown>, source: unknown = parent) {
			winListeners.forEach((fn) =>
				fn({ source, data: { type: 'n8n-chat:credential-status', ...status } }),
			);
		}

		/** Fires a submit the way the widget would see it, through the capture phase. */
		function submit(kind: 'enter' | 'click', keys: { shiftKey?: boolean } = {}) {
			const blocked = { defaultPrevented: false, propagationStopped: false };
			const event =
				kind === 'enter'
					? { key: 'Enter', shiftKey: keys.shiftKey ?? false, target: { tagName: 'TEXTAREA' } }
					: {
							target: {
								closest: (selector: string) => (selector === '.chat-input-send-button' ? {} : null),
							},
						};
			const listeners = docListeners[kind === 'enter' ? 'keydown' : 'click'] ?? [];
			listeners.forEach((fn) =>
				fn({
					...event,
					preventDefault: () => {
						blocked.defaultPrevented = true;
					},
					stopImmediatePropagation: () => {
						blocked.propagationStopped = true;
					},
				}),
			);
			return blocked;
		}

		return { win, textarea, posted, sendStatus, submit };
	}

	it('renders only inside the shell frame', () => {
		const inFrame = createPage({ ...baseParams, enableStreaming: false, frameIdentity });
		const standalone = createPage({ ...baseParams, enableStreaming: false });

		expect(inFrame).toContain('credential_connections_required');
		expect(standalone).not.toContain('credential_connections_required');
	});

	it('renders as valid script, with no unresolved escaping', () => {
		const script = gateScriptOf(
			createPage({ ...baseParams, enableStreaming: false, frameIdentity }),
		);

		// Compiles without running: proves the emitted escaping is syntactically sound.
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		expect(() => new Function(script)).not.toThrow();
		// Split so neither this file's lint rules nor the assertion itself contain the
		// placeholder they check for.
		expect(script.includes('$' + '{')).toBe(false);
	});

	it('answers a rejection with the reason, never the gate body', async () => {
		const { win } = runGateScript({
			enableStreaming: false,
			response: new Response(JSON.stringify(GATE_BODY), {
				status: 428,
				headers: { 'Content-Type': 'application/json' },
			}),
		});

		const answer = (await win.fetch('http://test.com/webhook', {
			method: 'POST',
			body: sendBody('Book me a flight'),
		})) as unknown as Response;
		const body = (await answer.json()) as { output: string };

		expect(answer.status).toBe(200);
		expect(body.output).toBe(NOTICE);
		expect(JSON.stringify(body)).not.toContain('credential_connections_required');
	});

	it('leaves the input and the transcript to the widget', async () => {
		// The message really was sent, so it belongs in the transcript. This page has no
		// reach into the widget's state and must not fake one by writing at its DOM.
		const { win, textarea } = runGateScript({
			enableStreaming: false,
			response: new Response(JSON.stringify(GATE_BODY), { status: 428 }),
			// Non-empty, so the assertions below fail if the page writes at the input at
			// all - whether it clears it or restores the refused message over a draft.
			inputValue: 'a draft the visitor started',
		});

		await win.fetch('http://test.com/webhook', {
			method: 'POST',
			body: sendBody('Book me a flight'),
		});

		expect(textarea.value).toBe('a draft the visitor started');
		expect(textarea.events).toEqual([]);
		expect(textarea.focused).toBe(false);
	});

	it('answers a multipart send the same way', async () => {
		const { win, posted } = runGateScript({
			enableStreaming: false,
			response: new Response(JSON.stringify(GATE_BODY), { status: 428 }),
		});

		const form = new FormData();
		form.append('action', 'sendMessage');
		form.append('chatInput', 'Here is the file');

		const answer = (await win.fetch('http://test.com/webhook', {
			method: 'POST',
			body: form,
		})) as unknown as Response;

		expect(((await answer.json()) as { output: string }).output).toBe(NOTICE);
		expect(posted).toHaveLength(1);
	});

	it('tells the shell which accounts are missing, and only those', async () => {
		const { win, posted } = runGateScript({
			enableStreaming: false,
			response: new Response(JSON.stringify(GATE_BODY), { status: 428 }),
		});

		await win.fetch('http://test.com/webhook', { method: 'POST', body: sendBody('hello') });

		expect(posted).toEqual([
			{
				message: { type: 'n8n-chat-credentials-rejected', ids: ['cred-missing'] },
				options: '*',
			},
		]);
	});

	it('answers streaming sends with frames the widget can parse', async () => {
		const { win } = runGateScript({
			enableStreaming: true,
			response: new Response(JSON.stringify(GATE_BODY), { status: 428 }),
		});

		const answer = (await win.fetch('http://test.com/webhook', {
			method: 'POST',
			body: sendBody('hello'),
		})) as unknown as Response;
		const frames = (await answer.text())
			.split('\n')
			.filter(Boolean)
			.map((line) => JSON.parse(line) as { type: string; content?: string });

		expect(frames.map((frame) => frame.type)).toEqual(['begin', 'item', 'end']);
		expect(frames[1].content).toBe(NOTICE);
	});

	it('leaves a 428 that is not this gate alone', async () => {
		const { win, posted, textarea } = runGateScript({
			enableStreaming: false,
			response: new Response(JSON.stringify({ message: 'Precondition Required' }), {
				status: 428,
			}),
		});

		const answer = (await win.fetch('http://test.com/webhook', {
			method: 'POST',
			body: sendBody('hello'),
		})) as unknown as Response;

		expect(answer.status).toBe(428);
		expect(posted).toEqual([]);
		expect(textarea.value).toBe('');
	});

	describe('blocking the send before it happens', () => {
		const notReady = { ready: false, missingCount: 1, testMode: false };

		function page() {
			return runGateScript({
				enableStreaming: false,
				response: new Response(JSON.stringify({ output: 'unused' }), { status: 200 }),
			});
		}

		it('lets a send through before the shell has said anything', () => {
			const { submit } = page();

			expect(submit('enter').defaultPrevented).toBe(false);
			expect(submit('click').defaultPrevented).toBe(false);
		});

		it('lets a send through once the shell reports readiness', () => {
			const { submit, sendStatus } = page();

			sendStatus({ ready: true, missingCount: 0, testMode: false });

			expect(submit('enter').defaultPrevented).toBe(false);
			expect(submit('click').defaultPrevented).toBe(false);
		});

		it.each(['enter', 'click'] as const)(
			'refuses a %s submit while accounts are outstanding',
			(kind) => {
				const { submit, sendStatus } = page();

				sendStatus(notReady);
				const blocked = submit(kind);

				expect(blocked.defaultPrevented).toBe(true);
				// The widget's own handler must not run, or the message lands in the
				// transcript anyway.
				expect(blocked.propagationStopped).toBe(true);
			},
		);

		it('asks the shell to open its connect panel when it blocks', () => {
			const { submit, sendStatus, posted } = page();

			sendStatus(notReady);
			submit('click');

			expect(posted).toEqual([{ message: { type: 'n8n-chat-connect-requested' }, options: '*' }]);
		});

		it('blocks in test mode too, since the server refuses builders as well', () => {
			const { submit, sendStatus } = page();

			sendStatus({ ready: false, missingCount: 1, testMode: true });

			expect(submit('click').defaultPrevented).toBe(true);
		});

		it('ignores a readiness signal that did not come from the shell', () => {
			const { submit, sendStatus } = page();

			sendStatus(notReady, { notTheParent: true });

			expect(submit('click').defaultPrevented).toBe(false);
		});

		it('leaves Shift+Enter alone, which is a newline not a send', () => {
			const { sendStatus, submit } = page();
			sendStatus(notReady);

			const blocked = submit('enter', { shiftKey: true });

			expect(blocked.defaultPrevented).toBe(false);
			expect(blocked.propagationStopped).toBe(false);
		});
	});

	it('leaves a rejected loadPreviousSession alone', async () => {
		// The gate excludes it server-side, but this fetch is shared: answering it with
		// a chat notice would replace the restored conversation with one bot message.
		const { win, posted, textarea } = runGateScript({
			enableStreaming: true,
			response: new Response(JSON.stringify(GATE_BODY), { status: 428 }),
		});

		const answer = (await win.fetch('http://test.com/webhook', {
			method: 'POST',
			body: JSON.stringify({ action: 'loadPreviousSession', sessionId: 's-1' }),
		})) as unknown as Response;

		expect(answer.status).toBe(428);
		expect(posted).toEqual([]);
		expect(textarea.value).toBe('');
	});

	it("never reaches into the widget's DOM", async () => {
		const script = gateScriptOf(
			createPage({ ...baseParams, enableStreaming: false, frameIdentity }),
		);

		// No dependency on widget markup, so a rename inside `@n8n/chat` cannot
		// silently break this page.
		expect(script).not.toContain('data-test-id');
		expect(script).not.toContain('querySelector');
	});

	it('passes a successful send straight through', async () => {
		const { win, posted } = runGateScript({
			enableStreaming: false,
			response: new Response(JSON.stringify({ output: 'Sure' }), { status: 200 }),
		});

		const answer = (await win.fetch('http://test.com/webhook', {
			method: 'POST',
			body: sendBody('hello'),
		})) as unknown as Response;

		expect(answer.status).toBe(200);
		expect(posted).toEqual([]);
	});
});
