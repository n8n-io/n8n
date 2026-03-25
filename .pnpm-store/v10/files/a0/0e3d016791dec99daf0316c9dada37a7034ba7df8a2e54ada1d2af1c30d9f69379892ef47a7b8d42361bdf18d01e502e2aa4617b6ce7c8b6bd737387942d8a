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

```
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

## Examples

### Example 1 - basic usage

```js
const { EventHubClient } = require('@azure/event-hubs');

const logger = require('@azure/logger');
logger.setLogLevel('info');

// operations will now emit info, warning, and error logs
const client = new EventHubClient(/* params */);
client.getPartitionIds()
  .then(ids => { /* do work */ })
  .catch(e => { /* do work */ });
});
```

### Example 2 - redirect log output

```js
const { AzureLogger, setLogLevel } = require("@azure/logger");

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

![Impressions](https://azure-sdk-impressions.azurewebsites.net/api/impressions/azure-sdk-for-js%2Fsdk%2Fcore%2Flogger%2FREADME.png)
