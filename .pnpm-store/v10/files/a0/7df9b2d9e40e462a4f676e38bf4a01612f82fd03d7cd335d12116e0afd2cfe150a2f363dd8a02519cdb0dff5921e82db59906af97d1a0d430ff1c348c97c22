# nice-grpc-common [![npm version][npm-image]][npm-url]

Common data structures and types for
[`nice-grpc`](https://github.com/deeplay-io/nice-grpc) and `nice-grpc-web`.

If you are making a middleware library, consider depending on
`nice-grpc-common`, as it is considered more stable in terms of semver. Also,
this allows you to build an isomorphic client middleware (working on both
Node.js and the Browser).

For application code, use `nice-grpc` or `nice-grpc-web` directly. Both
re-export names from `nice-grpc-common`.

## Installation

```
npm install nice-grpc-common
```

## Contents

- [`Metadata`](src/Metadata.ts) — represents
  [gRPC Metadata](https://grpc.io/docs/what-is-grpc/core-concepts/#metadata).
- [`Status`](src/Status.ts) — enum with
  [gRPC status codes](https://grpc.github.io/grpc/core/md_doc_statuscodes.html).
- [`CallContext`](src/server/CallContext.ts) — call context passed to server
  methods.
- [`ServerError`](src/server/ServerError.ts).
- [`ServerMiddleware`](src/server/ServerMiddleware.ts).
- [`composeServerMiddleware`](src/server/composeServerMiddleware.ts).
- [`CallOptions`](src/client/CallOptions.ts) — call options accepted by client
  methods.
- [`ClientError`](src/client/ClientError.ts).
- [`ClientMiddleware`](src/client/ClientMiddleware.ts).
- [`composeClientMiddleware`](src/client/composeClientMiddleware.ts).

[npm-image]: https://badge.fury.io/js/nice-grpc-common.svg
[npm-url]: https://badge.fury.io/js/nice-grpc-common
