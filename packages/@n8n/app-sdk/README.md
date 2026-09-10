# @n8n/app-sdk

Browser client for the workflows bound to a built n8n app. It posts to the
app's runtime API, `/apps/<namespace>/api/workflows/<key>`, with no
dependencies.

```ts
import { n8n, N8nAppError } from '@n8n/app-sdk';

const result = await n8n.workflows.run('submit', { email: 'a@b.c' });
```

The app-builder skill in `@n8n/instance-ai` documents the API, the error codes
and the generated `src/n8n-bindings.d.ts` that types the bound keys.

## Compatibility

The SDK is copied into the app at create time (`vendor/n8n-app-sdk.tgz`) and
never changes afterwards. The runtime API contract is additive-only: new
fields, endpoints and error codes may appear, nothing is renamed, removed or
retyped, so any SDK version keeps working. A breaking change, if ever needed,
ships under a new path next to the existing one.
