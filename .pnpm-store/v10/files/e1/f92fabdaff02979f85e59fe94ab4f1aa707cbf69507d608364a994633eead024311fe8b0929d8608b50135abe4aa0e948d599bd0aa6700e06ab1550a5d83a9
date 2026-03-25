<img src="https://avatars2.githubusercontent.com/u/2810941?v=3&s=96" alt="Google Cloud Platform logo" title="Google Cloud Platform" align="right" height="96" width="96"/>

# [node-gtoken](https://github.com/googleapis/node-gtoken)

[![npm version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![codecov][codecov-image]][codecov-url]
[![Code Style: Google][gts-image]][gts-url]

> Node.js Google Authentication Service Account Tokens

This is a low level utility library used to interact with Google Authentication services.  **In most cases, you probably want to use the [google-auth-library](https://github.com/googleapis/google-auth-library-nodejs) instead.**

* [gtoken API Reference][client-docs]
* [github.com/googleapis/node-gtoken](https://github.com/googleapis/node-gtoken)

## Installation

``` sh
npm install gtoken
```

## Usage

### Use with a `.pem` or `.json` key file:

``` js
const { GoogleToken } = require('gtoken');
const gtoken = new GoogleToken({
  keyFile: 'path/to/key.pem', // or path to .json key file
  email: 'my_service_account_email@developer.gserviceaccount.com',
  scope: ['https://scope1', 'https://scope2'], // or space-delimited string of scopes
  eagerRefreshThresholdMillis: 5 * 60 * 1000
});

gtoken.getToken((err, tokens) => {
  if (err) {
    console.log(err);
    return;
  }
  console.log(tokens);
  // {
  //   access_token: 'very-secret-token',
  //   expires_in: 3600,
  //   token_type: 'Bearer'
  // }
});
```

You can also use the async/await style API:

``` js
const tokens = await gtoken.getToken()
console.log(tokens);
```

Or use promises:

```js
gtoken.getToken()
  .then(tokens => {
    console.log(tokens)
  })
  .catch(console.error);
```

### Use with a service account `.json` key file:

``` js
const { GoogleToken } = require('gtoken');
const gtoken = new GoogleToken({
  keyFile: 'path/to/key.json',
  scope: ['https://scope1', 'https://scope2'], // or space-delimited string of scopes
  eagerRefreshThresholdMillis: 5 * 60 * 1000
});

gtoken.getToken((err, tokens) => {
  if (err) {
    console.log(err);
    return;
  }
  console.log(tokens);
});
```

### Pass the private key as a string directly:

``` js
const key = '-----BEGIN RSA PRIVATE KEY-----\nXXXXXXXXXXX...';
const { GoogleToken } = require('gtoken');
const gtoken = new GoogleToken({
  email: 'my_service_account_email@developer.gserviceaccount.com',
  scope: ['https://scope1', 'https://scope2'], // or space-delimited string of scopes
  key: key,
  eagerRefreshThresholdMillis: 5 * 60 * 1000
});
```

## Options

> Various options that can be set when creating initializing the `gtoken` object.

- `options.email or options.iss`: The service account email address.
- `options.scope`: An array of scope strings or space-delimited string of scopes.
- `options.sub`: The email address of the user requesting delegated access.
- `options.keyFile`: The filename of `.json` key or `.pem` key.
- `options.key`: The raw RSA private key value, in place of using `options.keyFile`.
- `options.additionalClaims`: Additional claims to include in the JWT when requesting a token.
- `options.eagerRefreshThresholdMillis`: How long must a token be valid for in order to return it from the cache. Defaults to 0.

### .getToken(callback)

> Returns the cached tokens or requests a new one and returns it.

``` js
gtoken.getToken((err, token) => {
  console.log(err || token);
  // gtoken.rawToken value is also set
});
```

### .getCredentials('path/to/key.json')

> Given a keyfile, returns the key and (if available) the client email.

```js
const creds = await gtoken.getCredentials('path/to/key.json');
```

### Properties

> Various properties set on the gtoken object after call to `.getToken()`.

- `gtoken.idToken`: The OIDC token returned (if any).
- `gtoken.accessToken`: The access token.
- `gtoken.expiresAt`: The expiry date as milliseconds since 1970/01/01
- `gtoken.key`: The raw key value.
- `gtoken.rawToken`: Most recent raw token data received from Google.

### .hasExpired()

> Returns true if the token has expired, or token does not exist.

``` js
const tokens = await gtoken.getToken();
gtoken.hasExpired(); // false
```

### .revokeToken()

> Revoke the token if set.

``` js
await gtoken.revokeToken();
console.log('Token revoked!');
```

## Downloading your private `.json` key from Google

1. Open the [Google Developer Console][gdevconsole].
2. Open your project and under "APIs & auth", click Credentials.
3. Generate a new `.json` key and download it into your project.

## Converting your `.p12` key to a `.pem` key

If you'd like to convert to a `.pem` for use later, use OpenSSL if you have it installed.

``` sh
$ openssl pkcs12 -in key.p12 -nodes -nocerts > key.pem
```

Don't forget, the passphrase when converting these files is the string `'notasecret'`

## License

[MIT](https://github.com/googleapis/node-gtoken/blob/main/LICENSE)

[codecov-image]: https://codecov.io/gh/googleapis/node-gtoken/branch/main/graph/badge.svg
[codecov-url]: https://codecov.io/gh/googleapis/node-gtoken
[gdevconsole]: https://console.developers.google.com
[gts-image]: https://img.shields.io/badge/code%20style-google-blueviolet.svg
[gts-url]: https://www.npmjs.com/package/gts
[npm-image]: https://img.shields.io/npm/v/gtoken.svg
[npm-url]: https://npmjs.org/package/gtoken
[snyk-image]: https://snyk.io/test/github/googleapis/node-gtoken/badge.svg
[snyk-url]: https://snyk.io/test/github/googleapis/node-gtoken
[client-docs]: https://googleapis.dev/nodejs/gtoken/latest/
