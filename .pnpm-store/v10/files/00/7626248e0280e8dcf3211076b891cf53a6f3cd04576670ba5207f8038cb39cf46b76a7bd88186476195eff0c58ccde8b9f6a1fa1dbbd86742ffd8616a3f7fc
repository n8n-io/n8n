# Azure Key Vault Key client library for JavaScript

Azure Key Vault is a service that allows you to encrypt authentication keys, storage account keys, data encryption keys, .pfx files, and passwords by using secured keys.
If you would like to know more about Azure Key Vault, you may want to review: [What is Azure Key Vault?][keyvault]

Azure Key Vault Managed HSM is a fully-managed, highly-available, single-tenant, standards-compliant cloud service that enables you to safeguard cryptographic keys for your cloud applications using FIPS 140-2 Level 3 validated HSMs. If you would like to know more about Azure Key Vault Managed HSM, you may want to review: [What is Azure Key Vault Managed HSM?][managedhsm]

The Azure Key Vault key library client supports RSA keys, Elliptic Curve (EC) keys, as well as Symmetric (oct) keys when running against a managed HSM, each with corresponding support in hardware security modules (HSM). It offers operations to create, retrieve, update, delete, purge, backup, restore, and list the keys and its versions.

Use the client library for Azure Key Vault Keys in your Node.js application to:

- Create keys using elliptic curve or RSA encryption, optionally backed by Hardware Security Modules (HSM).
- Import, Delete, and Update keys.
- Get one or more keys and deleted keys, with their attributes.
- Recover a deleted key and restore a backed up key.
- Get the versions of a key.

Using the cryptography client available in this library you also have access to:

- Encrypting
- Decrypting
- Signing
- Verifying
- Wrapping keys
- Unwrapping keys

> Note: This package cannot be used in the browser due to Azure Key Vault service limitations, please refer to [this document][cors] for guidance.

Key links:

- [Source code][package-gh]
- [Package (npm)][package-npm]
- [API Reference Documentation][docs]
- [Product documentation][docs-service]
- [Samples][samples]

## Getting started

### Currently supported environments

- [LTS versions of Node.js](https://github.com/nodejs/release#release-schedule)

### Prerequisites

- An [Azure subscription](https://azure.microsoft.com/free/)
- An existing [Azure Key Vault][azure_keyvault]. If you need to create a key vault, you can do so in the Azure Portal by following the steps in [this document][azure_keyvault_portal]. Alternatively, use the Azure CLI by following [these steps][azure_keyvault_cli].
- If using Managed HSM, an existing [Azure Key Vault Managed HSM][azure_keyvault_mhsm]. If you need to create a Managed HSM, you can do so using the Azure CLI by following the steps in [this document][azure_keyvault_mhsm_cli].

### Install the package

Install the Azure Key Vault Key client library using npm

`npm install @azure/keyvault-keys`

### Install the identity library

Azure Key Vault clients authenticate using the Azure identity library. Install it as well using npm

`npm install @azure/identity`

### Configure TypeScript

TypeScript users need to have Node type definitions installed:

```bash
npm install @types/node
```

You also need to enable `compilerOptions.allowSyntheticDefaultImports` in your tsconfig.json. Note that if you have enabled `compilerOptions.esModuleInterop`, `allowSyntheticDefaultImports` is enabled by default. See [TypeScript's compiler options handbook][tscompileroptions] for more information.

## Key concepts

- The **Key client** is the primary interface to interact with the API methods
  related to keys in the Azure Key Vault API from a JavaScript application.
  Once initialized, it provides a basic set of methods that can be used to
  create, read, update and delete keys.
- A **Key version** is a version of a key in the Key Vault.
  Each time a user assigns a value to a unique key name, a new **version**
  of that key is created. Retrieving a key by a name will always return
  the latest value assigned, unless a specific version is provided to the
  query.
- **Soft delete** allows Key Vaults to support deletion and purging as two
  separate steps, so deleted keys are not immediately lost. This only happens if the Key Vault
  has [soft-delete][softdelete]
  enabled.
- A **Key backup** can be generated from any created key. These backups come as
  binary data, and can only be used to regenerate a previously deleted key.
- The **Cryptography client** is a separate interface that interacts with the
  keys API methods in the Key Vault API. This client focuses only in the
  cryptography operations that can be executed using a key that has been
  already created in the Key Vault. More about this client in the
  [Cryptography](#cryptography) section.

## Authenticating with Azure Active Directory

The Key Vault service relies on Azure Active Directory to authenticate requests to its APIs. The [`@azure/identity`](https://www.npmjs.com/package/@azure/identity) package provides a variety of credential types that your application can use to do this. The [README for `@azure/identity`](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/identity/identity/README.md) provides more details and samples to get you started.

In order to interact with the Azure Key Vault service, you will need to create an instance of the `KeyClient` class, a **vault url** and a credential object. The examples shown in this document use a credential object named [`DefaultAzureCredential`][default_azure_credential], which is appropriate for most scenarios, including local development and production environments. Additionally, we recommend using a [managed identity][managed_identity] for authentication in production environments.

You can find more information on different ways of authenticating and their corresponding credential types in the [Azure Identity documentation][azure_identity].

Here's a quick example. First, import `DefaultAzureCredential` and `KeyClient`:

```javascript
const { DefaultAzureCredential } = require("@azure/identity");
const { KeyClient } = require("@azure/keyvault-keys");
```

Once these are imported, we can next connect to the Key Vault service:

```javascript
const { DefaultAzureCredential } = require("@azure/identity");
const { KeyClient } = require("@azure/keyvault-keys");

const credential = new DefaultAzureCredential();

// Build the URL to reach your key vault
const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`; // or `https://${vaultName}.managedhsm.azure.net` for managed HSM.

// Lastly, create our keys client and connect to the service
const client = new KeyClient(url, credential);
```

## Specifying the Azure Key Vault service API version

By default, this package uses the latest Azure Key Vault service version which is `7.2`. You can change the service version being used by setting the option `serviceVersion` in the client constructor as shown below:

```javascript
const { DefaultAzureCredential } = require("@azure/identity");
const { KeyClient } = require("@azure/keyvault-keys");

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

// Change the Azure Key Vault service API version being used via the `serviceVersion` option
const client = new KeyClient(url, credential, {
  serviceVersion: "7.0", // Or 7.1
});
```

## Examples

The following sections provide code snippets that cover some of the common
tasks using Azure Key Vault Keys. The scenarios that are covered here consist of:

- [Creating a key](#creating-a-key).
- [Getting a key](#getting-a-key).
- [Creating and updating keys with attributes](#creating-and-updating-keys-with-attributes).
- [Deleting a key](#deleting-a-key).
- [Iterating lists of keys](#iterating-lists-of-keys).

### Creating a key

`createKey` creates a Key to be stored in the Azure Key Vault. If a key with the same name already exists, then a new version of the key is created.

```javascript
const { DefaultAzureCredential } = require("@azure/identity");
const { KeyClient } = require("@azure/keyvault-keys");

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const client = new KeyClient(url, credential);

const keyName = "MyKeyName";

async function main() {
  const result = await client.createKey(keyName, "RSA");
  console.log("result: ", result);
}

main();
```

The second parameter sent to `createKey` is the type of the key. The type of keys that are supported will depend on the SKU and whether you are using an Azure Key Vault or an Azure Managed HSM. For an up-to-date list of supported key types please refer to [About keys][aboutkeys]

### Getting a key

The simplest way to read keys back from the vault is to get a key by name. This
will retrieve the most recent version of the key. You can optionally get a
different version of the key if you specify it as part of the optional
parameters.

`getKey` retrieves a key previous stores in the Key Vault.

```typescript
const { DefaultAzureCredential } = require("@azure/identity");
const { KeyClient } = require("@azure/keyvault-keys");

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const client = new KeyClient(url, credential);

const keyName = "MyKeyName";

async function main() {
  const latestKey = await client.getKey(keyName);
  console.log(`Latest version of the key ${keyName}: `, latestKey);
  const specificKey = await client.getKey(keyName, { version: latestKey.properties.version! });
  console.log(`The key ${keyName} at the version ${latestKey.properties.version!}: `, specificKey);
}

main();
```

### Creating and updating keys with attributes

The following attributes can also be assigned to any key in a Key Vault:

- `tags`: Any set of key-values that can be used to search and filter keys.
- `keyOps`: An array of the operations that this key will be able to perform (`encrypt`, `decrypt`, `sign`, `verify`, `wrapKey`, `unwrapKey`).
- `enabled`: A boolean value that determines whether the key value can be read or not.
- `notBefore`: A given date after which the key value can be retrieved.
- `expires`: A given date after which the key value cannot be retrieved.

An object with these attributes can be sent as the third parameter of
`createKey`, right after the key's name and value, as follows:

```javascript
const { DefaultAzureCredential } = require("@azure/identity");
const { KeyClient } = require("@azure/keyvault-keys");

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const client = new KeyClient(url, credential);

const keyName = "MyKeyName";

async function main() {
  const result = await client.createKey(keyName, "RSA", {
    enabled: false,
  });
  console.log("result: ", result);
}

main();
```

This will create a new version of the same key, which will have the latest
provided attributes.

Attributes can also be updated to an existing key version with
`updateKeyProperties`, as follows:

```javascript
const { DefaultAzureCredential } = require("@azure/identity");
const { KeyClient } = require("@azure/keyvault-keys");

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const client = new KeyClient(url, credential);

const keyName = "MyKeyName";

async function main() {
  const result = await client.createKey(keyName, "RSA");
  await client.updateKeyProperties(keyName, result.properties.version, {
    enabled: false,
  });
}

main();
```

### Deleting a key

The `beginDeleteKey` method starts the deletion of a key.
This process will happen in the background as soon as the necessary resources
are available.

```javascript
const { DefaultAzureCredential } = require("@azure/identity");
const { KeyClient } = require("@azure/keyvault-keys");

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const client = new KeyClient(url, credential);

const keyName = "MyKeyName";

async function main() {
  const poller = await client.beginDeleteKey(keyName);
  await poller.pollUntilDone();
}

main();
```

If [soft-delete][softdelete]
is enabled for the Key Vault, this operation will only label the key as a
_deleted_ key. A deleted key can't be updated. They can only be
read, recovered or purged.

```typescript
const { DefaultAzureCredential } = require("@azure/identity");
const { KeyClient } = require("@azure/keyvault-keys");

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const client = new KeyClient(url, credential);

const keyName = "MyKeyName";

async function main() {
  const poller = await client.beginDeleteKey(keyName);

  // You can use the deleted key immediately:
  const deletedKey = poller.getResult();

  // The key is being deleted. Only wait for it if you want to restore it or purge it.
  await poller.pollUntilDone();

  // You can also get the deleted key this way:
  await client.getDeletedKey(keyName);

  // Deleted keys can also be recovered or purged:

  // recoverDeletedKey also returns a poller, just like beginDeleteKey.
  const recoverPoller = await client.beginRecoverDeletedKey(keyName);
  await recoverPoller.pollUntilDone();

  // And here is how to purge a deleted key
  await client.purgeDeletedKey(keyName);
}

main();
```

Since Keys take some time to get fully deleted, `beginDeleteKey`
returns a Poller object that keeps track of the underlying Long Running
Operation according to our guidelines:
https://azure.github.io/azure-sdk/typescript_design.html#ts-lro

The received poller will allow you to get the deleted key by calling to `poller.getResult()`.
You can also wait until the deletion finishes either by running individual service
calls until the key is deleted, or by waiting until the process is done:

```typescript
const { DefaultAzureCredential } = require("@azure/identity");
const { KeyClient } = require("@azure/keyvault-keys");

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const client = new KeyClient(url, credential);

const keyName = "MyKeyName";

async function main() {
  const poller = await client.beginDeleteKey(keyName);

  // You can use the deleted key immediately:
  let deletedKey = poller.getResult();

  // Or you can wait until the key finishes being deleted:
  deletedKey = await poller.pollUntilDone();
  console.log(deletedKey);
}

main();
```

Another way to wait until the key is fully deleted is to do individual calls, as follows:

```typescript
const { DefaultAzureCredential } = require("@azure/identity");
const { KeyClient } = require("@azure/keyvault-keys");
const { delay } = require("@azure/core-http");

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const client = new KeyClient(url, credential);

const keyName = "MyKeyName";

async function main() {
  const poller = await client.beginDeleteKey(keyName);

  while (!poller.isDone()) {
    await poller.poll();
    await delay(5000);
  }

  console.log(`The key ${keyName} is fully deleted`);
}

main();
```

### Configuring Automatic Key Rotation

Using the KeyClient, you can configure automatic key rotation for a key by specifying the rotation policy.
In addition, KeyClient provides a method to rotate a key on-demand by creating a new version of the given key.

```javascript
const { DefaultAzureCredential } = require("@azure/identity");
const { KeyClient } = require("@azure/keyvault-keys");

const vaultUrl = `https://<YOUR KEYVAULT NAME>.vault.azure.net`;
const client = new KeyClient(url, new DefaultAzureCredential());

async function main() {
  const keyName = "MyKeyName";

  // Set the key's automated rotation policy to rotate the key 30 days before expiry.
  const policy = await client.updateKeyRotationPolicy(key.name, {
    lifetimeActions: [
      {
        action: "Rotate",
        timeBeforeExpiry: "P30D",
      },
    ],
    // You may also specify the duration after which any newly rotated key will expire.
    // In this case, any new key versions will expire after 90 days.
    expiresIn: "P90D",
  });

  // You can get the current key rotation policy of a given key by calling the getKeyRotationPolicy method.
  const currentPolicy = await client.getKeyRotationPolicy(key.name);

  // Finally, you can rotate a key on-demand by creating a new version of the given key.
  const rotatedKey = await client.rotateKey(key.name);
}

main();
```

### Iterating lists of keys

Using the KeyClient, you can retrieve and iterate through all of the
keys in an Azure Key Vault, as well as through all of the deleted keys and the
versions of a specific key. The following API methods are available:

- `listPropertiesOfKeys` will list all of your non-deleted keys by their names, only
  at their latest versions.
- `listDeletedKeys` will list all of your deleted keys by their names,
  only at their latest versions.
- `listPropertiesOfKeyVersions` will list all the versions of a key based on a key
  name.

Which can be used as follows:

```javascript
const { DefaultAzureCredential } = require("@azure/identity");
const { KeyClient } = require("@azure/keyvault-keys");

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const client = new KeyClient(url, credential);

const keyName = "MyKeyName";

async function main() {
  for await (let keyProperties of client.listPropertiesOfKeys()) {
    console.log("Key properties: ", keyProperties);
  }
  for await (let deletedKey of client.listDeletedKeys()) {
    console.log("Deleted: ", deletedKey);
  }
  for await (let versionProperties of client.listPropertiesOfKeyVersions(keyName)) {
    console.log("Version properties: ", versionProperties);
  }
}

main();
```

All of these methods will return **all of the available results** at once. To
retrieve them by pages, add `.byPage()` right after invoking the API method you
want to use, as follows:

```javascript
const { DefaultAzureCredential } = require("@azure/identity");
const { KeyClient } = require("@azure/keyvault-keys");

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const client = new KeyClient(url, credential);

const keyName = "MyKeyName";

async function main() {
  for await (let page of client.listPropertiesOfKeys().byPage()) {
    for (let keyProperties of page) {
      console.log("Key properties: ", keyProperties);
    }
  }
  for await (let page of client.listDeletedKeys().byPage()) {
    for (let deletedKey of page) {
      console.log("Deleted key: ", deletedKey);
    }
  }
  for await (let page of client.listPropertiesOfKeyVersions(keyName).byPage()) {
    for (let versionProperties of page) {
      console.log("Version: ", versionProperties);
    }
  }
}
```

## Cryptography

This library also offers a set of cryptographic utilities available through
`CryptographyClient`. Similar to the `KeyClient`, `CryptographyClient` will
connect to Azure Key Vault with the provided set of credentials. Once
connected, `CryptographyClient` can encrypt, decrypt, sign, verify, wrap keys,
and unwrap keys.

We can next connect to the key vault service just as we do with the `KeyClient`.
We'll need to copy some settings from the key vault we are
connecting to into our environment variables. Once they are in our environment,
we can access them with the following code:

```typescript
import { DefaultAzureCredential } from "@azure/identity";
import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const keysClient = new KeyClient(url, credential);

async function main() {
  // Create or retrieve a key from the keyvault
  let myKey = await keysClient.createKey("MyKey", "RSA");

  // Lastly, create our cryptography client and connect to the service
  const cryptographyClient = new CryptographyClient(myKey, credential);
}
```

### Encrypt

`encrypt` will encrypt a message.

```javascript
import { DefaultAzureCredential } from "@azure/identity";
import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const keysClient = new KeyClient(url, credential);

async function main() {
  let myKey = await keysClient.createKey("MyKey", "RSA");
  const cryptographyClient = new CryptographyClient(myKey.id, credential);

  const encryptResult = await cryptographyClient.encrypt({
    algorithm: "RSA1_5",
    plaintext: Buffer.from("My Message"),
  });
  console.log("encrypt result: ", encryptResult.result);
}

main();
```

### Decrypt

`decrypt` will decrypt an encrypted message.

```javascript
import { DefaultAzureCredential } from "@azure/identity";
import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const keysClient = new KeyClient(url, credential);

async function main() {
  let myKey = await keysClient.createKey("MyKey", "RSA");
  const cryptographyClient = new CryptographyClient(myKey.id, credential);

  const encryptResult = await cryptographyClient.encrypt({
    algorithm: "RSA1_5",
    plaintext: Buffer.from("My Message"),
  });
  console.log("encrypt result: ", encryptResult.result);

  const decryptResult = await cryptographyClient.decrypt({
    algorithm: "RSA1_5",
    ciphertext: encryptResult.result,
  });
  console.log("decrypt result: ", decryptResult.result.toString());
}

main();
```

### Sign

`sign` will cryptographically sign the digest (hash) of a message with a signature.

```javascript
import { DefaultAzureCredential } from "@azure/identity";
import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
import { createHash } from "crypto";

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const keysClient = new KeyClient(url, credential);

async function main() {
  let myKey = await keysClient.createKey("MyKey", "RSA");
  const cryptographyClient = new CryptographyClient(myKey, credential);

  const signatureValue = "MySignature";
  let hash = createHash("sha256");

  let digest = hash.update(signatureValue).digest();
  console.log("digest: ", digest);

  const signResult = await cryptographyClient.sign("RS256", digest);
  console.log("sign result: ", signResult.result);
}

main();
```

### Sign Data

`signData` will cryptographically sign a message with a signature.

```javascript
import { DefaultAzureCredential } from "@azure/identity";
import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const keysClient = new KeyClient(url, credential);

async function main() {
  let myKey = await keysClient.createKey("MyKey", "RSA");
  const cryptographyClient = new CryptographyClient(myKey, credential);

  const signResult = await cryptographyClient.signData("RS256", Buffer.from("My Message"));
  console.log("sign result: ", signResult.result);
}

main();
```

### Verify

`verify` will cryptographically verify that the signed digest was signed with the given signature.

```javascript
import { DefaultAzureCredential } from "@azure/identity";
import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
import { createHash } from "crypto";

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const keysClient = new KeyClient(url, credential);

async function main() {
  let myKey = await keysClient.createKey("MyKey", "RSA");
  const cryptographyClient = new CryptographyClient(myKey, credential);

  const hash = createHash("sha256");
  hash.update("My Message");
  const digest = hash.digest();

  const signResult = await cryptographyClient.sign("RS256", digest);
  console.log("sign result: ", signResult.result);

  const verifyResult = await cryptographyClient.verify("RS256", digest, signResult.result);
  console.log("verify result: ", verifyResult.result);
}

main();
```

### Verify Data

`verifyData` will cryptographically verify that the signed message was signed with the given signature.

```javascript
import { DefaultAzureCredential } from "@azure/identity";
import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const keysClient = new KeyClient(url, credential);

async function main() {
  let myKey = await keysClient.createKey("MyKey", "RSA");
  const cryptographyClient = new CryptographyClient(myKey, credential);

  const buffer = Buffer.from("My Message");

  const signResult = await cryptographyClient.signData("RS256", buffer);
  console.log("sign result: ", signResult.result);

  const verifyResult = await cryptographyClient.verifyData("RS256", buffer, signResult.result);
  console.log("verify result: ", verifyResult.result);
}

main();
```

### Wrap Key

`wrapKey` will wrap a key with an encryption layer.

```javascript
import { DefaultAzureCredential } from "@azure/identity";
import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const keysClient = new KeyClient(url, credential);

async function main() {
  let myKey = await keysClient.createKey("MyKey", "RSA");
  const cryptographyClient = new CryptographyClient(myKey, credential);

  const wrapResult = await cryptographyClient.wrapKey("RSA-OAEP", Buffer.from("My Key"));
  console.log("wrap result:", wrapResult.result);
}

main();
```

### Unwrap Key

`unwrapKey` will unwrap a wrapped key.

```javascript
import { DefaultAzureCredential } from "@azure/identity";
import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";

const credential = new DefaultAzureCredential();

const vaultName = "<YOUR KEYVAULT NAME>";
const url = `https://${vaultName}.vault.azure.net`;

const keysClient = new KeyClient(url, credential);

async function main() {
  let myKey = await keysClient.createKey("MyKey", "RSA");
  const cryptographyClient = new CryptographyClient(myKey, credential);

  const wrapResult = await cryptographyClient.wrapKey("RSA-OAEP", Buffer.from("My Key"));
  console.log("wrap result:", wrapResult.result);

  const unwrapResult = await cryptographyClient.unwrapKey("RSA-OAEP", wrapResult.result);
  console.log("unwrap result: ", unwrapResult.result);
}

main();
```

## Troubleshooting

See our [troubleshooting guide](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/keyvault/keyvault-keys/TROUBLESHOOTING.md) for details on how to diagnose various failure scenarios.

Enabling logging may help uncover useful information about failures. In order to see a log of HTTP requests and responses, set the `AZURE_LOG_LEVEL` environment variable to `info`. Alternatively, logging can be enabled at runtime by calling `setLogLevel` in the `@azure/logger`:

```javascript
const { setLogLevel } = require("@azure/logger");

setLogLevel("info");
```

## Next steps

You can find more code samples through the following links:

- [Key Vault Keys Samples (JavaScript)](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/keyvault/keyvault-keys/samples/v4/javascript)
- [Key Vault Keys Samples (TypeScript)](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/keyvault/keyvault-keys/samples/v4/typescript)
- [Key Vault Keys Test Cases](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/keyvault/keyvault-keys/test/)

## Contributing

If you'd like to contribute to this library, please read the [contributing guide](https://github.com/Azure/azure-sdk-for-js/blob/main/CONTRIBUTING.md) to learn more about how to build and test the code.

[aboutkeys]: https://docs.microsoft.com/azure/key-vault/keys/about-keys
[keyvault]: https://docs.microsoft.com/azure/key-vault/key-vault-overview
[managedhsm]: https://docs.microsoft.com/azure/key-vault/managed-hsm/overview
[cors]: https://github.com/Azure/azure-sdk-for-js/blob/main/samples/cors/ts/README.md
[package-gh]: https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/keyvault/keyvault-keys
[package-npm]: https://www.npmjs.com/package/@azure/keyvault-keys
[docs]: https://docs.microsoft.com/javascript/api/@azure/keyvault-keys
[docs-service]: https://azure.microsoft.com/services/key-vault/
[samples]: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/keyvault/keyvault-keys/samples
[tscompileroptions]: https://www.typescriptlang.org/docs/handbook/compiler-options.html
[softdelete]: https://docs.microsoft.com/azure/key-vault/key-vault-ovw-soft-delete
[azure_keyvault]: https://docs.microsoft.com/azure/key-vault/general/overview
[azure_keyvault_cli]: https://docs.microsoft.com/azure/key-vault/general/quick-create-cli
[azure_keyvault_portal]: https://docs.microsoft.com/azure/key-vault/general/quick-create-portal
[azure_keyvault_mhsm]: https://docs.microsoft.com/azure/key-vault/managed-hsm/overview
[azure_keyvault_mhsm_cli]: https://docs.microsoft.com/azure/key-vault/managed-hsm/quick-create-cli
[default_azure_credential]: https://docs.microsoft.com/java/api/overview/azure/identity-readme?view=azure-java-stable#defaultazurecredential
[managed_identity]: https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview
[azure_identity]: https://docs.microsoft.com/java/api/overview/azure/identity-readme?view=azure-java-stable

![Impressions](https://azure-sdk-impressions.azurewebsites.net/api/impressions/azure-sdk-for-js%2Fsdk%2Fkeyvault%2Fkeyvault-keys%2FREADME.png)
