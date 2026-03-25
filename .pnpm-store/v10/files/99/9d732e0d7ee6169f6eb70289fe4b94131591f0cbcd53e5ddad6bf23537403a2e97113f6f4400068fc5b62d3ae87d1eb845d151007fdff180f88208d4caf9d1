# Azure Core LRO client library for JavaScript

`@azure/core-lro` is a JavaScript library that manages long running operations (LROs) against Azure services. Until completion, such operations require consecutive calls to Azure services to update a local representation of the remote operation status.

**Please note:** This library is included with other Azure SDK libraries that need it. It should not be used as a direct dependency in your projects.

`@azure/core-lro` is made following our [Long Running Operations guidelines](https://azure.github.io/azure-sdk/typescript_design.html#ts-lro)

Key links:
- [Source code](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/core/core-lro)
- [Package (npm)](https://www.npmjs.com/package/@azure/core-lro) 
- [API Reference Documentation](https://docs.microsoft.com/javascript/api/@azure/core-lro) 
- [Samples](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/core/core-lro/samples)

## Getting started

### Install the package

To install this library for a project under the `azure-sdk-for-js`, make sure you are at the root of that project, then use [Rush](https://rushjs.io/) as follows:

```
rush add -p @azure/core-lro
```

To install this package outside of the `azure-sdk-for-js`, use `npm install --save @azure/core-lro`.

### Configure TypeScript

TypeScript users need to have Node type definitions installed:

```bash
npm install @types/node
```

They will also need to enable `compilerOptions.allowSyntheticDefaultImports` in their
`tsconfig.json`. Note that if you have enabled `compilerOptions.esModuleInterop`,
`allowSyntheticDefaultImports` is enabled by default.
See [TypeScript's compiler options handbook](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
for more information.

## Key concepts

@azure/core-lro makes a distinction between the Long Running Operation and its Poller.

- Whenever we talk about an **operation**, we mean the static representation of a Long Running Operation.
  Any operation will have a definition of a **state**, which has an opinionated default set of properties.
  The definition of the operation will also have functions that will define how to request new information
  about the pending operation, how to request its cancellation, and how to serialize it.
- A **Poller** is an object who's main function is to interact with an operation until the poller is manually stopped,
  the operation finishes (either by succeeding or failing) or if a manual request to cancel the operation has succeeded.  
  Some characteristics of the pollers are:
    - Pollers show the status of the polling behavior.
    - Pollers support manual as well as automatic polling.
    - Pollers are serializable and can resume from a serialized operation.
    - Pollers also specify how much of the operation's state is going to be available to the public.
- A **PollerLike** is the public interface of a Poller, which allows for different implementations to be used.

## Examples

You will be able to find some working examples of an implementation of an operation and a poller in:

- [The `@azure/core-lro` samples](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/core/core-lro/samples).
- [The `@azure/core-lro` tests](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/core/core-lro/test).

## Troubleshooting

### Logging

Logs can be added at the discretion of the library implementing the Long Running Operation poller.
Packages inside of [azure-sdk-for-js](https://github.com/Azure/azure-sdk-for-js) use
[@azure/logger](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/core/logger).

## Next steps

Please take a look at the [samples](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/core/core-lro/samples) directory for detailed examples on how to use this library.

## Contributing

If you'd like to contribute to this library, please read the [contributing guide](https://github.com/Azure/azure-sdk-for-js/blob/main/CONTRIBUTING.md) to learn more about how to build and test the code.

### Testing

To run our tests, first install the dependencies (with `npm install` or `rush install`),
then run the unit tests with: `npm run unit-test`.

### Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

![Impressions](https://azure-sdk-impressions.azurewebsites.net/api/impressions/azure-sdk-for-js%2Fsdk%2Fcore%2Fcore-lro%2FREADME.png)
