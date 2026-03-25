# Mistral Typescript Client

<!-- Start Summary [summary] -->
## Summary

Mistral AI API: Our Chat Completion and Embeddings APIs specification. Create your account on [La Plateforme](https://console.mistral.ai) to get access and read the [docs](https://docs.mistral.ai) to learn how to use it.
<!-- End Summary [summary] -->

<!-- Start Table of Contents [toc] -->
## Table of Contents
<!-- $toc-max-depth=2 -->
* [Mistral Typescript Client](#mistral-typescript-client)
  * [SDK Installation](#sdk-installation)
  * [Requirements](#requirements)
  * [API Key Setup](#api-key-setup)
  * [SDK Example Usage](#sdk-example-usage)
  * [Providers' SDKs](#providers-sdks)
  * [Available Resources and Operations](#available-resources-and-operations)
  * [Server-sent event streaming](#server-sent-event-streaming)
  * [File uploads](#file-uploads)
  * [Retries](#retries)
  * [Error Handling](#error-handling)
  * [Server Selection](#server-selection)
  * [Custom HTTP Client](#custom-http-client)
  * [Authentication](#authentication)
  * [Providers Support](#providers-support)
  * [Standalone functions](#standalone-functions)
  * [Debugging](#debugging)
* [Development](#development)
  * [Contributions](#contributions)

<!-- End Table of Contents [toc] -->

<!-- Start SDK Installation [installation] -->
## SDK Installation

The SDK can be installed with either [npm](https://www.npmjs.com/), [pnpm](https://pnpm.io/), [bun](https://bun.sh/) or [yarn](https://classic.yarnpkg.com/en/) package managers.

### NPM

```bash
npm add @mistralai/mistralai
```

### PNPM

```bash
pnpm add @mistralai/mistralai
```

### Bun

```bash
bun add @mistralai/mistralai
```

### Yarn

```bash
yarn add @mistralai/mistralai zod

# Note that Yarn does not install peer dependencies automatically. You will need
# to install zod as shown above.
```
<!-- End SDK Installation [installation] -->

<!-- Start Requirements [requirements] -->
## Requirements

For supported JavaScript runtimes, please consult [RUNTIMES.md](RUNTIMES.md).
<!-- End Requirements [requirements] -->

## API Key Setup

Before you begin, you will need a Mistral AI API key.

1. Get your own Mistral API Key: <https://docs.mistral.ai/#api-access>
2. Set your Mistral API Key as an environment variable. You only need to do this once.

```bash
# set Mistral API Key (using zsh for example)
$ echo 'export MISTRAL_API_KEY=[your_key_here]' >> ~/.zshenv

# reload the environment (or just quit and open a new terminal)
$ source ~/.zshenv
```

<!-- Start SDK Example Usage [usage] -->
## SDK Example Usage

### Create Chat Completions

This example shows how to create chat completions.

```typescript
import { Mistral } from "@mistralai/mistralai";

const mistral = new Mistral({
  apiKey: process.env["MISTRAL_API_KEY"] ?? "",
});

async function run() {
  const result = await mistral.chat.complete({
    model: "mistral-small-latest",
    messages: [
      {
        content:
          "Who is the best French painter? Answer in one short sentence.",
        role: "user",
      },
    ],
  });

  console.log(result);
}

run();

```

### Upload a file

This example shows how to upload a file.

```typescript
import { Mistral } from "@mistralai/mistralai";
import { openAsBlob } from "node:fs";

const mistral = new Mistral({
  apiKey: process.env["MISTRAL_API_KEY"] ?? "",
});

async function run() {
  const result = await mistral.files.upload({
    file: await openAsBlob("example.file"),
  });

  console.log(result);
}

run();

```

### Create Agents Completions

This example shows how to create agents completions.

```typescript
import { Mistral } from "@mistralai/mistralai";

const mistral = new Mistral({
  apiKey: process.env["MISTRAL_API_KEY"] ?? "",
});

async function run() {
  const result = await mistral.agents.complete({
    messages: [
      {
        content:
          "Who is the best French painter? Answer in one short sentence.",
        role: "user",
      },
    ],
    agentId: "<id>",
  });

  console.log(result);
}

run();

```

### Create Embedding Request

This example shows how to create embedding request.

```typescript
import { Mistral } from "@mistralai/mistralai";

const mistral = new Mistral({
  apiKey: process.env["MISTRAL_API_KEY"] ?? "",
});

async function run() {
  const result = await mistral.embeddings.create({
    model: "mistral-embed",
    inputs: [
      "Embed this sentence.",
      "As well as this one.",
    ],
  });

  console.log(result);
}

run();

```
<!-- End SDK Example Usage [usage] -->

## Providers' SDKs

We have dedicated SDKs for the following providers:

- [GCP](/packages/mistralai-gcp/README.md)
- [Azure](/packages/mistralai-azure/README.md)

<!-- Start Available Resources and Operations [operations] -->
## Available Resources and Operations

<details open>
<summary>Available methods</summary>

### [agents](docs/sdks/agents/README.md)

* [complete](docs/sdks/agents/README.md#complete) - Agents Completion
* [stream](docs/sdks/agents/README.md#stream) - Stream Agents completion

### [audio](docs/sdks/audio/README.md)


#### [audio.transcriptions](docs/sdks/transcriptions/README.md)

* [complete](docs/sdks/transcriptions/README.md#complete) - Create Transcription
* [stream](docs/sdks/transcriptions/README.md#stream) - Create streaming transcription (SSE)

### [batch](docs/sdks/batch/README.md)


#### [batch.jobs](docs/sdks/mistraljobs/README.md)

* [list](docs/sdks/mistraljobs/README.md#list) - Get Batch Jobs
* [create](docs/sdks/mistraljobs/README.md#create) - Create Batch Job
* [get](docs/sdks/mistraljobs/README.md#get) - Get Batch Job
* [cancel](docs/sdks/mistraljobs/README.md#cancel) - Cancel Batch Job

### [beta](docs/sdks/beta/README.md)


#### [beta.agents](docs/sdks/mistralagents/README.md)

* [create](docs/sdks/mistralagents/README.md#create) - Create a agent that can be used within a conversation.
* [list](docs/sdks/mistralagents/README.md#list) - List agent entities.
* [get](docs/sdks/mistralagents/README.md#get) - Retrieve an agent entity.
* [update](docs/sdks/mistralagents/README.md#update) - Update an agent entity.
* [updateVersion](docs/sdks/mistralagents/README.md#updateversion) - Update an agent version.

#### [beta.conversations](docs/sdks/conversations/README.md)

* [start](docs/sdks/conversations/README.md#start) - Create a conversation and append entries to it.
* [list](docs/sdks/conversations/README.md#list) - List all created conversations.
* [get](docs/sdks/conversations/README.md#get) - Retrieve a conversation information.
* [append](docs/sdks/conversations/README.md#append) - Append new entries to an existing conversation.
* [getHistory](docs/sdks/conversations/README.md#gethistory) - Retrieve all entries in a conversation.
* [getMessages](docs/sdks/conversations/README.md#getmessages) - Retrieve all messages in a conversation.
* [restart](docs/sdks/conversations/README.md#restart) - Restart a conversation starting from a given entry.
* [startStream](docs/sdks/conversations/README.md#startstream) - Create a conversation and append entries to it.
* [appendStream](docs/sdks/conversations/README.md#appendstream) - Append new entries to an existing conversation.
* [restartStream](docs/sdks/conversations/README.md#restartstream) - Restart a conversation starting from a given entry.

#### [beta.libraries](docs/sdks/libraries/README.md)

* [list](docs/sdks/libraries/README.md#list) - List all libraries you have access to.
* [create](docs/sdks/libraries/README.md#create) - Create a new Library.
* [get](docs/sdks/libraries/README.md#get) - Detailed information about a specific Library.
* [delete](docs/sdks/libraries/README.md#delete) - Delete a library and all of it's document.
* [update](docs/sdks/libraries/README.md#update) - Update a library.

#### [beta.libraries.accesses](docs/sdks/accesses/README.md)

* [list](docs/sdks/accesses/README.md#list) - List all of the access to this library.
* [updateOrCreate](docs/sdks/accesses/README.md#updateorcreate) - Create or update an access level.
* [delete](docs/sdks/accesses/README.md#delete) - Delete an access level.

#### [beta.libraries.documents](docs/sdks/documents/README.md)

* [list](docs/sdks/documents/README.md#list) - List document in a given library.
* [upload](docs/sdks/documents/README.md#upload) - Upload a new document.
* [get](docs/sdks/documents/README.md#get) - Retrieve the metadata of a specific document.
* [update](docs/sdks/documents/README.md#update) - Update the metadata of a specific document.
* [delete](docs/sdks/documents/README.md#delete) - Delete a document.
* [textContent](docs/sdks/documents/README.md#textcontent) - Retrieve the text content of a specific document.
* [status](docs/sdks/documents/README.md#status) - Retrieve the processing status of a specific document.
* [getSignedUrl](docs/sdks/documents/README.md#getsignedurl) - Retrieve the signed URL of a specific document.
* [extractedTextSignedUrl](docs/sdks/documents/README.md#extractedtextsignedurl) - Retrieve the signed URL of text extracted from a given document.
* [reprocess](docs/sdks/documents/README.md#reprocess) - Reprocess a document.

### [chat](docs/sdks/chat/README.md)

* [complete](docs/sdks/chat/README.md#complete) - Chat Completion
* [stream](docs/sdks/chat/README.md#stream) - Stream chat completion

### [classifiers](docs/sdks/classifiers/README.md)

* [moderate](docs/sdks/classifiers/README.md#moderate) - Moderations
* [moderateChat](docs/sdks/classifiers/README.md#moderatechat) - Chat Moderations
* [classify](docs/sdks/classifiers/README.md#classify) - Classifications
* [classifyChat](docs/sdks/classifiers/README.md#classifychat) - Chat Classifications

### [embeddings](docs/sdks/embeddings/README.md)

* [create](docs/sdks/embeddings/README.md#create) - Embeddings

### [files](docs/sdks/files/README.md)

* [upload](docs/sdks/files/README.md#upload) - Upload File
* [list](docs/sdks/files/README.md#list) - List Files
* [retrieve](docs/sdks/files/README.md#retrieve) - Retrieve File
* [delete](docs/sdks/files/README.md#delete) - Delete File
* [download](docs/sdks/files/README.md#download) - Download File
* [getSignedUrl](docs/sdks/files/README.md#getsignedurl) - Get Signed Url

### [fim](docs/sdks/fim/README.md)

* [complete](docs/sdks/fim/README.md#complete) - Fim Completion
* [stream](docs/sdks/fim/README.md#stream) - Stream fim completion

### [fineTuning](docs/sdks/finetuning/README.md)


#### [fineTuning.jobs](docs/sdks/jobs/README.md)

* [list](docs/sdks/jobs/README.md#list) - Get Fine Tuning Jobs
* [create](docs/sdks/jobs/README.md#create) - Create Fine Tuning Job
* [get](docs/sdks/jobs/README.md#get) - Get Fine Tuning Job
* [cancel](docs/sdks/jobs/README.md#cancel) - Cancel Fine Tuning Job
* [start](docs/sdks/jobs/README.md#start) - Start Fine Tuning Job


### [models](docs/sdks/models/README.md)

* [list](docs/sdks/models/README.md#list) - List Models
* [retrieve](docs/sdks/models/README.md#retrieve) - Retrieve Model
* [delete](docs/sdks/models/README.md#delete) - Delete Model
* [update](docs/sdks/models/README.md#update) - Update Fine Tuned Model
* [archive](docs/sdks/models/README.md#archive) - Archive Fine Tuned Model
* [unarchive](docs/sdks/models/README.md#unarchive) - Unarchive Fine Tuned Model

### [ocr](docs/sdks/ocr/README.md)

* [process](docs/sdks/ocr/README.md#process) - OCR

</details>
<!-- End Available Resources and Operations [operations] -->

<!-- Start Server-sent event streaming [eventstream] -->
## Server-sent event streaming

[Server-sent events][mdn-sse] are used to stream content from certain
operations. These operations will expose the stream as an async iterable that
can be consumed using a [`for await...of`][mdn-for-await-of] loop. The loop will
terminate when the server no longer has any events to send and closes the
underlying connection.

```typescript
import { Mistral } from "@mistralai/mistralai";

const mistral = new Mistral({
  apiKey: process.env["MISTRAL_API_KEY"] ?? "",
});

async function run() {
  const result = await mistral.beta.conversations.startStream({
    inputs: [
      {
        object: "entry",
        type: "agent.handoff",
        previousAgentId: "<id>",
        previousAgentName: "<value>",
        nextAgentId: "<id>",
        nextAgentName: "<value>",
      },
    ],
  });

  for await (const event of result) {
    // Handle the event
    console.log(event);
  }
}

run();

```

[mdn-sse]: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
[mdn-for-await-of]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
<!-- End Server-sent event streaming [eventstream] -->

<!-- Start File uploads [file-upload] -->
## File uploads

Certain SDK methods accept files as part of a multi-part request. It is possible and typically recommended to upload files as a stream rather than reading the entire contents into memory. This avoids excessive memory consumption and potentially crashing with out-of-memory errors when working with very large files. The following example demonstrates how to attach a file stream to a request.

> [!TIP]
>
> Depending on your JavaScript runtime, there are convenient utilities that return a handle to a file without reading the entire contents into memory:
>
> - **Node.js v20+:** Since v20, Node.js comes with a native `openAsBlob` function in [`node:fs`](https://nodejs.org/docs/latest-v20.x/api/fs.html#fsopenasblobpath-options).
> - **Bun:** The native [`Bun.file`](https://bun.sh/docs/api/file-io#reading-files-bun-file) function produces a file handle that can be used for streaming file uploads.
> - **Browsers:** All supported browsers return an instance to a [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) when reading the value from an `<input type="file">` element.
> - **Node.js v18:** A file stream can be created using the `fileFrom` helper from [`fetch-blob/from.js`](https://www.npmjs.com/package/fetch-blob).

```typescript
import { Mistral } from "@mistralai/mistralai";
import { openAsBlob } from "node:fs";

const mistral = new Mistral({
  apiKey: process.env["MISTRAL_API_KEY"] ?? "",
});

async function run() {
  const result = await mistral.beta.libraries.documents.upload({
    libraryId: "a02150d9-5ee0-4877-b62c-28b1fcdf3b76",
    requestBody: {
      file: await openAsBlob("example.file"),
    },
  });

  console.log(result);
}

run();

```
<!-- End File uploads [file-upload] -->

<!-- Start Retries [retries] -->
## Retries

Some of the endpoints in this SDK support retries.  If you use the SDK without any configuration, it will fall back to the default retry strategy provided by the API.  However, the default retry strategy can be overridden on a per-operation basis, or across the entire SDK.

To change the default retry strategy for a single API call, simply provide a retryConfig object to the call:
```typescript
import { Mistral } from "@mistralai/mistralai";

const mistral = new Mistral({
  apiKey: process.env["MISTRAL_API_KEY"] ?? "",
});

async function run() {
  const result = await mistral.models.list({
    retries: {
      strategy: "backoff",
      backoff: {
        initialInterval: 1,
        maxInterval: 50,
        exponent: 1.1,
        maxElapsedTime: 100,
      },
      retryConnectionErrors: false,
    },
  });

  console.log(result);
}

run();

```

If you'd like to override the default retry strategy for all operations that support retries, you can provide a retryConfig at SDK initialization:
```typescript
import { Mistral } from "@mistralai/mistralai";

const mistral = new Mistral({
  retryConfig: {
    strategy: "backoff",
    backoff: {
      initialInterval: 1,
      maxInterval: 50,
      exponent: 1.1,
      maxElapsedTime: 100,
    },
    retryConnectionErrors: false,
  },
  apiKey: process.env["MISTRAL_API_KEY"] ?? "",
});

async function run() {
  const result = await mistral.models.list();

  console.log(result);
}

run();

```
<!-- End Retries [retries] -->

<!-- Start Error Handling [errors] -->
## Error Handling

[`MistralError`](./src/models/errors/mistralerror.ts) is the base class for all HTTP error responses. It has the following properties:

| Property            | Type       | Description                                                                             |
| ------------------- | ---------- | --------------------------------------------------------------------------------------- |
| `error.message`     | `string`   | Error message                                                                           |
| `error.statusCode`  | `number`   | HTTP response status code eg `404`                                                      |
| `error.headers`     | `Headers`  | HTTP response headers                                                                   |
| `error.body`        | `string`   | HTTP body. Can be empty string if no body is returned.                                  |
| `error.rawResponse` | `Response` | Raw HTTP response                                                                       |
| `error.data$`       |            | Optional. Some errors may contain structured data. [See Error Classes](#error-classes). |

### Example
```typescript
import { Mistral } from "@mistralai/mistralai";
import * as errors from "@mistralai/mistralai/models/errors";

const mistral = new Mistral({
  apiKey: process.env["MISTRAL_API_KEY"] ?? "",
});

async function run() {
  try {
    const result = await mistral.models.list();

    console.log(result);
  } catch (error) {
    // The base class for HTTP error responses
    if (error instanceof errors.MistralError) {
      console.log(error.message);
      console.log(error.statusCode);
      console.log(error.body);
      console.log(error.headers);

      // Depending on the method different errors may be thrown
      if (error instanceof errors.HTTPValidationError) {
        console.log(error.data$.detail); // ValidationError[]
      }
    }
  }
}

run();

```

### Error Classes
**Primary error:**
* [`MistralError`](./src/models/errors/mistralerror.ts): The base class for HTTP error responses.

<details><summary>Less common errors (7)</summary>

<br />

**Network errors:**
* [`ConnectionError`](./src/models/errors/httpclienterrors.ts): HTTP client was unable to make a request to a server.
* [`RequestTimeoutError`](./src/models/errors/httpclienterrors.ts): HTTP request timed out due to an AbortSignal signal.
* [`RequestAbortedError`](./src/models/errors/httpclienterrors.ts): HTTP request was aborted by the client.
* [`InvalidRequestError`](./src/models/errors/httpclienterrors.ts): Any input used to create a request is invalid.
* [`UnexpectedClientError`](./src/models/errors/httpclienterrors.ts): Unrecognised or unexpected error.


**Inherit from [`MistralError`](./src/models/errors/mistralerror.ts)**:
* [`HTTPValidationError`](./src/models/errors/httpvalidationerror.ts): Validation Error. Status code `422`. Applicable to 47 of 68 methods.*
* [`ResponseValidationError`](./src/models/errors/responsevalidationerror.ts): Type mismatch between the data returned from the server and the structure expected by the SDK. See `error.rawValue` for the raw value and `error.pretty()` for a nicely formatted multi-line string.

</details>

\* Check [the method documentation](#available-resources-and-operations) to see if the error is applicable.
<!-- End Error Handling [errors] -->

<!-- Start Server Selection [server] -->
## Server Selection

### Select Server by Name

You can override the default server globally by passing a server name to the `server: keyof typeof ServerList` optional parameter when initializing the SDK client instance. The selected server will then be used as the default on the operations that use it. This table lists the names associated with the available servers:

| Name | Server                   | Description          |
| ---- | ------------------------ | -------------------- |
| `eu` | `https://api.mistral.ai` | EU Production server |

#### Example

```typescript
import { Mistral } from "@mistralai/mistralai";

const mistral = new Mistral({
  server: "eu",
  apiKey: process.env["MISTRAL_API_KEY"] ?? "",
});

async function run() {
  const result = await mistral.models.list();

  console.log(result);
}

run();

```

### Override Server URL Per-Client

The default server can also be overridden globally by passing a URL to the `serverURL: string` optional parameter when initializing the SDK client instance. For example:
```typescript
import { Mistral } from "@mistralai/mistralai";

const mistral = new Mistral({
  serverURL: "https://api.mistral.ai",
  apiKey: process.env["MISTRAL_API_KEY"] ?? "",
});

async function run() {
  const result = await mistral.models.list();

  console.log(result);
}

run();

```
<!-- End Server Selection [server] -->

<!-- Start Custom HTTP Client [http-client] -->
## Custom HTTP Client

The TypeScript SDK makes API calls using an `HTTPClient` that wraps the native
[Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). This
client is a thin wrapper around `fetch` and provides the ability to attach hooks
around the request lifecycle that can be used to modify the request or handle
errors and response.

The `HTTPClient` constructor takes an optional `fetcher` argument that can be
used to integrate a third-party HTTP client or when writing tests to mock out
the HTTP client and feed in fixtures.

The following example shows how to use the `"beforeRequest"` hook to to add a
custom header and a timeout to requests and how to use the `"requestError"` hook
to log errors:

```typescript
import { Mistral } from "@mistralai/mistralai";
import { HTTPClient } from "@mistralai/mistralai/lib/http";

const httpClient = new HTTPClient({
  // fetcher takes a function that has the same signature as native `fetch`.
  fetcher: (request) => {
    return fetch(request);
  }
});

httpClient.addHook("beforeRequest", (request) => {
  const nextRequest = new Request(request, {
    signal: request.signal || AbortSignal.timeout(5000)
  });

  nextRequest.headers.set("x-custom-header", "custom value");

  return nextRequest;
});

httpClient.addHook("requestError", (error, request) => {
  console.group("Request Error");
  console.log("Reason:", `${error}`);
  console.log("Endpoint:", `${request.method} ${request.url}`);
  console.groupEnd();
});

const sdk = new Mistral({ httpClient });
```
<!-- End Custom HTTP Client [http-client] -->

<!-- Start Authentication [security] -->
## Authentication

### Per-Client Security Schemes

This SDK supports the following security scheme globally:

| Name     | Type | Scheme      | Environment Variable |
| -------- | ---- | ----------- | -------------------- |
| `apiKey` | http | HTTP Bearer | `MISTRAL_API_KEY`    |

To authenticate with the API the `apiKey` parameter must be set when initializing the SDK client instance. For example:
```typescript
import { Mistral } from "@mistralai/mistralai";

const mistral = new Mistral({
  apiKey: process.env["MISTRAL_API_KEY"] ?? "",
});

async function run() {
  const result = await mistral.models.list();

  console.log(result);
}

run();

```
<!-- End Authentication [security] -->

## Providers Support

We also provide provider specific SDK for:

- [GCP](packages/mistralai-gcp/README.md)
- [Azure](packages/mistralai-azure/README.md)

<!-- Start Standalone functions [standalone-funcs] -->
## Standalone functions

All the methods listed above are available as standalone functions. These
functions are ideal for use in applications running in the browser, serverless
runtimes or other environments where application bundle size is a primary
concern. When using a bundler to build your application, all unused
functionality will be either excluded from the final bundle or tree-shaken away.

To read more about standalone functions, check [FUNCTIONS.md](./FUNCTIONS.md).

<details>

<summary>Available standalone functions</summary>

- [`agentsComplete`](docs/sdks/agents/README.md#complete) - Agents Completion
- [`agentsStream`](docs/sdks/agents/README.md#stream) - Stream Agents completion
- [`audioTranscriptionsComplete`](docs/sdks/transcriptions/README.md#complete) - Create Transcription
- [`audioTranscriptionsStream`](docs/sdks/transcriptions/README.md#stream) - Create streaming transcription (SSE)
- [`batchJobsCancel`](docs/sdks/mistraljobs/README.md#cancel) - Cancel Batch Job
- [`batchJobsCreate`](docs/sdks/mistraljobs/README.md#create) - Create Batch Job
- [`batchJobsGet`](docs/sdks/mistraljobs/README.md#get) - Get Batch Job
- [`batchJobsList`](docs/sdks/mistraljobs/README.md#list) - Get Batch Jobs
- [`betaAgentsCreate`](docs/sdks/mistralagents/README.md#create) - Create a agent that can be used within a conversation.
- [`betaAgentsGet`](docs/sdks/mistralagents/README.md#get) - Retrieve an agent entity.
- [`betaAgentsList`](docs/sdks/mistralagents/README.md#list) - List agent entities.
- [`betaAgentsUpdate`](docs/sdks/mistralagents/README.md#update) - Update an agent entity.
- [`betaAgentsUpdateVersion`](docs/sdks/mistralagents/README.md#updateversion) - Update an agent version.
- [`betaConversationsAppend`](docs/sdks/conversations/README.md#append) - Append new entries to an existing conversation.
- [`betaConversationsAppendStream`](docs/sdks/conversations/README.md#appendstream) - Append new entries to an existing conversation.
- [`betaConversationsGet`](docs/sdks/conversations/README.md#get) - Retrieve a conversation information.
- [`betaConversationsGetHistory`](docs/sdks/conversations/README.md#gethistory) - Retrieve all entries in a conversation.
- [`betaConversationsGetMessages`](docs/sdks/conversations/README.md#getmessages) - Retrieve all messages in a conversation.
- [`betaConversationsList`](docs/sdks/conversations/README.md#list) - List all created conversations.
- [`betaConversationsRestart`](docs/sdks/conversations/README.md#restart) - Restart a conversation starting from a given entry.
- [`betaConversationsRestartStream`](docs/sdks/conversations/README.md#restartstream) - Restart a conversation starting from a given entry.
- [`betaConversationsStart`](docs/sdks/conversations/README.md#start) - Create a conversation and append entries to it.
- [`betaConversationsStartStream`](docs/sdks/conversations/README.md#startstream) - Create a conversation and append entries to it.
- [`betaLibrariesAccessesDelete`](docs/sdks/accesses/README.md#delete) - Delete an access level.
- [`betaLibrariesAccessesList`](docs/sdks/accesses/README.md#list) - List all of the access to this library.
- [`betaLibrariesAccessesUpdateOrCreate`](docs/sdks/accesses/README.md#updateorcreate) - Create or update an access level.
- [`betaLibrariesCreate`](docs/sdks/libraries/README.md#create) - Create a new Library.
- [`betaLibrariesDelete`](docs/sdks/libraries/README.md#delete) - Delete a library and all of it's document.
- [`betaLibrariesDocumentsDelete`](docs/sdks/documents/README.md#delete) - Delete a document.
- [`betaLibrariesDocumentsExtractedTextSignedUrl`](docs/sdks/documents/README.md#extractedtextsignedurl) - Retrieve the signed URL of text extracted from a given document.
- [`betaLibrariesDocumentsGet`](docs/sdks/documents/README.md#get) - Retrieve the metadata of a specific document.
- [`betaLibrariesDocumentsGetSignedUrl`](docs/sdks/documents/README.md#getsignedurl) - Retrieve the signed URL of a specific document.
- [`betaLibrariesDocumentsList`](docs/sdks/documents/README.md#list) - List document in a given library.
- [`betaLibrariesDocumentsReprocess`](docs/sdks/documents/README.md#reprocess) - Reprocess a document.
- [`betaLibrariesDocumentsStatus`](docs/sdks/documents/README.md#status) - Retrieve the processing status of a specific document.
- [`betaLibrariesDocumentsTextContent`](docs/sdks/documents/README.md#textcontent) - Retrieve the text content of a specific document.
- [`betaLibrariesDocumentsUpdate`](docs/sdks/documents/README.md#update) - Update the metadata of a specific document.
- [`betaLibrariesDocumentsUpload`](docs/sdks/documents/README.md#upload) - Upload a new document.
- [`betaLibrariesGet`](docs/sdks/libraries/README.md#get) - Detailed information about a specific Library.
- [`betaLibrariesList`](docs/sdks/libraries/README.md#list) - List all libraries you have access to.
- [`betaLibrariesUpdate`](docs/sdks/libraries/README.md#update) - Update a library.
- [`chatComplete`](docs/sdks/chat/README.md#complete) - Chat Completion
- [`chatStream`](docs/sdks/chat/README.md#stream) - Stream chat completion
- [`classifiersClassify`](docs/sdks/classifiers/README.md#classify) - Classifications
- [`classifiersClassifyChat`](docs/sdks/classifiers/README.md#classifychat) - Chat Classifications
- [`classifiersModerate`](docs/sdks/classifiers/README.md#moderate) - Moderations
- [`classifiersModerateChat`](docs/sdks/classifiers/README.md#moderatechat) - Chat Moderations
- [`embeddingsCreate`](docs/sdks/embeddings/README.md#create) - Embeddings
- [`filesDelete`](docs/sdks/files/README.md#delete) - Delete File
- [`filesDownload`](docs/sdks/files/README.md#download) - Download File
- [`filesGetSignedUrl`](docs/sdks/files/README.md#getsignedurl) - Get Signed Url
- [`filesList`](docs/sdks/files/README.md#list) - List Files
- [`filesRetrieve`](docs/sdks/files/README.md#retrieve) - Retrieve File
- [`filesUpload`](docs/sdks/files/README.md#upload) - Upload File
- [`fimComplete`](docs/sdks/fim/README.md#complete) - Fim Completion
- [`fimStream`](docs/sdks/fim/README.md#stream) - Stream fim completion
- [`fineTuningJobsCancel`](docs/sdks/jobs/README.md#cancel) - Cancel Fine Tuning Job
- [`fineTuningJobsCreate`](docs/sdks/jobs/README.md#create) - Create Fine Tuning Job
- [`fineTuningJobsGet`](docs/sdks/jobs/README.md#get) - Get Fine Tuning Job
- [`fineTuningJobsList`](docs/sdks/jobs/README.md#list) - Get Fine Tuning Jobs
- [`fineTuningJobsStart`](docs/sdks/jobs/README.md#start) - Start Fine Tuning Job
- [`modelsArchive`](docs/sdks/models/README.md#archive) - Archive Fine Tuned Model
- [`modelsDelete`](docs/sdks/models/README.md#delete) - Delete Model
- [`modelsList`](docs/sdks/models/README.md#list) - List Models
- [`modelsRetrieve`](docs/sdks/models/README.md#retrieve) - Retrieve Model
- [`modelsUnarchive`](docs/sdks/models/README.md#unarchive) - Unarchive Fine Tuned Model
- [`modelsUpdate`](docs/sdks/models/README.md#update) - Update Fine Tuned Model
- [`ocrProcess`](docs/sdks/ocr/README.md#process) - OCR

</details>
<!-- End Standalone functions [standalone-funcs] -->

<!-- Start Debugging [debug] -->
## Debugging

You can setup your SDK to emit debug logs for SDK requests and responses.

You can pass a logger that matches `console`'s interface as an SDK option.

> [!WARNING]
> Beware that debug logging will reveal secrets, like API tokens in headers, in log messages printed to a console or files. It's recommended to use this feature only during local development and not in production.

```typescript
import { Mistral } from "@mistralai/mistralai";

const sdk = new Mistral({ debugLogger: console });
```

You can also enable a default debug logger by setting an environment variable `MISTRAL_DEBUG` to true.
<!-- End Debugging [debug] -->

<!-- Placeholder for Future Speakeasy SDK Sections -->

# Development

## Contributions

While we value open-source contributions to this SDK, this library is generated programmatically. Any manual changes added to internal files will be overwritten on the next generation. 
We look forward to hearing your feedback. Feel free to open a PR or an issue with a proof of concept and we'll do our best to include it in a future release. 

