# oauth4webapi

> Low-Level OAuth 2 / OpenID Connect Client API for JavaScript Runtimes

This software provides a collection of routines that can be used to build client modules for OAuth 2.1, OAuth 2.0 with the latest Security Best Current Practices (BCP), and FAPI 2.0, as well as OpenID Connect where applicable. The primary goal of this software is to promote secure and up-to-date best practices while using only the capabilities common to both browser and non-browser JavaScript runtimes.

## Features

The following features are currently in scope and implemented in this software:

- Authorization Server Metadata discovery
- Resource Server Metadata discovery
- Authorization Code Flow (profiled under OpenID Connect 1.0, OAuth 2.0, OAuth 2.1, and FAPI 2.0), with PKCE
- Refresh Token, Device Authorization, Client-Initiated Backchannel Authentication (CIBA), and Client Credentials Grants
- Demonstrating Proof-of-Possession at the Application Layer (DPoP)
- Token Introspection and Revocation
- Pushed Authorization Requests (PAR)
- UserInfo and Protected Resource Requests
- Authorization Server Issuer Identification
- JWT Secured Introspection, Response Mode (JARM), Authorization Request (JAR), and UserInfo
- Dynamic Client Registration (DCR)
- Validating incoming JWT Access Tokens

## Sponsor

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/panva/oauth4webapi/HEAD/sponsor/Auth0byOkta_dark.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/panva/oauth4webapi/HEAD/sponsor/Auth0byOkta_light.png">
  <img height="65" align="left" alt="Auth0 by Okta" src="https://raw.githubusercontent.com/panva/oauth4webapi/HEAD/sponsor/Auth0byOkta_light.png">
</picture>

If you want to quickly add authentication to JavaScript apps, feel free to check out Auth0's JavaScript SDK and free plan. [Create an Auth0 account; it's free!][sponsor-auth0]<br><br>

## [Certification](https://openid.net/certification/faq/)

[<img width="96" height="50" align="right" src="https://user-images.githubusercontent.com/241506/166977513-7cd710a9-7f60-4944-aebe-a658e9f36375.png" alt="OpenID Certification">](#certification)

[Filip Skokan](https://github.com/panva) has [certified](https://openid.net/certification) that [this software](https://github.com/panva/oauth4webapi) conforms to the Basic, FAPI 1.0, and FAPI 2.0 Relying Party Conformance Profiles of the OpenID Connect™ protocol.

## [💗 Help the project](https://github.com/sponsors/panva)

Support from the community to continue maintaining and improving this module is welcome. If you find the module useful, please consider supporting the project by [becoming a sponsor](https://github.com/sponsors/panva).

## Dependencies: 0

`oauth4webapi` has no dependencies and it exports tree-shakeable ESM.

## [API Reference](docs/README.md)

`oauth4webapi` is distributed via [npmjs.com](https://www.npmjs.com/package/oauth4webapi), [jsr.io](https://jsr.io/@panva/oauth4webapi), [jsdelivr.com](https://www.jsdelivr.com/package/npm/oauth4webapi), and [github.com](https://github.com/panva/oauth4webapi).

## [Examples](examples/README.md)

**`example`** ESM import[^cjs]

```js
import * as oauth from 'oauth4webapi'
```

- Authorization Code Flow (OAuth 2.0) - [source](examples/oauth.ts)
- Authorization Code Flow (OpenID Connect) - [source](examples/oidc.ts) | [diff](examples/oidc.diff)
- Extensions
  - DPoP - [source](examples/dpop.ts) | [diff](examples/dpop.diff)
  - JWT Secured Authorization Request (JAR) - [source](examples/jar.ts) | [diff](examples/jar.diff)
  - JWT Secured Authorization Response Mode (JARM) - [source](examples/jarm.ts) | [diff](examples/jarm.diff)
  - Pushed Authorization Request (PAR) - [source](examples/par.ts) | [diff](examples/par.diff)
- Client Authentication
  - Client Secret in HTTP Authorization Header - [source](examples/oauth.ts)
  - Client Secret in HTTP Body - [source](examples/client_secret_post.ts) | [diff](examples/client_secret_post.diff)
  - Private Key JWT Client Authentication - [source](examples/private_key_jwt.ts) | [diff](examples/private_key_jwt.diff)
  - Public Client - [source](examples/public.ts) | [diff](examples/public.diff)
- Other Grants
  - Client Credentials Grant - [source](examples/client_credentials.ts)
  - Client-Initiated Backchannel Authentication Grant (CIBA) - [source](examples/ciba.ts)
  - Device Authorization Grant - [source](examples/device_authorization_grant.ts)
  - Refresh Token Grant - [source](examples/refresh_token.ts) | [diff](examples/refresh_token.diff)
- FAPI
  - FAPI 1.0 Advanced - [source](examples/fapi1-advanced.ts) | [diff](examples/fapi1-advanced.diff)
  - FAPI 2.0 Security Profile - [source](examples/fapi2.ts) | [diff](examples/fapi2.diff)
  - FAPI 2.0 Message Signing - [source](examples/fapi2-message-signing.ts) | [diff](examples/fapi2-message-signing.diff)

## Supported Runtimes

The supported JavaScript runtimes include those that support the utilized Web API globals and standard built-in objects. These are _(but are not limited to)_:

- Browsers
- Bun
- Cloudflare Workers
- Deno
- Electron
- Node.js[^nodejs]
- Vercel's Edge Runtime

## Supported Versions

| Version                                                 | Security Fixes 🔑 | Other Bug Fixes 🐞 | New Features ⭐ |
| ------------------------------------------------------- | ----------------- | ------------------ | --------------- |
| [v3.x](https://github.com/panva/oauth4webapi/tree/v3.x) | [Security Policy] | ✅                 | ✅              |

[sponsor-auth0]: https://a0.to/signup/panva
[Security Policy]: https://github.com/panva/oauth4webapi/security/policy

[^cjs]: CJS style `let oauth = require('oauth4webapi')` is possible in Node.js versions where the `require(esm)` feature is enabled by default (^20.19.0 || ^22.12.0 || >= 23.0.0).

[^nodejs]: Node.js v20.x as baseline is required
