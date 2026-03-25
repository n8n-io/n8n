# Fim
(*fim*)

## Overview

Fill-in-the-middle API.

### Available Operations

* [create](#create) - Fim Completion

## create

FIM completion.

### Example Usage

```typescript
import { MistralGoogleCloud } from "@mistralai/mistralai-gcp";

const MistralGoogleCloud = new MistralGoogleCloud({
  region: "europe-west4",
  projectId: process.env["GOOGLE_PROJECT_ID"],
});

async function run() {
  const result = await MistralGoogleCloud.fim.complete({
    model: "codestral-2405",
    prompt: "def",
    suffix: "return a+b",
  });

  // Handle the result
  console.log(result)
}

run();
```

### Parameters

| Parameter              | Type                                                                                    | Required           | Description                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`              | [components.FIMCompletionRequest](../../models/components/fimcompletionrequest.md)      | :heavy_check_mark: | The request object to use for the request.                                                                                                                                     |
| `options`              | RequestOptions                                                                          | :heavy_minus_sign: | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions` | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options) | :heavy_minus_sign: | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`      | [RetryConfig](../../lib/utils/retryconfig.md)                                           | :heavy_minus_sign: | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |


### Response

**Promise\<[components.FIMCompletionResponse](../../models/components/fimcompletionresponse.md)\>**
### Errors

| Error Object               | Status Code | Content Type     |
| -------------------------- | ----------- | ---------------- |
| errors.HTTPValidationError | 422         | application/json |
| errors.SDKError            | 4xx-5xx     | */*              |
