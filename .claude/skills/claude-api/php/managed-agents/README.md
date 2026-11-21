# Managed Agents - PHP

> **Bindings not shown here:** This README covers the most common managed-agents flows for PHP. If you need a class, method, namespace, field, or behavior that isn't shown, WebFetch the PHP SDK repo **or the relevant docs page** from `shared/live-sources.md` rather than guess. Do not extrapolate from cURL shapes or another language's SDK.

> **Agents are persistent - create once, reference by ID.** Store the agent ID returned by `$client->beta->agents->create` and pass it to every subsequent `->sessions->create`; do not call `agents->create` in the request path. **Recommended:** define agents and environments as version-controlled files synced with `ant apply` - see `shared/anthropic-cli.md` (its live-docs URL is in `shared/live-sources.md`). The CLI owns the control plane (create/update); your code owns the data plane (sessions with the stored ID). The examples below show in-code creation for when you must provision programmatically; in production the create call belongs in setup, not in the request path.

## Installation

```bash
composer require "anthropic-ai/sdk" "guzzlehttp/guzzle:^7"
```

## Client Initialization

```php
use Anthropic\Client;

// Default (uses ANTHROPIC_API_KEY env var)
$client = new Client();

// Explicit API key
$client = new Client(apiKey: 'your-api-key');
```

---

## Create an Environment

```php
$environment = $client->beta->environments->create(
    name: 'my-dev-env',
    config: ['type' => 'cloud', 'networking' => ['type' => 'limited', 'allow_package_managers' => true, 'allow_mcp_servers' => true]],
);
echo "Environment ID: {$environment->id}\n"; // env_...
```

---

## Create an Agent (required first step)

> Warning: **There is no inline agent config.** `model`/`system`/`tools` live on the agent object, not the session. Always start with `$client->beta->agents->create()` - the session takes either `agent: $agent->id` or the typed `BetaManagedAgentsAgentParams::with(type: 'agent', id: $agent->id, version: $agent->version)`.

### Minimal

The examples on this page turn both web tools off. Set `enabled` to true on `web_fetch` / `web_search` only when the job as described needs the web (a general-purpose or open-ended job stays off; tell the user how to switch it on) - see `shared/managed-agents-tools.md` § Agent Toolset. They also set the `auto` permission policy (PHP SDK 0.48.0+), under which a call can pause for your approval - the event loop under Stream Events answers it. When nobody is watching the run, answer `deny`; never answer `allow` to every paused call.

```php
use Anthropic\Beta\Agents\BetaManagedAgentsAgentToolset20260401Params;
use Anthropic\Beta\Agents\BetaManagedAgentsAgentToolsetDefaultConfigParams;
use Anthropic\Beta\Agents\BetaManagedAgentsAutoPolicy;
use Anthropic\Beta\Agents\BetaManagedAgentsWebFetchToolConfigParams;
use Anthropic\Beta\Agents\BetaManagedAgentsWebSearchToolConfigParams;

// 1. Create the agent (reusable, versioned)
$agent = $client->beta->agents->create(
    name: 'Coding Assistant',
    model: 'claude-opus-5-5',
    system: 'You are a helpful coding assistant.',
    tools: [
        BetaManagedAgentsAgentToolset20260401Params::with(
            type: 'agent_toolset_20260401',
            defaultConfig: BetaManagedAgentsAgentToolsetDefaultConfigParams::with(
                permissionPolicy: BetaManagedAgentsAutoPolicy::with(),
            ),
            configs: [
                BetaManagedAgentsWebFetchToolConfigParams::with(enabled: false),
                BetaManagedAgentsWebSearchToolConfigParams::with(enabled: false),
            ],
        ),
    ],
);

// 2. Start a session
$session = $client->beta->sessions->create(
    agent: ['type' => 'agent', 'id' => $agent->id, 'version' => $agent->version],
    environmentID: $environment->id,
    title: 'Quickstart session',
);
echo "Session ID: {$session->id}\n";
echo "Trace: https://platform.claude.com/workspaces/default/sessions/{$session->id}\n"; // swap 'default' for your workspace ID if the API key is not in the Default workspace
```

### Updating an Agent

Updates create new versions; the agent object is immutable per version.

```php
$updatedAgent = $client->beta->agents->update(
    $agent->id,
    version: $agent->version,
    system: 'You are a helpful coding agent. Always write tests.',
);
echo "New version: {$updatedAgent->version}\n";

// List all versions
foreach ($client->beta->agents->versions->list($agent->id)->pagingEachItem() as $version) {
    echo "Version {$version->version}: {$version->updatedAt->format(DateTimeInterface::ATOM)}\n";
}

// Archive the agent
$archived = $client->beta->agents->archive($agent->id);
echo "Archived at: {$archived->archivedAt->format(DateTimeInterface::ATOM)}\n";
```

---

## Send a User Message

```php
$client->beta->sessions->events->send(
    $session->id,
    events: [
        [
            'type' => 'user.message',
            'content' => [['type' => 'text', 'text' => 'Review the auth module']],
        ],
    ],
);
```

> Tip: **Stream-first:** Open the stream *before* (or concurrently with) sending the message. The stream only delivers events that occur after it opens - stream-after-send means early events arrive buffered in one batch. See [Steering Patterns](../../shared/managed-agents-events.md#steering-patterns).

---

## Stream Events (SSE)

> Note: **Streaming transporter:** PHP's default buffered PSR-18 client never returns for the open-ended session event stream. Use a streaming Guzzle transporter for `streamStream()` calls - other calls keep the default client.

```php
use Anthropic\Beta\Sessions\Events\ManagedAgentsUserToolConfirmationEventParams;

$streamingClient = new GuzzleHttp\Client(['stream' => true]);

// Open the stream first, then send the user message
$stream = $client->beta->sessions->events->streamStream(
    $session->id,
    requestOptions: ['transporter' => $streamingClient],
);
$client->beta->sessions->events->send(
    $session->id,
    events: [
        [
            'type' => 'user.message',
            'content' => [['type' => 'text', 'text' => 'Summarize the repo README']],
        ],
    ],
);

foreach ($stream as $event) {
    match ($event->type) {
        'agent.message' => array_walk(
            $event->content,
            static fn($block) => $block->type === 'text' ? print($block->text) : null,
        ),
        'agent.tool_use' => print("\n[Using tool: {$event->name}]\n"),
        'session.error' => printf("\n[Error: %s]", $event->error?->message ?? 'unknown'),
        default => null,
    };
    if (in_array($event->type, ['agent.tool_use', 'agent.mcp_tool_use'], true) && $event->evaluatedPermission === 'ask') {
        // Paused for your decision (always_ask, or auto with no determination)
        $client->beta->sessions->events->send(
            $session->id,
            events: [
                ManagedAgentsUserToolConfirmationEventParams::with(
                    // you write approve(): ask a person or apply your own rule; deny when unattended
                    result: approve($event) ? 'allow' : 'deny',
                    toolUseID: $event->id,
                    type: 'user.tool_confirmation',
                ),
            ],
        );
    }
    // requires_action: waiting on you, keep streaming
    if ($event->type === 'session.status_idle' && $event->stopReason->type !== 'requires_action') {
        break;
    }
    if ($event->type === 'session.error') {
        break;
    }
}
$stream->close();
```

### Reconnecting and Tailing

When reconnecting mid-session, list past events first to dedupe, then tail live events. Answer paused calls as in the loop above, including an `ask` in the history that no `user.tool_confirmation` follows.

```php
$stream = $client->beta->sessions->events->streamStream(
    $session->id,
    requestOptions: ['transporter' => $streamingClient],
);

// Stream is open and buffering. List history before tailing live.
$seenEventIds = [];
foreach ($client->beta->sessions->events->list($session->id)->pagingEachItem() as $event) {
    $seenEventIds[$event->id] = true;
}

// Tail live events, skipping anything already seen
foreach ($stream as $event) {
    if (isset($seenEventIds[$event->id])) {
        continue;
    }
    $seenEventIds[$event->id] = true;
    match ($event->type) {
        'agent.message' => array_walk(
            $event->content,
            static fn($block) => $block->type === 'text' ? print($block->text) : null,
        ),
        default => null,
    };
    // requires_action: answer the paused call as under Stream Events, then keep streaming
    if ($event->type === 'session.status_idle' && $event->stopReason->type !== 'requires_action') {
        break;
    }
}
$stream->close();
```

---

## Provide Custom Tool Result

> Note: The PHP managed-agents bindings for `user.custom_tool_result` are not yet documented in this skill or in the apps source examples. Refer to `shared/managed-agents-events.md` for the wire format and the `anthropic-ai/sdk` PHP repository for the corresponding params.

---

## Poll Events

```php
foreach ($client->beta->sessions->events->list($session->id)->pagingEachItem() as $event) {
    echo "{$event->type}: {$event->id}\n";
}
```

---

## Upload a File

> Note: **PHP file upload:** The PHP SDK's beta managed-agents file upload binding is not shown in the apps source examples; the canonical PHP example uses raw cURL against `POST /v1/files`. If your codebase prefers the SDK, WebFetch the `anthropic-ai/sdk` PHP repository for the latest binding before writing code.

```php
use Anthropic\Beta\Sessions\BetaManagedAgentsFileResourceParams;

// Raw cURL upload (canonical example from the apps source)
$csvPath = 'data.csv';
$ch = curl_init('https://api.anthropic.com/v1/files');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'x-api-key: ' . getenv('ANTHROPIC_API_KEY'),
        'anthropic-version: 2023-06-01',
        'anthropic-beta: files-api-2025-04-14',
    ],
    CURLOPT_POSTFIELDS => ['file' => new CURLFile($csvPath, 'text/csv', 'data.csv')],
]);
$file = json_decode(curl_exec($ch));
echo "File ID: {$file->id}\n";

// Mount in a session
$session = $client->beta->sessions->create(
    agent: $agent->id,
    environmentID: $environment->id,
    resources: [
        BetaManagedAgentsFileResourceParams::with(
            type: 'file',
            fileID: $file->id,
            mountPath: '/data.csv',
        ),
    ],
);
```

### Add and Manage Resources on an Existing Session

```php
// Attach an additional file to an open session
$resource = $client->beta->sessions->resources->add(
    $session->id,
    type: 'file',
    fileID: $file->id,
);
echo "{$resource->id}\n"; // "sesrsc_01ABC..."

// List resources on the session
$listed = $client->beta->sessions->resources->list($session->id);
foreach ($listed->data as $entry) {
    echo "{$entry->id} {$entry->type}\n";
}

// Detach a resource
$client->beta->sessions->resources->delete($resource->id, sessionID: $session->id);
```

---

## List and Download Session Files

```php
$files = $client->beta->files->list(
    scopeID: 'sesn_abc123',
    betas: ['managed-agents-2026-04-01'],
);
$content = $client->beta->files->download($files->data[0]->id);
file_put_contents('output.txt', $content);
```

---

## Session Management

```php
// List environments
$environments = $client->beta->environments->list();

// Retrieve a specific environment
$env = $client->beta->environments->retrieve($environment->id);

// Archive an environment (read-only, existing sessions continue)
$client->beta->environments->archive($environment->id);

// Delete an environment (only if no sessions reference it)
$client->beta->environments->delete($environment->id);

// Delete a session
$client->beta->sessions->delete($session->id);
```

---

## MCP Server Integration

```php
use Anthropic\Beta\Agents\BetaManagedAgentsAgentToolset20260401Params;
use Anthropic\Beta\Agents\BetaManagedAgentsAgentToolsetDefaultConfigParams;
use Anthropic\Beta\Agents\BetaManagedAgentsAutoPolicy;
use Anthropic\Beta\Agents\BetaManagedAgentsMCPToolsetParams;
use Anthropic\Beta\Agents\BetaManagedAgentsURLMCPServerParams;
use Anthropic\Beta\Agents\BetaManagedAgentsWebFetchToolConfigParams;
use Anthropic\Beta\Agents\BetaManagedAgentsWebSearchToolConfigParams;
use Anthropic\Beta\Sessions\BetaManagedAgentsAgentParams;

// Agent declares MCP server (no auth here - auth goes in a vault)
$agent = $client->beta->agents->create(
    name: 'GitHub Assistant',
    model: 'claude-opus-5-5',
    mcpServers: [
        BetaManagedAgentsURLMCPServerParams::with(
            type: 'url',
            name: 'github',
            url: 'https://api.githubcopilot.com/mcp/',
        ),
    ],
    tools: [
        BetaManagedAgentsAgentToolset20260401Params::with(
            type: 'agent_toolset_20260401',
            defaultConfig: BetaManagedAgentsAgentToolsetDefaultConfigParams::with(
                permissionPolicy: BetaManagedAgentsAutoPolicy::with(),
            ),
            configs: [
                BetaManagedAgentsWebFetchToolConfigParams::with(enabled: false),
                BetaManagedAgentsWebSearchToolConfigParams::with(enabled: false),
            ],
        ),
        BetaManagedAgentsMCPToolsetParams::with(
            type: 'mcp_toolset',
            mcpServerName: 'github',
        ),
    ],
);

// Session attaches vault(s) containing credentials for those MCP server URLs
$session = $client->beta->sessions->create(
    agent: BetaManagedAgentsAgentParams::with(
        type: 'agent',
        id: $agent->id,
        version: $agent->version,
    ),
    environmentID: $environment->id,
    vaultIDs: [$vault->id],
);
```

See `shared/managed-agents-tools.md` §Vaults for creating vaults and adding credentials.

---

## Vaults

```php
// Create a vault
$vault = $client->beta->vaults->create(
    displayName: 'Alice',
    metadata: ['external_user_id' => 'usr_abc123'],
);
echo $vault->id . "\n"; // "vlt_01ABC..."

// Add an OAuth credential
$credential = $client->beta->vaults->credentials->create(
    vaultID: $vault->id,
    displayName: "Alice's Slack",
    auth: [
        'type' => 'mcp_oauth',
        'mcp_server_url' => 'https://mcp.slack.com/mcp',
        'access_token' => 'xoxp-...',
        'expires_at' => '2026-04-15T00:00:00Z',
        'refresh' => [
            'token_endpoint' => 'https://slack.com/api/oauth.v2.access',
            'client_id' => '1234567890.0987654321',
            'scope' => 'channels:read chat:write',
            'refresh_token' => 'xoxe-1-...',
            'token_endpoint_auth' => [
                'type' => 'client_secret_post',
                'client_secret' => 'abc123...',
            ],
        ],
    ],
);

// Rotate the credential (e.g., after a token refresh)
$client->beta->vaults->credentials->update(
    $credential->id,
    vaultID: $vault->id,
    auth: [
        'type' => 'mcp_oauth',
        'access_token' => 'xoxp-new-...',
        'expires_at' => '2026-05-15T00:00:00Z',
        'refresh' => ['refresh_token' => 'xoxe-1-new-...'],
    ],
);

// Archive a vault
$client->beta->vaults->archive($vault->id);
```

---

## GitHub Repository Integration

Mount a GitHub repository as a session resource (a vault holds the GitHub MCP credential):

```php
$session = $client->beta->sessions->create(
    agent: $agent->id,
    environmentID: $environment->id,
    vaultIDs: [$vault->id],
    resources: [
        [
            'type' => 'github_repository',
            'url' => 'https://github.com/org/repo',
            'mount_path' => '/workspace/repo',
            'authorization_token' => 'ghp_your_github_token',
        ],
    ],
);
```

Multiple repositories on the same session:

```php
$resources = [
    [
        'type' => 'github_repository',
        'url' => 'https://github.com/org/frontend',
        'mount_path' => '/workspace/frontend',
        'authorization_token' => 'ghp_your_github_token',
    ],
    [
        'type' => 'github_repository',
        'url' => 'https://github.com/org/backend',
        'mount_path' => '/workspace/backend',
        'authorization_token' => 'ghp_your_github_token',
    ],
];
```

Rotating a repository's authorization token:

```php
$listed = $client->beta->sessions->resources->list($session->id);
$repoResourceId = $listed->data[0]->id;

$client->beta->sessions->resources->update(
    $repoResourceId,
    sessionID: $session->id,
    authorizationToken: 'ghp_your_new_github_token',
);
```
