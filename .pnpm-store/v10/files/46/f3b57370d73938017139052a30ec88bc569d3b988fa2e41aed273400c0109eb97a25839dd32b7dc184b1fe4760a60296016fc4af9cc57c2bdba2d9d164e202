# Mistral on GCP Typescript Client



<!-- Start SDK Installation [installation] -->
## SDK Installation

### NPM

```bash
npm add @mistralai/mistralai-gcp
```

### PNPM

```bash
pnpm add @mistralai/mistralai-gcp
```

### Bun

```bash
bun add @mistralai/mistralai-gcp
```

### Yarn

```bash
yarn add @mistralai/mistralai-gcp zod

# Note that Yarn does not install peer dependencies automatically. You will need
# to install zod as shown above.
```
<!-- End SDK Installation [installation] -->

<!-- Start Requirements [requirements] -->
## Requirements

For supported JavaScript runtimes, please consult [RUNTIMES.md](RUNTIMES.md).
<!-- End Requirements [requirements] -->

<!-- Start SDK Example Usage [usage] -->
## SDK Example Usage

### Create Chat Completions

This example shows how to create chat completions.

```typescript
import { MistralGoogleCloud } from "@mistralai/mistralai-gcp";


const sdk = new MistralGoogleCloud({
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
    console.log(result);
}

run();

```
<!-- End SDK Example Usage [usage] -->

<!-- Start Available Resources and Operations [operations] -->
## Available Resources and Operations

### [chat](docs/sdks/chat/README.md)

* [stream](docs/sdks/chat/README.md#stream) - Stream chat completion
* [create](docs/sdks/chat/README.md#create) - Chat Completion

### [fim](docs/sdks/fim/README.md)

* [create](docs/sdks/fim/README.md#create) - Fim Completion
<!-- End Available Resources and Operations [operations] -->

<!-- Start Server-sent event streaming [eventstream] -->
## Server-sent event streaming

[Server-sent events][mdn-sse] are used to stream content from certain
operations. These operations will expose the stream as an async iterable that
can be consumed using a [`for await...of`][mdn-for-await-of] loop. The loop will
terminate when the server no longer has any events to send and closes the
underlying connection.

```typescript
import { MistralGoogleCloud } from "@mistralai/mistralai-gcp";

const sdk = new MistralGoogleCloud({
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

[mdn-sse]: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
[mdn-for-await-of]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
<!-- End Server-sent event streaming [eventstream] -->

<!-- Start Retries [retries] -->
## Retries

Some of the endpoints in this SDK support retries.  If you use the SDK without any configuration, it will fall back to the default retry strategy provided by the API.  However, the default retry strategy can be overridden on a per-operation basis, or across the entire SDK.

To change the default retry strategy for a single API call, simply provide a retryConfig object to the call:
```typescript
import { MistralGoogleCloud } from "@mistralai/mistralai-gcp";

const sdk = new MistralGoogleCloud({
  region: "europe-west4",
  projectId: process.env["GOOGLE_PROJECT_ID"],
});

async function run() {
    const result = await MistralGoogleCloud.chat.stream(
        {
            model: "mistral-small-latest",
            messages: [
                {
                    content: "Who is the best French painter? Answer in one short sentence.",
                    role: "user",
                },
            ],
        },
        {
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
        }
    );

    for await (const event of result) {
        // Handle the event
    }
}

run();

```

If you'd like to override the default retry strategy for all operations that support retries, you can provide a retryConfig at SDK initialization:
```typescript
import { MistralGoogleCloud } from "@mistralai/mistralai-gcp";

const MistralGoogleCloud = new MistralGoogleCloud({
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
<!-- End Retries [retries] -->

<!-- Start Error Handling [errors] -->
## Error Handling

All SDK methods return a response object or throw an error. If Error objects are specified in your OpenAPI Spec, the SDK will throw the appropriate Error type.

| Error Object               | Status Code | Content Type     |
| -------------------------- | ----------- | ---------------- |
| errors.HTTPValidationError | 422         | application/json |
| errors.SDKError            | 4xx-5xx     | */*              |

Validation errors can also occur when either method arguments or data returned from the server do not match the expected format. The `SDKValidationError` that is thrown as a result will capture the raw value that failed validation in an attribute called `rawValue`. Additionally, a `pretty()` method is available on this error that can be used to log a nicely formatted string since validation errors can list many issues and the plain error string may be difficult read when debugging. 


```typescript
import { MistralGoogleCloud } from "@mistralai/mistralai-gcp";
import { SDKValidationError } from "@mistralai/mistralai-gcp/models/errors";

const MistralGoogleCloud = new MistralGoogleCloud({
    region: "europe-west4",
    projectId: process.env["GOOGLE_PROJECT_ID"],
});

async function run() {
    let result;
    try {
        result = await MistralGoogleCloud.chat.complete({
            model: "mistral-small-latest",
            messages: [
                {
                    content: "Who is the best French painter? Answer in one short sentence.",
                    role: "user",
                },
            ],
        });
    } catch (err) {
        switch (true) {
            case err instanceof SDKValidationError: {
                // Validation errors can be pretty-printed
                console.error(err.pretty());
                // Raw value may also be inspected
                console.error(err.rawValue);
                return;
            }
            case err instanceof errors.HTTPValidationError: {
                console.error(err); // handle exception
                return;
            }
            default: {
                throw err;
            }
        }
    }

    // Handle the result
    console.log(result);
}

run();

```
<!-- End Error Handling [errors] -->

<!-- Start Server Selection [server] -->
## Server Selection

### Select Server by Name

You can override the default server globally by passing a server name to the `server` optional parameter when initializing the SDK client instance. The selected server will then be used as the default on the operations that use it. This table lists the names associated with the available servers:

| Name   | Server                   | Variables |
| ------ | ------------------------ | --------- |
| `prod` | `https://api.mistral.ai` | None      |

```typescript
import { MistralGoogleCloud } from "@mistralai/mistralai-gcp";

const MistralGoogleCloud = new MistralGoogleCloud({
    server: "prod",
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


### Override Server URL Per-Client

The default server can also be overridden globally by passing a URL to the `serverURL` optional parameter when initializing the SDK client instance. For example:

```typescript
import { MistralGoogleCloud } from "@mistralai/mistralai-gcp";

const MistralGoogleCloud = new MistralGoogleCloud({
    serverURL: "https://api.mistral.ai",
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
import { MistralGoogleCloud } from "@mistralai/mistralai-gcp";
import { HTTPClient } from "@mistralai/mistralai-gcp/lib/http";

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

const sdk = new MistralGoogleCloud({ httpClient });
```
<!-- End Custom HTTP Client [http-client] -->

<!-- Start Authentication [security] -->
## Authentication

### Per-Client Security Schemes

This SDK supports the following security scheme globally:

| Name     | Type | Scheme      |
| -------- | ---- | ----------- |
| `apiKey` | http | HTTP Bearer |

To authenticate with the API the `apiKey` parameter must be set when initializing the SDK client instance. For example:
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
<!-- End Authentication [security] -->

<!-- Placeholder for Future Speakeasy SDK Sections -->

# Development


## Contributions

While we value open-source contributions to this SDK, this library is generated programmatically. Any manual changes added to internal files will be overwritten on the next generation. 
We look forward to hearing your feedback. Feel free to open a PR or an issue with a proof of concept and we'll do our best to include it in a future release. 
