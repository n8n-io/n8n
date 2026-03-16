# Testing `BrokerClientService` and Broker Controller Paths

Patterns and gotchas discovered while writing the broker test suite.

---

## Testing `BrokerClientService`

The service is a plain `@Service()` class with three injected deps. Instantiate it directly in tests — no need for `Container.get()`.

**Critical:** `BrokerClientService` calls `logger.scoped('broker-auth')` in its constructor and stores the result as `this.logger`. Because the test `beforeEach` uses `jest.restoreAllMocks()`, the `mockReturnValue` on `logger.scoped` is cleared each time. You must re-configure it *after* `restoreAllMocks` or the service will have `undefined` as its logger and throw on first use. See the [Jest gotchas section](#scoped-logger--jestrestoreallmocks) below.

```typescript
import { mockLogger } from '@n8n/backend-test-utils';
import { mockInstance } from '@n8n/backend-test-utils';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

const BROKER_URL = 'https://broker.example.com';
const settingsRepository = mockInstance(SettingsRepository);
const logger = mockLogger();
// Holds the scoped logger the service actually uses — needed for asserting on warn/debug
let scopedLogger: Logger;
let service: BrokerClientService;

beforeEach(() => {
  jest.restoreAllMocks();
  settingsRepository.findByKey.mockReset();
  settingsRepository.upsert.mockReset();
  settingsRepository.delete.mockReset();
  // restoreAllMocks clears mockReturnValue — re-configure so the constructor gets a valid Logger
  scopedLogger = mock<Logger>();
  (logger.scoped as jest.Mock).mockReturnValue(scopedLogger);
  const globalConfig = mock<GlobalConfig>({ brokerAuth: { url: BROKER_URL, enabled: true } });
  service = new BrokerClientService(logger, settingsRepository, globalConfig);
});
```

To test with no URL or disabled broker, create a service with a different config:

```typescript
// No broker URL → ensureRegistered returns early; registerInstance/startFlow throw
const noUrlConfig = mock<GlobalConfig>({ brokerAuth: { url: '', enabled: true } });
const noUrlService = new BrokerClientService(logger, settingsRepository, noUrlConfig);

// Broker disabled → ensureRegistered returns early
const disabledConfig = mock<GlobalConfig>({ brokerAuth: { url: BROKER_URL, enabled: false } });
const disabledService = new BrokerClientService(logger, settingsRepository, disabledConfig);
```

### Mocking `fetch`

The service uses the Node.js global `fetch`. Override `global.fetch` directly — do not use `nock`.

```typescript
function mockFetch(status: number, body?: unknown): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

// Usage:
global.fetch = mockFetch(200, { apiKey: 'mob_abc123' });
```

### Asserting request details

```typescript
const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
expect(url).toBe('https://broker.example.com/keys/register');
expect((init.headers as Record<string, string>)['X-Instance-Hash']).toMatch(/^[a-f0-9]{64}$/);
```

### Asserting on log output

Because all logging goes through `scopedLogger`, assert on it — not on the raw `logger`:

```typescript
// ✅ correct
expect(scopedLogger.warn).toHaveBeenCalledWith(expect.stringContaining('already registered'));

// ❌ wrong — logger.warn is never called directly
expect(logger.warn).toHaveBeenCalledWith(...);
```

### Mocking `settingsRepository.findByKey` return value

```typescript
settingsRepository.findByKey.mockResolvedValue(mock({ value: 'test-api-key' }));
// For the "no key" case:
settingsRepository.findByKey.mockResolvedValue(null);
```

---

## Testing `OAuth2CredentialController` Broker Paths

The controller is retrieved from the DI container. `mockInstance()` both creates the mock and registers it.

**Critical:** `OAuth2CredentialController` has a class field `private readonly brokerLogger = this.logger.scoped('broker-auth')` that is evaluated when the controller is constructed. The controller is created at module scope (before any `beforeEach`), so `logger.scoped` must be configured to return a valid mock *before* `Container.get()` is called. See the [Jest gotchas section](#scoped-logger--jestrestoreallmocks) below.

```typescript
import { Logger } from '@n8n/backend-common';
import { GlobalConfig, type BrokerAuthConfig } from '@n8n/config';
import { UrlService } from '@/services/url.service';
import { mock } from 'jest-mock-extended';

const credentialTypes = mockInstance(CredentialTypes);
const settingsRepository = mockInstance(SettingsRepository);
const brokerClientService = mockInstance(BrokerClientService);
const globalConfig = mockInstance(GlobalConfig);
const urlService = mockInstance(UrlService);

// Configure scoped logger before controller instantiation so `brokerLogger` field is non-undefined
const loggerMock = mockInstance(Logger);
loggerMock.scoped.mockReturnValue(mock<Logger>());

const controller = Container.get(OAuth2CredentialController);
```

The controller tests use `jest.clearAllMocks()` (not `restoreAllMocks`), so the one-time `mockReturnValue` setup survives across all tests.

### Setting up broker test fixtures

```typescript
const flowId = 'test-flow-uuid';
const retrievalCode = 'test-retrieval-code';
const credentialId = 'cred-123';
const brokerCredential = mock<CredentialsEntity>({ id: credentialId, type: 'gmailBrokerOAuth2Api' });

// In beforeEach:
globalConfig.brokerAuth = { url: 'https://broker.example.com', enabled: true } as unknown as BrokerAuthConfig;
urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com');
settingsRepository.findByKey.mockResolvedValue(mock({ value: credentialId }));
settingsRepository.delete.mockResolvedValue(undefined);
oauthService.getCredentialForBrokerCallback.mockResolvedValue(brokerCredential);
oauthService.getRawDecryptedData.mockReturnValue({
  pendingBrokerFlowId: flowId,
  pendingBrokerFlowExpiresAt: timestamp + 10 * 60 * 1000,
});
credentialTypes.getByName.mockReturnValue(
  mock({ managedAuth: { provider: 'gmailBrokerOAuth2Api' } }),
);
brokerClientService.retrieveTokens.mockResolvedValue({
  access_token: 'at_abc',
  refresh_token: 'rt_xyz',
});
```

### Constructing broker callback requests

Use `as unknown as OAuthRequest.OAuth2Credential.Callback['query']` for the type cast since the broker query params aren't in the declared query type.

```typescript
const req = mock<OAuthRequest.OAuth2Credential.Callback>({
  query: { flowId, retrievalCode } as unknown as OAuthRequest.OAuth2Credential.Callback['query'],
});
```

For user denial callbacks:
```typescript
const req = mock<OAuthRequest.OAuth2Credential.Callback>({
  query: {
    flowId,
    error: 'access_denied',
  } as unknown as OAuthRequest.OAuth2Credential.Callback['query'],
});
```

---

## Jest-mock-extended Gotchas

### Scoped Logger + `jest.restoreAllMocks()`

`BrokerClientService` stores a scoped logger in its constructor:
```typescript
this.logger = logger.scoped('broker-auth');
```

`OAuth2CredentialController` initialises a class field at construction time:
```typescript
private readonly brokerLogger = this.logger.scoped('broker-auth');
```

**Problem 1 — `BrokerClientService` tests use `jest.restoreAllMocks()`.**
This clears `mockReturnValue` from `logger.scoped` (a `jest.fn()` inside `mockLogger()`), so the next `new BrokerClientService(...)` call gets `undefined` assigned to `this.logger`, causing `TypeError: Cannot read properties of undefined (reading 'debug')`.

Fix: re-configure the return value *after* `restoreAllMocks` in every `beforeEach`:
```typescript
scopedLogger = mock<Logger>();
(logger.scoped as jest.Mock).mockReturnValue(scopedLogger);
```
Then assert on `scopedLogger.warn` / `scopedLogger.debug` rather than `logger.warn`.

**Problem 2 — `OAuth2CredentialController` is instantiated at module scope** (before any `beforeEach`). If `logger.scoped` hasn't been given a return value at that point, `brokerLogger` is permanently `undefined` for the entire test file.

Fix: configure `scoped` *before* calling `Container.get()`:
```typescript
const loggerMock = mockInstance(Logger);
loggerMock.scoped.mockReturnValue(mock<Logger>());
const controller = Container.get(OAuth2CredentialController);
```
The controller tests use `jest.clearAllMocks()` (not `restoreAllMocks`), so this one-time setup survives across all tests.

### `mock<T>({ query: {...} })` vs `req.query = {...}`

**Problem:** When `query` is provided via the `mock<T>({...})` constructor, jest-mock-extended may wrap the nested object in a Proxy. Accessing any extra property on the query (even for type-checking like `typeof x === 'string'`) registers a mock function for that property. This causes `Object.keys(req.query)` to return those extra keys, corrupting later logic that uses `Object.keys` to count query params.

**Solution:** For non-broker tests where `query` must be a clean plain object, use **direct assignment** after construction:

```typescript
// ✅ Safe — query is a plain object, Object.keys() returns exactly ['code', 'state']
const req = mock<OAuthRequest.OAuth2Credential.Callback>({
  originalUrl: '/oauth2-credential/callback?code=auth_code&state=state',
});
req.query = {
  code: 'auth_code',
  state: validState,
} as OAuthRequest.OAuth2Credential.Callback['query'];

// ⚠️ Risky — accessing extra properties on the mock proxy registers them in ownKeys
const req = mock<OAuthRequest.OAuth2Credential.Callback>({
  query: { code: 'auth_code', state: validState },  // proxy-wrapped
  originalUrl: '...',
});
```

### Truthy checks on mock properties

Always use `typeof x === 'string'` instead of `if (x)` when checking whether a query param is present. A jest mock proxy returns a jest function (truthy) for any unspecified property, so `if (flowId)` triggers even when the user hasn't set `flowId`.

```typescript
// ✅
if (typeof flowId === 'string' && (typeof retrievalCode === 'string' || typeof brokerError === 'string')) {

// ❌ — triggers for non-broker requests because mock functions are truthy
if (flowId && (retrievalCode || brokerError)) {
```

### Non-broker tests need `credentialTypes.getByName` mocked

The controller calls `credentialTypes.getByName()` on every `getAuthUri` request. Existing tests that don't go through the broker path must mock it to return a non-broker credential type:

```typescript
credentialTypes.getByName.mockReturnValue({} as never);
```

---

## Test File Locations

| Test file | What it covers |
|-----------|----------------|
| `packages/cli/src/credentials/__tests__/broker-client.service.test.ts` | All `BrokerClientService` public methods, all error HTTP statuses |
| `packages/cli/src/controllers/oauth/__tests__/oauth2-credential.controller.test.ts` | Broker `getAuthUri` + `handleCallback` paths, plus existing standard OAuth tests |
