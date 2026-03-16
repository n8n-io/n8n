# Broker-Managed OAuth (`managedAuth`)

n8n-managed OAuth lets n8n Cloud hold shared OAuth client credentials on behalf of users so they never need to supply their own Client ID / Secret. The user authenticates via Google (or another provider) and n8n transparently stores the resulting tokens.

---

## High-Level Flow

```
User clicks "Connect"
  → GET /rest/oauth2-credential/auth
      → OAuth2CredentialController.getAuthUri()
          → credType.managedAuth is set → broker path
          → BrokerClientService.startFlow() → POST broker /flow/start
          → returns authUrl (Google login page)
User authenticates at Google
  → Broker receives code, exchanges for tokens, stores them
  → Broker redirects to:
      GET /rest/oauth2-credential/callback?flowId=<uuid>&retrievalCode=<code>
  → OAuth2CredentialController.handleCallback()
      → detects flowId + retrievalCode → handleBrokerCallback()
      → polls BrokerClientService.retrieveTokens() (up to 10× / 500 ms)
      → encrypts tokens into credential, renders oauth-callback
```

At runtime (workflow execution), expired access tokens are refreshed via `BrokerClientService.refreshToken()`, called from `workflow-execute-additional-data.ts`.

---

## Startup Registration

On startup, `start.ts` calls `BrokerClientService.ensureRegistered()` when `N8N_OAUTH_BROKER_URL` is set and `N8N_BROKER_AUTH_ENABLED` is not `false`:

```typescript
if (this.globalConfig.brokerAuth.url && this.globalConfig.brokerAuth.enabled) {
  await Container.get(BrokerClientService).ensureRegistered(
    this.instanceSettings.instanceId,
    Container.get(UrlService).getInstanceBaseUrl(),
    this.license.getConsumerId(),
  );
  this.logger.scoped('broker-auth').debug('Broker registration init complete');
}
```

`ensureRegistered` is idempotent:
- Checks the `settings` table for `brokerApiKey` — returns immediately if found
- Otherwise calls `POST /keys/register` with an `X-Instance-Hash` header (SHA-256 of `instanceId + consumerId`) and body `{ instanceId, instanceBaseUrl, consumerId }`
- On success (200), persists the returned `apiKey` to the `settings` table under key `brokerApiKey` with `loadOnStartup: false`
- On 409 (already registered but key missing locally): logs a warning and returns — operator must rotate the key via the broker's `POST /keys/rotate`
- On any other error: propagates as `BrokerError`

---

## Key Files

| File | Purpose |
|------|---------|
| `packages/cli/src/credentials/broker-client.service.ts` | `@Service()` class — all HTTP calls to the broker |
| `packages/cli/src/controllers/oauth/oauth2-credential.controller.ts` | Handles `/auth` and `/callback` routes; broker path runs alongside the existing self-managed path |
| `packages/cli/src/commands/start.ts` | Calls `ensureRegistered()` at startup when broker is configured |
| `packages/cli/src/workflow-execute-additional-data.ts` | Provides `refreshBrokerToken` hook into workflow execution |
| `packages/nodes-base/credentials/*BrokerOAuth2Api.credentials.ts` | Per-service credential definitions with `managedAuth` set |

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `N8N_OAUTH_BROKER_URL` | Yes | Base URL of the OAuth broker (`https://broker.example.com`) |
| `N8N_BROKER_AUTH_ENABLED` | No | Defaults to `true`. Set to `false` to disable the broker path without removing `N8N_OAUTH_BROKER_URL`. |

The instance base URL is resolved automatically via `UrlService.getInstanceBaseUrl()` (falls back through `N8N_EDITOR_BASE_URL` → `WEBHOOK_URL` → auto-calculated from host/port/protocol).

If `N8N_OAUTH_BROKER_URL` is unset, or `N8N_BROKER_AUTH_ENABLED=false`, the broker path is entirely inactive; all existing self-managed OAuth flows are unaffected.

---

## Logging

All broker-related logs use the `broker-auth` scope. To see only broker logs:

```bash
N8N_LOG_LEVEL=debug N8N_LOG_SCOPES=broker-auth pnpm start
```

When `N8N_LOG_SCOPES` is set, unscoped logs are suppressed. Omit it to see everything (useful when debugging interactions between broker auth and other subsystems).

Log sources:
- `BrokerClientService` — all methods log through `logger.scoped('broker-auth')` (scoped in constructor)
- `OAuth2CredentialController` — broker flow steps logged via `this.brokerLogger` (= `this.logger.scoped('broker-auth')`)
- `start.ts` — registration completion logged with `this.logger.scoped('broker-auth').debug(...)`

---

## `BrokerClientService`

**Location:** `packages/cli/src/credentials/broker-client.service.ts`

Injected via `@n8n/di`. Consumers call `Container.get(BrokerClientService)` or receive it via constructor injection. All logging is scoped to `broker-auth` in the constructor.

```typescript
constructor(logger: Logger, settingsRepository: SettingsRepository, globalConfig: GlobalConfig) {
  this.logger = logger.scoped('broker-auth');
}
```

### Methods

```typescript
// Called once at startup – idempotent
ensureRegistered(instanceId, instanceBaseUrl, consumerId): Promise<void>

// Lower-level — register and return the API key
registerInstance(instanceId, instanceBaseUrl, consumerId): Promise<string>

// Begin an OAuth flow; returns the URL to redirect the user to
// scopes and authQueryParameters are extracted from credential type properties
startFlow({ provider, flowId, instanceBaseUrl, scopes?, authQueryParameters? }): Promise<string>

// Retrieve tokens after the user has authenticated (poll-friendly)
retrieveTokens(retrievalCode: string): Promise<TokenSet>

// Exchange a refresh token for a new access token
// scopes are passed from credentials.scope (split from space/comma string)
refreshToken({ provider, refreshToken, scopes? }): Promise<TokenSet>
```

### Error Classes (all exported from the service file)

| Class | HTTP status | Meaning |
|-------|------------|---------|
| `BrokerError` | base | Generic broker error |
| `BrokerTokenNotReadyError` | 404 | Tokens not yet available — retry |
| `BrokerTokenExpiredError` | 410 | Pickup window closed — user must reconnect |
| `BrokerRefreshRejectedError` | 401 on refresh | Refresh token invalid — user must reconnect |
| `BrokerUnavailableError` | 502 | Broker temporarily down — retry |
| `BrokerAlreadyRegisteredError` | 409 on register | Instance already known to broker |

### Broker API Key Storage

The API key returned by `POST /keys/register` is persisted in the `settings` table under the key `brokerApiKey` with `loadOnStartup: false`. Subsequent calls read it from there; it is never re-requested unless the key is missing.

---

## Defining a Broker-Managed Credential Type

Add `managedAuth` to the credential class. All OAuth parameters (scopes, URLs) are hardcoded as `hidden` fields — the user supplies nothing.

### Inheritance Design

**Google services** extend `googleOAuth2Api` (not `oAuth2Api` directly):

```typescript
export class GmailBrokerOAuth2Api implements ICredentialType {
  name = 'gmailBrokerOAuth2Api';
  extends = ['googleOAuth2Api'];  // ← NOT oAuth2Api
  // eslint-disable-next-line n8n-nodes-base/cred-class-field-display-name-missing-oauth2, n8n-nodes-base/cred-class-field-display-name-miscased
  displayName = 'Gmail OAuth2 API (n8n-managed)';
  icon: Icon = 'node:n8n-nodes-base.gmail';

  managedAuth = {
    type: 'broker' as const,
    provider: 'gmailBrokerOAuth2Api', // sent to broker in startFlow / refreshToken
  };

  // Only service-specific scope is needed; grantType, authUrl, accessTokenUrl,
  // authQueryParameters, and authentication are all inherited from googleOAuth2Api.
  properties: INodeProperties[] = [
    { displayName: 'Scope', name: 'scope', type: 'hidden', default: '...' },
  ];
}
```

Extending `googleOAuth2Api` means `CredentialConfig.vue`'s `isGoogleOAuthType` check resolves `true` (it walks the full inheritance chain), so the credential editor shows the branded **"Sign in with Google"** button instead of a generic connect button.

**Non-Google services** (e.g., GitHub) extend `oAuth2Api` directly:

```typescript
export class GithubBrokerOAuth2Api implements ICredentialType {
  name = 'githubBrokerOAuth2Api';
  extends = ['oAuth2Api'];
  // ... must define all URL/auth properties explicitly
}
```

**Existing credential files:**
- `GmailBrokerOAuth2Api.credentials.ts` — extends `googleOAuth2Api`
- `GoogleDocsBrokerOAuth2Api.credentials.ts` — extends `googleOAuth2Api`
- `GoogleDriveBrokerOAuth2Api.credentials.ts` — extends `googleOAuth2Api`
- `GoogleSheetsBrokerOAuth2Api.credentials.ts` — extends `googleOAuth2Api`
- `GithubBrokerOAuth2Api.credentials.ts` — extends `oAuth2Api`

---

## Adding `managedAuth` to a Node

1. Add the broker credential entry (shown/hidden via `authentication` selector):

```typescript
// In the node's credentials array:
{
  name: 'gmailBrokerOAuth2Api',
  required: true,
  displayOptions: { show: { authentication: ['oAuth2Managed'] } },
},
```

2. Add the selector option (requires the eslint-disable because of the hyphen):

```typescript
{
  // eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
  name: 'OAuth2 (n8n-managed)',
  value: 'oAuth2Managed',
},
```

3. In `GenericFunctions.ts` (or the transport layer), branch on `authentication`:

```typescript
} else if (authentication === 'oAuth2Managed') {
  return await this.helpers.requestWithAuthentication.call(
    this,
    'gmailBrokerOAuth2Api',
    options,
  );
}
```

**Nodes already updated:** Gmail (`GmailV2`, `GmailTrigger`), Google Docs, Google Sheets.

---

## Session State During the OAuth Flow

Two pieces of transient state are written when `getAuthUri` is called and cleaned up in `handleBrokerCallback`:

| Store | Key | Value | Purpose |
|-------|-----|-------|---------|
| `settings` table | `brokerFlow.<flowId>` | `credentialId` | Maps broker callback back to the credential |
| Credential (encrypted) | `pendingBrokerFlowId` + `pendingBrokerFlowExpiresAt` | UUID + timestamp | CSRF-like validation to prevent replay |

The flow session expires after 10 minutes. The `settings` row is deleted once the callback is handled.

---

## Callback Query Parameters

The broker redirects to `/rest/oauth2-credential/callback` with:

| Success | `?flowId=<uuid>&retrievalCode=<code>` |
|---------|---------------------------------------|
| User denial | `?flowId=<uuid>&error=access_denied` |

The controller uses `typeof flowId === 'string'` guards (not truthy checks) to distinguish broker callbacks from standard OAuth callbacks.

---

## Tests

- `packages/cli/src/credentials/__tests__/broker-client.service.test.ts` — unit tests covering all `BrokerClientService` methods, error cases, and the `N8N_BROKER_AUTH_ENABLED=false` early-return behaviour
- `packages/cli/src/controllers/oauth/__tests__/oauth2-credential.controller.test.ts` — broker-specific tests (for `getAuthUri` including disabled-auth case, and `handleCallback`) alongside the existing standard OAuth tests

See [broker-client-service-testing.md](broker-client-service-testing.md) for patterns and gotchas specific to testing these components.
