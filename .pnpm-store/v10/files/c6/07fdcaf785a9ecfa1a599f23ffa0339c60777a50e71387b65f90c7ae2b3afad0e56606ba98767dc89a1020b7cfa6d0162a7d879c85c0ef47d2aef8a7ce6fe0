# Azure Core HTTP Compatibility library for JavaScript

This library provides classes and interfaces to be used by Azure client libraries that want to move from using [@azure/core-http](https://www.npmjs.com/package/@azure/core-http) to [@azure/core-client](https://www.npmjs.com/package/@azure/core-client) & [@azure/core-rest-pipeline](https://www.npmjs.com/package/@azure/core-rest-pipeline) without causing breaking changes in their public API surface.

## Usage

### ExtendedCommonClientOptions

With `@azure/core-http` library, the `options` parameter to the custom client will look like:

```
export interface SearchClientOptions extends PipelineOptions {
  apiVersion?: string;
}
```

With the `@azure/core-client` & `@azure/core-rest-pipeline` libraries, the `options` parameter to the custom client will look like:

```
export interface SearchClientOptions extends CommonClientOptions {
  apiVersion?: string;
}
```

With the Core HTTP Compatibility library, the `options` parameter to the custom client will look like:

```
export interface SearchClientOptions extends ExtendedCommonClientOptions {
  apiVersion?: string;
}
```
