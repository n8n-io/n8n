# Logging

-   [Enabling logging](#enabling-logging)
-   [Logging options](#logging-options)
-   [Log long-running queries](#log-long-running-queries)
-   [Changing default logger](#changing-default-logger)
-   [Using custom logger](#using-custom-logger)

## Enabling logging

You can enable logging of all queries and errors by simply setting `logging: true` in data source options:

```typescript
{
    name: "mysql",
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "test",
    password: "test",
    database: "test",
    ...
    logging: true
}
```

## Logging options

You can enable different types of logging in data source options:

```typescript
{
    host: "localhost",
    ...
    logging: ["query", "error"]
}
```

If you want to enable logging of failed queries only then only add `error`:

```typescript
{
    host: "localhost",
    ...
    logging: ["error"]
}
```

There are other options you can use:

-   `query` - logs all queries.
-   `error` - logs all failed queries and errors.
-   `schema` - logs the schema build process.
-   `warn` - logs internal orm warnings.
-   `info` - logs internal orm informative messages.
-   `log` - logs internal orm log messages.

You can specify as many options as needed.
If you want to enable all logging you can simply specify `logging: "all"`:

```typescript
{
    host: "localhost",
    ...
    logging: "all"
}
```

## Log long-running queries

If you have performance issues, you can log queries that take too much time to execute
by setting `maxQueryExecutionTime` in data source options:

```typescript
{
    host: "localhost",
    ...
    maxQueryExecutionTime: 1000
}
```

This code will log all queries which run for more than `1 second`.

## Changing default logger

TypeORM ships with 4 different types of logger:

-   `advanced-console` - this is the default logger which logs all messages into the console using color
    and sql syntax highlighting (using [chalk](https://github.com/chalk/chalk)).
-   `simple-console` - this is a simple console logger which is exactly the same as the advanced logger, but it does not use any color highlighting.
    This logger can be used if you have problems / or don't like colorized logs.
-   `file` - this logger writes all logs into `ormlogs.log` in the root folder of your project (near `package.json`).
-   `debug` - this logger uses [debug package](https://github.com/visionmedia/debug), to turn on logging set your env variable `DEBUG=typeorm:*` (note logging option has no effect on this logger).

You can enable any of them in data source options:

```typescript
{
    host: "localhost",
    ...
    logging: true,
    logger: "file"
}
```

## Using custom logger

You can create your own logger class by implementing the `Logger` interface:

```typescript
import { Logger } from "typeorm"

export class MyCustomLogger implements Logger {
    // implement all methods from logger class
}
```

Or you can extend the `AbstractLogger` class:

```typescript
import { AbstractLogger } from "typeorm"

export class MyCustomLogger extends AbstractLogger {
    /**
     * Write log to specific output.
     */
    protected writeLog(
        level: LogLevel,
        logMessage: LogMessage | LogMessage[],
        queryRunner?: QueryRunner,
    ) {
        const messages = this.prepareLogMessages(logMessage)

        for (let message of messages) {
            switch (message.type ?? level) {
                case "log":
                case "schema-build":
                case "migration":
                    console.log(message.message)
                    break

                case "info":
                case "query":
                    if (message.prefix) {
                        console.info(message.prefix, message.message)
                    } else {
                        console.info(message.message)
                    }
                    break

                case "warn":
                case "query-slow":
                    if (message.prefix) {
                        console.warn(message.prefix, message.message)
                    } else {
                        console.warn(message.message)
                    }
                    break

                case "error":
                case "query-error":
                    if (message.prefix) {
                        console.error(message.prefix, message.message)
                    } else {
                        console.error(message.message)
                    }
                    break
            }
        }
    }
}
```

And specify it in data source options:

```typescript
import { DataSource } from "typeorm"
import { MyCustomLogger } from "./logger/MyCustomLogger"

const dataSource = new DataSource({
    name: "mysql",
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "test",
    password: "test",
    database: "test",
    logger: new MyCustomLogger(),
})
```

Logger methods can accept `QueryRunner` when it's available. It's helpful if you want to log additional data.
Also, via query runner, you can get access to additional data passed during to persist/remove. For example:

```typescript
// user sends request during entity save
postRepository.save(post, { data: { request: request } });

// in logger you can access it this way:
logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    const requestUrl = queryRunner && queryRunner.data["request"] ? "(" + queryRunner.data["request"].url + ") " : "";
    console.log(requestUrl + "executing query: " + query);
}
```
