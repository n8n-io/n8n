# @smithy/types

[![NPM version](https://img.shields.io/npm/v/@smithy/types/latest.svg)](https://www.npmjs.com/package/@smithy/types)
[![NPM downloads](https://img.shields.io/npm/dm/@smithy/types.svg)](https://www.npmjs.com/package/@smithy/types)

## Usage

This package is mostly used internally by generated clients.
Some public components have independent applications.

---

### Scenario: Removing `| undefined` from input and output structures

Generated shapes' members are unioned with `undefined` for
input shapes, and are `?` (optional) for output shapes.

- for inputs, this defers the validation to the service.
- for outputs, this strongly suggests that you should runtime-check the output data.

If you would like to skip these steps, use the `AssertiveClient` or
`UncheckedClient` type helpers.

Using AWS S3 as an example:

```ts
import { S3 } from "@aws-sdk/client-s3";
import type { AssertiveClient, UncheckedClient } from "@smithy/types";

const s3a = new S3({}) as AssertiveClient<S3>;
const s3b = new S3({}) as UncheckedClient<S3>;

// AssertiveClient enforces required inputs are not undefined
// and required outputs are not undefined.
const get = await s3a.getObject({
  Bucket: "",
  // @ts-expect-error (undefined not assignable to string)
  Key: undefined,
});

// UncheckedClient makes output fields non-nullable.
// You should still perform type checks as you deem
// necessary, but the SDK will no longer prompt you
// with nullability errors.
const body = await (
  await s3b.getObject({
    Bucket: "",
    Key: "",
  })
).Body.transformToString();
```

When using the transform on non-aggregated client with the `Command` syntax,
the input cannot be validated because it goes through another class.

```ts
import { S3Client, ListBucketsCommand, GetObjectCommand, GetObjectCommandInput } from "@aws-sdk/client-s3";
import type { AssertiveClient, UncheckedClient, NoUndefined } from "@smithy/types";

const s3 = new S3Client({}) as UncheckedClient<S3Client>;

const list = await s3.send(
  new ListBucketsCommand({
    // command inputs are not validated by the type transform.
    // because this is a separate class.
  })
);

/**
 * Although less ergonomic, you can use the NoUndefined<T>
 * transform on the input type.
 */
const getObjectInput: NoUndefined<GetObjectCommandInput> = {
  Bucket: "undefined",
  // @ts-expect-error (undefined not assignable to string)
  Key: undefined,
  // optional params can still be undefined.
  SSECustomerAlgorithm: undefined,
};

const get = s3.send(new GetObjectCommand(getObjectInput));

// outputs are still transformed.
await get.Body.TransformToString();
```

### Scenario: Narrowing a smithy-typescript generated client's output payload blob types

This is mostly relevant to operations with streaming bodies such as within
the S3Client in the AWS SDK for JavaScript v3.

Because blob payload types are platform dependent, you may wish to indicate in your application that a client is running in a specific
environment. This narrows the blob payload types.

```typescript
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { NodeJsClient, SdkStream, StreamingBlobPayloadOutputTypes } from "@smithy/types";
import type { IncomingMessage } from "node:http";

// default client init.
const s3Default = new S3Client({});

// client init with type narrowing.
const s3NarrowType = new S3Client({}) as NodeJsClient<S3Client>;

// The default type of blob payloads is a wide union type including multiple possible
// request handlers.
const body1: StreamingBlobPayloadOutputTypes = (await s3Default.send(new GetObjectCommand({ Key: "", Bucket: "" })))
  .Body!;

// This is of the narrower type SdkStream<IncomingMessage> representing
// blob payload responses using specifically the node:http request handler.
const body2: SdkStream<IncomingMessage> = (await s3NarrowType.send(new GetObjectCommand({ Key: "", Bucket: "" })))
  .Body!;
```
