import type { IUser } from 'n8n-workflow';
import sanitizeHtml from 'sanitize-html';

import { CHAT_FRAME_SANDBOX } from './shell';
import type { AuthenticationChatOption, LoadPreviousSessionChatOption } from './types';

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

const SCRIPT_CONTEXT_ESCAPES: Record<string, string> = {
	'<': '\\u003c',
	'>': '\\u003e',
	'&': '\\u0026',
	'\u2028': '\\u2028',
	'\u2029': '\\u2029',
};

// Returns a JSON literal safe to embed inside an inline <script> block. Escapes
// `<`/`>` to prevent </script> breakout and U+2028/U+2029 for legacy JS engines.
// For string inputs the returned literal includes surrounding double quotes \u2014
// do not add quotes at the call site.
export function escapeForScriptContext(value: string | object): string {
	return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (c) => SCRIPT_CONTEXT_ESCAPES[c]);
}

const HTML_ATTRIBUTE_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'"': '&quot;',
	"'": '&#39;',
	'<': '&lt;',
	'>': '&gt;',
};

// For use inside a double-quoted HTML attribute.
export function escapeForHtmlAttribute(value: string): string {
	return value.replace(/[&"'<>]/g, (c) => HTML_ATTRIBUTE_ESCAPES[c]);
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

/**
 * The trusted shell: an n8n-controlled document on the real origin holding nothing but
 * the frame. Everything the author can shape lives in that frame, which has no origin
 * and so can't reach this document's cookies or the OAuth `BroadcastChannel`.
 */
export function createShellPage({ iframeSrc }: { iframeSrc: string }) {
	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>Chat</title>
		<style>
			html, body { width: 100%; height: 100%; margin: 0; padding: 0; }
			#n8n-chat-frame { display: block; width: 100%; height: 100%; border: 0; }
		</style>
	</head>
	<body>
		<iframe
			id="n8n-chat-frame"
			title="Chat"
			sandbox="${CHAT_FRAME_SANDBOX}"
			data-src="${escapeForHtmlAttribute(iframeSrc)}"
		></iframe>
		<script>
			(function () {
				// Held here, not in the frame, whose storage dies with its opaque origin on
				// every reload. Keyed by path so two chats don't share a conversation.
				var key = 'n8n-chat-shell/sessionId' + window.location.pathname;
				var sessionId = '';
				try { sessionId = window.localStorage.getItem(key) || ''; } catch (error) {}
				if (!sessionId) {
					sessionId =
						window.crypto && window.crypto.randomUUID
							? window.crypto.randomUUID()
							: String(Date.now()) + Math.random().toString(16).slice(2);
					try { window.localStorage.setItem(key, sessionId); } catch (error) {}
				}
				var frame = document.getElementById('n8n-chat-frame');
				frame.src = frame.getAttribute('data-src') + '#sessionId=' + encodeURIComponent(sessionId);
			})();
		</script>
	</body>
</html>`;
}

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
	shellInner,
	authToken,
	visitor,
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
	/** True when this page renders inside the shell's sandboxed frame. */
	shellInner?: boolean;
	/** Sent as `x-auth-token` on every message, since the frame can't send cookies. */
	authToken?: string;
	/** Injected server-side: the frame can't fetch `/rest/login` for itself. */
	visitor?: IUser;
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

	// Inner render only, where the frame's opaque origin makes the `/rest/login` bootstrap
	// below impossible. Field-by-field so nothing else on the user object reaches the page.
	const injectedVisitor =
		shellInner && visitor
			? escapeForScriptContext({
					id: visitor.id,
					firstName: visitor.firstName,
					lastName: visitor.lastName,
					email: visitor.email,
				})
			: 'null';

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
					const authentication = '${sanitizedAuthentication}';
					const injectedVisitor = ${injectedVisitor};
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
					}

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
								${shellInner && authToken ? `'x-auth-token': ${escapeForScriptContext(authToken)},` : ''}
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
