# Azure Abort Controller client library for JavaScript

The `@azure/abort-controller` package provides `AbortSignalLike` interface and
`AbortError` classes to make it easier to work with the
[AbortController](https://developer.mozilla.org/docs/Web/API/AbortController)
 and the `AbortSignal` used by
[fetch](https://developer.mozilla.org/docs/Web/API/Fetch_API) built into modern JavaScript platforms.

Customers of Azure SDK for JavaScript in general do not need to use this library. Instead they
use `AbortController` and `AbortSignal` provided by their platforms and pass the abort signals to Azure SDK operations.

Key links:

- [Source code](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/core/abort-controller)
- [Package (npm)](https://www.npmjs.com/package/@azure/abort-controller)
- [API Reference Documentation](https://docs.microsoft.com/javascript/api/overview/azure/abort-controller-readme)

## Getting started

### Installation

Install this library using npm as follows

```
npm install @azure/abort-controller
```

## Key Concepts

Use `AbortController` to create an `AbortSignal` which can then be passed to Azure SDK operations to cancel
pending work. The `AbortSignal` can be accessed via the `signal` property on an instantiated `AbortController`.
An `AbortSignal` can also be returned directly from a static method, e.g. `AbortSignal.timeout(100)`.
that is cancelled after 100 milliseconds.

## Examples

The below examples assume that `doAsyncWork` is a function that takes a bag of properties, one of which is
of the abort signal.

### Example 1 - basic usage

```js
const controller = new AbortController();
doAsyncWork({ abortSignal: controller.signal });

// at some point later
controller.abort();
```

### Example 2 - Aborting with timeout

```js
const signal = AbortSignal.timeout(1000);
doAsyncWork({ abortSignal: signal });
```

## Next steps

You can build and run the tests locally by executing `rushx test`. Explore the `test` folder to see advanced usage and behavior of the public classes.

## Troubleshooting

If you run into issues while using this library, please feel free to [file an issue](https://github.com/Azure/azure-sdk-for-js/issues/new).

## Contributing

If you'd like to contribute to this library, please read the [contributing guide](https://github.com/Azure/azure-sdk-for-js/blob/main/CONTRIBUTING.md) to learn more about how to build and test the code.

![Impressions](https://azure-sdk-impressions.azurewebsites.net/api/impressions/azure-sdk-for-js%2Fsdk%2Fcore%2Fabort-controller%2FREADME.png)
