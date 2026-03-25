# otplib

> Time-based (TOTP) and HMAC-based (HOTP) One-Time Password library

[![npm][badge-npm]][project-npm]
[![Build Status][badge-circle]][project-circle]
[![Coverage Status][badge-coveralls]][project-coveralls]
[![npm downloads][badge-npm-downloads]][project-npm]
[![TypeScript Support][badge-type-ts]][project-v-api]

---

<!-- TOC depthFrom:2 -->

- [About](#about)
- [Features](#features)
- [Quick Start](#quick-start)
  - [In Node.js](#in-nodejs)
  - [In Browser](#in-browser)
- [References](#references)
  - [API / Demo Website](#api--demo-website)
  - [Versioning](#versioning)
  - [Migrating from v11.x](#migrating-from-v11x)
  - [Available Options](#available-options)
    - [HOTP Options](#hotp-options)
    - [TOTP Options](#totp-options)
    - [Authenticator Options](#authenticator-options)
- [Appendix](#appendix)
  - [Type Definitions](#type-definitions)
  - [Async Support](#async-support)
  - [Browser Compatiblity](#browser-compatiblity)
  - [Length of Secrets](#length-of-secrets)
  - [Google Authenticator](#google-authenticator)
    - [Difference between Authenticator and TOTP](#difference-between-authenticator-and-totp)
    - [RFC3548 Base32](#rfc3548-base32)
    - [Displaying a QR code](#displaying-a-qr-code)
  - [Getting Time Remaining / Time Used](#getting-time-remaining--time-used)
  - [Using with Expo](#using-with-expo)
  - [Exploring with local-repl](#exploring-with-local-repl)
  - [OTP Backup Codes](#otp-backup-codes)
- [Contributors](#contributors)
- [License](#license)

<!-- /TOC -->

## About

`otplib` is a JavaScript One Time Password (OTP) library for OTP generation and verification.

It implements both [HOTP][rfc-4226-wiki] - [RFC 4226][rfc-4226]
and [TOTP][rfc-6238-wiki] - [RFC 6238][rfc-6238],
and are tested against the test vectors provided in their respective RFC specifications.
These datasets can be found in the `tests/data` folder.

- [RFC 4226 Dataset][rfc-4226-dataset]
- [RFC 6238 Dataset][rfc-6238-dataset]

This library is also compatible with [Google Authenticator](https://github.com/google/google-authenticator),
and includes additional methods to allow you to work with Google Authenticator.

## Features

- Typescript support
- [Class][link-mdn-classes] interfaces
- [Function][link-mdn-functions] interfaces
- [Async][link-mdn-async] interfaces
- Pluggable modules (crypto / base32)
  - `crypto (node)`
  - `crypto-js`
  - `@ronomon/crypto-async`
  - `thirty-two`
  - `base32-encode` + `base32-decode`
- Presets provided
  - `browser`
  - `default (node)`
  - `default-async (same as default, but with async methods)`
  - `v11 (adapter for previous version)`

## Quick Start

> If you need to customise your base32 or crypto libraries,
> check out the [In-Depth Guide][docs-in-depth] and [Available Packages][docs-available-packages]

### In Node.js

```bash
npm install otplib --save
```

```js
import { authenticator } from 'otplib';

const secret = 'KVKFKRCPNZQUYMLXOVYDSQKJKZDTSRLD';
// Alternative:
// const secret = authenticator.generateSecret();
// Note: .generateSecret() is only available for authenticator and not totp/hotp

const token = authenticator.generate(secret);

try {
  const isValid = authenticator.check(token, secret);
  // or
  const isValid = authenticator.verify({ token, secret });
} catch (err) {
  // Possible errors
  // - options validation
  // - "Invalid input - it is not base32 encoded string" (if thiry-two is used)
  console.error(err);
}
```

Please replace "authenticator" with "totp" or "hotp" depending on your requirements.

```js
// For TOTP
import { totp } from 'otplib';
const token = totp.generate(secret);
const isValid = totp.check(token, secret);
const isValid = totp.verify({ token, secret });

// For HOTP
import { hotp } from 'otplib';
const token = hotp.generate(secret, counter);
const isValid = hotp.check(token, secret, counter);
const isValid = hotp.verify({ token, secret, counter });
```

For all available APIs, please refer to [API Documentation][project-v-api].

### In Browser

The browser preset is a self-contained `umd` module, and it is provided in a separate bundle.

```bash
npm install @otplib/preset-browser --save
```

The following is an example, where we are using the scripts hosted by `unpkg.com`.

```html
<script src="https://unpkg.com/@otplib/preset-browser@^12.0.0/buffer.js"></script>
<script src="https://unpkg.com/@otplib/preset-browser@^12.0.0/index.js"></script>

<script type="text/javascript">
  // window.otplib.authenticator
  // window.otplib.hotp
  // window.otplib.totp
</script>
```

For more details, please refer to the [@otplib/preset-browser documentation][docs-preset-browser].

## References

### API / Demo Website

| Version         | Links                                                                               |
| --------------- | ----------------------------------------------------------------------------------- |
| v12.x           | [Website][project-v-site] / [API][project-v-api] / [Readme][project-v-readme]       |
| v11.x           | [API][project-v11-api] / [Readme][project-v11-readme] |
| v10.x and below | Available via git history                                                           |

### Versioning

This library follows `semver`. As such, major version bumps usually mean API changes or behavior changes.
Please check [upgrade notes](https://github.com/yeojz/otplib/wiki/upgrade-notes) for more information,
especially before making any major upgrades.

To simplify releases, all packages within this repository have their versions synced.
Therefore, if there are any releases or updates to a package, we will bump all packages.

Check out the release notes associated with each tagged versions
in the [releases](https://github.com/yeojz/otplib/releases) page.

| Release Type      | Version Pattern | Command                   |                                       |
| :---------------- | --------------- | ------------------------- | :------------------------------------ |
| Current / Stable  | 0.0.0           | `npm install otplib`      | [![npm][badge-npm]][project-npm]      |
| Release Candidate | 0.0.0-0         | `npm install otplib@next` | [![npm][badge-npm-next]][project-npm] |

### Migrating from v11.x

> v12.x is a huge architectural and language rewrite. Please check out the docs if you are migrating.
> A preset adapter is available to provide methods that behave like `v11.x` of `otplib`.

```js
// Update
import { authenticator } from 'otplib'; // v11.x
// to
import { authenticator } from '@otplib/preset-v11';

// There should be no changes to your current code.
// However, deprecated or modified class methods will have console.warn.
```

### Available Options

All instantiated classes will have their options inherited from their respective options
generator. i.e. HOTP from `hotpOptions`, TOTP from `totpOptions`
and Authenticator from `authenticatorOptions`.

All OTP classes have an object setter and getter method to override these default options.

For example,

```js
import { authenticator, totp, hotp } from 'otplib';

// setting
authenticator.options = { digits: 6 };
totp.options = { digits: 6 };
hotp.options = { digits: 6 };

// getting
const opts = authenticator.options;
const opts = totp.options;
const opts = hotp.options;

// reset to default
authenticator.resetOptions();
totp.resetOptions();
hotp.resetOptions();

// getting all options, with validation
// and backfilled with library defaults
const opts = authenticator.allOptions();
const opts = totp.allOptions();
const opts = hotp.allOptions();
```

#### HOTP Options

| Option        | Type     | Description                                                                                                                     |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| algorithm     | string   | The algorithm used for calculating the HMAC.                                                                                    |
| createDigest  | function | Creates the digest which token is derived from.                                                                                 |
| createHmacKey | function | Formats the secret into a HMAC key, applying transformations (like padding) where needed.                                       |
| digest        | string   | **USE WITH CAUTION**. Same digest = same token. <br />Used in cases where digest is generated externally. (eg: async use cases) |
| digits        | integer  | The length of the token.                                                                                                        |
| encoding      | string   | The encoding that was used on the secret.                                                                                       |

```js
// HOTP defaults
{
  algorithm: 'sha1'
  createDigest: undefined, // to be provided via a @otplib/plugin-*
  createHmacKey: hotpCreateHmacKey,
  digits: 6,
  encoding: 'ascii',
}
```

#### TOTP Options

> Note: Includes all HOTP Options

| Option | Type                             | Description                                                                                                                                                                            |
| ------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| epoch  | integer                          | **USE WITH CAUTION**. Same epoch = same token. <br />Starting time since the UNIX epoch (seconds). <br /> Epoch is JavaScript formatted. i.e. `Date.now()` or `UNIX time * 1000`       |
| step   | integer                          | Time step (seconds)                                                                                                                                                                    |
| window | integer, <br /> [number, number] | Tokens in the previous and future x-windows that should be considered valid. <br /> If integer, same value will be used for both. <br /> Alternatively, define array: `[past, future]` |

```js
// TOTP defaults
{
  // ...includes all HOTP defaults
  createHmacKey: totpCreateHmacKey,
  epoch: Date.now(),
  step: 30,
  window: 0,
}
```

#### Authenticator Options

> Note: Includes all HOTP + TOTP Options

| Option            | Type     | Description                                                                                           |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| createRandomBytes | function | Creates a random string containing the defined number of bytes to be used in generating a secret key. |
| keyEncoder        | function | Encodes a secret key into a Base32 string before it is sent to the user (in QR Code etc).             |
| keyDecoder        | function | Decodes the Base32 string given by the user into a secret.                                            |

```js
// Authenticator defaults
{
  // ...includes all HOTP + TOTP defaults
  encoding: 'hex',
  createRandomBytes: undefined, // to be provided via a @otplib/plugin-*
  keyEncoder: undefined, // to be provided via a @otplib/plugin-*
  keyDecoder: undefined, // to be provided via a @otplib/plugin-*
}
```

## Appendix

### Type Definitions

`TypeScript` support was introduced in `v10.0.0`, which added type definitions over `.js` files.

As of `v12.0.0`, the library has been re-written in Typescript from the ground up.

### Async Support

`async` support was introduced in `v12.0.0` as an additional core library.

This was added as some libraries like [expo.io][link-expo-crypto] or even
the browser API ([window.Crypto.subtle][link-mdn-subtlecrypto]) started providing
only async methods.

You to find more details in the [core-async][docs-core-async] folder.

### Browser Compatiblity

`@otplib/preset-browser` is a `umd` bundle with some node modules replaced to reduce the browser size.

The approximate size for the **optimised, minified + gzipped** bundle is **9.53KB**.
Paired with the gzipped browser `buffer.js` module, it would be about `7.65KB + 9.53KB = 17.18KB`.

For more details, please refer to the [@otplib/preset-browser documentation][docs-preset-browser].

### Length of Secrets

In [RFC 6238][rfc-6238], the secret / seed length for different algorithms are predefined:

```txt
HMAC-SHA1 - 20 bytes
HMAC-SHA256 - 32 bytes
HMAC-SHA512 - 64 bytes
```

As such, the length of the secret provided (after any decoding) will be padded and sliced
according to the expected length for respective algorithms.

### Google Authenticator

#### Difference between Authenticator and TOTP

The default encoding option has been set to `hex` (Authenticator) instead of `ascii` (TOTP).

#### RFC3548 Base32

> Note: [RFC4648][rfc-4648] obseletes [RFC 3548][rfc-3548].
> Any encoders following the newer specifications will work.

Google Authenticator requires keys to be base32 encoded.
It also requires the base32 encoder to be [RFC 3548][rfc-3548] compliant.

OTP calculation will still work should you want to use
other base32 encoding methods (like Crockford's Base32)
but it will NOT be compatible with Google Authenticator.

```js
const secret = authenticator.generateSecret(); // base32 encoded hex secret key
const token = authenticator.generate(secret);
```

#### Displaying a QR code

You may want to generate and display a QR Code so that users can scan
instead of manually entering the secret. Google Authenticator and similar apps
take in a QR code that holds a URL with the protocol `otpauth://`,
which you get from `authenticator.keyuri`.

Google Authenticator will ignore the `algorithm`, `digits`, and `step` options.
See the [keyuri documentation](https://github.com/google/google-authenticator/wiki/Key-Uri-Format)
for more information.

If you are using a different authenticator app, check the documentation
for that app to see if any options are ignored, which will result in invalid tokens.

While this library provides the "otpauth" uri, you'll need a library to
generate the QR Code image.

An example is shown below:

```js
// npm install qrcode
import qrcode from 'qrcode';
import { authenticator } from '@otplib/preset-default';

const user = 'A user name, possibly an email';
const service = 'A service name';

// v11.x and above
const otpauth = authenticator.keyuri(user, service, secret);

// v10.x and below
const otpauth = authenticator.keyuri(
  encodeURIComponent(user),
  encodeURIComponent(service),
  secret
);

qrcode.toDataURL(otpauth, (err, imageUrl) => {
  if (err) {
    console.log('Error with QR');
    return;
  }
  console.log(imageUrl);
});
```

> **Note**: For versions `v10.x` and below, `keyuri` does not URI encode
> `user` and `service`. You'll need to do so before passing in the parameteres.

### Getting Time Remaining / Time Used

Helper methods for getting the remaining time and used time within a validity period
of a `totp` or `authenticator` token were introduced in `v10.0.0`.

```js
authenticator.timeUsed(); // or totp.timeUsed();
authenticator.timeRemaining(); // or totp.timeRemaining();

// The start of a new token would be when:
// - timeUsed() === 0
// - timeRemaining() === step
```

### Using with Expo

[Expo][link-expo-io] contains modified crypto implmentations targeted at the platform.
While `otplib` does not provide an `expo` specified package, with the re-architecture
of `otplib`, you can now provide an expo native `createDigest` to the library.

Alternatively, you can make use of crypto provided by `@otplib/plugin-crypto-js` or
the bundled browser umd module `@otplib/preset-browser`.

Pull Requests are much welcomed for a native expo implementation as well.

### Exploring with local-repl

If you'll like to explore the library with `local-repl` you can do so as well.

```bash
# after cloning the repo:
npm run setup
npm run build
npx local-repl
# You should see something like:
# Node v8.9.4, local-repl 4.0.0
# otplib 10.0.0
# Context: otplib
# [otplib] >

[otplib] > secret = 'KVKFKRCPNZQUYMLXOVYDSQKJKZDTSRLD'
[otplib] > otplib.authenticator.generate(secret)
```

### OTP Backup Codes

It is common for services to also provide a set of backup codes to authenticate
and bypass the OTP step in the event that you are not able to access your 2FA
device or have misplaced the device.

As this process is separate from the specifications for OTP, this library does not
provide any backup code related verification logic, and thus would have to be
implemented separately.

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/yeojz"><img src="https://avatars2.githubusercontent.com/u/429598?v=4" width="80px;" alt="Gerald Yeo"/><br /><sub><b>Gerald Yeo</b></sub></a><br /><a href="https://github.com/yeojz/otplib/commits?author=yeojz" title="Code">💻</a> <a href="https://github.com/yeojz/otplib/commits?author=yeojz" title="Documentation">📖</a> <a href="#maintenance-yeojz" title="Maintenance">🚧</a> <a href="https://github.com/yeojz/otplib/commits?author=yeojz" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://ols.io"><img src="https://avatars3.githubusercontent.com/u/6209178?v=4" width="80px;" alt="Oliver Schneider"/><br /><sub><b>Oliver Schneider</b></sub></a><br /><a href="https://github.com/yeojz/otplib/commits?author=olsio" title="Documentation">📖</a></td>
    <td align="center"><a href="https://developer.mozilla.org/profiles/madarche/"><img src="https://avatars0.githubusercontent.com/u/152407?v=4" width="80px;" alt="Marc-Aurèle DARCHE"/><br /><sub><b>Marc-Aurèle DARCHE</b></sub></a><br /><a href="https://github.com/yeojz/otplib/commits?author=madarche" title="Documentation">📖</a></td>
    <td align="center"><a href="http://shakram02.github.io/"><img src="https://avatars3.githubusercontent.com/u/10996982?v=4" width="80px;" alt="Ahmed Hamdy (@shakram02)"/><br /><sub><b>Ahmed Hamdy (@shakram02)</b></sub></a><br /><a href="https://github.com/yeojz/otplib/commits?author=shakram02" title="Documentation">📖</a></td>
    <td align="center"><a href="https://tony.brix.ninja"><img src="https://avatars3.githubusercontent.com/u/97994?v=4" width="80px;" alt="Tony Brix"/><br /><sub><b>Tony Brix</b></sub></a><br /><a href="https://github.com/yeojz/otplib/commits?author=UziTech" title="Code">💻</a> <a href="https://github.com/yeojz/otplib/commits?author=UziTech" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/encX"><img src="https://avatars3.githubusercontent.com/u/5965883?v=4" width="80px;" alt="Plai"/><br /><sub><b>Plai</b></sub></a><br /><a href="https://github.com/yeojz/otplib/commits?author=encX" title="Documentation">📖</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors)
specification. Contributions of any kind welcome!

## License

`otplib` is [MIT licensed][project-license]

<img width="150" src="https://otplib.yeojz.dev/otplib.png" />

<!-- Badges -->

[badge-circle]: https://img.shields.io/circleci/project/github/yeojz/otplib/master.svg?style=flat-square
[badge-coveralls]: https://img.shields.io/coveralls/yeojz/otplib/master.svg?style=flat-square
[badge-npm-downloads]: https://img.shields.io/npm/dt/otplib.svg?style=flat-square
[badge-npm-next]: https://img.shields.io/npm/v/otplib/next.svg?style=flat-square
[badge-npm]: https://img.shields.io/npm/v/otplib.svg?style=flat-square
[badge-type-ts]: https://img.shields.io/badge/typedef-.d.ts-blue.svg?style=flat-square&longCache=true

<!-- External Links -->

[link-expo-crypto]: https://docs.expo.io/versions/v33.0.0/sdk/crypto/
[link-expo-io]: https://expo.io
[link-mdn-async]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
[link-mdn-classes]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
[link-mdn-functions]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions
[link-mdn-subtlecrypto]: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
[link-npm-buffer]: https://www.npmjs.com/package/buffer
[rfc-3548]: http://tools.ietf.org/html/rfc3548
[rfc-4226-dataset]: https://github.com/yeojz/otplib/blob/master/tests/data/rfc-4226.ts
[rfc-4226-wiki]: http://en.wikipedia.org/wiki/HMAC-based_One-time_Password_Algorithm
[rfc-4226]: http://tools.ietf.org/html/rfc4226
[rfc-4648]: https://tools.ietf.org/html/rfc4648
[rfc-6238-dataset]: https://github.com/yeojz/otplib/blob/master/tests/data/rfc-6238.ts
[rfc-6238-wiki]: http://en.wikipedia.org/wiki/Time-based_One-time_Password_Algorithm
[rfc-6238]: http://tools.ietf.org/html/rfc6238

<!-- Project Links -->

[docs-available-packages]: https://github.com/yeojz/otplib/blob/master/packages/README.md
[docs-core-async]: https://github.com/yeojz/otplib/blob/master/packages/otplib-core-async/README.md
[docs-in-depth]: https://github.com/yeojz/otplib/blob/master/packages/otplib-core/README.md#getting-started
[docs-preset-browser-src]: https://github.com/yeojz/otplib/blob/master/packages/otplib-preset-browser/src/index.ts
[docs-preset-browser]: https://github.com/yeojz/otplib/blob/master/packages/otplib-preset-browser/README.md
[project-circle]: https://circleci.com/gh/yeojz/otplib
[project-coveralls]: https://coveralls.io/github/yeojz/otplib
[project-license]: https://github.com/yeojz/otplib/blob/master/LICENSE
[project-npm]: https://www.npmjs.com/package/otplib
[project-repo]: https://github.com/yeojz/otplib
[project-v-api]: https://otplib.yeojz.dev/api
[project-v-readme]: https://github.com/yeojz/otplib/blob/master/README.md
[project-v-site]: https://otplib.yeojz.dev
[project-v11-api]: https://5d4d0cc4c85e00000788a456--otplib.netlify.com/docs
[project-v11-readme]: https://github.com/yeojz/otplib/blob/d0aedccbca8ae7ec1983f40da4d7a14c9e815e9c/README.md
