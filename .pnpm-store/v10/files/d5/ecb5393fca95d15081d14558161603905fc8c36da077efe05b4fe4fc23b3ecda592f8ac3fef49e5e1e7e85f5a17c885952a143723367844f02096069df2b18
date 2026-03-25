# nice-grpc-client-middleware-retry [![npm version][npm-image]][npm-url] <!-- omit in toc -->

Client middleware for [nice-grpc](https://github.com/deeplay-io/nice-grpc) that
adds automatic retries to unary calls.
[Exponential backoff](https://aws.amazon.com/ru/blogs/architecture/exponential-backoff-and-jitter/)
is added between retry attempts.

- [Installation](#installation)
- [Idempotency](#idempotency)
- [Usage](#usage)
  - [Infinite retries](#infinite-retries)
  - [Deadlines](#deadlines)
  - [Client configuration](#client-configuration)

## Installation

```
npm install nice-grpc-client-middleware-retry
```

## Idempotency

It is generally not safe to retry calls in case of errors, because the failed
call might have reached the server and had an effect on the system. For example,
an increment operation is not idempotent, since executing it twice will
increment by 2. In contrast, a delete operation can be made idempotent, if the
server ignores the delete of an already non-existent entity. Any read-only
operation is inherently idempotent.

In this middleware, the retries are disabled by default, unless the method is
marked as idempotent:

```protobuf
service ExampleService {
  rpc ExampleMethod(ExampleMethodRequest) returns (ExampleMethodResponse) {
    option idempotency_level = IDEMPOTENT;
  }
}
```

or read-only:

```protobuf
service ExampleService {
  rpc ExampleMethod(ExampleMethodRequest) returns (ExampleMethodResponse) {
    option idempotency_level = NO_SIDE_EFFECTS;
  }
}
```

> Note that method options currently work only when
> [compiling with `ts-proto`](https://github.com/deeplay-io/nice-grpc/tree/master/packages/nice-grpc#using-ts-proto).

## Usage

```ts
import {
  createClientFactory,
  createChannel,
  ClientError,
  Status,
} from 'nice-grpc';
import {retryMiddleware} from 'nice-grpc-client-middleware-retry';

const clientFactory = createClientFactory().use(retryMiddleware);

const channel = createChannel(address);
const client = clientFactory.create(ExampleService, channel);

const response = await client.exampleMethod(request, {
  // not needed if the method is marked as idempotent in Protobuf
  retry: true,
  // defaults to 1
  retryMaxAttempts: 5,
  // defaults to [UNKNOWN, INTERNAL, UNAVAILABLE, CANCELLED]
  retryableStatuses: [Status.UNAVAILABLE],
  onRetryableError(error: ClientError, attempt: number, delayMs: number) {
    logger.error(error, `Call failed (${attempt}), retrying in ${delayMs}ms`);
  },
});
```

### Infinite retries

You can also set `retryMaxAttempts` to `Infinity` and use
[`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) to
[cancel](https://github.com/deeplay-io/nice-grpc/tree/master/packages/nice-grpc#cancelling-calls)
the retried call:

```ts
const abortController = new AbortController();

setTimeout(() => {
  abortController.abort();
}, 1000);

const response = await client.exampleMethod(request, {
  retry: true,
  retryMaxAttempts: Infinity,
  signal: abortController.signal,
});
```

### Deadlines

When using this middleware together with
[deadline middleware](https://github.com/deeplay-io/nice-grpc/tree/master/packages/nice-grpc-client-middleware-deadline),
make sure to have them in correct order. This way, if the retry is currently in
a backoff delay, it will be correctly aborted upon deadline:

```ts
const clientFactory = createClientFactory()
  .use(retryMiddleware)
  .use(deadlineMiddleware);
```

### Client configuration

Instead of specifying retry options per call, you can configure retries when
creating the client:

```ts
const clientFactory = createClientFactory().use(retryMiddleware);

const channel = createChannel(address);
const client = clientFactory.create(ExampleService, channel, {
  // set defaults for all methods
  '*': {
    retryMaxAttempts: 5,
  },
  // enable retries for particular method
  exampleMethod: {
    retry: true,
  },
});
```

[npm-image]: https://badge.fury.io/js/nice-grpc-client-middleware-retry.svg
[npm-url]: https://badge.fury.io/js/nice-grpc-client-middleware-retry
