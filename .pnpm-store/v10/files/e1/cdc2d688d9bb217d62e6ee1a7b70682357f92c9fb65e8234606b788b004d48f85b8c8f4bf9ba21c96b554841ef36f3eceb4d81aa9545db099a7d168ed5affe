# nice-grpc [![npm version][npm-image]][npm-url] <!-- omit in toc -->

A Node.js gRPC library that is nice to you. Built on top of
[`grpc-js`](https://www.npmjs.com/package/@grpc/grpc-js).

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Compiling Protobuf files](#compiling-protobuf-files)
    - [Using `ts-proto`](#using-ts-proto)
    - [Using `google-protobuf`](#using-google-protobuf)
  - [Server](#server)
    - [Call context](#call-context)
    - [Errors](#errors)
    - [Metadata](#metadata)
    - [Cancelling calls](#cancelling-calls)
    - [Server streaming](#server-streaming)
      - [Example: IxJS](#example-ixjs)
      - [Example: Observables](#example-observables)
    - [Client streaming](#client-streaming)
    - [Middleware](#middleware)
      - [Example: Logging](#example-logging)
      - [Example: Error handling](#example-error-handling)
      - [Example: Authentication](#example-authentication)
  - [Client](#client)
    - [Call options](#call-options)
    - [Channels](#channels)
    - [Metadata](#metadata-1)
    - [Errors](#errors-1)
    - [Cancelling calls](#cancelling-calls-1)
    - [Server streaming](#server-streaming-1)
    - [Client streaming](#client-streaming-1)
    - [Middleware](#middleware-1)
      - [Example: Logging](#example-logging-1)

## Features

- Written in TypeScript for TypeScript.
- Modern API that uses Promises and Async Iterables for streaming.
- Easy cancellation propagation with
  [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal).
- Client and server middleware support via concise API that uses Async
  Generators.

## Prerequisites

Supports NodeJS 14+. Global `AbortController` is required which is
[available in NodeJS](https://nodejs.org/api/globals.html#class-abortcontroller)
since 15.0.0, NodeJS 14.17+ requires the
[--experimental-abortcontroller](https://nodejs.org/docs/latest-v14.x/api/cli.html#cli_experimental_abortcontroller)
flag. A [polyfill](https://www.npmjs.com/package/abort-controller) is available
for older NodeJS versions.

## Installation

```
npm install nice-grpc
```

## Usage

### Compiling Protobuf files

The recommended way is to use
[`ts-proto`](https://github.com/stephenh/ts-proto).

#### Using `ts-proto`

Install necessary tools:

```
npm install protobufjs long
npm install --save-dev grpc-tools ts-proto
```

> Use `ts-proto` version not older than `1.112.0`.

Given a Protobuf file `./proto/example.proto`, generate TypeScript code into
directory `./compiled_proto`:

```
./node_modules/.bin/grpc_tools_node_protoc \
  --plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out=./compiled_proto \
  --ts_proto_opt=outputServices=nice-grpc,outputServices=generic-definitions,useExactTypes=false \
  --proto_path=./proto \
  ./proto/example.proto
```

> You can omit the `--plugin` flag if you invoke this command via
> [npm script](https://docs.npmjs.com/cli/v7/using-npm/scripts).

When running on Windows command line, you may need to wrap the `ts_proto_opt`
value with double quotes:

```
--ts_proto_opt="outputServices=nice-grpc,outputServices=generic-definitions,useExactTypes=false"
```

#### Using `google-protobuf`

Install necessary tools:

```
npm install google-protobuf
npm install --save-dev grpc-tools grpc_tools_node_protoc_ts @types/google-protobuf
```

Given a Protobuf file `./proto/example.proto`, generate JS code and TypeScript
definitions into directory `./compiled_proto`:

```
./node_modules/.bin/grpc_tools_node_protoc \
  --plugin=protoc-gen-grpc=./node_modules/.bin/grpc_tools_node_protoc_plugin \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --js_out=import_style=commonjs,binary:./compiled_proto \
  --ts_out=grpc_js:./compiled_proto \
  --grpc_out=grpc_js:./compiled_proto \
  --proto_path=./proto \
  ./proto/example.proto
```

### Server

Consider the following Protobuf definition:

```proto
syntax = "proto3";

package nice_grpc.example;

service ExampleService {
  rpc ExampleUnaryMethod(ExampleRequest) returns (ExampleResponse) {};
}

message ExampleRequest {
  // ...
}
message ExampleResponse {
  // ...
}
```

After compiling Protobuf file, we can write service implementation:

When compiling Protobufs using `ts-proto`:

```ts
import {
  ExampleServiceImplementation,
  ExampleRequest,
  ExampleResponse,
  DeepPartial,
} from './compiled_proto/example';

const exampleServiceImpl: ExampleServiceImplementation = {
  async exampleUnaryMethod(
    request: ExampleRequest,
  ): Promise<DeepPartial<ExampleResponse>> {
    // ... method logic

    return response;
  },
};
```

Alternatively, you can use classes:

```ts
class ExampleServiceImpl implements ExampleServiceImplementation {
  async exampleUnaryMethod(
    request: ExampleRequest,
  ): Promise<DeepPartial<ExampleResponse>> {
    // ... method logic

    return response;
  }
}
```

With `ts-proto`, response is automatically wrapped with `fromPartial`.

When compiling Protobufs using `google-protobuf`:

```ts
import {ServiceImplementation} from 'nice-grpc';
import {ExampleRequest, ExampleResponse} from './compiled_proto/example_pb';
import {IExampleService} from './compiled_proto/example_grpc_pb';

const exampleServiceImpl: ServiceImplementation<IExampleService> = {
  async exampleUnaryMethod(request: ExampleRequest): Promise<ExampleResponse> {
    // ... method logic

    return response;
  },
};
```

Further examples use `ts-proto`.

Now we can create and start a server that exposes our service:

```ts
import {createServer} from 'nice-grpc';
import {ExampleServiceDefinition} from './compiled_proto/example';

const server = createServer();

server.add(ExampleServiceDefinition, exampleServiceImpl);

await server.listen('0.0.0.0:8080');
```

Once we need to stop, gracefully shut down the server:

```ts
await server.shutdown();
```

#### Call context

Each service implementation method receives `CallContext` as a second argument,
that has type:

```ts
type CallContext = {
  /**
   * Request metadata from client.
   */
  metadata: Metadata;
  /**
   * Client address.
   */
  peer: string;
  /**
   * Response header. Sent with the first response, or when `sendHeader` is
   * called.
   */
  header: Metadata;
  /**
   * Manually send response header.
   */
  sendHeader(): void;
  /**
   * Response trailer. Sent when server method returns or throws.
   */
  trailer: Metadata;
  /**
   * Signal that is aborted once the call gets cancelled.
   */
  signal: AbortSignal;
};
```

Call context may be augmented by [Middleware](#middleware).

#### Errors

To report an error to a client, use `ServerError`.

> Any thrown errors other than `ServerError` will result in client receiving
> error with status code `UNKNOWN`. Use server middleware for custom handling of
> uncaught errors.

See [gRPC docs](https://grpc.github.io/grpc/core/md_doc_statuscodes.html) for
the correct usage of status codes.

```ts
import {ServerError, Status} from 'nice-grpc';

const exampleServiceImpl: ExampleServiceImplementation = {
  async exampleUnaryMethod(
    request: ExampleRequest,
  ): Promise<DeepPartial<ExampleResponse>> {
    // ... method logic

    throw new ServerError(Status.NOT_FOUND, 'Requested data does not exist');
  },
};
```

#### Metadata

A server receives client metadata along with request, and can send response
metadata in header and trailer.

```ts
const exampleServiceImpl: ExampleServiceImplementation = {
  async exampleUnaryMethod(
    request: ExampleRequest,
    context: CallContext,
  ): Promise<DeepPartial<ExampleResponse>> {
    // read client metadata
    const someValue = context.metadata.get('some-key');

    // add metadata to header
    context.header.set('some-key', 'some-value');

    // ... method logic

    // add metadata to trailer
    context.trailer.set('some-key', 'some-value');

    return response;
  },
};
```

#### Cancelling calls

A server receives
[`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
that gets aborted once the call is cancelled by the client. You can use it to
cancel any inner requests.

```ts
import fetch from 'node-fetch';

const exampleServiceImpl: ExampleServiceImplementation = {
  async exampleUnaryMethod(
    request: ExampleRequest,
    context: CallContext,
  ): Promise<DeepPartial<ExampleResponse>> {
    const response = await fetch('http://example.com', {
      signal: context.signal,
    });

    // ...
  },
};
```

#### Server streaming

Consider the following Protobuf definition:

```proto
service ExampleService {
  rpc ExampleStreamingMethod(ExampleRequest)
    returns (stream ExampleResponse) {};
}
```

Service implementation defines this method as an Async Generator:

```ts
import {delay} from 'abort-controller-x';

const exampleServiceImpl: ExampleServiceImplementation = {
  async *exampleStreamingMethod(
    request: ExampleRequest,
    context: CallContext,
  ): AsyncIterable<DeepPartial<ExampleResponse>> {
    for (let i = 0; i < 10; i++) {
      await delay(context.signal, 1000);

      yield response;
    }
  },
};
```

##### Example: IxJS

```ts
import {range} from 'ix/asynciterable';
import {withAbort, map} from 'ix/asynciterable/operators';

const exampleServiceImpl: ExampleServiceImplementation = {
  async *exampleStreamingMethod(
    request: ExampleRequest,
    context: CallContext,
  ): AsyncIterable<DeepPartial<ExampleResponse>> {
    yield* range(0, 10).pipe(
      withAbort(context.signal),
      map(() => response),
    );
  },
};
```

##### Example: Observables

```ts
import {Observable} from 'rxjs';
import {from} from 'ix/asynciterable';
import {withAbort} from 'ix/asynciterable/operators';

const exampleServiceImpl: ExampleServiceImplementation = {
  async *exampleStreamingMethod(
    request: ExampleRequest,
    context: CallContext,
  ): AsyncIterable<DeepPartial<ExampleResponse>> {
    const observable: Observable<DeepPartial<ExampleResponse>>;

    yield* from(observable).pipe(withAbort(context.signal));
  },
};
```

#### Client streaming

Given a client streaming method:

```proto
service ExampleService {
  rpc ExampleClientStreamingMethod(stream ExampleRequest)
    returns (ExampleResponse) {};
}
```

Service implementation method receives request as an Async Iterable:

```ts
const exampleServiceImpl: ExampleServiceImplementation = {
  async exampleUnaryMethod(
    request: AsyncIterable<ExampleRequest>,
  ): Promise<DeepPartial<ExampleResponse>> {
    for await (const item of request) {
      // ...
    }

    return response;
  },
};
```

#### Middleware

Server middleware intercepts incoming calls allowing to:

- Execute any logic before and after implementation methods
- Look into request, request metadata and response
- Interrupt a call before it reaches implementation by throwing a `ServerError`
- Catch implementation errors and return friendly `ServerError`s to a client
- Augment call context
- Modify response header and trailer metadata

Server middleware is defined as an Async Generator. The most basic no-op
middleware looks like this:

```ts
import {ServerMiddlewareCall, CallContext} from 'nice-grpc';

async function* middleware<Request, Response>(
  call: ServerMiddlewareCall<Request, Response>,
  context: CallContext,
) {
  return yield* call.next(call.request, context);
}
```

For unary and client streaming methods, the `call.next` generator yields no
items and returns a single response; for server streaming and bidirectional
streaming methods, it yields each response and returns void. By doing
`return yield*` we cover both cases. To handle these cases separately, we can
write a middleware as follows:

```ts
async function* middleware<Request, Response>(
  call: ServerMiddlewareCall<Request, Response>,
  context: CallContext,
) {
  if (!call.responseStream) {
    const response = yield* call.next(call.request, context);

    return response;
  } else {
    for await (const response of call.next(call.request, context)) {
      yield response;
    }

    return;
  }
}
```

To attach a middleware to a server, use a `server.use` method. Note that
`server.use` returns a new server instance.

```ts
const server = createServer().use(middleware1).use(middleware2);
```

A middleware that is attached first, will be invoked first.

You can also attach middleware per-service:

```ts
const server = createServer().use(middlewareA);

server.with(middlewareB).add(Service1, service1Impl);
server.with(middlewareC).add(Service2, service2Impl);
```

In the above example, `Service1` gets `middlewareA` and `middlewareB`, and
`Service2` gets `middlewareA` and `middlewareC`.

##### Example: Logging

Log all calls:

```ts
import {Status} from 'nice-grpc';
import {isAbortError} from 'abort-controller-x';

async function* loggingMiddleware<Request, Response>(
  call: ServerMiddlewareCall<Request, Response>,
  context: CallContext,
) {
  const {path} = call.method;

  console.log('Server call', path, 'start');

  try {
    const result = yield* call.next(call.request, context);

    console.log('Server call', path, 'end: OK');

    return result;
  } catch (error) {
    if (error instanceof ServerError) {
      console.log(
        'Server call',
        path,
        `end: ${Status[error.code]}: ${error.details}`,
      );
    } else if (isAbortError(error)) {
      console.log('Server call', path, 'cancel');
    } else {
      console.log('Server call', path, `error: ${error?.stack}`);
    }

    throw error;
  }
}
```

##### Example: Error handling

Catch unknown errors and wrap them into `ServerError`s with friendly messages:

```ts
import {Status} from 'nice-grpc';
import {isAbortError} from 'abort-controller-x';

async function* errorHandlingMiddleware<Request, Response>(
  call: ServerMiddlewareCall<Request, Response>,
  context: CallContext,
) {
  try {
    return yield* call.next(call.request, context);
  } catch (error: unknown) {
    if (error instanceof ServerError || isAbortError(error)) {
      throw error;
    }

    let details = 'Unknown server error occurred';

    if (process.env.NODE_ENV === 'development') {
      details += `: ${error.stack}`;
    }

    throw new ServerError(Status.UNKNOWN, details);
  }
}
```

##### Example: Authentication

Validate JSON Web Token (JWT) from request metadata and put its claims to
`CallContext`:

```ts
import {Status} from 'nice-grpc';
import createRemoteJWKSet from 'jose/jwks/remote';
import jwtVerify, {JWTPayload} from 'jose/jwt/verify';
import {JOSEError} from 'jose/util/errors';

const jwks = createRemoteJWKSet(
  new URL('https://example.com/.well-known/jwks.json'),
);

type AuthCallContextExt = {
  auth: JWTPayload;
};

async function* authMiddleware<Request, Response>(
  call: ServerMiddlewareCall<Request, Response, AuthCallContextExt>,
  context: CallContext,
) {
  const authorization = context.metadata.get('Authorization');

  if (authorization == null) {
    throw new ServerError(
      Status.UNAUTHENTICATED,
      'Missing Authorization metadata',
    );
  }

  const parts = authorization.toString().split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new ServerError(
      Status.UNAUTHENTICATED,
      'Invalid Authorization metadata format. Expected "Bearer <token>"',
    );
  }

  const token = parts[1];

  const {payload} = await jwtVerify(token, jwks).catch(error => {
    if (error instanceof JOSEError) {
      throw new ServerError(Status.UNAUTHENTICATED, error.message);
    } else {
      throw error;
    }
  });

  return yield* call.next(call.request, {
    ...context,
    auth: payload,
  });
}
```

Service implementation can then access JWT claims via call context:

```ts
const exampleServiceImpl: ExampleServiceImplementation<AuthCallContextExt> = {
  async exampleUnaryMethod(
    request: ExampleRequest,
    context: CallContext & AuthCallContextExt,
  ): Promise<DeepPartial<ExampleResponse>> {
    const userId = context.auth.sub;

    // ...
  },
};
```

### Client

Consider the following Protobuf definition:

```proto
syntax = "proto3";

package nice_grpc.example;

service ExampleService {
  rpc ExampleUnaryMethod(ExampleRequest) returns (ExampleResponse) {};
}

message ExampleRequest {
  // ...
}
message ExampleResponse {
  // ...
}
```

After compiling Protobuf file, we can create the client:

When compiling Protobufs using `ts-proto`:

```ts
import {createChannel, createClient} from 'nice-grpc';
import {
  ExampleServiceClient,
  ExampleServiceDefinition,
} from './compiled_proto/example';

const channel = createChannel('localhost:8080');

const client: ExampleServiceClient = createClient(
  ExampleServiceDefinition,
  channel,
);
```

When compiling Protobufs using `google-protobuf`:

```ts
import {createChannel, createClient, Client} from 'nice-grpc';
import {
  ExampleService,
  IExampleService,
} from './compiled_proto/example_grpc_pb';

const channel = createChannel('localhost:8080');

const client: Client<IExampleService> = createClient(ExampleService, channel);
```

Further examples use `ts-proto`.

Call the method:

```ts
const response = await client.exampleUnaryMethod(request);
```

With `ts-proto`, request is automatically wrapped with `fromPartial`.

Once we've done with the client, close the channel:

```ts
channel.close();
```

#### Call options

Each client method accepts `CallOptions` as an optional second argument, that
has type:

```ts
type CallOptions = {
  /**
   * Request metadata.
   */
  metadata?: Metadata;
  /**
   * Signal that cancels the call once aborted.
   */
  signal?: AbortSignal;
  /**
   * Called when header is received.
   */
  onHeader?(header: Metadata): void;
  /**
   * Called when trailer is received.
   */
  onTrailer?(trailer: Metadata): void;
};
```

Call options may be augmented by [Middleware](#middleware-1).

When creating a client, you may specify default call options per method, or for
all methods. This doesn't make much sense for built-in options, but may do for
middleware, for example,
[nice-grpc-client-middleware-deadline](/packages/nice-grpc-client-middleware-deadline):

```ts
const client = createClient(ExampleServiceDefinition, channel, {
  '*': {
    // applies for all methods
    deadline: 30_000,
  },
  exampleUnaryMethod: {
    // applies for single method
    deadline: 10_000,
  },
});
```

To add default metadata, instead use a middleware that merges it with the
metadata passed to the call:

```ts
const token = '...';

const client = createClientFactory().use((call, options) =>
  call.next(call.request, {
    ...options,
    metadata: Metadata(options.metadata).set(
      'Authorization',
      `Bearer ${token}`,
    ),
  }),
);
```

#### Channels

By default, a channel uses insecure connection. The following are equivalent:

```ts
import {createChannel, ChannelCredentials} from 'nice-grpc';

createChannel('example.com:8080');
createChannel('http://example.com:8080');
createChannel('example.com:8080', ChannelCredentials.createInsecure());
```

To connect over TLS, use one of the following:

```ts
createChannel('https://example.com:8080');
createChannel('example.com:8080', ChannelCredentials.createSsl());
```

If the port is omitted, it defaults to `80` for insecure connections, and `443`
for secure connections.

#### Metadata

Client can send request metadata and receive response header and trailer:

```ts
import {Metadata} from 'nice-grpc';

const response = await client.exampleUnaryMethod(request, {
  metadata: Metadata({key: 'value'}),
  onHeader(header: Metadata) {
    // ...
  },
  onTrailer(trailer: Metadata) {
    // ...
  },
});
```

#### Errors

Client calls may throw gRPC errors represented as `ClientError`, that contain
status code and description.

```ts
import {ClientError, Status} from 'nice-grpc';
import {ExampleResponse} from './compiled_proto/example';

let response: ExampleResponse | null;

try {
  response = await client.exampleUnaryMethod(request);
} catch (error: unknown) {
  if (error instanceof ClientError && error.code === Status.NOT_FOUND) {
    response = null;
  } else {
    throw error;
  }
}
```

#### Cancelling calls

A client call can be cancelled using
[`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal).

```ts
import {isAbortError} from 'abort-controller-x';

const abortController = new AbortController();

client
  .exampleUnaryMethod(request, {
    signal: abortController.signal,
  })
  .catch(error => {
    if (isAbortError(error)) {
      // aborted
    } else {
      throw error;
    }
  });

abortController.abort();
```

#### Server streaming

Consider the following Protobuf definition:

```proto
service ExampleService {
  rpc ExampleStreamingMethod(ExampleRequest)
    returns (stream ExampleResponse) {};
}
```

Client method returns an Async Iterable:

```ts
for await (const response of client.exampleStreamingMethod(request)) {
  // ...
}
```

#### Client streaming

Given a client streaming method:

```proto
service ExampleService {
  rpc ExampleClientStreamingMethod(stream ExampleRequest)
    returns (ExampleResponse) {};
}
```

Client method expects an Async Iterable as its first argument:

```ts
import {ExampleRequest, DeepPartial} from './compiled_proto/example';

async function* createRequest(): AsyncIterable<DeepPartial<ExampleRequest>> {
  for (let i = 0; i < 10; i++) {
    yield request;
  }
}

const response = await client.exampleClientStreamingMethod(createRequest());
```

#### Middleware

Client middleware intercepts outgoing calls allowing to:

- Execute any logic before and after reaching server
- Modify request metadata
- Look into request, response and response metadata
- Send call multiple times for retries or hedging
- Augment call options type to have own configuration

Client middleware is defined as an Async Generator and is very similar to
[Server middleware](#middleware). Key differences:

- Middleware invocation order is reversed: middleware that is attached first,
  will be invoked last.
- There's no such thing as `CallContext` for client middleware; instead,
  `CallOptions` are passed through the chain and can be accessed or altered by a
  middleware.

The most basic no-op middleware looks like this:

```ts
import {ClientMiddlewareCall, CallOptions} from 'nice-grpc';

async function* middleware<Request, Response>(
  call: ClientMiddlewareCall<Request, Response>,
  options: CallOptions,
) {
  return yield* call.next(call.request, options);
}
```

For unary and client streaming methods, the `call.next` generator yields no
items and returns a single response; for server streaming and bidirectional
streaming methods, it yields each response and returns void. By doing
`return yield*` we cover both cases. To handle these cases separately, we can
write a middleware as follows:

```ts
async function* middleware<Request, Response>(
  call: ClientMiddlewareCall<Request, Response>,
  options: CallOptions,
) {
  if (!call.responseStream) {
    const response = yield* call.next(call.request, options);

    return response;
  } else {
    for await (const response of call.next(call.request, options)) {
      yield response;
    }

    return;
  }
}
```

To create a client with middleware, use a client factory:

```ts
import {createClientFactory} from 'nice-grpc';

const client = createClientFactory()
  .use(middleware1)
  .use(middleware2)
  .create(ExampleService, channel);
```

A middleware that is attached first, will be invoked last.

You can reuse a single factory to create multiple clients:

```ts
const clientFactory = createClientFactory().use(middleware);

const client1 = clientFactory.create(Service1, channel1);
const client2 = clientFactory.create(Service2, channel2);
```

You can also attach middleware per-client:

```ts
const factory = createClientFactory().use(middlewareA);

const client1 = clientFactory.use(middlewareB).create(Service1, channel1);
const client2 = clientFactory.use(middlewareC).create(Service2, channel2);
```

In the above example, `Service1` client gets `middlewareA` and `middlewareB`,
and `Service2` client gets `middlewareA` and `middlewareC`.

Type augmentation to `Client` CallOptions is done automatically by adding a middleware, but can also be done by passing a generic. This code example shows how to correctly annotate client type given that middleware has type `ClientMiddleware<{callOption?: number}>`.

```ts
let client: ExampleServiceClient<{callOption?: number}>;
client = createClientFactory()
  .use(middleware)
  .create(ExampleService, channel);
```

##### Example: Logging

Log all calls:

```ts
import {
  ClientMiddlewareCall,
  CallOptions,
  ClientError,
  Status,
} from 'nice-grpc';
import {isAbortError} from 'abort-controller-x';

async function* loggingMiddleware<Request, Response>(
  call: ClientMiddlewareCall<Request, Response>,
  options: CallOptions,
) {
  const {path} = call.method;

  console.log('Client call', path, 'start');

  try {
    const result = yield* call.next(call.request, options);

    console.log('Client call', path, 'end: OK');

    return result;
  } catch (error) {
    if (error instanceof ClientError) {
      console.log(
        'Client call',
        path,
        `end: ${Status[error.code]}: ${error.details}`,
      );
    } else if (isAbortError(error)) {
      console.log('Client call', path, 'cancel');
    } else {
      console.log('Client call', path, `error: ${error?.stack}`);
    }

    throw error;
  }
}
```

[npm-image]: https://badge.fury.io/js/nice-grpc.svg
[npm-url]: https://badge.fury.io/js/nice-grpc
