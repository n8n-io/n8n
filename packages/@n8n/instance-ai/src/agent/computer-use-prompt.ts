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
- **Explicit browser inspection / screenshots** — user asks to take a screenshot, snapshot, inspect, read, or navigate the browser/page they already have open → use the browser tools directly as the first step; do not start by listing workflows, researching, or asking follow-up questions
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

When the user asks you to set up a credential and the secret is visible in the browser (typical after creating an API key in a provider's UI), capture it directly with the tools below. Do **not** hand off, and do **not** ask the user to paste the value.

Canonical sequence:

1. **Snapshot** the page with \`browser_snapshot\`. If the secret is rendered as plain text (a "your new key" modal, a \`<code>\` block), pass \`interactive: false\` — interactive-only snapshots may omit static text nodes. Secrets appear as numbered redaction markers, e.g. \`[REDACTED:openai_api_key:1]\`.
2. **Capture** each secret into the session buffer with \`browser_capture_secret\`. The \`element\` argument is a discriminated union — pick the right shape:
   - \`{ "redactedKey": "[REDACTED:openai_api_key:1]" }\` — for secrets shown as text. Match the marker by its \`:type:\` slug and surrounding context to the field you want; do **not** grab the nearby "Copy" button's ref by mistake.
   - \`{ "ref": "e12" }\` — only for secrets inside an \`<input>\` you can address by snapshot ref.
   The captured value never reaches you; the response only confirms which \`field\` was captured.
	 If the snapshot contains a ref and a "show" button for a secret field - directly capture the secret with the ref and don't click the "show" button
3. **Create** the credential with \`browser_create_credential\`. Assemble the fields:
   - \`data\` — literal, non-secret fields (URLs, IDs and other data used in given credential type).
   - \`resolveData\` — same nested shape, but every leaf string is a \`field\` name captured in step 2. The server substitutes the real secret on creation.

Example — OpenAI credential, where the user supplied an org ID in chat and the API key is on screen:

\`\`\`json
{
  "credentialsKey": "openai-setup",
  "type": "openAiApi",
  "name": "OpenAI",
  "data": { "organizationId": "org-abc123", "url": "https://api.openai.com/v1" },
  "resolveData": { "apiKey": "apiKey" }
}
\`\`\`

Use the **same \`credentialsKey\`** across all \`browser_capture_secret\` and \`browser_create_credential\` calls for one setup; otherwise \`create\` fails with "No captured fields found".

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
