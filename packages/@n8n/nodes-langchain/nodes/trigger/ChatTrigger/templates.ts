import sanitizeHtml from 'sanitize-html';

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
		<body>
			<script type="module">
				import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

				(async function () {
					const authentication = '${sanitizedAuthentication}';
					let metadata;
					if (authentication === 'n8nUserAuth') {
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
						webhookConfig: {
							headers: {
								'X-Instance-Id': '${instanceId}',
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
