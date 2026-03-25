# Chat
(*chat*)

## Overview

Chat Completion API.

### Available Operations

* [stream](#stream) - Stream chat completion
* [create](#create) - Chat Completion

## stream

Mistral AI provides the ability to stream responses back to a client in order to allow partial results for certain requests. Tokens will be sent as data-only server-sent events as they become available, with the stream terminated by a data: [DONE] message. Otherwise, the server will hold the request open until the timeout or until completion, with the response containing the full result as JSON.

### Example Usage

```typescript
import { MistralGoogleCloud } from "@mistralai/mistralai-gcp";

const MistralGoogleCloud = new MistralGoogleCloud({
  region: "europe-west4",
  projectId: process.env["GOOGLE_PROJECT_ID"],
});

async function run() {
  const result = await MistralGoogleCloud.chat.stream({
    model: "mistral-small-latest",
    messages: [
        {
        content: "Who is the best French painter? Answer in one short sentence.",
          role: "user",
        },
    ],
  });

  for await (const event of result) {
    // Handle the event
  }
}

run();
```

### Parameters

| Parameter              | Type                                                                                             | Required           | Description                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`              | [components.ChatCompletionStreamRequest](../../models/components/chatcompletionstreamrequest.md) | :heavy_check_mark: | The request object to use for the request.                                                                                                                                     |
| `options`              | RequestOptions                                                                                   | :heavy_minus_sign: | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions` | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)          | :heavy_minus_sign: | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`      | [RetryConfig](../../lib/utils/retryconfig.md)                                                    | :heavy_minus_sign: | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |


### Response

**Promise\<[EventStream<components.ChatCompletionEvent>](../../models/.md)\>**
### Errors

| Error Object    | Status Code | Content Type |
| --------------- | ----------- | ------------ |
| errors.SDKError | 4xx-5xx     | */*          |

## create

Chat Completion

### Example Usage

```typescript
import { MistralGoogleCloud } from "@mistralai/mistralai-gcp";

const MistralGoogleCloud = new MistralGoogleCloud({
  region: "europe-west4",
  projectId: process.env["GOOGLE_PROJECT_ID"],
});

async function run() {
  const result = await MistralGoogleCloud.chat.complete({
    model: "mistral-small-latest",
    messages: [
        {
        content: "Who is the best French painter? Answer in one short sentence.",
          role: "user",
        },
    ],
  });

  // Handle the result
  console.log(result)
}

run();
```

### Parameters

| Parameter              | Type                                                                                    | Required           | Description                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`              | [components.ChatCompletionRequest](../../models/components/chatcompletionrequest.md)    | :heavy_check_mark: | The request object to use for the request.                                                                                                                                     |
| `options`              | RequestOptions                                                                          | :heavy_minus_sign: | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions` | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options) | :heavy_minus_sign: | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`      | [RetryConfig](../../lib/utils/retryconfig.md)                                           | :heavy_minus_sign: | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |


### Response

**Promise\<[components.ChatCompletionResponse](../../models/components/chatcompletionresponse.md)\>**
### Errors

| Error Object               | Status Code | Content Type     |
| -------------------------- | ----------- | ---------------- |
| errors.HTTPValidationError | 422         | application/json |
| errors.SDKError            | 4xx-5xx     | */*              |
