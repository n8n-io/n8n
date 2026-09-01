import sanitizeHtml from 'sanitize-html';

import { CHAT_FRAME_SANDBOX } from './shell';
import type {
	AuthenticationChatOption,
	ChatFrameIdentity,
	LoadPreviousSessionChatOption,
} from './types';

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
 * Runs before the widget's module script (classic inline scripts aren't deferred). The
 * first two jobs follow from the frame having no origin: stand in for `localStorage`,
 * which the widget touches at startup and which throws here, and read the session id the
 * shell passes in the fragment. The third is the auth channel — this document opens the
 * `MessagePort` the shell delivers rotated tokens down, so the channel belongs to this
 * document and no later one can inherit it.
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

					// The widget reads this same object on every send, so writing the rotated
					// token into it in place is all a refresh has to do. Created here, before
					// the module script, so a token that lands early is never dropped.
					window.__n8nChatAuthHeaders = {};

					// A private channel rather than a window listener: the port is an object in
					// this document's realm, so it dies with this document. If author script
					// navigates the frame away, the replacement can't obtain the port and the
					// shell's next token reaches nothing.
					try {
						var channel = new MessageChannel();
						// Assigning onmessage implicitly starts the port. No sender check is needed
						// or possible: a port has one peer, and only the shell holds it.
						channel.port1.onmessage = function (event) {
							var data = event.data;
							if (!data || data.type !== 'n8n-chat-auth-token') return;
							if (typeof data.token !== 'string' || !data.token) return;
							window.__n8nChatAuthHeaders['x-auth-token'] = data.token;
						};
						window.parent.postMessage({ type: 'n8n-chat-frame-ready' }, '*', [channel.port2]);
					} catch (error) {
						// Announce anyway, with no port: that closes the shell's latch, so a document
						// loaded here later cannot claim the channel we failed to open.
						try { window.parent.postMessage({ type: 'n8n-chat-frame-ready' }, '*'); } catch (postError) {}
					}
				})();
			</script>`;

/**
 * The trusted shell: an n8n-controlled document on the real origin holding nothing but
 * the frame. Everything the author can shape lives in that frame, which has no origin
 * and so can't reach this document's cookies or the OAuth `BroadcastChannel`.
 */
export function createShellPage({
	iframeSrc,
	refresh,
}: {
	iframeSrc: string;
	/**
	 * Set only on the OAuth2 path: where to ask for a fresh access token, and how many
	 * seconds the one the frame was just handed has left. A duration, never an absolute
	 * timestamp — see `ChatShellSession`. Absent leaves the shell exactly what it was
	 * before refresh existed.
	 */
	refresh?: { url: string; expiresIn: number };
}) {
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
		></iframe>${refresh ? refreshScript(refresh) : ''}
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

/**
 * Keeps the frame's access token alive. The token is interpolated into the frame's HTML
 * once and frozen for the life of that document, so without this a conversation older
 * than the token fails every message with a 401.
 *
 * Lives on the shell, not in the frame: the refresh token is in an httpOnly cookie
 * scoped to this path, and only a same-origin request carries it. The shell never reads
 * that cookie either — it only asks the server to trade it.
 */
function refreshScript({ url, expiresIn }: { url: string; expiresIn: number }): string {
	return `
		<script>
			(function () {
				var endpoint = ${escapeForScriptContext(url)};
				var timer = null;
				var reloaded = false;

				// Every token goes down a port the frame handed us, never at its contentWindow:
				// that names the browsing context, which survives a navigation, so author script
				// that navigates the frame away would be handed the next token. A port is an
				// object in the frame document's realm — it dies with that document, and no
				// replacement can obtain it.
				var frame = document.getElementById('n8n-chat-frame');
				var port = null;
				var latched = false;
				var pendingToken = '';
				var portTimer = null;

				window.addEventListener('message', function (event) {
					// First announcement wins, and the latch never re-arms: the inner document is
					// already unreloadable (its one-hop cookie is consumed on the first GET), so a
					// second announcement can only come from a document we must not hand a token.
					if (latched) return;
					// allow-popups means a popup the frame opened can reach us as opener.parent,
					// so the sender has to be the frame itself.
					if (!frame || event.source !== frame.contentWindow) return;
					var data = event.data;
					if (!data || data.type !== 'n8n-chat-frame-ready') return;
					latched = true;
					if (event.ports && event.ports.length) port = event.ports[0];
					if (portTimer) { clearTimeout(portTimer); portTimer = null; }
					if (!port) {
						// This browser can't carry a token to the frame. Stop: the frame keeps the
						// token baked into its HTML for its full hour, as it did before refresh existed.
						if (timer) { clearTimeout(timer); timer = null; }
						return;
					}
					if (pendingToken) {
						port.postMessage({ type: 'n8n-chat-auth-token', token: pendingToken });
						pendingToken = '';
					}
				});

				function deliver(token) {
					if (port) { port.postMessage({ type: 'n8n-chat-auth-token', token: token }); return; }
					// Hold the newest token rather than lose a one-shot post: a refresh can beat
					// the frame's own bootstrap.
					pendingToken = token;
					if (!portTimer) portTimer = setTimeout(portMissing, 10000);
				}

				function portMissing() {
					portTimer = null;
					if (port) return;
					// No fallback that posts at the frame's own window: a document that navigated
					// the frame simply never announces itself, so the fallback would be the exact
					// path that hands it the token. Reload instead — guarded, same-origin.
					giveUp();
				}

				// How long BEFORE expiry to refresh, not when to refresh: a fifth of the
				// lifetime, clamped to [60s, 600s]. A one-hour token is therefore replaced at
				// t+50min, leaving ten minutes of margin — enough for a throttled background
				// tab, a slept laptop, and the one retry before the reload fallback.
				function leadSeconds(lifetimeSeconds) {
					return Math.min(600, Math.max(60, lifetimeSeconds * 0.2));
				}

				// Takes a duration, never an absolute expiry the server computed: a clock that
				// disagrees with the server's would otherwise skew every schedule. This timer is
				// the only thing that starts a refresh, so two can never be in flight at once.
				function planFor(lifetimeSeconds) {
					var remaining = Math.max(0, lifetimeSeconds);
					var delay = Math.max(0, (remaining - leadSeconds(remaining)) * 1000);
					if (timer) clearTimeout(timer);
					timer = setTimeout(function () { refresh(false); }, delay);
				}

				function giveUp() {
					// One reload, guarded: it re-runs the handshake, which auto-approves against
					// the visitor's existing consent. Without the guard a broken AS would put the
					// page in a reload loop.
					if (reloaded) return;
					reloaded = true;
					window.location.reload();
				}

				function refresh(isRetry) {
					// The frame announced itself with no port, so there is nowhere to put a fresh
					// token. Reachable through the 5s retry: a request already in flight when that
					// announcement arrives still schedules one.
					if (latched && !port) return;
					// Taken before the request leaves, so the elapsed time subtracted below covers
					// the whole window — both network legs, our handler, and the AS round trip.
					// Without it the page anchors the lifetime to when the response *arrived* and
					// so always believes it has more left than it does, which is the direction
					// that ends in 401s.
					var startedAt = Date.now();
					fetch(endpoint, {
						method: 'GET',
						credentials: 'same-origin',
						cache: 'no-store',
						// Custom header, so the request needs a preflight no other origin gets
						// past. This is the CSRF guard on the leg.
						headers: { 'x-n8n-chat-refresh': '1' },
					})
						.then(function (response) {
							if (!response.ok) throw new Error('refresh failed: ' + response.status);
							return response.json();
						})
						.then(function (data) {
							if (!data || typeof data.token !== 'string' || !data.token) {
								throw new Error('refresh returned no token');
							}
							deliver(data.token);
							var lifetime = typeof data.expiresIn === 'number' ? data.expiresIn : 3600;
							planFor(lifetime - (Date.now() - startedAt) / 1000);
						})
						.catch(function () {
							if (isRetry) giveUp();
							else setTimeout(function () { refresh(true); }, 5000);
						});
				}

				planFor(${String(Math.max(0, Math.round(expiresIn)))});
			})();
		</script>`;
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

	// In the frame, the header object is hoisted out of the `createChat` literal so a
	// reference to it survives the call: `createChat` keeps this object's identity and
	// the widget reads it on every send, so the shell's refresh writes the rotated token
	// into it in place and nothing re-enters this code. The `if` covers the narrow race
	// where a refresh lands before this module script runs. The unsplit render keeps the
	// literal inline so its page stays byte-for-byte what it was.
	const headersBootstrap = frameIdentity
		? `const headers = window.__n8nChatAuthHeaders || {};
					headers['X-Instance-Id'] = '${instanceId}';
					if (!headers['x-auth-token']) headers['x-auth-token'] = ${escapeForScriptContext(frameIdentity.authToken)};

					`
		: '';
	const webhookConfigHeaders = frameIdentity
		? 'headers: headers'
		: `headers: {
								'X-Instance-Id': '${instanceId}',
								
							}`;

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

					${headersBootstrap}createChat({
						mode: 'fullscreen',
						webhookUrl: ${escapeForScriptContext(webhookUrl ?? '')},
						showWelcomeScreen: ${sanitizedShowWelcomeScreen},
						loadPreviousSession: ${sanitizedLoadPreviousSession !== 'notSupported'},
						metadata: metadata,
						${shellInner ? 'sessionId: window.__n8nChatSessionId || undefined,' : ''}
						webhookConfig: {
							${webhookConfigHeaders}
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
