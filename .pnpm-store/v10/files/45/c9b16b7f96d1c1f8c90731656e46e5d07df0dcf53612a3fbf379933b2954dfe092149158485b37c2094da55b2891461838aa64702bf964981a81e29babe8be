# eciesjs

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/47784cde956642b1b9e8e33cb8551674)](https://app.codacy.com/app/ecies/js)
[![License](https://img.shields.io/github/license/ecies/js.svg)](https://github.com/ecies/js)
[![NPM Package](https://img.shields.io/npm/v/eciesjs.svg)](https://www.npmjs.com/package/eciesjs)
[![NPM Downloads](https://img.shields.io/npm/dm/eciesjs)](https://npm-stat.link/eciesjs)
[![Bundle size](https://badgen.net/bundlephobia/minzip/eciesjs)](https://bundlephobia.com/package/eciesjs@latest)
[![CI](https://img.shields.io/github/actions/workflow/status/ecies/js/ci.yml)](https://github.com/ecies/js/actions)
[![Codecov](https://img.shields.io/codecov/c/github/ecies/js.svg)](https://codecov.io/gh/ecies/js)

Elliptic Curve Integrated Encryption Scheme for secp256k1/curve25519 in TypeScript.

This is the JavaScript/TypeScript version of [eciespy](https://github.com/ecies/py) with a built-in class-like secp256k1/curve25519 [API](#privatekey).

You can learn the details in [DETAILS.md](./DETAILS.md).

## Install

```bash
npm install eciesjs
```

We recommend using the latest JavaScript/TypeScript runtime although it's still possible to install on some old versions.

This library supports multiple platforms (browser, node, bun/deno, react native), see [Multi-platform Support](#multi-platform-support).

For security, see [Security](#security).

## Quick Start

```typescript
// example/runtime/quick-start.js
import { PrivateKey, decrypt, encrypt } from "eciesjs";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const sk = new PrivateKey();
const data = encoder.encode("hello world🌍");
const decrypted = decrypt(sk.secret, encrypt(sk.publicKey.toBytes(), data));
console.log(decoder.decode(decrypted));
```

Or run the example code:

```bash
$ pnpm install && pnpm build && cd example/runtime && pnpm install && node quick-start.js
hello world🌍
```

See [Configuration](#configuration) to control with more granularity.

## Sponsors

<a href="https://dotenvx.com"><img alt="dotenvx" src="https://dotenvx.com/logo.png" width="200" height="200"/></a>

## API

### `encrypt(receiverRawPK: string | Uint8Array, data: Uint8Array): Uint8Array`

Parameters:

- `receiverRawPK` - Receiver's public key, hex `string` or `Uint8Array`
- `data` - Data to encrypt

Returns: `Uint8Array`

### `decrypt(receiverRawSK: string | Uint8Array, data: Uint8Array): Uint8Array`

Parameters:

- `receiverRawSK` - Receiver's private key, hex `string` or `Uint8Array`
- `data` - Data to decrypt

Returns: `Uint8Array`

### `PrivateKey`

- Methods

```typescript
static fromHex(hex: string, curve?: EllipticCurve): PrivateKey;
constructor(secret?: Uint8Array, curve?: EllipticCurve);
toHex(): string;
encapsulate(pk: PublicKey, compressed?: boolean): Uint8Array;
multiply(pk: PublicKey, compressed?: boolean): Uint8Array;
equals(other: PrivateKey): boolean;
```

- Properties

```typescript
get secret(): Uint8Array;
readonly publicKey: PublicKey;
```

### `PublicKey`

- Methods

```typescript
static fromHex(hex: string, curve?: EllipticCurve): PublicKey;
constructor(data: Uint8Array, curve?: EllipticCurve);
toBytes(compressed?: boolean): Uint8Array;
toHex(compressed?: boolean): string;
decapsulate(sk: PrivateKey, compressed?: boolean): Uint8Array;
equals(other: PublicKey): boolean;
```

## Configuration

Following configurations are available.

- Elliptic curve: secp256k1 or curve25519 (x25519/ed25519)
- Ephemeral key format in the payload: compressed or uncompressed (only for secp256k1)
- Shared elliptic curve key format in the key derivation: compressed or uncompressed (only for secp256k1)
- Symmetric cipher algorithm: AES-256-GCM or XChaCha20-Poly1305
- Symmetric nonce length: 12 or 16 bytes (only for AES-256-GCM)

For compatibility, make sure different applications share the same configuration.

```ts
export type EllipticCurve = "secp256k1" | "x25519" | "ed25519";
export type SymmetricAlgorithm = "aes-256-gcm" | "xchacha20";
export type NonceLength = 12 | 16;

export class Config {
  ellipticCurve: EllipticCurve = "secp256k1";
  isEphemeralKeyCompressed: boolean = false;
  isHkdfKeyCompressed: boolean = false;
  symmetricAlgorithm: SymmetricAlgorithm = "aes-256-gcm";
  symmetricNonceLength: NonceLength = 16;
}

export const ECIES_CONFIG = new Config();
```

### Elliptic curve configuration

On `ellipticCurve = "x25519"` or `ellipticCurve = "ed25519"`, x25519 (key exchange function on curve25519) or ed25519 (signature algorithm on curve25519) will be used for key exchange instead of secp256k1.

In this case, the payload would always be: `32 Bytes + Ciphered` regardless of `isEphemeralKeyCompressed`.

> If you don't know how to choose between x25519 and ed25519, just use the dedicated key exchange function x25519 for efficiency.
>
> Because any 32-byte data is a valid curve25519 public key, the payload would seem random. This property is excellent for circumventing censorship by adversaries.

### Secp256k1-specific configuration

On `isEphemeralKeyCompressed = true`, the payload would be: `33 Bytes + Ciphered` instead of `65 Bytes + Ciphered`.

On `isHkdfKeyCompressed = true`, the hkdf key would be derived from `ephemeral public key (compressed) + shared public key (compressed)` instead of `ephemeral public key (uncompressed) + shared public key (uncompressed)`.

### Symmetric cipher configuration

On `symmetricAlgorithm = "xchacha20"`, plaintext data would be encrypted with XChaCha20-Poly1305.

On `symmetricNonceLength = 12`, the nonce of AES-256-GCM would be 12 bytes. XChaCha20-Poly1305's nonce is always 24 bytes regardless of `symmetricNonceLength`.

### Which configuration should I choose?

For compatibility with other [ecies libraries](https://github.com/orgs/ecies/repositories), start with the default (secp256k1 with AES-256-GCM).

For speed and security, pick x25519 with XChaCha20-Poly1305.

If you know exactly what you are doing, configure as you wish or build your own ecies logic with this library.

## Multi-platform Support

|              | Fully Supported |
| ------------ | --------------- |
| Node         | ✅               |
| Bun          | ✅               |
| Deno         | ✅ (see below)   |
| Browser      | ✅               |
| React Native | ✅               |

Via [`@ecies/ciphers`](https://github.com/ecies/js-ciphers), `node:crypto`'s native implementation of AES-256-GCM and XChaCha20-Poly1305 is chosen if available.

### Browser

This library is browser-friendly, check the [`example/browser`](./example/browser) directory for details. You can check [the online demo](https://js-demo.ecies.org/) as well.

If you want a WASM version to run directly in modern browsers or on some blockchains, you can also try [`ecies-wasm`](https://github.com/ecies/rs-wasm).

### Bun/Deno

For bun/deno, see [`example/runtime`](./example/runtime). There are some limitations currently, mentioned in [`@ecies/ciphers`](https://github.com/ecies/js-ciphers#known-limitations):

- `chacha20-poly1305`'s pure JS implementation is used on bun (`node:crypto`'s `chacha20-poly1305` is not available due to lack of implementation);
- `chacha20-poly1305` does not work on deno by default. You need to upgrade deno and run with `--conditions deno` (>=2.4.0) or `--unstable-node-conditions deno`(>=2.3.6,<2.4.0).

### React Native

See the [React Native demo](https://github.com/ecies/js-rn-demo).

## Security

To mitigate security risks, such as [supply chain attacks](https://slowmist.medium.com/supply-chain-attack-on-ledger-connect-kit-analyzing-the-impact-and-preventive-measures-1005e39422fd) and zero-day [vulnerabilities](https://github.com/advisories/GHSA-vjh7-7g9h-fjfh), we only use `node:crypto` and these audited dependencies:

- [noble-curves](https://github.com/paulmillr/noble-curves#security)
- [noble-hashes](https://github.com/paulmillr/noble-hashes#security)
- [noble-ciphers](https://github.com/paulmillr/noble-ciphers#security)

Every release is built on GitHub Actions with [provenance](https://www.npmjs.com/package/eciesjs#provenance).

This library is fully auditable as well. We're seeking funding for a professional third-party security audit to verify implementation and identify potential vulnerabilities.

If you rely on this library or value secure open-source cryptography, please consider [donating](https://github.com/sponsors/kigawas) to help fund this audit.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
