[![Last version](https://img.shields.io/github/v/tag/hectorm/otpauth?label=version)](https://github.com/hectorm/otpauth/tags)
[![npm downloads](https://img.shields.io/npm/dm/otpauth?label=npm%20downloads)](https://www.npmjs.com/package/otpauth)

<p align="center">
  <img src="./resources/logo/OTPAuth-Color-Reduced.svg" height="192">
</p>

# OTPAuth

One Time Password (HOTP/TOTP) library for Node.js, Deno, Bun and browsers.

## Usage

### Node.js

```javascript
import * as OTPAuth from "otpauth";

// Create a new TOTP object.
let totp = new OTPAuth.TOTP({
  issuer: "ACME",
  label: "AzureDiamond",
  algorithm: "SHA1",
  digits: 6,
  period: 30,
  secret: "NB2W45DFOIZA", // or 'OTPAuth.Secret.fromBase32("NB2W45DFOIZA")'
});

// Generate a token (returns the current token as a string).
let token = totp.generate();

// Validate a token (returns the token delta or null if it is not found in the search window, in which case it should be considered invalid).
let delta = totp.validate({ token, window: 1 });

// Convert to Google Authenticator key URI:
// otpauth://totp/ACME:AzureDiamond?issuer=ACME&secret=NB2W45DFOIZA&algorithm=SHA1&digits=6&period=30
let uri = totp.toString(); // or 'OTPAuth.URI.stringify(totp)'

// Convert from Google Authenticator key URI.
totp = OTPAuth.URI.parse(uri);
```

### Deno

```javascript
import * as OTPAuth from "https://deno.land/x/otpauth@VERSION/dist/otpauth.esm.js"

// Same as above.
```

### Bun

```javascript
import * as OTPAuth from "otpauth";

// Same as above.
```

### Browsers

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/otpauth/VERSION/otpauth.umd.min.js"></script>
<script>
  // Same as above.
</script>
```

## Documentation

See the documentation page.

> [https://hectorm.github.io/otpauth/](https://hectorm.github.io/otpauth/)

## Supported hashing algorithms

In Node.js, the same algorithms as
[`Crypto.createHmac`](https://nodejs.org/api/crypto.html#crypto_crypto_createhmac_algorithm_key_options)
function are supported, since it is used internally. In Deno, Bun and browsers, the `SHA1`, `SHA224`, `SHA256`, `SHA384`,
`SHA512`, `SHA3-224`, `SHA3-256`, `SHA3-384` and `SHA3-512` algorithms are supported by using the
[jsSHA](https://github.com/Caligatio/jsSHA) library.

## License

[MIT License](https://github.com/hectorm/otpauth/blob/master/LICENSE.md)
© [Héctor Molinero Fernández](https://hector.molinero.dev/).
