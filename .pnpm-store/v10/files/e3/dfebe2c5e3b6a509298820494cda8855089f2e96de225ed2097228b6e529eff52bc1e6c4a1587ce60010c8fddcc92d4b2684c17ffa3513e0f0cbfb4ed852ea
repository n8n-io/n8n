# @smithy/types

[![NPM version](https://img.shields.io/npm/v/@smithy/types/latest.svg)](https://www.npmjs.com/package/@smithy/types)
[![NPM downloads](https://img.shields.io/npm/dm/@smithy/types.svg)](https://www.npmjs.com/package/@smithy/types)

## Usage

This package is mostly used internally by generated clients.
Some public components have independent applications.

### Scenario: Narrowing a smithy-typescript generated client's output payload blob types

---

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
