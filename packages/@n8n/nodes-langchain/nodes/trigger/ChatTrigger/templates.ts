import sanitizeHtml from 'sanitize-html';

import type {
	AuthenticationChatOption,
	ChatFrameIdentity,
	LoadPreviousSessionChatOption,
} from './types';

// Escapes what would let a value break out of an inline <script> block: `<`/`>`
// to prevent `</script>` breakout, and U+2028/U+2029, which are valid in a JS
// string but were statement terminators to older engines.
const SCRIPT_CONTEXT_ESCAPES: Record<string, string> = {
	'<': '\\u003c',
	'>': '\\u003e',
	'&': '\\u0026',
	'\u2028': '\\u2028',
	'\u2029': '\\u2029',
};

// Returns a JSON literal safe to embed inside an inline <script> block. For string
// inputs the returned literal includes surrounding double quotes — do not add
// quotes at the call site.
export function escapeForScriptContext(value: string | object): string {
	return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (c) => SCRIPT_CONTEXT_ESCAPES[c]);
}

function sanitizeUserInput(input: unknown): string {
	// Only strings and numbers are meaningful display values; sanitize-html
	// requires a string input, so coerce numbers and drop everything else.
	const value = typeof input === 'string' ? input : typeof input === 'number' ? String(input) : '';
	// Sanitize HTML tags and entities
	let sanitized = sanitizeHtml(value, {
		allowedTags: [],
		allowedAttributes: {},
	});
	// Remove dangerous protocols
	sanitized = sanitized.replace(/javascript:/gi, '');
	sanitized = sanitized.replace(/data:/gi, '');
	sanitized = sanitized.replace(/vbscript:/gi, '');
	return sanitized;
}

export function getSanitizedInitialMessages(initialMessages: string): string[] {
	const sanitizedString = sanitizeUserInput(initialMessages);

	return sanitizedString
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line !== '');
}

export function getSanitizedI18nConfig(config: Record<string, string>): Record<string, string> {
	const sanitized: Record<string, string> = {};

	for (const [key, value] of Object.entries<string>(config)) {
		sanitized[key] = sanitizeUserInput(value);
	}

	return sanitized;
}
export function getSanitizedCustomCss(customCss: string): string {
	// Strip any sequence that could close the <style> context.
	// Browsers treat </style followed by /, space, tab, or > as a closing tag,
	// so we remove all </style variants (case-insensitive) to prevent breakout.
	return customCss.replace(/<\/style/gi, '');
}

/**
 * `localStorageSessionIdKey` in `@n8n/chat/src/constants/localStorage.ts`. Seeding the
 * shim under it keeps continuity working against a widget build predating the
 * `sessionId` option — the bundle comes from an unpinned CDN URL, not the instance.
 * The shell that passes the id in the fragment is `chat-shell.handlebars`.
 */
const WIDGET_SESSION_ID_KEY = 'n8n-chat/sessionId';

/**
 * Runs before the widget's module script (classic inline scripts aren't deferred). Both
 * jobs follow from the frame having no origin: stand in for `localStorage`, which the
 * widget touches at startup and which throws here, and read the session id the shell
 * passes in the fragment.
 */
const innerBootstrapScript = `
			<script>
				(function () {
					var store = Object.create(null);
					var shim = {
						getItem: function (key) { return key in store ? store[key] : null; },
						setItem: function (key, value) { store[key] = String(value); },
						removeItem: function (key) { delete store[key]; },
						clear: function () { store = Object.create(null); },
						key: function (index) {
							var keys = Object.keys(store);
							return index < keys.length ? keys[index] : null;
						},
						get length() { return Object.keys(store).length; },
					};
					try {
						Object.defineProperty(window, 'localStorage', { value: shim, configurable: true });
					} catch (error) {}

					var match = /(?:^|&)sessionId=([^&]*)/.exec(window.location.hash.slice(1));
					window.__n8nChatSessionId = match ? decodeURIComponent(match[1]) : '';
					if (window.__n8nChatSessionId) {
						shim.setItem(${escapeForScriptContext(WIDGET_SESSION_ID_KEY)}, window.__n8nChatSessionId);
					}
				})();
			</script>`;

export function createPage({
	instanceId,
	webhookUrl,
	showWelcomeScreen,
	loadPreviousSession,
	i18n: { en },
	initialMessages,
	authentication,
	allowFileUploads,
	allowedFilesMimeTypes,
	customCss,
	enableStreaming,
	frameIdentity,
}: {
	instanceId: string;
	webhookUrl?: string;
	showWelcomeScreen?: boolean;
	loadPreviousSession?: LoadPreviousSessionChatOption;
	i18n: {
		en: Record<string, string>;
	};
	initialMessages: string;
	mode: 'test' | 'production';
	authentication: AuthenticationChatOption;
	allowFileUploads?: boolean;
	allowedFilesMimeTypes?: string;
	customCss?: string;
	enableStreaming?: boolean;
	/**
	 * Set only for the render inside the shell's sandboxed frame, carrying the identity the
	 * server resolved for it. Absent means the single-document render, which resolves its
	 * own identity in the browser (or has none, under `none`/`basicAuth`).
	 */
	frameIdentity?: ChatFrameIdentity;
}) {
	const validAuthenticationOptions: AuthenticationChatOption[] = [
		'none',
		'basicAuth',
		'n8nUserAuth',
	];
	const validLoadPreviousSessionOptions: LoadPreviousSessionChatOption[] = [
		'manually',
		'memory',
		'notSupported',
	];

	const sanitizedAuthentication = validAuthenticationOptions.includes(authentication)
		? authentication
		: 'none';
	const sanitizedShowWelcomeScreen = !!showWelcomeScreen;
	const sanitizedAllowFileUploads = !!allowFileUploads;
	const sanitizedAllowedFilesMimeTypes = sanitizeUserInput(allowedFilesMimeTypes?.toString() ?? '');
	const sanitizedCustomCss = getSanitizedCustomCss(customCss?.toString() ?? '');

	const sanitizedLoadPreviousSession = validLoadPreviousSessionOptions.includes(
		loadPreviousSession as LoadPreviousSessionChatOption,
	)
		? loadPreviousSession
		: 'notSupported';

	const sanitizedInitialMessages = getSanitizedInitialMessages(initialMessages);
	const sanitizedI18nConfig = getSanitizedI18nConfig(en || {});

	const shellInner = frameIdentity !== undefined;

	// How the page learns who the visitor is. The `/rest/login` bootstrap can only work on
	// the real origin: from the frame's opaque origin the request carries no cookie, and the
	// `/signin` it falls back to would render editor-ui inside the sandbox. So the inner
	// render omits that branch outright — nothing at runtime decides it — and takes the
	// identity resolved server-side, field by field so nothing else on the user object
	// reaches the page. The unsplit render is reproduced verbatim, vestigial
	// `injectedVisitor` indirection and all, so its page stays byte-for-byte what it was.
	const identityBootstrap = !frameIdentity
		? `const authentication = '${sanitizedAuthentication}';
					const injectedVisitor = null;
					let metadata;
					if (injectedVisitor) {
						metadata = { user: injectedVisitor };
					} else if (authentication === 'n8nUserAuth') {
						try {
							const response = await fetch('/rest/login', {
									method: 'GET',
									headers: { 'browser-id': localStorage.getItem('n8n-browserId') }
							});

							if (response.status !== 200) {
								throw new Error('Not logged in');
							}

							const responseData = await response.json();
							metadata = {
								user: {
									id: responseData.data.id,
									firstName: responseData.data.firstName,
									lastName: responseData.data.lastName,
									email: responseData.data.email,
								},
							};
						} catch (error) {
							window.location.href = '/signin?redirect=' + window.location.href;
							return;
						}
					}`
		: `const metadata = { user: ${escapeForScriptContext({
				id: frameIdentity.visitor.id,
				firstName: frameIdentity.visitor.firstName,
				lastName: frameIdentity.visitor.lastName,
				email: frameIdentity.visitor.email,
			})} };`;

	return `<!doctype html>
	<html lang="en">
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1">
			<title>Chat</title>
			<link href="https://cdn.jsdelivr.net/npm/normalize.css@8.0.1/normalize.min.css" rel="stylesheet" />
			<link href="https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css" rel="stylesheet" />
			<style>
				html,
				body,
				#n8n-chat {
					width: 100%;
					height: 100%;
				}
			</style>
			<style>${sanitizedCustomCss}</style>
		</head>
		<body>${shellInner ? innerBootstrapScript : ''}
			<script type="module">
				import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

				(async function () {
					${identityBootstrap}

					createChat({
						mode: 'fullscreen',
						webhookUrl: ${escapeForScriptContext(webhookUrl ?? '')},
						showWelcomeScreen: ${sanitizedShowWelcomeScreen},
						loadPreviousSession: ${sanitizedLoadPreviousSession !== 'notSupported'},
						metadata: metadata,
						${shellInner ? 'sessionId: window.__n8nChatSessionId || undefined,' : ''}
						webhookConfig: {
							headers: {
								'X-Instance-Id': '${instanceId}',
								${frameIdentity ? `'x-auth-token': ${escapeForScriptContext(frameIdentity.authToken)},` : ''}
							}
						},
						allowFileUploads: ${sanitizedAllowFileUploads},
						allowedFilesMimeTypes: ${escapeForScriptContext(sanitizedAllowedFilesMimeTypes)},
						i18n: {
							${Object.keys(sanitizedI18nConfig).length ? `en: ${escapeForScriptContext(sanitizedI18nConfig)},` : ''}
						},
						${sanitizedInitialMessages.length ? `initialMessages: ${escapeForScriptContext(sanitizedInitialMessages)},` : ''}
						enableStreaming: ${!!enableStreaming},
					});
				})();
			</script>
		</body>
	</html>`;
}
