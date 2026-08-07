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
client — SSRF level, a `baseURL`, and default `headers`. Set them once at
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

### On by default

Both `requests()` and `transport()` apply the container's
`SsrfProtectionService` **unless you explicitly opt out** with `ssrf: 'disabled'`.

This default is deliberate. Outbound HTTP in n8n is frequently driven by
user-controlled input — credential URLs, workflow parameters, redirect targets
returned by a remote server. Without guarding, that input can be pointed at
internal-only addresses (cloud metadata endpoints, `localhost`, private ranges),
turning the n8n backend into a confused deputy (a Server-Side Request Forgery,
or SSRF). Centralizing the call here means every backend request — and every
redirect hop — is validated by default, so a new call site is safe unless
someone consciously turns the guard off.

Because the secure default lives in the factory rather than at each call site,
forgetting to add protection cannot silently introduce a vulnerability — the
unsafe choice is the explicit one.

### Why the choice is explicit per call, not read from config

The `ssrf` option is passed **per call**; it is **not** derived automatically
from `SsrfProtectionConfig`. That is intentional: whether a request is dangerous
is a property of *its destination*, and only the calling code knows that. A
global flag cannot tell a fixed, n8n-owned URL apart from a URL a user just
pasted into a credential. So each call site makes a single, local, reviewable
decision — and a reviewer reading a `ssrf: 'disabled'` knows to ask "is this
destination really not user-controlled?".

`SsrfProtectionConfig` (env-driven) configures *how* the guard behaves once it
runs — the blocked/allowed IP ranges (`N8N_SSRF_BLOCKED_IP_RANGES`,
`N8N_SSRF_ALLOWED_IP_RANGES`), the allowed and blocked hostnames
(`N8N_SSRF_ALLOWED_HOSTNAMES`, `N8N_SSRF_BLOCKED_HOSTNAMES`), and the DNS-cache
size. Its `enabled` flag (`N8N_SSRF_PROTECTION_ENABLED`) is the **instance-wide gate that high-risk call sites consult** to decide whether to turn the guard on (see below).

The config sets the policy; the call site decides whether that policy applies to *this* destination.

### Choosing an SSRF level: low-risk vs high-risk calls

Classify the **destination**, then pick:

| Destination | Risk | What to pass |
| --- | --- | --- |
| Fixed n8n-owned host, or a fixed public vendor API (Slack, Linear, npm registry default, AWS service endpoint) | **Low** — not user-controllable | `ssrf: 'disabled'` + a one-line "fixed host" comment |
| Admin-configured infrastructure that may legitimately be internal (SAML/OIDC IdP, OTLP collector, log-streaming destination, external-secrets manager) | **Low–medium** — operator-trusted | `ssrf: 'disabled'` + a "may point at internal X" comment. The `N8N_SSRF_ALLOWED_*` allowlists are the escape hatch when the instance runs with protection globally on. |
| User- or remote-controlled URL (workflow import URL, credential/OAuth URLs, a discovery document's second hop, a user-supplied registry, an LLM/web-research target) | **High** — attacker-influenceable | gate on the instance setting: `ssrf: ssrfConfig.enabled ? ssrfProtectionService : 'disabled'` |

```ts
// LOW risk — fixed, n8n-owned host.
const client = this.outboundHttp.requests({ ssrf: 'disabled' });

// HIGH risk — `url` comes from user input. Guard when the instance enables it.
const client = this.outboundHttp.requests({
	ssrf: this.ssrfConfig.enabled ? this.ssrfProtectionService : 'disabled',
});
```

Whatever you pick, **write a one-line comment stating why** — that comment is
what a security reviewer reads. Reference implementations:
`packages/cli/src/oauth/oauth.service.ts` (config-gated high-risk) and
`packages/nodes-base/credentials/common/token-request.ts`, which lifts the
low/high-risk choice into the type system with a
`'fixed-vendor' | 'user-controlled'` parameter so the caller is forced to
classify the destination.

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