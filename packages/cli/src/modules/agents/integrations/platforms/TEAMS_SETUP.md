# Microsoft Teams channel setup

How to connect an agent to Microsoft Teams while the channel has no setup UI.
You need an Entra tenant you can register an application in, and an Azure
subscription you can create a bot resource in.

The channel is `internal`, so it does not appear in the add-trigger UI. Step 6
gives two ways around that.

## 1. Register the application

In the [Microsoft Entra admin center](https://entra.microsoft.com) create a new
app registration. Choose **Single tenant** — the channel does not support
multi-tenant bots yet.

From the overview page, copy the **Application (client) ID** and the
**Directory (tenant) ID**.

Under **Certificates & secrets**, create a **client secret** and copy its value
immediately; Entra shows it only once. Do not create a certificate: the Teams
SDK does not support certificate authentication, and the channel rejects such a
credential at connect.

## 2. Create the Azure Bot resource

In the [Azure portal](https://portal.azure.com) create an **Azure Bot**
resource. For **Microsoft App ID**, choose the existing app registration from
step 1 rather than letting Azure create a new one — the bot and the credential
must be the same identity.

## 3. Set the messaging endpoint

The bot's messaging endpoint is the n8n webhook URL for the agent:

```
{publicBaseUrl}/rest/projects/{projectId}/agents/v2/{agentId}/webhooks/teams
```

Take `projectId` and `agentId` from the agent's URL in n8n.

Paste it into the bot resource under **Settings → Configuration → Messaging
endpoint**.

### Local instances need a tunnel

Azure pushes activities to this endpoint, and Teams has no polling mode to fall
back on, so the host must be reachable over public HTTPS. `n8n --tunnel` no
longer exists, so run your own:

```bash
cloudflared tunnel --url http://localhost:5678
# or: ngrok http 5678
```

Use the tunnel hostname in the endpoint URL above.

A free Cloudflare quick tunnel gets a new hostname every restart, and Azure
holds only the hostname you last pasted. Use a named tunnel to keep one
hostname across restarts.

### `N8N_WEBHOOK_URL`

```bash
N8N_WEBHOOK_URL=https://your-tunnel.example.com
```

This is the env var behind `UrlService.getWebhookBaseUrl()`. The deprecated
`WEBHOOK_URL` still works, and the new name wins when both are set.

Teams does not need it. `webhookUrlFor()` reads that base URL, and this channel
never calls it, because there is no endpoint to register. Inbound activities
reach whatever path you gave Azure. Set it anyway, so every other absolute URL
n8n builds matches the tunnel — but a wrong value will not stop Teams from
working, the way it would stop Telegram.

Unlike Telegram, n8n cannot register this for you. The endpoint lives on the
Azure Bot resource, so setting it needs Azure management credentials rather
than the bot credential n8n holds — there is an ARM API for it, but nothing the
bot identity can call. Hence the manual step, and hence the setup stepper the
channel waits on before it goes public.

## 4. Enable the Teams channel

On the bot resource, open **Channels** and add **Microsoft Teams**.

## 5. Install the bot in the tenant

A Teams app package is three files in a **flat** zip. A nested folder makes the
upload fail:

```
manifest.json
color.png     # 192x192
outline.png   # 32x32, transparent
```

`manifest.json`, with `botId` set to the application ID from step 1. `id` is a
different value: a fresh GUID identifying the app itself. `personal` is the only
scope this slice supports.

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
  "manifestVersion": "1.16",
  "version": "1.0.0",
  "id": "<a fresh GUID>",
  "packageName": "com.example.n8n.agent",
  "developer": {
    "name": "n8n dev",
    "websiteUrl": "https://n8n.io",
    "privacyUrl": "https://n8n.io/legal/privacy",
    "termsOfUseUrl": "https://n8n.io/legal/terms"
  },
  "name": { "short": "n8n Agent (dev)", "full": "n8n Agent channel test bot" },
  "description": {
    "short": "Local test bot for the n8n Teams agent channel.",
    "full": "Development-only bot used to test the n8n Microsoft Teams agent channel."
  },
  "icons": { "color": "color.png", "outline": "outline.png" },
  "accentColor": "#EA4B71",
  "bots": [
    {
      "botId": "<Application (client) ID from step 1>",
      "scopes": ["personal", "team", "groupchat"],
      "isNotificationOnly": false,
      "supportsFiles": false
    }
  ],
  "permissions": ["identity", "messageTeamMembers"],
  "validDomains": []
}
```

Only `personal` is supported and tested. `team` and `groupchat` are here so a
tester can try those surfaces early, and an @-mention does reach the agent,
because Teams delivers mentions without an RSC permission grant. What happens
after that is unverified: channel and group thread identity was never
exercised. Treat anything odd there as expected, not as a defect. NODE-5965
makes these surfaces supported. Drop them from `scopes` to install the
supported configuration only.

Two things about updating an installed app:

- Keep the same `id` and raise `version`. Teams caches a package by version, and
  a new `id` installs a second, separate app instead of updating the first.
- Adding a scope needs more than an upload. Add the app to a team or a group
  chat from its page in the Teams client before the bot can be mentioned there.

Upload it in the **Teams desktop or web client** — not the Azure portal and not
the Teams admin center:

1. **Apps** in the left rail.
2. **Manage your apps** at the bottom of the left panel.
3. **Upload an app → Upload a customised app.**
4. Pick the zip, then **Add**.

The bot then appears in your chat list and you can direct-message it.

**If "Upload a customised app" is missing or greyed out,** the tenant disables
sideloading. Turn on **Upload custom apps** in Teams admin center under
**Teams apps → Setup policies → Global**; it needs Teams Administrator and takes
a while to propagate. Without that role, try the Developer Portal for Teams
(`dev.teams.microsoft.com`) → **Apps → Import app**, then **Preview in Teams**.

## 6. Create the credential and connect

In n8n, create a **Microsoft Entra Service Principal** credential with the
tenant ID, client ID and client secret from step 1. Leave **Authentication** on
**Client Secret**.

The channel is hidden from the UI, so connect it one of two ways:

- **Local build:** set `internal = false` on `TeamsIntegration`, restart, and
  connect the channel through the agent's trigger list. The fallback view asks
  only for a credential.
- **REST:** `POST` the integration onto the agent directly, with
  `{ "type": "teams", "credentialId": "<id>" }`.

Publish the agent, then message the bot in Teams.

## What is not supported yet

- Group chats and channel conversations (NODE-5965). Nothing blocks a mention
  there, but none of it is tested.
- Streaming (NODE-5967). Replies arrive as one buffered message.
- A setup stepper (NODE-5966), which is what makes step 3 self-service.
- Certificate authentication and sovereign clouds. Both are rejected at connect
  with a message naming the problem, rather than failing later against the wrong
  endpoint.
- Multi-tenant bots. This one is **not** detected: the credential always carries
  a tenant ID, so the channel always drives the bot single-tenant. Register the
  Azure bot as single-tenant, or the first message fails with an opaque
  token-mint error.
