import type { ComputerUseChannel, ComputerUseState } from '@/types';

const BROWSER_USE_EXTENSION_URL =
	'https://chromewebstore.google.com/detail/n8n-browser-use/cegmdpndekdfpnafgacidejijecomlhh';

/** Prose order for the + menu entries. */
const CHANNEL_ORDER: ComputerUseChannel[] = ['localComputer', 'browser'];

/**
 * One table owns which channel provides each capability, in both prose forms the
 * prompt needs, so the connected and not-connected sections cannot disagree about
 * what the user can reach.
 */
const CAPABILITIES: Array<{
	channel: ComputerUseChannel;
	/** Compact, for the not-connected paragraph. */
	compact: string;
	/** Bulleted, for the connected preamble. */
	bullet: string;
}> = [
	{
		channel: 'localComputer',
		compact: '*filesystem* (read/write local files)',
		bullet:
			'- *filesystem* - read/write files. Use when users want to include own files in automation.',
	},
	{
		channel: 'localComputer',
		compact: '*shell* (run local commands)',
		bullet:
			"- *shell* - Execute shell commands. Use when needed or asked to execute commands on user's computer",
	},
	{
		channel: 'browser',
		compact: `*browser* (automate user's real browser session; requires "n8n Browser Use" Chrome extension: ${BROWSER_USE_EXTENSION_URL})`,
		bullet: `- *browser* - Automate user's browser to access web pages and do tasks on user's behalf. Use when you need user's browser session, e.g. creating credentials with user's accounts. Requires "n8n Browser Use" Chrome extension from Chrome Web Store: ${BROWSER_USE_EXTENSION_URL}`,
	},
	{
		channel: 'localComputer',
		compact: '*screenshot*/*mouse-keyboard* (never advertise or use unless explicitly requested)',
		bullet:
			"- *screenshot*, *mouse-keyboard* - control user's mouse, keyboard; take screenshots (do not advertise or use unless user explicitly asks)",
	},
];

/** `channels` lists every channel a signal needs, so a signal spanning both is
 *  dropped unless both are available. `compact` is absent where the compact
 *  paragraph folds a signal into its neighbour. */
const SIGNALS: Array<{
	channels: ComputerUseChannel[];
	bullet: string;
	compact?: string;
}> = [
	{
		channels: ['browser'],
		compact: "credential/OAuth/API-key setup through service's web portal (*browser*)",
		bullet:
			'- **Credential / OAuth setup** — user needs to set up, create, configure, or connect credentials for service requiring OAuth or API key generation through web portal (Slack, Google, Microsoft, HubSpot, Notion, Stripe, Twilio, etc.) → *browser*',
	},
	{
		channels: ['localComputer'],
		compact:
			'a local file (PDF, CSV, spec) as context, or docs/exports written to files (*filesystem*)',
		bullet:
			'- **Local file as context** — user mentions file, PDF, CSV, spec, or requirements doc to use as reference while building workflow → *filesystem*',
	},
	{
		channels: ['localComputer'],
		bullet:
			'- **Documentation / output to files** — user asks to document, write up, export, or save workflow description, runbook, or handover doc → *filesystem*',
	},
	{
		channels: ['browser'],
		compact: 'authenticated web research or form/frontend testing (*browser*)',
		bullet:
			'- **Authenticated web research** — user wants to check something on a site they’re logged into, or gather data from a web-based tool → *browser*',
	},
	{
		channels: ['browser'],
		bullet:
			'- **Form / frontend testing** — user builds n8n forms or web app with n8n as backend and wants end-to-end testing → *browser*',
	},
	{
		channels: ['localComputer'],
		compact: 'local commands or debugging (*shell*)',
		bullet:
			'- **Shell / environment** — user asks to run command (curl, CLI, DB query), automate something locally, or debug connectivity → *shell*',
	},
	{
		channels: ['browser', 'localComputer'],
		compact: 'migration from Make/Zapier or similar (*browser* + *filesystem*)',
		bullet:
			'- **Platform migration** — user wants to migrate from Make, Zapier, or other automation platform, or replicate existing workflow from it → *browser* + *filesystem*',
	},
];

/** "a", "a and b", "a, b, and c" — Oxford comma, matching the prose style below. */
function joinPhrases(parts: string[]): string {
	if (parts.length <= 1) return parts[0] ?? '';
	if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
	return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

/** Semicolon-separated, "; or " before the last — the not-connected signal list. */
function joinSignals(parts: string[]): string {
	if (parts.length <= 1) return parts[0] ?? '';
	return `${parts.slice(0, -1).join('; ')}; or ${parts[parts.length - 1]}`;
}

function availableChannels(state: ComputerUseState): ComputerUseChannel[] {
	return CHANNEL_ORDER.filter((channel) => state[channel].status !== 'unavailable');
}

/** Tool categories every connected channel serves, deduped: the daemon can serve
 *  browser tools alongside the extension session, so a category is not tied to
 *  one channel. */
function liveToolCategories(state: ComputerUseState): string[] {
	return [
		...new Set(
			CHANNEL_ORDER.flatMap((channel) => {
				const channelState = state[channel];
				return channelState.status === 'connected' ? channelState.toolCategories : [];
			}),
		),
	];
}

function getCapabilityList(available: ComputerUseChannel[], form: 'compact' | 'bullet'): string[] {
	return CAPABILITIES.filter((c) => available.includes(c.channel)).map((c) => c[form]);
}

function getSignalList(available: ComputerUseChannel[], form: 'compact' | 'bullet'): string[] {
	return SIGNALS.filter((s) => s.channels.every((c) => available.includes(c)))
		.map((s) => (form === 'bullet' ? s.bullet : s.compact))
		.filter((text): text is string => text !== undefined);
}

function getConnectInstructions(available: ComputerUseChannel[]): string {
	const lead = 'To connect, user selects + button beside the chat input.';
	const localClause =
		'"Connect local computer" for filesystem, shell, and other local capabilities';

	if (available.includes('browser') && available.includes('localComputer')) {
		return `${lead} They select "Connect browser" for browser automation, or ${localClause}, then follow setup dialog instructions.`;
	}
	if (available.includes('browser')) {
		return `${lead} They select "Connect browser", then follow setup dialog instructions.`;
	}
	return `${lead} They select ${localClause}, then follow setup dialog instructions.`;
}

/** Not connected: cover only what Computer Use is and how to connect, not the
 *  operational rules. */
function getNotConnectedPrompt(available: ComputerUseChannel[]): string {
	return `## Computer Use

This instance supports "Computer Use": connecting to user's computer with capabilities ${joinPhrases(getCapabilityList(available, 'compact'))}. Users choose which capabilities to enable and can reconnect with different set.

Computer Use is NOT currently connected — do NOT attempt to use Computer Use tools. Proactively suggest connecting when user needs: ${joinSignals(getSignalList(available, 'compact'))}.

${getConnectInstructions(available)}`;
}

function getConnectedPreamble(available: ComputerUseChannel[]): string {
	return `
## Computer Use
This instance supports "Computer Use", which connects to user's computer and provides following functionality:
${getCapabilityList(available, 'bullet').join('\n')}

Users control this functionality and can enable only tools they want to provide.
Users can reconnect Computer Use with different functionality set, so always rely on Computer Use status and available tools, not conversation history.

### When to suggest or use Computer Use

Proactively suggest Computer Use (or use directly if connected) when you detect these signals:

${getSignalList(available, 'bullet').join('\n')}
`;
}

export function getComputerUsePrompt({ state }: { state: ComputerUseState | undefined }): string {
	if (!state) return '';

	const available = availableChannels(state);
	if (available.length === 0) return '';

	const connectedChannels = CHANNEL_ORDER.filter(
		(channel) => state[channel].status === 'connected',
	);
	if (connectedChannels.length === 0) return getNotConnectedPrompt(available);

	const liveCategories = liveToolCategories(state);
	const promptParts: string[] = [getConnectedPreamble(available), '\n### Computer Use status'];

	if (liveCategories.length === 0) {
		promptParts.push('Computer Use is connected, but the user did not enable any capabilities');
	} else {
		promptParts.push(
			`Computer Use is connected, the user has enabled following capabilities: ${liveCategories.join(',')}`,
		);
	}

	if (liveCategories.includes('filesystem')) {
		promptParts.push(`
### Computer Use - Filesystem Exploration

Keep exploration shallow: start at depth 1–2, prefer \`search\` over browsing, and read specific files rather than whole directories.`);
	}

	if (liveCategories.includes('browser')) {
		promptParts.push(`
### Computer Use - Browser Automation rules

You control user's browser with browser_* tools. It is their real browser, shared with them.

#### Handing control to the user

When user must act in browser, **end your turn** with clear message explaining what to do. Resume after they reply. Hand off when:
- **Authentication** — login pages, OAuth, SSO, 2FA/MFA prompts
- **CAPTCHAs or visual challenges** — you cannot solve these
- **Accessing downloads** — you can click download buttons, but cannot open or read downloaded files; ask user to open file and share needed content
- **User requests manual control** — they explicitly want to act themselves

After user confirms done, take snapshot to verify before continuing.

#### Secrets and sensitive data

**NEVER include passwords, API keys, tokens, or secrets in chat messages** — even if visible on page. Snapshots and other tool outputs replace secrets with numbered redaction markers like \`[REDACTED:openai_api_key:1]\`. Treat marker as opaque — never read, decode, or echo underlying value. To put a secret into an n8n credential, use capture flow below; do not ask user to copy it to chat.

If visual tool (\`browser_screenshot\`, \`browser_evaluate\`, \`browser_pdf\`) refuses with \`reason: "sensitive_context"\`, page has visible secrets — switch to \`browser_snapshot\`, always safe.

#### Creating credentials from the browser

When user asks to set up credentials in external service console,
or when \`workflow_builder_credentials(action="setup")\` returns \`needsBrowserSetup=true\`, load
the \`credential-setup-with-computer-use\` skill and follow it. Use
\`browser_capture_secret\` and \`browser_create_credential\` for visible
secrets; never ask user to paste secret values into chat.

#### When browser tools fail at runtime

browser_navigate tool requires a connected tab to already be open. For fresh browser connection or when browser_navigate fails, use browser_tab_open to open url in new tab.
If browser_* tool call fails because browser is unreachable (e.g. connection lost, extension not responding), ask user to verify **n8n Browser Use** Chrome extension is installed and connected. If needed, they can reinstall from Chrome Web Store: ${BROWSER_USE_EXTENSION_URL}`);
	} else if (available.includes('browser')) {
		promptParts.push(`
### Browser Automation (Disabled in Computer Use)

Browser tools not connected. If user asks for browser automation, tell them to select + button beside the chat input, select "Connect browser", and follow setup instructions. Setup requires n8n Browser Use Chrome extension from Chrome Web Store: ${BROWSER_USE_EXTENSION_URL}`);
	} else {
		promptParts.push(`
### Browser Automation (Unavailable)

Browser automation not available on this instance. If user asks for it, say so plainly — do not point them at a setup flow or browser extension.`);
	}

	// The channels connect separately, so one can be live while the other is
	// still only offered. Say so rather than implying the local tools exist.
	// `disabledByUser` reads the same as `disconnected` here: the client renders
	// the entry either way, and selecting it clears the user's own preference.
	const localComputerStatus = state.localComputer.status;
	if (localComputerStatus === 'disconnected' || localComputerStatus === 'disabledByUser') {
		promptParts.push(`
### Local Computer (Not Connected)

User's local computer not connected, so filesystem, shell, and other local tools are unavailable. If user needs them, tell them to select + button beside the chat input, select "Connect local computer", and follow setup instructions.`);
	}

	return promptParts.join('\n');
}
