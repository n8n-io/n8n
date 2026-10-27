# @n8n/backend-network

The single home for n8n's backend outbound-network concerns.

## Why this package exists

Today network behavior is scattered across `packages/core` and several `@n8n/*` packages.

This package consolidates into one place behind a single factory contract:
SSRF/DNS guarding, proxy handling, and the HTTP client plumbing.
The eventual goal is to make backend network behavior reviewable and controllable from a single entry point.

## Using `OutboundHttp`

`OutboundHttp` is the single entry point for outbound HTTP in the backend. It is
injectable via `@n8n/di`, so depend on it from a constructor rather than
constructing it yourself:

```ts
import { OutboundHttp } from '@n8n/backend-network';
import { Service } from '@n8n/di';

@Service()
class MyProvider {
	constructor(private readonly outboundHttp: OutboundHttp) {}
}
```

Pick the method by intent, not by transport library:

### `requests()` — you make the call

Use when your code drives the request and consumes the response (the n8n request
pipeline). Returns a `HttpRequestClient`:

```ts
const client = this.outboundHttp.requests();
const data = await client.request({ method: 'GET', url: 'https://api.example.com/v1/data' });
```

`HttpRequestClientOptions` carry policy that applies to every call on the
client — the `useDefaultSsrfPolicy`, a `baseURL`, and default `headers`. Set them once at
creation instead of repeating them per request:

```ts
const client = this.outboundHttp.requests({
	baseURL: 'https://api.example.com',
	headers: () => ({ Authorization: `Bearer ${this.token}` }),
});
```

### `transport()` — a third-party SDK makes the call

Use when you hand transport primitives to a library you do not drive yourself
(an OpenAI/Anthropic SDK, the AWS SDK, an OIDC client). `HttpTransport` exposes
`asCustomFetch()`, `getDispatcher()`, and `getNodeAgent()`; which one you use is
dictated by what the consuming library accepts.

## SSRF protection

### Safe by default

Both `requests()` and `transport()` guard every call — and every redirect hop —
by default. You do not pass a bridge, a service, or a config flag; the default
`useDefaultSsrfPolicy: 'safe'` is applied for you. The only way to skip the guard is to
opt out explicitly with `useDefaultSsrfPolicy: 'unsafe'`.

This default is deliberate. Outbound HTTP in n8n is frequently driven by
user-controlled input — credential URLs, workflow parameters, redirect targets
returned by a remote server. Without guarding, that input can be pointed at
internal-only addresses (cloud metadata endpoints, `localhost`, private ranges),
turning the n8n backend into a confused deputy (a Server-Side Request Forgery,
or SSRF). Because the secure default lives in the factory rather than at each
call site, forgetting to add protection cannot silently introduce a
vulnerability — the unsafe choice is the explicit one, and a new call site is
safe unless someone consciously writes `useDefaultSsrfPolicy: 'unsafe'`.

### `enabled` is resolved inside `OutboundHttp`, not by callers

`useDefaultSsrfPolicy` answers one question: *is this destination trusted enough to skip
the guard?* Only the calling code knows that, so it is decided per call. Whether
the guard actually runs for a `'safe'` call is a separate, instance-wide
decision that `OutboundHttp` resolves internally from
`SsrfProtectionConfig.enabled` (`N8N_SSRF_PROTECTION_ENABLED`). Callers neither
read that flag nor inject the `SsrfProtectionService` — passing `'safe'` (or
nothing) is enough.

Concretely, a `'safe'` call is guarded when the instance enables protection and
passes through untouched when it does not; an `'enforced'` call is always
guarded and an `'unsafe'` call is never guarded, regardless of the flag.

`SsrfProtectionConfig` (env-driven) also configures *how* the guard behaves once
it runs — the blocked/allowed IP ranges (`N8N_SSRF_BLOCKED_IP_RANGES`,
`N8N_SSRF_ALLOWED_IP_RANGES`), the allowed and blocked hostnames
(`N8N_SSRF_ALLOWED_HOSTNAMES`, `N8N_SSRF_BLOCKED_HOSTNAMES`), and the DNS-cache
size.

### Choosing a safety mode: when to opt out

Leave the default `'safe'` unless the destination genuinely cannot be
user-controlled. Classify the **destination**, then pick:

| Destination | Risk | What to pass |
| --- | --- | --- |
| User- or remote-controlled URL (workflow import URL, credential/OAuth URLs, a discovery document's second hop, a user-supplied registry) | **High** — attacker-influenceable | nothing — the default `'safe'` guards it when the instance enables protection |
| URL an autonomous component picks on its own (an LLM/web-research target) | **High** — attacker-influenceable, and the operator never sees the URL | `useDefaultSsrfPolicy: 'enforced'` — guarded even when the instance leaves protection off |
| Fixed n8n-owned host, or a fixed public vendor API (Slack, Linear, npm registry default, AWS service endpoint) | **Low** — not user-controllable | `useDefaultSsrfPolicy: 'unsafe'` + a one-line "fixed host" comment |
| Admin-configured infrastructure that may legitimately be internal (SAML/OIDC IdP, OTLP collector, log-streaming destination, external-secrets manager) | **Low–medium** — operator-trusted | `useDefaultSsrfPolicy: 'unsafe'` + a "may point at internal X" comment. The `N8N_SSRF_ALLOWED_*` allowlists are the alternative when the instance runs with protection globally on. |

```ts
// HIGH risk — `url` comes from user input. Guarded by default.
const client = this.outboundHttp.requests();

// LOW risk — fixed, n8n-owned host. Opt out explicitly.
const client = this.outboundHttp.requests({ useDefaultSsrfPolicy: 'unsafe' });
```

Whenever you opt out, **write a one-line comment stating why** — that comment is
what a security reviewer reads. Reference implementation:
`packages/nodes-base/credentials/common/token-request.ts`, which lifts the
low/high-risk choice into the type system with a
`'fixed-vendor' | 'user-controlled'` parameter so the caller is forced to
classify the destination.

### The node execution path

Node request helpers (`this.helpers.httpRequest`,
`httpRequestWithAuthentication`, and the deprecated `request`) go through
`OutboundHttp.requests()` with the default safe mode. `IHttpRequestOptions`
exposes no `useDefaultSsrfPolicy` field, so node code — community nodes included — cannot
opt out of the instance's policy.

The raw `httpRequest` function is not exported from the package barrel. It is
reachable only through the `@n8n/backend-network/testing` entry point, so
production code cannot reach an unguarded request function.

## The boundary rule

The `n8n-local-rules/no-uncentralized-http` ESLint rule enforces this.
It is on by default for every Node backend package.

Two sanctioned escape hatches, depending on the shape of the exception:

**1. Inline disable** When a single callsite legitimately cannot use the factory, disable the
rule on the line with a justifying comment:

```ts
// eslint-disable-next-line n8n-local-rules/no-uncentralized-http -- <reason>
import axios from 'axios';
```

Always include the reason after `--`. 

**2. Central allow list** For whole packages that are out of scope, add the file
path (a substring of the absolute path is enough) to the `allow` list in
`packages/@n8n/eslint-config/src/configs/backend-network-boundary.ts`.

Keep the list shrinking: every entry is debt or a documented carve-out, not a default.