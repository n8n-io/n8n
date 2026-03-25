# Azure Core Authentication client library for JavaScript

The `@azure/core-auth` package provides core interfaces and helper methods for authenticating with Azure services using Azure Active Directory and other authentication schemes common across the Azure SDK. As a "core" library, it shouldn't need to be added as a dependency to any user code, only other Azure SDK libraries.

## Getting started

### Installation

Install this library using npm as follows

```
npm install @azure/core-auth
```

## Key Concepts

The `TokenCredential` interface represents a credential capable of providing an authentication token. The `@azure/identity` package contains various credentials that implement the `TokenCredential` interface.

The `AzureKeyCredential` is a static key-based credential that supports key rotation via the `update` method. Use this when a single secret value is needed for authentication, e.g. when using a shared access key.

The `AzureNamedKeyCredential` is a static name/key-based credential that supports name and key rotation via the `update` method. Use this when both a secret value and a label are needed, e.g. when using a shared access key and shared access key name.

The `AzureSASCredential` is a static signature-based credential that supports updating the signature value via the `update` method. Use this when using a shared access signature.

## Examples

### AzureKeyCredential

```ts snippet:ReadmeSampleAzureKeyCredential
import { AzureKeyCredential } from "@azure/core-auth";

const credential = new AzureKeyCredential("secret value");

console.log(credential.key); // prints: "secret value"

credential.update("other secret value");

console.log(credential.key); // prints: "other secret value"
```

### AzureNamedKeyCredential

```ts snippet:ReadmeSampleAzureNamedCredential
import { AzureNamedKeyCredential } from "@azure/core-auth";

const credential = new AzureNamedKeyCredential("ManagedPolicy", "secret value");

console.log(`${credential.name}, ${credential.key}`); // prints: "ManagedPolicy, secret value"

credential.update("OtherManagedPolicy", "other secret value");

console.log(`${credential.name}, ${credential.key}`); // prints: "OtherManagedPolicy, other secret value"
```

### AzureSASCredential

```ts snippet:ReadmeSampleSASCredential
import { AzureSASCredential } from "@azure/core-auth";

const credential = new AzureSASCredential("signature1");

console.log(credential.signature); // prints: "signature1"

credential.update("signature2");

console.log(credential.signature); // prints: "signature2"
```

## Next steps

You can build and run the tests locally by executing `npm run test`. Explore the `test` folder to see advanced usage and behavior of the public classes.

## Troubleshooting

If you run into issues while using this library, please feel free to [file an issue](https://github.com/Azure/azure-sdk-for-js/issues/new).

## Contributing

If you'd like to contribute to this library, please read the [contributing guide](https://github.com/Azure/azure-sdk-for-js/blob/main/CONTRIBUTING.md) to learn more about how to build and test the code.
