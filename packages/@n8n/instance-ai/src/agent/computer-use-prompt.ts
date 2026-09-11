import { type LocalGatewayChannel, type LocalGatewayStatus } from '@/types';

const BROWSER_USE_EXTENSION_URL =
	'https://chromewebstore.google.com/detail/n8n-browser-use/cegmdpndekdfpnafgacidejijecomlhh';

/** "a", "a and b", "a, b, and c" — Oxford comma, matching the prose style below. */
function joinPhrases(parts: string[], conjunction: string): string {
	if (parts.length <= 1) return parts[0] ?? '';
	if (parts.length === 2) return `${parts[0]} ${conjunction} ${parts[1]}`;
	return `${parts.slice(0, -1).join(', ')}, ${conjunction} ${parts[parts.length - 1]}`;
}

/** Semicolon-separated, "; or " before the last — the not-connected signal list. */
function joinSignals(parts: string[]): string {
	if (parts.length <= 1) return parts[0] ?? '';
	return `${parts.slice(0, -1).join('; ')}; or ${parts[parts.length - 1]}`;
}

/** Capability blurbs in prose order, each tagged with the channel that provides it. */
const CAPABILITY_BLURBS: Array<{ channel: LocalGatewayChannel; text: string }> = [
	{ channel: 'localComputer', text: '*filesystem* (read/write local files)' },
	{ channel: 'localComputer', text: '*shell* (run local commands)' },
	{
		channel: 'browser',
		text: `*browser* (automate the user's real browser session; requires the "n8n Browser Use" Chrome extension: ${BROWSER_USE_EXTENSION_URL})`,
	},
	{
		channel: 'localComputer',
		text: '*screenshot*/*mouse-keyboard* (never advertise or use unless explicitly requested)',
	},
];

/** "Suggest Computer Use when…" signals. `channels` lists every channel the signal
 *  needs, so a signal spanning both is dropped unless both are connectable. */
const SUGGESTION_SIGNALS: Array<{ channels: LocalGatewayChannel[]; text: string }> = [
	{
		channels: ['browser'],
		text: "credential/OAuth/API-key setup through a service's web portal (*browser*)",
	},
	{
		channels: ['localComputer'],
		text: 'a local file (PDF, CSV, spec) as context, or docs/exports written to files (*filesystem*)',
	},
	{
		channels: ['browser'],
		text: 'authenticated web research or form/frontend testing (*browser*)',
	},
	{ channels: ['localComputer'], text: 'local commands or debugging (*shell*)' },
	{
		channels: ['browser', 'localComputer'],
		text: 'migration from Make/Zapier or similar (*browser* + *filesystem*)',
	},
];

function getConnectInstructions(connectable: readonly LocalGatewayChannel[]): string {
	const lead = 'To connect, the user should select the + button beside the chat input.';
	const localClause =
		'"Connect local computer" for filesystem, shell, and other local capabilities';

	if (connectable.includes('browser') && connectable.includes('localComputer')) {
		return `${lead} They should select "Connect browser" for browser automation, or ${localClause}, then follow the instructions in the setup dialog.`;
	}
	if (connectable.includes('browser')) {
		return `${lead} They should select "Connect browser", then follow the instructions in the setup dialog.`;
	}
	return `${lead} They should select ${localClause}, then follow the instructions in the setup dialog.`;
}

/** Not connected: cover only what CU is and how to connect, not the operational rules. */
function getNotConnectedPrompt(connectable: readonly LocalGatewayChannel[]): string {
	const capabilities = joinPhrases(
		CAPABILITY_BLURBS.filter((c) => connectable.includes(c.channel)).map((c) => c.text),
		'and',
	);
	const signals = joinSignals(
		SUGGESTION_SIGNALS.filter((s) => s.channels.every((c) => connectable.includes(c))).map(
			(s) => s.text,
		),
	);

	return `## Computer Use

This instance supports "Computer Use": connecting to the user's computer with the capabilities ${capabilities}. Users choose which capabilities to enable and can reconnect with a different set.

Computer Use is NOT currently connected — do NOT attempt to use Computer Use tools. Proactively suggest connecting when the user needs: ${signals}.

${getConnectInstructions(connectable)}`;
}

export function getComputerUsePrompt({
	browserAvailable,
	localGateway,
	connectable = [],
}: {
	browserAvailable: boolean | undefined;
	localGateway: LocalGatewayStatus | undefined;
	/**
	 * The Computer Use entries the client renders in the + menu for THIS user. The
	 * client gates each entry on its own rollout, so naming one that is missing here
	 * sends the user hunting for a control they cannot see (INS-1293).
	 *
	 * Defaults to none: a caller that forgets it advertises nothing, which is the
	 * safe direction to fail.
	 */
	connectable?: readonly LocalGatewayChannel[];
}) {
	if (localGateway && localGateway.status !== 'disabledGlobally') {
		const promptParts: string[] = [];

		if (localGateway.status === 'disconnected' || localGateway.status === 'disabled') {
			// Nothing the user can reach ⇒ say nothing about Computer Use at all.
			return connectable.length === 0 ? '' : getNotConnectedPrompt(connectable);
		}
		promptParts.push(`
## Computer Use
This instance support "Computer Use", which allows connecting to user's computer and execute following functionality:
- *filesystem* - read and write files. Use it when users want to include their own files in the automation.
- *shell* - Execute shell commands. Use it when you need or are asked to execute commands on user's computer
- *browser* - Automate user's browser to access web pages and do tasks on user's behalf. Use it when you require access to user's browser session for example when creating credentials with user's accounts. Requires installing the "n8n Browser Use" Chrome extension from the Chrome Web Store: ${BROWSER_USE_EXTENSION_URL}
- *screenshot*, *mouse-keyboard* - control user's computer mouse, keyboard and do screenshots (do not advertise or use this functionality if user does not explicitly ask for it)

Users have control over this functionality and can enable only the tools they want to provide.
Users can reconnect Computer Use with different set of functionality, so always rely on Computer Use status and the available tools and not the conversation history.

### When to suggest or use Computer Use

Proactively suggest Computer Use (or use it directly if connected) when you detect these signals:

- **Credential / OAuth setup** — user needs to set up, create, configure, or connect credentials for any service that requires OAuth or API key generation through a web portal (Slack, Google, Microsoft, HubSpot, Notion, Stripe, Twilio, etc.) → *browser*
- **Local file as context** — user mentions a file, PDF, CSV, spec, or requirements doc they want to use as reference while building a workflow → *filesystem*
- **Documentation / output to files** — user asks to document, write up, export, or save a workflow description, runbook, or handover doc → *filesystem*
- **Authenticated web research** — user wants to check something on a site they're logged into, or gather data from a web-based tool → *browser*
- **Form / frontend testing** — user is building n8n forms or a web app with n8n as backend and wants end-to-end testing → *browser*
- **Shell / environment** — user asks to run a command (curl, CLI, DB query), automate something locally, or debug connectivity → *shell*
- **Platform migration** — user wants to migrate from Make, Zapier, or another automation platform, or replicate an existing workflow from it → *browser* + *filesystem*
`);

		promptParts.push(`
### Computer Use status`);

		switch (localGateway.status) {
			case 'connected':
				if (localGateway.capabilities.length > 0) {
					promptParts.push(
						`Computer Use is connected, the user has enabled following capabilities: ${localGateway.capabilities.join(',')}`,
					);
					if (localGateway.capabilities.includes('filesystem')) {
						promptParts.push(`
### Computer Use - Filesystem Exploration

Keep exploration shallow: start at depth 1–2, prefer \`search\` over browsing, and read specific files rather than whole directories.`);
					}
					if (browserAvailable) {
						promptParts.push(`
### Computer Use - Browser Automation rules

You can control the user's browser using the browser_* tools. Since this is their real browser, you share it with them.

#### Handing control to the user

When the user needs to act in the browser, **end your turn** with a clear message explaining what they should do. Resume after they reply. Hand off when:
- **Authentication** — login pages, OAuth, SSO, 2FA/MFA prompts
- **CAPTCHAs or visual challenges** — you cannot solve these
- **Accessing downloads** — you can click download buttons, but you cannot open or read downloaded files; ask the user to open the file and share the content you need
- **User requests manual control** — they explicitly want to do something themselves

After the user confirms they're done, take a snapshot to verify before continuing.

#### Secrets and sensitive data

**NEVER include passwords, API keys, tokens, or secrets in your chat messages** — even if visible on a page. Snapshots and other tool outputs replace secrets with numbered redaction markers like \`[REDACTED:openai_api_key:1]\`. Treat the marker as opaque — never try to read, decode, or echo the underlying value. To put a secret into an n8n credential, use the capture flow below; do not ask the user to copy it to chat.

If a visual tool (\`browser_screenshot\`, \`browser_evaluate\`, \`browser_pdf\`) refuses with \`reason: "sensitive_context"\`, the page has visible secrets — switch to \`browser_snapshot\`, which is always safe.

#### Creating credentials from the browser

When the user asks you to set up credentials in an external service console,
or when \`credentials(action="setup")\` returns \`needsBrowserSetup=true\`, load
the \`credential-setup-with-computer-use\` skill and follow it. Use
\`browser_capture_secret\` and \`browser_create_credential\` for visible
secrets; never ask the user to paste secret values into chat.

#### When browser tools fail at runtime

The browser_navigate tool requires a connected tab to already be open. For fresh browser connection or when browser_navigate fails use browser_tab_open to open the url in a new tab.
If a browser_* tool call fails because the browser is unreachable (e.g. connection lost, extension not responding), ask the user to verify the **n8n Browser Use** Chrome extension is installed and connected. If needed, they can reinstall from the Chrome Web Store: ${BROWSER_USE_EXTENSION_URL}`);
					} else if (connectable.includes('browser')) {
						promptParts.push(`
### Browser Automation (Disabled in Computer Use)

Browser tools are not connected. If the user asks for browser automation, tell them to select the + button beside the chat input, select "Connect browser", and follow the setup instructions. The setup requires the n8n Browser Use Chrome extension from the Chrome Web Store: ${BROWSER_USE_EXTENSION_URL}`);
					} else {
						// Browser-use is off for this user, so the + menu has no "Connect browser"
						// entry to send them to.
						promptParts.push(`
### Browser Automation (Unavailable)

Browser automation is not available on this instance. If the user asks for it, say so plainly — do not point them at a setup flow or a browser extension.`);
					}
				} else {
					promptParts.push(
						'Computer Use is connected, but the user did not enable any capabilities',
					);
				}

				break;
			default:
		}

		return promptParts.join('\n');
	}

	return '';
}
