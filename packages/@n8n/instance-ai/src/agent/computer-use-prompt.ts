import { type LocalGatewayStatus } from '@/types';

const BROWSER_USE_EXTENSION_URL =
	'https://chromewebstore.google.com/detail/n8n-browser-use/cegmdpndekdfpnafgacidejijecomlhh';

export function getComputerUsePrompt({
	browserAvailable,
	localGateway,
}: {
	browserAvailable: boolean | undefined;
	localGateway: LocalGatewayStatus | undefined;
}) {
	if (localGateway && localGateway.status !== 'disabledGlobally') {
		const promptParts: string[] = [];

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
- **Sensitive content on screen** — passwords, tokens, secrets visible in the browser
- **User requests manual control** — they explicitly want to do something themselves

After the user confirms they're done, take a snapshot to verify before continuing.

#### Secrets and sensitive data

**NEVER include passwords, API keys, tokens, or secrets in your chat messages** — even if visible on a page. If the user asks you to retrieve a secret, tell them to read it directly from their browser.

#### When browser tools fail at runtime

If a browser_* tool call fails because the browser is unreachable (e.g. connection lost, extension not responding), ask the user to verify the **n8n Browser Use** Chrome extension is installed and connected. If needed, they can reinstall from the Chrome Web Store: ${BROWSER_USE_EXTENSION_URL}`);
					} else {
						promptParts.push(`
### Browser Automation (Disabled in Computer Use)

Browser tools are not enabled in the user's Computer Use configuration. If the user asks for browser automation, tell them to (1) enable browser tools in their Computer Use config, and (2) install the n8n Browser Use Chrome extension from the Chrome Web Store: ${BROWSER_USE_EXTENSION_URL}`);
					}
				} else {
					promptParts.push(
						'Computer Use is connected, but the user did not enable any capabilities',
					);
				}

				break;
			case 'disconnected':
				promptParts.push(
					`Computer Use is not connected. Do NOT attempt to use Computer Use tools — they are not available. You can provide these instructions to establish a connection:
1. open the right sidebar
2. click on the "..." button next to "Computer Use"
3. click on "Connect" and follow the instructions in the dialog`,
				);
				break;
			case 'disabled':
				promptParts.push(
					`Computer Use is not connected and not set-up. Do NOT attempt to use Computer Use tools — they are not available. You can provide these instructions to establish a connection:
1. open the right sidebar
2. click on "Setup computer use"
3. follow the instructions in the dialog`,
				);
				break;
			default:
		}

		return promptParts.join('\n');
	}

	return '';
}
