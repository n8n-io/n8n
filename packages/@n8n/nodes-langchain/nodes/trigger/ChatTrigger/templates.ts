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
 * Handles the send-time credential gate's rejection, in the frame's own page rather
 * than in `@n8n/chat`: this page ships with the instance, so the behaviour arrives on
 * upgrade instead of waiting on the widget's npm publish. Mirrors the form page's
 * `handleCredentialGate`.
 *
 * The widget looks `fetch` up globally on every send, and this classic script runs
 * before its deferred module, so wrapping the global intercepts the rejection without
 * the widget knowing.
 *
 * Two layers. The first refuses the submit while accounts are outstanding, so the
 * common case never reaches the server at all. The second answers the gate's 428 for
 * what the first cannot see: a page that was ready when it loaded and had a credential
 * revoked under it, and the moments before the shell's first readiness signal arrives.
 *
 * On that second path the visitor's message stays in the transcript, because it really
 * was sent - the server received it and declined to run the workflow. The reply says
 * exactly that. Taking it back out of the transcript and into the input would need the
 * widget's own state, which this page cannot reach.
 */
function buildCredentialGateScript(streaming: boolean) {
	return `
			<script>
				(function () {
					var STREAMING = ${!!streaming};
					var NOTICE =
						'Not all required accounts are connected, so your message could not be processed. Connect them below, then send it again.';
					var nativeFetch = window.fetch.bind(window);

					// Both the status and the discriminator must match. A 428 without this body
					// belongs to something else - a proxy, or the webhook trigger's own gate.
					function isGateBody(body) {
						return (
							!!body &&
							body.status === 'credential_connections_required' &&
							Array.isArray(body.credentials)
						);
					}

					// The shell posts readiness in. The widget has its own listener for this
					// message, but the published bundle the page loads does not carry it yet, so
					// this page does the blocking itself. Accepted only from our own parent: the
					// frame is sandboxed with no origin, so \`event.origin\` cannot be checked
					// against an allowlist.
					//
					// Starts ready: until the shell says otherwise, nothing is blocked. That
					// matches the widget, which also treats "no status yet" as no gate.
					var ready = true;
					window.addEventListener('message', function (event) {
						if (window.parent === window || event.source !== window.parent) return;
						var data = event.data;
						if (!data || data.type !== 'n8n-chat:credential-status') return;
						if (typeof data.ready === 'boolean') ready = data.ready;
					});

					// Refuse the submit before the widget sees it, so a message that cannot run is
					// never sent and never appears in the transcript. Capture phase, ahead of the
					// widget's own handlers. Test mode is blocked too: the server gate refuses
					// builders as well, so letting it through only wastes a round trip.
					function blockSubmit(event) {
						event.preventDefault();
						event.stopImmediatePropagation();
						if (window.parent === window) return;
						// Asks the shell to surface its connect panel. Never a provider popup from
						// here - this frame's click doesn't hand the shell a usable gesture (it's
						// an opaque origin, by design), so a popup opened off this message would
						// just be blocked. The dialog's own Connect button is a real click there.
						window.parent.postMessage({ type: 'n8n-chat-connect-requested' }, '*');
					}

					document.addEventListener(
						'keydown',
						function (event) {
							if (ready) return;
							if (event.key !== 'Enter' || event.shiftKey) return;
							var target = event.target;
							if (!target || String(target.tagName).toLowerCase() !== 'textarea') return;
							blockSubmit(event);
						},
						true
					);

					document.addEventListener(
						'click',
						function (event) {
							if (ready) return;
							var target = event.target;
							// The send button's class is part of the widget's published theming
							// contract (\`--chat--input--send--button--*\`), so it is a safer hook than
							// its markup.
							if (!target || !target.closest || !target.closest('.chat-input-send-button')) {
								return;
							}
							blockSubmit(event);
						},
						true
					);

					// Only a message send is ours to answer. \`loadPreviousSession\` goes down this
					// same \`fetch\`, and replacing its reply with a chat notice would drop the
					// restored conversation.
					function isMessageSend(init) {
						try {
							var body = init && init.body;
							if (!body) return false;
							if (typeof FormData !== 'undefined' && body instanceof FormData) {
								return body.get('action') === 'sendMessage';
							}
							if (typeof body === 'string') {
								var parsed = JSON.parse(body);
								return !!parsed && parsed.action === 'sendMessage';
							}
						} catch (error) {}
						return false;
					}

					// Ids only: the shell must not have to trust a name or a URL from this frame.
					// targetOrigin '*' because this frame is sandboxed without allow-same-origin
					// and cannot know the parent's origin.
					function tellShell(credentials) {
						if (window.parent === window) return;
						window.parent.postMessage(
							{
								type: 'n8n-chat-credentials-rejected',
								// The body lists every required credential, connected ones included.
								ids: credentials
									.filter(function (credential) {
										return credential.credentialStatus !== 'configured';
									})
									.map(function (credential) {
										return credential.credentialId;
									}),
							},
							'*'
						);
					}

					// Answered in place of the rejection so the widget renders an ordinary bot
					// message instead of the gate's JSON. The transport decides the shape:
					// newline-delimited frames when streaming, a plain body otherwise.
					function noticeResponse() {
						var frame = { metadata: { nodeId: 'credential-gate' } };
						var body = STREAMING
							? JSON.stringify(Object.assign({ type: 'begin' }, frame)) +
								'\\n' +
								JSON.stringify(Object.assign({ type: 'item', content: NOTICE }, frame)) +
								'\\n' +
								JSON.stringify(Object.assign({ type: 'end' }, frame)) +
								'\\n'
							: JSON.stringify({ output: NOTICE });

						return new Response(body, {
							status: 200,
							headers: { 'Content-Type': STREAMING ? 'text/plain' : 'application/json' },
						});
					}

					window.fetch = function (input, init) {
						return nativeFetch(input, init).then(function (response) {
							if (response.status !== 428 || !isMessageSend(init)) return response;

							return response
								.clone()
								.json()
								.catch(function () {
									return null;
								})
								.then(function (body) {
									if (!isGateBody(body)) return response;

									tellShell(body.credentials);
									return noticeResponse();
								});
						});
					};
				})();
			</script>`;
}

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
		<body>${shellInner ? innerBootstrapScript + buildCredentialGateScript(!!enableStreaming) : ''}
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
