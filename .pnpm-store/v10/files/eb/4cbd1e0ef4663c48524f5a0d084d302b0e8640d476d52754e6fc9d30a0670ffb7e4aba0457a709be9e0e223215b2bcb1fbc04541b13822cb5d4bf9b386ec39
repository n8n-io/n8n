# jose

`jose` is JavaScript module for JSON Object Signing and Encryption, providing support for JSON Web Tokens (JWT), JSON Web Signature (JWS), JSON Web Encryption (JWE), JSON Web Key (JWK), JSON Web Key Set (JWKS), and more. The module is designed to work across various Web-interoperable runtimes including Node.js, browsers, Cloudflare Workers, Deno, Bun, and others.

## Sponsor

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/panva/jose/HEAD/sponsor/Auth0byOkta_dark.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/panva/jose/HEAD/sponsor/Auth0byOkta_light.png">
  <img height="65" align="left" alt="Auth0 by Okta" src="https://raw.githubusercontent.com/panva/jose/HEAD/sponsor/Auth0byOkta_light.png">
</picture>

If you want to quickly add JWT authentication to JavaScript apps, feel free to check out Auth0's JavaScript SDK and free plan. [Create an Auth0 account; it's free!][sponsor-auth0]<br><br>

## [💗 Help the project](https://github.com/sponsors/panva)

Support from the community to continue maintaining and improving this module is welcome. If you find the module useful, please consider supporting the project by [becoming a sponsor](https://github.com/sponsors/panva).

## Dependencies: 0

`jose` has no dependencies and it exports tree-shakeable ESM[^cjs].

## Documentation

`jose` is distributed via [npmjs.com](https://www.npmjs.com/package/jose), [jsr.io](https://jsr.io/@panva/jose), [jsdelivr.com](https://www.jsdelivr.com/package/npm/jose), and [github.com](https://github.com/panva/jose).

**`example`** ESM import[^cjs]

```js
import * as jose from 'jose'
```

### JSON Web Tokens (JWT)

The `jose` module supports JSON Web Tokens (JWT) and provides functionality for signing and verifying tokens, as well as their JWT Claims Set validation.

- [JWT Claims Set Validation & Signature Verification](docs/jwt/verify/functions/jwtVerify.md) using the `jwtVerify` function
  - [Using a remote JSON Web Key Set (JWKS)](docs/jwks/remote/functions/createRemoteJWKSet.md)
  - [Using a local JSON Web Key Set (JWKS)](docs/jwks/local/functions/createLocalJWKSet.md)
- [Signing](docs/jwt/sign/classes/SignJWT.md) using the `SignJWT` class
- Utility functions
  - [Decoding Token's Protected Header](docs/util/decode_protected_header/functions/decodeProtectedHeader.md)
  - [Decoding JWT Claims Set](docs/util/decode_jwt/functions/decodeJwt.md) prior to its validation

### Encrypted JSON Web Tokens

The `jose` module supports encrypted JSON Web Tokens and provides functionality for encrypting and decrypting tokens, as well as their JWT Claims Set validation.

- [Decryption & JWT Claims Set Validation](docs/jwt/decrypt/functions/jwtDecrypt.md) using the `jwtDecrypt` function
- [Encryption](docs/jwt/encrypt/classes/EncryptJWT.md) using the `EncryptJWT` class
- Utility functions
  - [Decoding Token's Protected Header](docs/util/decode_protected_header/functions/decodeProtectedHeader.md)

### Key Utilities

The `jose` module supports importing, exporting, and generating keys and secrets in various formats, including PEM formats like SPKI, X.509 certificate, and PKCS #8, as well as JSON Web Key (JWK).

- Key Import Functions
  - [JWK Import](docs/key/import/functions/importJWK.md)
  - [Public Key Import (SPKI)](docs/key/import/functions/importSPKI.md)
  - [Public Key Import (X.509 Certificate)](docs/key/import/functions/importX509.md)
  - [Private Key Import (PKCS #8)](docs/key/import/functions/importPKCS8.md)
- Key and Secret Generation Functions
  - [Asymmetric Key Pair Generation](docs/key/generate_key_pair/functions/generateKeyPair.md)
  - [Symmetric Secret Generation](docs/key/generate_secret/functions/generateSecret.md)
- Key Export Functions
  - [JWK Export](docs/key/export/functions/exportJWK.md)
  - [Private Key Export](docs/key/export/functions/exportPKCS8.md)
  - [Public Key Export](docs/key/export/functions/exportSPKI.md)

### JSON Web Signature (JWS)

The `jose` module supports signing and verification of JWS messages with arbitrary payloads in Compact, Flattened JSON, and General JSON serialization syntaxes.

- Signing - [Compact](docs/jws/compact/sign/classes/CompactSign.md), [Flattened JSON](docs/jws/flattened/sign/classes/FlattenedSign.md), [General JSON](docs/jws/general/sign/classes/GeneralSign.md)
- Verification - [Compact](docs/jws/compact/verify/functions/compactVerify.md), [Flattened JSON](docs/jws/flattened/verify/functions/flattenedVerify.md), [General JSON](docs/jws/general/verify/functions/generalVerify.md)
  - [Using a remote JSON Web Key Set (JWKS)](docs/jwks/remote/functions/createRemoteJWKSet.md)
  - [Using a local JSON Web Key Set (JWKS)](docs/jwks/local/functions/createLocalJWKSet.md)
- Utility functions
  - [Decoding Token's Protected Header](docs/util/decode_protected_header/functions/decodeProtectedHeader.md)

### JSON Web Encryption (JWE)

The `jose` module supports encryption and decryption of JWE messages with arbitrary plaintext in Compact, Flattened JSON, and General JSON serialization syntaxes.

- Encryption - [Compact](docs/jwe/compact/encrypt/classes/CompactEncrypt.md), [Flattened JSON](docs/jwe/flattened/encrypt/classes/FlattenedEncrypt.md), [General JSON](docs/jwe/general/encrypt/classes/GeneralEncrypt.md)
- Decryption - [Compact](docs/jwe/compact/decrypt/functions/compactDecrypt.md), [Flattened JSON](docs/jwe/flattened/decrypt/functions/flattenedDecrypt.md), [General JSON](docs/jwe/general/decrypt/functions/generalDecrypt.md)
- Utility functions
  - [Decoding Token's Protected Header](docs/util/decode_protected_header/functions/decodeProtectedHeader.md)

### Other

The following are additional features and utilities provided by the `jose` module:

- [Calculating JWK Thumbprint](docs/jwk/thumbprint/functions/calculateJwkThumbprint.md)
- [Calculating JWK Thumbprint URI](docs/jwk/thumbprint/functions/calculateJwkThumbprintUri.md)
- [Verification using a JWK Embedded in a JWS Header](docs/jwk/embedded/functions/EmbeddedJWK.md)
- [Unsecured JWT](docs/jwt/unsecured/classes/UnsecuredJWT.md)
- [JOSE Errors](docs/util/errors/README.md)

## Supported Runtimes

The `jose` module is compatible with JavaScript runtimes that support the utilized Web API globals and standard built-in objects or are Node.js.

The following runtimes are supported _(this is not an exhaustive list)_:

- [Bun](https://github.com/panva/jose/issues/471)
- [Browsers](https://github.com/panva/jose/issues/263)
- [Cloudflare Workers](https://github.com/panva/jose/issues/265)
- [Deno](https://github.com/panva/jose/issues/266)
- [Electron](https://github.com/panva/jose/issues/264)
- [Node.js](https://github.com/panva/jose/issues/262)
- [Vercel's Edge Runtime](https://github.com/panva/jose/issues/301)

Please note that certain algorithms may not be available depending on the runtime used. You can find a list of available algorithms for each runtime in the specific issue links provided above.

## Supported Versions

| Version                                         | Security Fixes 🔑 | Other Bug Fixes 🐞 | New Features ⭐ | Runtime and Module type         |
| ----------------------------------------------- | ----------------- | ------------------ | --------------- | ------------------------------- |
| [v6.x](https://github.com/panva/jose/tree/v6.x) | [Security Policy] | ✅                 | ✅              | Universal[^universal] ESM[^cjs] |
| [v5.x](https://github.com/panva/jose/tree/v5.x) | [Security Policy] | ❌                 | ❌              | Universal[^universal] CJS + ESM |
| [v4.x](https://github.com/panva/jose/tree/v4.x) | [Security Policy] | ❌                 | ❌              | Universal[^universal] CJS + ESM |
| [v2.x](https://github.com/panva/jose/tree/v2.x) | [Security Policy] | ❌                 | ❌              | Node.js CJS                     |

## Specifications

<details>
<summary>Details</summary>

- JSON Web Signature (JWS) - [RFC7515](https://www.rfc-editor.org/rfc/rfc7515)
- JSON Web Encryption (JWE) - [RFC7516](https://www.rfc-editor.org/rfc/rfc7516)
- JSON Web Key (JWK) - [RFC7517](https://www.rfc-editor.org/rfc/rfc7517)
- JSON Web Algorithms (JWA) - [RFC7518](https://www.rfc-editor.org/rfc/rfc7518)
- JSON Web Token (JWT) - [RFC7519](https://www.rfc-editor.org/rfc/rfc7519)
- JSON Web Key Thumbprint - [RFC7638](https://www.rfc-editor.org/rfc/rfc7638)
- JSON Web Key Thumbprint URI - [RFC9278](https://www.rfc-editor.org/rfc/rfc9278)
- JWS Unencoded Payload Option - [RFC7797](https://www.rfc-editor.org/rfc/rfc7797)
- CFRG Elliptic Curve ECDH and Signatures - [RFC8037](https://www.rfc-editor.org/rfc/rfc8037)

The algorithm implementations in `jose` have been tested using test vectors from their respective specifications as well as [RFC7520](https://www.rfc-editor.org/rfc/rfc7520).

</details>

[sponsor-auth0]: https://a0.to/signup/panva
[WebCryptoAPI]: https://w3c.github.io/webcrypto/
[Fetch API]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
[Security Policy]: https://github.com/panva/jose/security/policy

[^cjs]: CJS style `let jose = require('jose')` is possible in Node.js versions where the `require(esm)` feature is enabled by default (^20.19.0 || ^22.12.0 || >= 23.0.0).

[^universal]: Assumes runtime support of [WebCryptoAPI][] and [Fetch API][]
