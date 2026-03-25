# jose

`jose` is JavaScript module for JSON Object Signing and Encryption, providing support for JSON Web Tokens (JWT), JSON Web Signature (JWS), JSON Web Encryption (JWE), JSON Web Key (JWK), JSON Web Key Set (JWKS), and more. The module is designed to work across various Web-interoperable runtimes including Node.js, browsers, Cloudflare Workers, Deno, Bun, and others.

## [💗 Help the project](https://github.com/sponsors/panva)

Support from the community to continue maintaining and improving this module is welcome. If you find the module useful, please consider supporting the project by [becoming a sponsor](https://github.com/sponsors/panva).

## Dependencies: 0

`jose` has no dependencies and it exports tree-shakeable ESM. CJS is also supported.

## Documentation

`jose` is distributed via [npmjs.com](https://www.npmjs.com/package/jose), [deno.land/x](https://deno.land/x/jose), [cdnjs.com](https://cdnjs.com/libraries/jose), [jsdelivr.com](https://www.jsdelivr.com/package/npm/jose), and [github.com](https://github.com/panva/jose).

**`example`** ESM import
```js
import * as jose from 'jose'
```

**`example`** CJS require
```js
const jose = require('jose')
```

### JSON Web Tokens (JWT)

The `jose` module supports JSON Web Tokens (JWT) and provides functionality for signing and verifying tokens, as well as their JWT Claims Set validation.

- [Signing](docs/classes/jwt_sign.SignJWT.md) using the `SignJWT` class
- [Verification & JWT Claims Set Validation](docs/functions/jwt_verify.jwtVerify.md) using the `jwtVerify` function
  - [Using a remote JWKS](docs/functions/jwks_remote.createRemoteJWKSet.md)
  - [Using a local JWKS](docs/functions/jwks_local.createLocalJWKSet.md)
- Utility functions
  - [Decoding Token's Protected Header](docs/functions/util_decode_protected_header.decodeProtectedHeader.md)
  - [Decoding JWT Claims Set](docs/functions/util_decode_jwt.decodeJwt.md) prior to its validation

### Encrypted JSON Web Tokens

The `jose` module supports encrypted JSON Web Tokens and provides functionality for encrypting and decrypting tokens, as well as their JWT Claims Set validation.

- [Encryption](docs/classes/jwt_encrypt.EncryptJWT.md) using the `EncryptJWT` class
- [Decryption & JWT Claims Set Validation](docs/functions/jwt_decrypt.jwtDecrypt.md) using the `jwtDecrypt` function
- Utility functions
  - [Decoding Token's Protected Header](docs/functions/util_decode_protected_header.decodeProtectedHeader.md)

### Key Utilities

The `jose` module supports importing, exporting, and generating keys and secrets in various formats, including PEM formats like SPKI, X.509 certificate, and PKCS #8, as well as JSON Web Key (JWK).

- Key Import Functions
  - [JWK Import](docs/functions/key_import.importJWK.md)
  - [Public Key Import (SPKI)](docs/functions/key_import.importSPKI.md)
  - [Public Key Import (X.509 Certificate)](docs/functions/key_import.importX509.md)
  - [Private Key Import (PKCS #8)](docs/functions/key_import.importPKCS8.md)
- Key and Secret Generation Functions
  - [Asymmetric Key Pair Generation](docs/functions/key_generate_key_pair.generateKeyPair.md)
  - [Symmetric Secret Generation](docs/functions/key_generate_secret.generateSecret.md)
- Key Export Functions
  - [JWK Export](docs/functions/key_export.exportJWK.md)
  - [Private Key Export](docs/functions/key_export.exportPKCS8.md)
  - [Public Key Export](docs/functions/key_export.exportSPKI.md)

### JSON Web Signature (JWS)

The `jose` module supports signing and verification of JWS messages with arbitrary payloads in Compact, Flattened JSON, and General JSON serialization syntaxes.

- Signing - [Compact](docs/classes/jws_compact_sign.CompactSign.md), [Flattened JSON](docs/classes/jws_flattened_sign.FlattenedSign.md), [General JSON](docs/classes/jws_general_sign.GeneralSign.md)
- Verification - [Compact](docs/functions/jws_compact_verify.compactVerify.md), [Flattened JSON](docs/functions/jws_flattened_verify.flattenedVerify.md), [General JSON](docs/functions/jws_general_verify.generalVerify.md)
  - [Verify using a remote JWKS](docs/functions/jwks_remote.createRemoteJWKSet.md)
  - [Verify using a local JWKS](docs/functions/jwks_local.createLocalJWKSet.md)
- Utility functions
  - [Decoding Token's Protected Header](docs/functions/util_decode_protected_header.decodeProtectedHeader.md)

### JSON Web Encryption (JWE)

The `jose` module supports encryption and decryption of JWE messages with arbitrary plaintext in Compact, Flattened JSON, and General JSON serialization syntaxes.

- Encryption - [Compact](docs/classes/jwe_compact_encrypt.CompactEncrypt.md), [Flattened JSON](docs/classes/jwe_flattened_encrypt.FlattenedEncrypt.md), [General JSON](docs/classes/jwe_general_encrypt.GeneralEncrypt.md)
- Decryption - [Compact](docs/functions/jwe_compact_decrypt.compactDecrypt.md), [Flattened JSON](docs/functions/jwe_flattened_decrypt.flattenedDecrypt.md), [General JSON](docs/functions/jwe_general_decrypt.generalDecrypt.md)
- Utility functions
  - [Decoding Token's Protected Header](docs/functions/util_decode_protected_header.decodeProtectedHeader.md)

### Other

The following are additional features and utilities provided by the `jose` module:

- [Calculating JWK Thumbprint](docs/functions/jwk_thumbprint.calculateJwkThumbprint.md)
- [Calculating JWK Thumbprint URI](docs/functions/jwk_thumbprint.calculateJwkThumbprintUri.md)
- [Verification using a JWK Embedded in a JWS Header](docs/functions/jwk_embedded.EmbeddedJWK.md)
- [Unsecured JWT](docs/classes/jwt_unsecured.UnsecuredJWT.md)
- [JOSE Errors](docs/modules/util_errors.md)

## Implemented specifications

The `jose` module implements the following specifications:

- JSON Web Signature (JWS) - [RFC7515](https://www.rfc-editor.org/rfc/rfc7515)
- JSON Web Encryption (JWE) - [RFC7516](https://www.rfc-editor.org/rfc/rfc7516)
- JSON Web Key (JWK) - [RFC7517](https://www.rfc-editor.org/rfc/rfc7517)
- JSON Web Algorithms (JWA) - [RFC7518](https://www.rfc-editor.org/rfc/rfc7518)
- JSON Web Token (JWT) - [RFC7519](https://www.rfc-editor.org/rfc/rfc7519)
- JSON Web Key Thumbprint - [RFC7638](https://www.rfc-editor.org/rfc/rfc7638)
- JSON Web Key Thumbprint URI - [RFC9278](https://www.rfc-editor.org/rfc/rfc9278)
- JWS Unencoded Payload Option - [RFC7797](https://www.rfc-editor.org/rfc/rfc7797)
- CFRG Elliptic Curve ECDH and Signatures - [RFC8037](https://www.rfc-editor.org/rfc/rfc8037)
- secp256k1 EC Key curve support - [RFC8812](https://www.rfc-editor.org/rfc/rfc8812)

The algorithm implementations have been tested using test vectors from their respective specifications as well as [RFC7520](https://www.rfc-editor.org/rfc/rfc7520).

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

| Version | Security Fixes 🔑 | Other Bug Fixes 🐞 | New Features ⭐ |
| ------- | --------- | -------- | -------- |
| [v4.x](https://github.com/panva/jose/tree/v4.x) | ✅ | ✅ | ✅ |
| [v2.x](https://github.com/panva/jose/tree/v2.x) | ✅ | ❌ | ❌ |
