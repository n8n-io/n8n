import type { BrowserUseState } from '@/types';

const BROWSER_USE_EXTENSION_URL =
	'https://chromewebstore.google.com/detail/n8n-browser-use/cegmdpndekdfpnafgacidejijecomlhh';

const CAPABILITY_COMPACT = `*browser* (automate user's real browser session; requires "n8n Browser Use" Chrome extension: ${BROWSER_USE_EXTENSION_URL})`;

const CAPABILITY_BULLET = `- *browser* - Automate user's browser to access web pages and do tasks on user's behalf. Use when you need access to user's browser session, e.g. creating credentials with user's accounts. Requires installing "n8n Browser Use" Chrome extension from Chrome Web Store: ${BROWSER_USE_EXTENSION_URL}`;

/** `compact` is absent where the compact paragraph folds a signal into its neighbour. */
const SIGNALS: Array<{ bullet: string; compact?: string }> = [
	{
		compact: "credential/OAuth/API-key setup through service's web portal",
		bullet:
			'- **Credential / OAuth setup** — user needs to set up, create, configure, or connect credentials for any service requiring OAuth or API key generation through web portal (Slack, Google, Microsoft, HubSpot, Notion, Stripe, Twilio, etc.)',
	},
	{
		compact: 'authenticated web research or form/frontend testing',
		bullet:
			'- **Authenticated web research** — user wants to check something on site they’re logged into, or gather data from web-based tool',
	},
	{
		bullet:
			'- **Form / frontend testing** — user is building n8n forms or web app with n8n as backend and wants end-to-end testing',
	},
];

const CONNECT_INSTRUCTIONS =
	'To connect, user should select + button beside the chat input, then "Connect browser", then follow setup dialog instructions.';

/** Not connected: cover only what Browser Use is and how to connect, not the
 *  operational rules. */
function getNotConnectedPrompt(): string {
	const signals = SIGNALS.map((s) => s.compact).filter(
		(text): text is string => text !== undefined,
	);
	return `## Browser Use

This instance supports "Browser Use": connecting to user's browser with capability ${CAPABILITY_COMPACT}.

Browser Use is NOT currently connected — do NOT attempt to use browser tools. Proactively suggest connecting when user needs: ${signals.join('; or ')}.

${CONNECT_INSTRUCTIONS}`;
}

function getConnectedPreamble(): string {
	return `
## Browser Use
This instance supports "Browser Use", which allows connecting to user's browser and executing following functionality:
${CAPABILITY_BULLET}

Users can reconnect Browser Use at any time, so always rely on Browser Use status and available tools, not conversation history.

### When to suggest or use Browser Use

Proactively suggest Browser Use (or use directly if connected) when you detect these signals:

${SIGNALS.map((s) => s.bullet).join('\n')}
`;
}

export function getBrowserUsePrompt({ state }: { state: BrowserUseState | undefined }): string {
	if (!state || state.status === 'unavailable') return '';
	if (state.status === 'disconnected') return getNotConnectedPrompt();

	return [
		getConnectedPreamble(),
		'\n### Browser Use status',
		'Browser Use is connected.',
		`
### Browser Use - Browser Automation rules

You can control user's browser using browser_* tools. It is their real browser; you share it with them.

#### Handing control to the user

When user needs to act in browser, **end your turn** with clear message explaining what they should do. Resume after they reply. Hand off when:
- **Authentication** — login pages, OAuth, SSO, 2FA/MFA prompts
- **CAPTCHAs or visual challenges** — you cannot solve these
- **Accessing downloads** — you can click download buttons, but you cannot open or read downloaded files; ask user to open file and share content you need
- **User requests manual control** — they explicitly want to do something themselves

After user confirms they're done, take snapshot to verify before continuing.

#### Secrets and sensitive data

**NEVER include passwords, API keys, tokens, or secrets in your chat messages** — even if visible on a page. Snapshots and other tool outputs replace secrets with numbered redaction markers like \`[REDACTED:openai_api_key:1]\`. Treat marker as opaque — never try to read, decode, or echo underlying value. To put secret into n8n credential, use capture flow below; do not ask user to copy it to chat.

If visual tool (\`browser_screenshot\`, \`browser_evaluate\`, \`browser_pdf\`) refuses with \`reason: "sensitive_context"\`, page has visible secrets — switch to \`browser_snapshot\`, always safe.

#### Creating credentials from the browser

When user asks to set up credentials in external service console,
or when \`credentials(action="setup")\` returns \`needsBrowserSetup=true\`, load
the \`credential-setup-with-browser-use\` skill and follow it. Use
\`browser_capture_secret\` and \`browser_create_credential\` for visible
secrets; never ask user to paste secret values into chat.

#### When browser tools fail at runtime

The browser_navigate tool requires a connected tab to already be open. For fresh browser connection or when browser_navigate fails, use browser_tab_open to open url in new tab.
If browser_* tool call fails because browser is unreachable (e.g. connection lost, extension not responding), ask user to verify **n8n Browser Use** Chrome extension is installed and connected. If needed, they can reinstall from Chrome Web Store: ${BROWSER_USE_EXTENSION_URL}`,
	].join('\n');
}
