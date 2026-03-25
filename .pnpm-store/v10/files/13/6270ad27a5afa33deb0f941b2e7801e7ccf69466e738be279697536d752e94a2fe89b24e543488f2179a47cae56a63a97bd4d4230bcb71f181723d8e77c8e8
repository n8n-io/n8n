# LangGraph JS/TS SDK

This repository contains the JS/TS SDK for interacting with the LangGraph REST API.

## Quick Start

To get started with the JS/TS SDK, [install the package](https://www.npmjs.com/package/@langchain/langgraph-sdk)

```bash
pnpm add @langchain/langgraph-sdk
```

You will need a running LangGraph API server. If you're running a server locally using `langgraph-cli`, SDK will automatically point at `http://localhost:8123`, otherwise
you would need to specify the server URL when creating a client.

```js
import { Client } from "@langchain/langgraph-sdk";

const client = new Client();

// List all assistants
const assistants = await client.assistants.search({
  metadata: null,
  offset: 0,
  limit: 10,
});

// We auto-create an assistant for each graph you register in config.
const agent = assistants[0];

// Start a new thread
const thread = await client.threads.create();

// Start a streaming run
const messages = [{ role: "human", content: "what's the weather in la" }];

const streamResponse = client.runs.stream(
  thread["thread_id"],
  agent["assistant_id"],
  {
    input: { messages },
  }
);

for await (const chunk of streamResponse) {
  console.log(chunk);
}
```

## Documentation

To generate documentation, run the following commands:

1. Generate docs.

        pnpm typedoc

1. Consolidate doc files into one markdown file.

        npx concat-md --decrease-title-levels --ignore=js_ts_sdk_ref.md --start-title-level-at 2 docs > docs/js_ts_sdk_ref.md

1. Copy `js_ts_sdk_ref.md` to MkDocs directory.

        cp docs/js_ts_sdk_ref.md ../../docs/docs/cloud/reference/sdk/js_ts_sdk_ref.md

## Reference Documentation

The reference documentation is available [here](https://reference.langchain.com/javascript/modules/_langchain_langgraph-sdk.html).

More usage examples can be found [here](https://docs.langchain.com/langsmith/sdk#js).


## Change Log

The change log for new versions can be found [here](https://github.com/langchain-ai/langgraphjs/blob/main/libs/sdk/CHANGELOG.md).