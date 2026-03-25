![A library to retrieve signing keys from a JWKS (JSON Web Key Set) endpoint.](https://cdn.auth0.com/website/sdks/banner/node-jwks-rsa-banner.png)

![Release](https://img.shields.io/npm/v/jwks-rsa)
[![Codecov](https://img.shields.io/codecov/c/github/auth0/node-jwks-rsa)](https://codecov.io/gh/auth0/node-jwks-rsa)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/auth0/node-jwks-rsa)
![Downloads](https://img.shields.io/npm/dw/jwks-rsa)
[![License](https://img.shields.io/:license-mit-blue.svg?style=flat)](https://opensource.org/licenses/MIT)
![CircleCI](https://img.shields.io/circleci/build/github/auth0/node-jwks-rsa)

📚 [Documentation](#documentation) - 🚀 [Getting Started](#getting-started) - 💬 [Feedback](#feedback)

## Documentation

- [Examples](https://github.com/auth0/node-jwks-rsa/blob/master/EXAMPLES.md) - documentation of the options and code samples for common scenarios.
- [Docs Site](https://auth0.com/docs) - explore our Docs site and learn more about Auth0.

## Getting Started

### Installation

Using [npm](https://npmjs.org) in your project directory run the following command:

````bash
npm install --save jwks-rsa
````

Supports all currently registered JWK types and JWS Algorithms, see [panva/jose#262](https://github.com/panva/jose/issues/262) for more information.

### Configure the client

Provide a JWKS endpoint which exposes your signing keys.

````js
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: 'https://sandrino.auth0.com/.well-known/jwks.json',
  requestHeaders: {}, // Optional
  timeout: 30000 // Defaults to 30s
});
````

### Retrieve a key

Then use `getSigningKey` to retrieve a signing key that matches a specific `kid`.

````js
const kid = 'RkI5MjI5OUY5ODc1N0Q4QzM0OUYzNkVGMTJDOUEzQkFCOTU3NjE2Rg';
const key = await client.getSigningKey(kid);
const signingKey = key.getPublicKey();
````

## Feedback

### Contributing

We appreciate feedback and contribution to this repo! Before you get started, please see the following:

- [Auth0's general contribution guidelines](https://github.com/auth0/open-source-template/blob/master/GENERAL-CONTRIBUTING.md)
- [Auth0's code of conduct guidelines](https://github.com/auth0/open-source-template/blob/master/CODE-OF-CONDUCT.md)

### Raise an issue

To provide feedback or report a bug, please [raise an issue on our issue tracker](https://github.com/auth0/node-jwks-rsa/issues).

### Vulnerability Reporting

Please do not report security vulnerabilities on the public GitHub issue tracker. The [Responsible Disclosure Program](https://auth0.com/whitehat) details the procedure for disclosing security issues.

## What is Auth0?

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.auth0.com/website/sdks/logos/auth0_dark_mode.png" width="150">
    <source media="(prefers-color-scheme: light)" srcset="https://cdn.auth0.com/website/sdks/logos/auth0_light_mode.png" width="150">
    <img alt="Auth0 Logo" src="https://cdn.auth0.com/website/sdks/logos/auth0_light_mode.png" width="150">
  </picture>
</p>
<p align="center">
  Auth0 is an easy to implement, adaptable authentication and authorization platform. To learn more checkout <a href="https://auth0.com/why-auth0">Why Auth0?</a>
</p>
<p align="center">
  This project is licensed under the MIT license. See the <a href="https://github.com/auth0/node-jwks-rsa/blob/master/LICENSE"> LICENSE</a> file for more info.
</p>