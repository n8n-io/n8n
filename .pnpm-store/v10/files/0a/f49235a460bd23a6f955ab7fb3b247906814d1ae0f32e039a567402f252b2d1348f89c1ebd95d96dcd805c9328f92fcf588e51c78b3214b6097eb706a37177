# @otplib/core

> Provides core methods for hotp, totp and authenticator.

<!-- TOC depthFrom:2 -->

- [Getting Started](#getting-started)
  - [Install the Package](#install-the-package)
  - [Choose Your Plugins](#choose-your-plugins)
    - [Adding Crypto](#adding-crypto)
    - [Adding Base32](#adding-base32)
  - [Initialise your Instance](#initialise-your-instance)
    - [Using Classes](#using-classes)
    - [Using Functions](#using-functions)
- [Available Options](#available-options)
- [License](#license)

<!-- /TOC -->

## Getting Started

This is the full setup guide for installing, configuring and customising
your dependencies for the library.

> Check out the [Quick Start Guide][docs-quick-start] instead for easier
> setup especially if you do not need to use any custom base32 / crypto libraries.

### Install the Package

```bash
npm install @otplib/core
```

### Choose Your Plugins

#### Adding Crypto

The crypto modules are used to generate the digest used to derive the OTP tokens from.
By default, Node.js has inbuilt `crypto` functionality, but you might want to replace it
for certain environments that do not support it.

Currently there are a few crypto plugins available from this project.
Install one of them. eg: `npm install @otplib/plugin-crypto`

Refer to the [crypto plugins list][docs-plugins-crypto],
or search for [otplib-plugin crypto][link-npm-search-crypto] on `npm`.

#### Adding Base32

If you're using `Google Authenticator`, you'll need a base32 module for
encoding and decoding your secrets.

Currently, there are a few base32 plugins available from this project.
Install one of them. eg: `npm install @otplib/plugin-thirty-two`

Refer to the [base32 plugin list][docs-plugins-base32],
or search for [otplib-plugin base32][link-npm-search-base32] on `npm`.

### Initialise your Instance

#### Using Classes

```js
import { HOTP, TOTP, Authenticator } from '@otplib/core';

import { keyDecoder, keyEncoder } from '@otplib/plugin-thirty-two'; // use your chosen base32 plugin
import { createDigest, createRandomBytes } from '@otplib/plugin-crypto'; // use your chosen crypto plugin

// Setup an OTP instance which you need
const hotp = new HOTP({ createDigest });
const totp = new TOTP({ createDigest });
const authenticator = new Authenticator({
  createDigest,
  createRandomBytes,
  keyDecoder,
  keyEncoder
});

// Go forth and generate tokens
const token = hotp.generate(YOUR_SECRET, 0);
const token = totp.generate(YOUR_SECRET);
const token = authenticator.generate(YOUR_SECRET);
```

#### Using Functions

Alternatively, if you are using the functions directly instead of the classes,
pass these as options into the functions.

```js
import {
  hotpOptions,
  hotpToken,
  totpOptions,
  totpToken,
  authenticatorOptions,
  authenticatorToken
} from 'otplib/core';

// As with classes, import your desired Base32 Plugin and Crypto Plugin.
// import ...

// Go forth and generate tokens
const token = hotpToken(YOUR_SECRET, 0, hotpOptions({ createDigest }));
const token = totpToken(YOUR_SECRET, totpOptions({ createDigest }));
const token = authenticatorToken(
  YOUR_SECRET,
  authenticatorOptions({
    createDigest,
    createRandomBytes,
    keyDecoder,
    keyEncoder
  })
);
```

## Available Options

Please refer to the [Options Guide][docs-options].

## License

`@otplib/core` is [MIT licensed][project-license]

[link-npm-search-base32]: https://www.npmjs.com/search?q=otplib-plugin%20base32
[link-npm-search-crypto]: https://www.npmjs.com/search?q=otplib-plugin%20crypto
[docs-options]: https://github.com/yeojz/otplib/blob/master/README.md#available-options
[docs-plugins-base32]: https://github.com/yeojz/otplib/blob/master/packages/README.md#plugins---base32
[docs-plugins-crypto]: https://github.com/yeojz/otplib/blob/master/packages/README.md#plugins---crypto
[docs-quick-start]: https://github.com/yeojz/otplib/blob/master/README.md#quick-start
[project-license]: https://github.com/yeojz/otplib/blob/master/LICENSE
