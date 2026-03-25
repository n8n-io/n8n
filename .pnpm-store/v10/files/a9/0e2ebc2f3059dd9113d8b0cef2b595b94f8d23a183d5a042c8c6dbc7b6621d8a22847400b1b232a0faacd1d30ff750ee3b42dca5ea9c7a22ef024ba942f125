# @ecies/ciphers

[![License](https://img.shields.io/github/license/ecies/js-ciphers.svg)](https://github.com/ecies/js-ciphers)
[![NPM Package](https://img.shields.io/npm/v/@ecies/ciphers.svg)](https://www.npmjs.com/package/@ecies/ciphers)
[![NPM Downloads](https://img.shields.io/npm/dm/@ecies/ciphers)](https://npm-stat.link/@ecies/ciphers)
[![Install size](https://packagephobia.com/badge?p=@ecies/ciphers)](https://packagephobia.com/result?p=@ecies/ciphers)
[![CI](https://img.shields.io/github/actions/workflow/status/ecies/js-ciphers/ci.yml)](https://github.com/ecies/js-ciphers/actions)
[![Codecov](https://img.shields.io/codecov/c/github/ecies/js-ciphers.svg)](https://codecov.io/gh/ecies/js-ciphers)

Node/Pure JavaScript symmetric ciphers adapter.

If native implementations are available on some platforms (e.g. node, deno, bun), it'll use [`node:crypto`](https://nodejs.org/api/crypto.html#cryptocreatecipherivalgorithm-key-iv-options) for efficiency.

Otherwise (e.g. browser, react native), it'll use [`@noble/ciphers`](https://github.com/paulmillr/noble-ciphers) for compatibility.

|              | aes              | chacha           |
| ------------ | ---------------- | ---------------- |
| Node         | `node:crypto` ⚡ | `node:crypto` ⚡ |
| Bun          | `node:crypto` ⚡ | `@noble/ciphers` |
| Deno         | `node:crypto` ⚡ | `@noble/ciphers` |
| Browser      | `@noble/ciphers` | `@noble/ciphers` |
| React Native | `@noble/ciphers` | `@noble/ciphers` |

> [!NOTE]
> You may need to polyfill [`crypto.getRandomValues`](https://github.com/LinusU/react-native-get-random-values) for React Native.
>
> There are some limitations, see [Known limitations](#known-limitations) below.
>
> This library is tree-shakeable, unused code will be excluded by bundlers.

Check the [example](./example/) folder for more usages.

## Quick start

```js
// example/quick-start.js
import { aes256gcm } from "@ecies/ciphers/aes";
import { randomBytes } from "@noble/ciphers/webcrypto";

const TEXT = "hello world🌍!";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const msg = encoder.encode(TEXT);

const key = randomBytes();
const nonce = randomBytes(16);
const cipher = aes256gcm(key, nonce);
console.log("decrypted:", decoder.decode(cipher.decrypt(cipher.encrypt(msg))));
```

The API follows `@noble/ciphers`'s API for ease of use, you can check their [examples](https://github.com/paulmillr/noble-ciphers#examples) as well.

## Supported ciphers

- `aes-256-gcm`
  - Both 16 bytes and 12 bytes nonce are supported.
- `aes-256-cbc`
  - **Only for legacy applications**. You should use `xchacha20-poly1305` or `aes-256-gcm` as possible.
  - Nonce is always 16 bytes.
- `chacha20-poly1305`
  - Nonce is always 12 bytes.
- `xchacha20-poly1305`
  - Nonce is always 24 bytes.

If key is fixed and nonce is less than 16 bytes, **avoid randomly generated nonce**.

## Known limitations

- `xchacha20-poly1305` is implemented with pure JS [`hchacha20`](https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha#section-2.2) function and `node:crypto`'s `chacha20-poly1305` on node.
- Currently (Nov 2025), `node:crypto`'s `chacha20-poly1305` is neither supported on [deno](https://github.com/denoland/deno/issues/28411) nor [bun](https://github.com/oven-sh/bun/issues/8072), `@noble/ciphers`'s implementation is used on both platforms instead.
- Some old versions of `deno` [did not support](https://github.com/denoland/deno/discussions/17964#discussioncomment-10917259) **indirect** conditional exports. If you used this library to build another library, client code of your library might have fell back to the `node:crypto` implementation and would not work properly, specifically `aes-256-gcm` (16 bytes nonce) and `chacha20-poly1305`. If you found such a problem, upgrade deno and run with `--conditions deno` (>=2.4.0) or `--unstable-node-conditions deno`(>=2.3.6,<2.4.0).
