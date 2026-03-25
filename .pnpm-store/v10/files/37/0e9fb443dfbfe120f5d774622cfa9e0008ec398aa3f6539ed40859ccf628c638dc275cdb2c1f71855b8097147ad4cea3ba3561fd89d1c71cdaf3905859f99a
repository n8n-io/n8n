# OAuth 1.0a Request Authorization [![semaphore][semaphore-img]][semaphore-url]

[![Join the chat at https://gitter.im/ddo/oauth-1.0a](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ddo/oauth-1.0a?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![version][version-img]][version-url]
[![download][download-img]][download-url]
[![coverage][coverage-img]][coverage-url]
[![climate][climate-img]][climate-url]
[![dependency][dependency-img]][dependency-url]

[semaphore-img]: https://semaphoreci.com/api/v1/ddo/oauth-1-0a/branches/master/badge.svg
[semaphore-url]: https://semaphoreci.com/ddo/oauth-1-0a
[download-img]: https://img.shields.io/npm/dm/oauth-1.0a.svg?style=flat-square
[download-url]: https://www.npmjs.com/package/oauth-1.0a
[version-img]: https://img.shields.io/npm/v/oauth-1.0a.svg?style=flat-square
[version-url]: https://www.npmjs.com/package/oauth-1.0a
[dependency-img]: https://img.shields.io/david/ddo/oauth-1.0a.svg?style=flat-square
[dependency-url]: https://david-dm.org/ddo/oauth-1.0a
[coverage-img]: https://img.shields.io/coveralls/ddo/oauth-1.0a/master.svg?style=flat-square
[coverage-url]: https://coveralls.io/r/ddo/oauth-1.0a?branch=master
[climate-img]: https://img.shields.io/codeclimate/github/ddo/oauth-1.0a.svg?style=flat-square
[climate-url]: https://codeclimate.com/github/ddo/oauth-1.0a

OAuth 1.0a Request Authorization for **Node** and **Browser**

Send OAuth request with your favorite HTTP client ([request](https://github.com/mikeal/request), [jQuery.ajax](http://api.jquery.com/jQuery.ajax/)...)

No more headache about OAuth 1.0a's stuff or "oauth_consumer_key, oauth_nonce, oauth_signature...." parameters, just use your familiar HTTP client to send OAuth requests.

Tested on some popular OAuth 1.0a services:

-   Twitter
-   Flickr
-   Bitbucket
-   Openbankproject(HMAC-SHA256)

## Quick Start

```js
const crypto = require('crypto')
const OAuth = require('oauth-1.0a')

const oauth = OAuth({
    consumer: { key: '<your consumer key>', secret: '<your consumer secret>' },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
        return crypto
            .createHmac('sha1', key)
            .update(base_string)
            .digest('base64')
    },
})
```

Get OAuth request data that can be easily used with your http client:

```js
oauth.authorize(request, token)
```

Or if you want to get as a header key-value pair:

```js
oauth.toHeader(oauth_data)
```

## Crypto

Starting with version `2.0.0`, crypto/hash stuff is separated.
`oauth-1.0a` will use your `hash_function` to sign.

### Example

#### Node.js

```js
const crypto = require('crypto')

function hash_function_sha1(base_string, key) {
    return crypto
        .createHmac('sha1', key)
        .update(base_string)
        .digest('base64')
}

const oauth = OAuth({
    consumer: { key: '<your consumer key>', secret: '<your consumer secret>' },
    signature_method: 'HMAC-SHA1',
    hash_function: hash_function_sha1,
})
```

-   sha1: `crypto.createHmac('sha1', key).update(base_string).digest('base64');`
-   sha256: `crypto.createHmac('sha256', key).update(base_string).digest('base64');`

#### Browser

_Using Google's CryptoJS_

-   sha1: `CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64);`
-   sha256: `CryptoJS.HmacSHA256(base_string, key).toString(CryptoJS.enc.Base64);`

## Installation

### Node.js

```bash
$ npm install oauth-1.0a --production
```

-   You can use the native crypto package for `hash_function`.
-   It is possible for Node.js to be built without including support for the crypto module. In such cases, calling `require('crypto')` will result in an error being thrown.
-   You can use your own hash function which has format as:

```
function(base_string, key) return <string>
```

### Browser

Download oauth-1.0a.js [here](https://raw.githubusercontent.com/ddo/oauth-1.0a/master/oauth-1.0a.js)

And also your crypto lib. For example [CryptoJS](https://code.google.com/archive/p/crypto-js/)

```html
<!-- sha1 -->
<script src="http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/hmac-sha1.js"></script>
<!-- sha256 -->
<script src="http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/hmac-sha256.js"></script>
<script src="http://crypto-js.googlecode.com/svn/tags/3.1.2/build/components/enc-base64-min.js"></script>
<script src="oauth-1.0a.js"></script>
```

## Example

### Work with the [request](https://github.com/mikeal/request) library (Node.js):

```js
// Dependencies
const request = require('request')
const OAuth = require('oauth-1.0a')
const crypto = require('crypto')

// Initialize
const oauth = OAuth({
    consumer: {
        key: 'xvz1evFS4wEEPTGEFPHBog',
        secret: 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw',
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
        return crypto
            .createHmac('sha1', key)
            .update(base_string)
            .digest('base64')
    },
})

const request_data = {
    url: 'https://api.twitter.com/1/statuses/update.json?include_entities=true',
    method: 'POST',
    data: { status: 'Hello Ladies + Gentlemen, a signed OAuth request!' },
}

// Note: The token is optional for some requests
const token = {
    key: '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb',
    secret: 'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE',
}

request(
    {
        url: request_data.url,
        method: request_data.method,
        form: oauth.authorize(request_data, token),
    },
    function(error, response, body) {
        // Process your data here
    }
)
```

Or if you want to send OAuth data in request's header:

```js
request(
    {
        url: request_data.url,
        method: request_data.method,
        form: request_data.data,
        headers: oauth.toHeader(oauth.authorize(request_data, token)),
    },
    function(error, response, body) {
        // Process your data here
    }
)
```

### Work with [jQuery.ajax](http://api.jquery.com/jQuery.ajax/) (Browser):

**Caution:** Please make sure you understand what happens when using OAuth protocol on the client side [here](#client-side-usage-caution)

```js
// Initialize
const oauth = OAuth({
    consumer: {
        key: 'xvz1evFS4wEEPTGEFPHBog',
        secret: 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw',
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
        return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64)
    },
})

const request_data = {
    url: 'https://api.twitter.com/1/statuses/update.json?include_entities=true',
    method: 'POST',
    data: { status: 'Hello Ladies + Gentlemen, a signed OAuth request!' },
}

// Note: The token is optional for some requests
const token = {
    key: '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb',
    secret: 'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE',
}

$.ajax({
    url: request_data.url,
    type: request_data.method,
    data: oauth.authorize(request_data, token),
}).done(function(data) {
    // Process your data here
})
```

Or if you want to send OAuth data in request's header:

```js
$.ajax({
    url: request_data.url,
    type: request_data.method,
    data: request_data.data,
    headers: oauth.toHeader(oauth.authorize(request_data, token)),
}).done(function(data) {
    // Process your data here
})
```

## .authorize(/_ options _/)

-   url: `String`
-   method: `String` default `'GET'`
-   data: `Object` any custom data you want to send with, including extra oauth option `oauth_*` as oauth_callback, oauth_version...
-   includeBodyHash: `Boolean` default `false` set to true if you want `oauth_body_hash` signing (you will need to have define the `body_hash_function` in most cases - for HMAC-SHA1 Oauth signature method, the `body_hash_function` should return a SHA1 hash).

```js
const request_data = {
    url: 'https://bitbucket.org/api/1.0/oauth/request_token',
    method: 'POST',
    data: { oauth_callback: 'http://www.ddo.me' },
}
```

## .toHeader(/_ signed data _/)

Convert signed data into headers:

```js
$.ajax({
    url: request_data.url,
    type: request_data.method,
    data: request_data.data,
    headers: oauth.toHeader(oauth.authorize(request_data, token)),
}).done(function(data) {
    // Process your data here
})
```

## Init Options

```js
const oauth = OAuth(/* options */)
```

-   `consumer`: `Object` `Required` your consumer keys

```js
{
  key: <your consumer key>,
  secret: <your consumer secret>
}
```

-   `signature_method`: `String` default `'PLAINTEXT'`
-   `hash_function`: `Function` if `signature_method` = `'PLAINTEXT'` default `return key`
-   `body_hash_function`: `Function` default to `hash_function`
-   `nonce_length`: `Int` default `32`
-   `version`: `String` default `'1.0'`
-   `parameter_seperator`: `String` for header only, default `', '`. Note that there is a space after `,`
-   `realm`: `String`
-   `last_ampersand`: `Bool` default `true`. For some services if there is no Token Secret then no need `&` at the end. Check [oauth doc](http://oauth.net/core/1.0a/#anchor22) for more information

> oauth_signature is set to the concatenated encoded values of the Consumer Secret and Token Secret, separated by a '&' character (ASCII code 38), even if either secret is empty

## Notes

-   Some OAuth requests without token use `.authorize(request_data)` instead of `.authorize(request_data, {})`
-   Or just token key only `.authorize(request_data, {key: 'xxxxx'})`
-   Want easier? Take a look:
    -   Node.js: [oauth-request](https://github.com/ddo/oauth-request)
    -   jquery: _soon_

## Client Side Usage Caution

OAuth is based around allowing tools and websites to talk to each other. However, JavaScript running in web browsers is hampered by security restrictions that prevent code running on one website from accessing data stored or served on another.

Before you start hacking, make sure you understand the limitations posed by cross-domain XMLHttpRequest.

On the bright side, some platforms use JavaScript as their language, but enable the programmer to access other web sites. Examples include:

-   **Google/Firefox/Safari extensions**
-   **Google Gadgets**
-   **Microsoft Sidebar**

For those platforms, this library should come in handy.

## [Changelog](https://github.com/ddo/oauth-1.0a/releases)

## [Contributors](https://github.com/ddo/oauth-1.0a/graphs/contributors)

## License

MIT