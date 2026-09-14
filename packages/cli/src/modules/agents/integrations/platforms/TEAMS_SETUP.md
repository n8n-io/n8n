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

Take `projectId` and `agentId` from the agent's URL in n8n. The host must be
publicly reachable over HTTPS, so a local instance needs a tunnel.

Paste it into the bot resource under **Settings → Configuration → Messaging
endpoint**.

Unlike Telegram, n8n cannot register this for you. The endpoint lives on the
Azure Bot resource, so setting it needs Azure management credentials rather
than the bot credential n8n holds — there is an ARM API for it, but nothing the
bot identity can call. Hence the manual step, and hence the setup stepper the
channel waits on before it goes public.

## 4. Enable the Teams channel

On the bot resource, open **Channels** and add **Microsoft Teams**.

## 5. Install the bot in the tenant

Build a Teams app manifest whose `bots[].botId` is the application ID from
step 1, then upload it in the Teams client under **Apps → Manage your apps →
Upload an app**. Install it for yourself so you can direct-message the bot.
Only 1:1 direct messages are supported in this slice.

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
- Multi-tenant bots, certificate authentication, and sovereign clouds. Each is
  rejected at connect with a message naming the problem, rather than failing
  later against the wrong endpoint.
