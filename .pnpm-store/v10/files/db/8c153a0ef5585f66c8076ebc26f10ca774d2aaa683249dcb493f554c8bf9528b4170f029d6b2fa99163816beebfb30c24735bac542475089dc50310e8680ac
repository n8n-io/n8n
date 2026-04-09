# Azure Logger client library for JavaScript

The `@azure/logger` package can be used to enable logging in the Azure SDKs for JavaScript.

Logging can be enabled for the Azure SDK in the following ways:

- Setting the AZURE_LOG_LEVEL environment variable
- Calling setLogLevel imported from "@azure/logger"
- Calling enable() on specific loggers
- Using the `DEBUG` environment variable.

Note that AZURE_LOG_LEVEL, if set, takes precedence over DEBUG. Only use DEBUG without specifying AZURE_LOG_LEVEL or calling setLogLevel.

## Getting started

### Installation

Install this library using npm as follows

```bash
npm install @azure/logger
```

## Key Concepts

The `@azure/logger` package supports the following log levels
specified in order of most verbose to least verbose:

- verbose
- info
- warning
- error

When setting a log level, either programmatically or via the `AZURE_LOG_LEVEL` environment variable,
any logs that are written using a log level equal to or less than the one you choose
will be emitted.

For example, setting the log level to `warning` will cause all logs that have the log
level `warning` or `error` to be emitted.

**NOTE**: When logging requests and responses, we sanitize these objects to make sure things like `Authorization` headers that contain secrets are not logged.

Request and response bodies are never logged. Headers are redacted by default, unless present in the following list or explicitly allowed by the client SDK:

- "x-ms-client-request-id",
- "x-ms-return-client-request-id",
- "x-ms-useragent",
- "x-ms-correlation-request-id",
- "x-ms-request-id",
- "client-request-id",
- "ms-cv",
- "return-client-request-id",
- "traceparent",
- "Access-Control-Allow-Credentials",
- "Access-Control-Allow-Headers",
- "Access-Control-Allow-Methods",
- "Access-Control-Allow-Origin",
- "Access-Control-Expose-Headers",
- "Access-Control-Max-Age",
- "Access-Control-Request-Headers",
- "Access-Control-Request-Method",
- "Origin",
- "Accept",
- "Accept-Encoding",
- "Cache-Control",
- "Connection",
- "Content-Length",
- "Content-Type",
- "Date",
- "ETag",
- "Expires",
- "If-Match",
- "If-Modified-Since",
- "If-None-Match",
- "If-Unmodified-Since",
- "Last-Modified",
- "Pragma",
- "Request-Id",
- "Retry-After",
- "Server",
- "Transfer-Encoding",
- "User-Agent",
- "WWW-Authenticate",

## Examples

### Example 1 - basic usage

```ts snippet:ReadmeSampleBasicUsage
import { setLogLevel } from "@azure/logger";

setLogLevel("info");
```

### Example 2 - redirect log output

```ts snippet:ReadmeSampleRedirectLog
import { setLogLevel, AzureLogger } from "@azure/logger";

setLogLevel("verbose");

// override logging to output to console.log (default location is stderr)
AzureLogger.log = (...args) => {
  console.log(...args);
};
```

Using `AzureLogger`, it is possible to redirect the logging output from the Azure SDKs by
overriding the `AzureLogger.log` method. This may be useful if you want to redirect logs to
a location other than stderr.

## Next steps

You can build and run the tests locally by executing `rushx test`. Explore the `test` folder to see advanced usage and behavior of the public classes.

## Troubleshooting

If you run into issues while using this library, please feel free to [file an issue](https://github.com/Azure/azure-sdk-for-js/issues/new).

## Contributing

If you'd like to contribute to this library, please read the [contributing guide](https://github.com/Azure/azure-sdk-for-js/blob/main/CONTRIBUTING.md) to learn more about how to build and test the code.
