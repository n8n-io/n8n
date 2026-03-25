<h1 align="center">
    <a href="https://github.com/Infisical/infisical">
        <img width="300" src="/img/logoname-white.svg#gh-dark-mode-only" alt="infisical">
    </a>
</h1>
<p align="center">
  <p align="center">Open-source, end-to-end encrypted tool to manage secrets and configs across your team and infrastructure.</p>
</p>

# Table of Contents

- [Links](#links)
- [Basic Usage](#basic-usage)
- [Secrets](#working-with-secrets)
  - [Get Secrets](#get-secrets)
  - [Get Secret](#get-secret)
  - [Create Secret](#create-secret)
  - [Update Secret](#update-secret)
  - [Delete Secret](#delete-secret)
- [Cryptography](#cryptography)
  - [Create Symmetric Key](#create-symmetric-key)
  - [Encrypt Symmetric](#encrypt-symmetric)
  - [Decrypt Symmetric](#decrypt-symmetric)

# Links

- [Infisical](https://github.com/Infisical/infisical)

# Basic Usage

```js
import express from "express";
import InfisicalClient from "infisical-node";
const app = express();
const PORT = 3000;

const client = new InfisicalClient({
  token: "YOUR_INFISICAL_TOKEN",
});

app.get("/", async (req, res) => {
  // access value
  const name = await client.getSecret("NAME", {
    environment: "dev",
    path: "/",
    type: "shared",
  });
  res.send(`Hello! My name is: ${name.secretValue}`);
});

app.listen(PORT, async () => {
  // initialize client
  console.log(`App listening on port ${port}`);
});
```

This example demonstrates how to use the Infisical Node SDK with an Express application. The application retrieves a secret named "NAME" and responds to requests with a greeting that includes the secret value.

It is also possible to use the SDK to encrypt/decrypt text; the implementation uses `aes-256-gcm`
with components of the encryption/decryption encoded in `base64`.

```js
import InfisicalClient from "infisical-node";
const client = new InfisicalClient();

// some plaintext you want to encrypt
const plaintext = "The quick brown fox jumps over the lazy dog";

// create a base64-encoded, 256-bit symmetric key
const key = client.createSymmetricKey();

// encrypt
const { ciphertext, iv, tag } = client.encryptSymmetric(plaintext, key);

// decrypt
const cleartext = client.decryptSymmetric(ciphertext, key, iv, tag);
```

# Installation

```console
$ npm install infisical-node
```

# Configuration

Import the SDK and create a client instance with your [Infisical Token](https://infisical.com/docs/getting-started/dashboard/token).

```js
const InfisicalClient = require("infisical-node");

const client = new InfisicalClient({
  token: "your_infisical_token",
});
```

Using ES6:

```js
import InfisicalClient from "infisical-node";

const client = new InfisicalClient({
  token: "your_infisical_token",
});

// your app logic
```

### Options

| Parameter  | Type      | Description                                                                |
| ---------- | --------- | -------------------------------------------------------------------------- |
| `token`    | `string`  | An Infisical Token scoped to a project and environment.                    |
| `siteURL`  | `string`  | Your self-hosted Infisical site URL. Default: `https://app.infisical.com`. |
| `cacheTTL` | `number`  | Time-to-live (in seconds) for refreshing cached secrets. Default: `300`.   |
| `debug`    | `boolean` | Turns debug mode on or off. Default: `false`.                              |

### Caching

The SDK caches every secret and updates it periodically based on the provided `cacheTTL`. For example, if `cacheTTL` of `300` is provided, then a secret will be refetched 5 minutes after the first fetch; if the fetch fails, the cached secret is returned.

# Secrets

## Get Secrets

```js
const secrets = await client.getAllSecrets({
  environment: "dev",
  path: "/foo/bar/",
});
```

Retrieve all secrets within a given environment and folder path. The service token used must have access to the given path and environment.

### Parameters

- `options` (object, optional)
  - `environment` The slug name (dev, prod, etc) of the environment from where secrets should be fetched from
  - `path` The path from where secrets should be fetched from

## Get Secret

Retrieve a secret from Infisical:

```js
const secret = await client.getSecret("API_KEY", {
  environment: "dev",
  type: "shared",
  path: "/",
});
const value = secret.secretValue; // get its value
```

By default, `getSecret()` fetches and returns a personal secret. If not found, it returns a shared secret, or tries to retrieve the value from `process.env`. If a secret is fetched, `getSecret()` caches it to reduce excessive calls and re-fetches periodically based on the `cacheTTL` option (default is `300` seconds) when initializing the client — for more information, see the caching section.

To explicitly retrieve a shared secret:

```js
const secret = await client.getSecret("API_KEY", {
  environment: "dev",
  type: "shared",
  path: "/",
});
const value = secret.secretValue; // get its value
```

### Parameters

- `secretName` (string): The key of the secret to retrieve.
- `options` (object, optional): An options object to speify the type of secret.
  - `environment` The slug name (dev, prod, etc) of the environment from where secrets should be fetched from
  - `path` The path from where secrets should be fetched from
  - `type` (string, optional): The type of the secret. Valid options are "shared" or "personal". If not specified, the default value is "personal".

## Create Secret

Create a new secret in Infisical:

```js
const newApiKey = await client.createSecret("API_KEY", "FOO");
```

### Parameters

- `secretName` (string): The key of the secret to create.
- `secretValue` (string): The value of the secret.
- `options` (object, optional): An options object to specify the type of secret.
  - `environment` The slug name (dev, prod, etc) of the environment where secret should be created
  - `path` The path from where secret should be created.
  - `type` (string, optional): The type of the secret. Valid options are "shared" or "personal". If not specified, the default value is "shared". A personal secret can only be created if a shared secret with the same name exists.

## Update Secret

Update an existing secret in Infisical:

```js
const updatedApiKey = await client.updateSecret("API_KEY", "BAR");
```

### Parameters

- `secretName` (string): The key of the secret to update.
- `secretValue` (string): The new value of the secret.
- `options` (object, optional): An options object to specify the type of secret.
  - `environment` The slug name (dev, prod, etc) of the environment where secret should be updated.
  - `path` The path from where secret should be updated.
  - `type` (string, optional): The type of the secret. Valid options are "shared" or "personal". If not specified, the default value is "shared".

## Delete Secret

Delete a secret in Infisical:

```js
const deletedSecret = await client.deleteSecret("API_KEY");
```

### Parameters

- `secretName` (string): The key of the secret to delete.
- `options` (object, optional): An options object to specify the type of secret to delete.
  - `environment` The slug name (dev, prod, etc) of the environment where secret should be deleted.
  - `path` The path from where secret should be deleted.
  - `type` (string, optional): The type of the secret. Valid options are "shared" or "personal". If not specified, the default value is "shared". Note that deleting a shared secret also deletes all associated personal secrets.

# Cryptography

## Create Symmetric Key

Create a base64-encoded, 256-bit symmetric key to be used for encryption/decryption.

```js
const key = client.createSymmetricKey();
```

### Returns

`key` (string): A base64-encoded, 256-bit symmetric key.

## Encrypt Symmetric

Encrypt plaintext -> ciphertext.

```js
const { ciphertext, iv, tag } = client.encryptSymmetric(plaintext, key);
```

### Parameters

- `plaintext` (string): The plaintext to encrypt.
- `key` (string): The base64-encoded, 256-bit symmetric key to use to encrypt the `plaintext`.

### Returns

An object containing the following properties:

- `ciphertext` (string): The base64-encoded, encrypted `plaintext`.
- `iv` (string): The base64-encoded, 96-bit initialization vector generated for the encryption.
- `tag` (string): The base64-encoded authentication tag generated during the encryption.

## Decrypt Symmetric

Decrypt ciphertext -> plaintext/cleartext.

```js
const cleartext = client.decryptSymmetric(ciphertext, key, iv, tag);
```

## Parameters

- `ciphertext` (string): The ciphertext to decrypt.
- `key` (string): The base64-encoded, 256-bit symmetric key to use to decrypt the `ciphertext`.
- `iv` (string): The base64-encoded, 96-bit initiatlization vector generated for the encryption.
- `tag` (string): The base64-encoded authentication tag generated during encryption.

### Returns

`cleartext` (string): The decrypted encryption that is the cleartext/plaintext.

# Contributing

Bug fixes, docs, and library improvements are always welcome. Please refer to our [Contributing Guide](https://infisical.com/docs/contributing/overview) for detailed information on how you can contribute.

[//]: contributor-faces

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

<a href="https://github.com/dangtony98"><img src="https://avatars.githubusercontent.com/u/25857006?v=4" width="50" height="50" alt=""/></a> <a href="https://github.com/Aashish-Upadhyay-101"><img src="https://avatars.githubusercontent.com/u/81024263?v=4" width="50" height="50" alt=""/></a> <a href="https://github.com/NicoZweifel"><img src="https://avatars.githubusercontent.com/u/34443492?v=4" width="50" height="50" alt=""/></a><a href="https://github.com/gitSambhal"><img src="https://avatars.githubusercontent.com/u/15196655?v=4" width="50" height="50" alt=""/></a>

## Getting Started

If you want to familiarize yourself with the SDK, you can start by [forking the repository](https://docs.github.com/en/get-started/quickstart/fork-a-repo) and [cloning it in your local development environment](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository). The project requires [Node.js](https://nodejs.org/en) to be installed on your machine.

After cloning the repository, install the depenencies by running the following command in the directory of your cloned repository:

```console
$ npm install
```

To run existing tests, you need to make a `.env` at the root of this project containing a `INFISICAL_TOKEN` and `SITE_URL`. This will execute the tests against a project and environment scoped to the `INFISICAL_TOKEN` on a running instance of Infisical at the `SITE_URL` (this could be [Infisical Cloud](https://app.infisical.com)).

To run all the tests you can use the following command:

```console
$ npm test
```

# License

`infisical-node` is distributed under the terms of the [MIT](https://spdx.org/licenses/MIT.html) license.
