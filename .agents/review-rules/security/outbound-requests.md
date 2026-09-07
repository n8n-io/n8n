# Outbound requests

Applies to: `packages/cli`, `packages/core`, `packages/nodes-base`,
`packages/@n8n/nodes-langchain`.

A URL is user-controlled unless the code shows otherwise. The recurring finding is not a weak allowlist but a working check the new path never calls: `n8n-workflow` exports `assertUrlAllowed`, `assertCredentialAllowsUrl` and `getCredentialAllowedDomains`, and a request surface reaching none of them is the finding.

Flag NEW code where:

- A request built from user input reaches an HTTP client unchecked
- A later hop inherits the first hop's approval — pagination `next` links, redirects, `.well-known` discovery, webhook callbacks. Per-hop checks need the allowlist `getCredentialAllowedDomains` returns
- Credential material (`Authorization`, cookies, signed headers) reaches a host the check did not cover
- The URL arrives in a field that reads like configuration but the user writes: `requestTokenUrl`, `accessTokenUrl`, OAuth `serverUrl`, SAML `metadataUrl`, a region or host fragment reaching an SDK endpoint
- A URL is checked by regex rather than `new URL()`; regexes miss `@`-userinfo, `#` fragments and IPv6 literals
- Certificate validation is dropped (`rejectUnauthorized: false`)
