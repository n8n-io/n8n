# LangSmith Client SDK

![NPM Version](https://img.shields.io/npm/v/langsmith?logo=npm)
[![JS Downloads](https://img.shields.io/npm/dm/langsmith)](https://www.npmjs.com/package/langsmith)

This package contains the TypeScript client for interacting with the [LangSmith platform](https://smith.langchain.com/).

To install:

```bash
yarn add langsmith
```

LangSmith helps you and your team develop and evaluate language models and intelligent agents. It is compatible with any LLM Application and provides seamless integration with [LangChain](https://github.com/hwchase17/langchainjs), a widely recognized open-source framework that simplifies the process for developers to create powerful language model applications.

> **Note**: You can enjoy the benefits of LangSmith without using the LangChain open-source packages! To get started with your own proprietary framework, set up your account and then skip to [Logging Traces Outside LangChain](#logging-traces-outside-langchain).

> **Cookbook:** For tutorials on how to get more value out of LangSmith, check out the [Langsmith Cookbook](https://github.com/langchain-ai/langsmith-cookbook/tree/main) repo.

A typical workflow looks like:

1. Set up an account with LangSmith.
2. Log traces.
3. Debug, Create Datasets, and Evaluate Runs.

We'll walk through these steps in more detail below.

## 1. Connect to LangSmith

Sign up for [LangSmith](https://smith.langchain.com/) using your GitHub, Discord accounts, or an email address and password. If you sign up with an email, make sure to verify your email address before logging in.

Then, create a unique API key on the [Settings Page](https://smith.langchain.com/settings).

> [!NOTE]
> Save the API Key in a secure location. It will not be shown again.

## 2. Log Traces

You can log traces natively in your LangChain application or using a LangSmith RunTree.

### Logging Traces with LangChain

LangSmith seamlessly integrates with the JavaScript LangChain library to record traces from your LLM applications.

```bash
yarn add langchain
```

1. **Copy the environment variables from the Settings Page and add them to your application.**

Tracing can be activated by setting the following environment variables or by manually specifying the LangChainTracer.

```typescript
process.env.LANGSMITH_TRACING = "true";
process.env.LANGSMITH_ENDPOINT = "https://api.smith.langchain.com";
// process.env.LANGSMITH_ENDPOINT = "https://eu.api.smith.langchain.com"; // If signed up in the EU region
process.env.LANGSMITH_API_KEY = "<YOUR-LANGSMITH-API-KEY>";
// process.env.LANGSMITH_PROJECT = "My Project Name"; // Optional: "default" is used if not set
// process.env.LANGSMITH_WORKSPACE_ID = "<YOUR-WORKSPACE-ID>"; // Required for org-scoped API keys
```

> **Tip:** Projects are groups of traces. All runs are logged to a project. If not specified, the project is set to `default`.

2. **Run an Agent, Chain, or Language Model in LangChain**

If the environment variables are correctly set, your application will automatically connect to the LangSmith platform.

```typescript
import { ChatOpenAI } from "langchain/chat_models/openai";

const chat = new ChatOpenAI({ temperature: 0 });
const response = await chat.predict(
  "Translate this sentence from English to French. I love programming."
);
console.log(response);
```

### Logging Traces Outside LangChain

You can still use the LangSmith development platform without depending on any
LangChain code. You can connect either by setting the appropriate environment variables,
or by directly specifying the connection information in the RunTree.

1. **Copy the environment variables from the Settings Page and add them to your application.**

```shell
export LANGSMITH_TRACING="true";
export LANGSMITH_API_KEY=<YOUR-LANGSMITH-API-KEY>
# export LANGSMITH_PROJECT="My Project Name" #  Optional: "default" is used if not set
# export LANGSMITH_ENDPOINT=https://api.smith.langchain.com # or your own server
```

## Integrations

Langsmith's `traceable` wrapper function makes it easy to trace any function or LLM call in your own favorite framework. Below are some examples.

### OpenAI SDK

<!-- markdown-link-check-disable -->

The easiest way to trace calls from the [OpenAI SDK](https://platform.openai.com/docs/api-reference) with LangSmith
is using the `wrapOpenAI` wrapper function available in LangSmith 0.1.3 and up.

In order to use, you first need to set your LangSmith API key:

```shell
export LANGSMITH_TRACING="true";
export LANGSMITH_API_KEY=<your-api-key>
```

Next, you will need to install the LangSmith SDK and the OpenAI SDK:

```shell
npm install langsmith openai
```

After that, initialize your OpenAI client and wrap the client with `wrapOpenAI` method to enable tracing for the completions and chat completions methods:

```ts
import { OpenAI } from "openai";
import { wrapOpenAI } from "langsmith/wrappers";

const openai = wrapOpenAI(new OpenAI());

await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [{ content: "Hi there!", role: "user" }],
});
```

Alternatively, you can use the `traceable` function to wrap the client methods you want to use:

```ts
import { traceable } from "langsmith/traceable";

const openai = new OpenAI();

const createCompletion = traceable(
  openai.chat.completions.create.bind(openai.chat.completions),
  { name: "OpenAI Chat Completion", run_type: "llm" }
);

await createCompletion({
  model: "gpt-3.5-turbo",
  messages: [{ content: "Hi there!", role: "user" }],
});
```

Note the use of `.bind` to preserve the function's context. The `run_type` field in the
extra config object marks the function as an LLM call, and enables token usage tracking
for OpenAI.

Oftentimes, you use the OpenAI client inside of other functions or as part of a longer
sequence. You can automatically get nested traces by using this wrapped method
within other functions wrapped with `traceable`.

```ts
const nestedTrace = traceable(async (text: string) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ content: text, role: "user" }],
  });
  return completion;
});

await nestedTrace("Why is the sky blue?");
```

```
{
  "id": "chatcmpl-8sPToJQLLVepJvyeTfzZMOMVIKjMo",
  "object": "chat.completion",
  "created": 1707978348,
  "model": "gpt-3.5-turbo-0613",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The sky appears blue because of a phenomenon known as Rayleigh scattering. The Earth's atmosphere is composed of tiny molecules, such as nitrogen and oxygen, which are much smaller than the wavelength of visible light. When sunlight interacts with these molecules, it gets scattered in all directions. However, shorter wavelengths of light (blue and violet) are scattered more compared to longer wavelengths (red, orange, and yellow). \n\nAs a result, when sunlight passes through the Earth's atmosphere, the blue and violet wavelengths are scattered in all directions, making the sky appear blue. This scattering of shorter wavelengths is also responsible for the vibrant colors observed during sunrise and sunset, when the sunlight has to pass through a thicker portion of the atmosphere, causing the longer wavelengths to dominate the scattered light."
      },
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 13,
    "completion_tokens": 154,
    "total_tokens": 167
  },
  "system_fingerprint": null
}
```

:::tip
[Click here](https://smith.langchain.com/public/4af46ef6-b065-46dc-9cf0-70f1274edb01/r) to see an example LangSmith trace of the above.
:::

## Next.js

You can use the `traceable` wrapper function in Next.js apps to wrap arbitrary functions much like in the example above.

One neat trick you can use for Next.js and other similar server frameworks is to wrap the entire exported handler for a route
to group traces for the any sub-runs. Here's an example:

```ts
import { NextRequest, NextResponse } from "next/server";

import { OpenAI } from "openai";
import { traceable } from "langsmith/traceable";
import { wrapOpenAI } from "langsmith/wrappers";

export const runtime = "edge";

const handler = traceable(
  async function () {
    const openai = wrapOpenAI(new OpenAI());

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ content: "Why is the sky blue?", role: "user" }],
    });

    const response1 = completion.choices[0].message.content;

    const completion2 = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { content: "Why is the sky blue?", role: "user" },
        { content: response1, role: "assistant" },
        { content: "Cool thank you!", role: "user" },
      ],
    });

    const response2 = completion2.choices[0].message.content;

    return {
      text: response2,
    };
  },
  {
    name: "Simple Next.js handler",
  }
);

export async function POST(req: NextRequest) {
  const result = await handler();
  return NextResponse.json(result);
}
```

The two OpenAI calls within the handler will be traced with appropriate inputs, outputs,
and token usage information.

:::tip
[Click here](https://smith.langchain.com/public/faaf26ad-8c59-4622-bcfe-b7d896733ca6/r) to see an example LangSmith trace of the above.
:::

## Vercel AI SDK

The [Vercel AI SDK](https://sdk.vercel.ai/docs) contains integrations with a variety of model providers.
Here's an example of how you can trace outputs in a Next.js handler:

```ts
import { traceable } from "langsmith/traceable";
import { OpenAIStream, StreamingTextResponse } from "ai";

// Note: There are no types for the Mistral API client yet.
import MistralClient from "@mistralai/mistralai";

const client = new MistralClient(process.env.MISTRAL_API_KEY || "");

export async function POST(req: Request) {
  // Extract the `messages` from the body of the request
  const { messages } = await req.json();

  const mistralChatStream = traceable(client.chatStream.bind(client), {
    name: "Mistral Stream",
    run_type: "llm",
  });

  const response = await mistralChatStream({
    model: "mistral-tiny",
    maxTokens: 1000,
    messages,
  });

  // Convert the response into a friendly text-stream. The Mistral client responses are
  // compatible with the Vercel AI SDK OpenAIStream adapter.
  const stream = OpenAIStream(response as any);

  // Respond with the stream
  return new StreamingTextResponse(stream);
}
```

See the [AI SDK docs](https://sdk.vercel.ai/docs) for more examples.

## Arbitrary SDKs

You can use the generic `wrapSDK` method to add tracing for arbitrary SDKs.

Do note that this will trace ALL methods in the SDK, not just chat completion endpoints.
If the SDK you are wrapping has other methods, we recommend using it for only LLM calls.

Here's an example using the Anthropic SDK:

```ts
import { wrapSDK } from "langsmith/wrappers";
import { Anthropic } from "@anthropic-ai/sdk";

const originalSDK = new Anthropic();
const sdkWithTracing = wrapSDK(originalSDK);

const response = await sdkWithTracing.messages.create({
  messages: [
    {
      role: "user",
      content: `What is 1 + 1? Respond only with "2" and nothing else.`,
    },
  ],
  model: "claude-3-sonnet-20240229",
  max_tokens: 1024,
});
```

:::tip
[Click here](https://smith.langchain.com/public/0e7248af-bbed-47cf-be9f-5967fea1dec1/r) to see an example LangSmith trace of the above.
:::

#### Alternatives: **Log traces using a RunTree.**

A RunTree tracks your application. Each RunTree object is required to have a name and run_type. These and other important attributes are as follows:

- `name`: `string` - used to identify the component's purpose
- `run_type`: `string` - Currently one of "llm", "chain" or "tool"; more options will be added in the future
- `inputs`: `Record<string, any>` - the inputs to the component
- `outputs`: `Optional<Record<string, any>>` - the (optional) returned values from the component
- `error`: `Optional<string>` - Any error messages that may have arisen during the call

```typescript
import { RunTree, RunTreeConfig } from "langsmith";

const parentRunConfig: RunTreeConfig = {
  name: "My Chat Bot",
  run_type: "chain",
  inputs: {
    text: "Summarize this morning's meetings.",
  },
  serialized: {}, // Serialized representation of this chain
  // project_name: "Defaults to the LANGSMITH_PROJECT env var"
  // apiUrl: "Defaults to the LANGSMITH_ENDPOINT env var"
  // apiKey: "Defaults to the LANGSMITH_API_KEY env var"
};

const parentRun = new RunTree(parentRunConfig);

await parentRun.postRun();

const childLlmRun = await parentRun.createChild({
  name: "My Proprietary LLM",
  run_type: "llm",
  inputs: {
    prompts: [
      "You are an AI Assistant. The time is XYZ." +
        " Summarize this morning's meetings.",
    ],
  },
});

await childLlmRun.postRun();

await childLlmRun.end({
  outputs: {
    generations: [
      "I should use the transcript_loader tool" +
        " to fetch meeting_transcripts from XYZ",
    ],
  },
});

await childLlmRun.patchRun();

const childToolRun = await parentRun.createChild({
  name: "transcript_loader",
  run_type: "tool",
  inputs: {
    date: "XYZ",
    content_type: "meeting_transcripts",
  },
});
await childToolRun.postRun();

await childToolRun.end({
  outputs: {
    meetings: ["Meeting1 notes.."],
  },
});

await childToolRun.patchRun();

const childChainRun = await parentRun.createChild({
  name: "Unreliable Component",
  run_type: "tool",
  inputs: {
    input: "Summarize these notes...",
  },
});

await childChainRun.postRun();

try {
  // .... the component does work
  throw new Error("Something went wrong");
} catch (e) {
  await childChainRun.end({
    error: `I errored again ${e.message}`,
  });
  await childChainRun.patchRun();
  throw e;
}

await childChainRun.patchRun();

await parentRun.end({
  outputs: {
    output: ["The meeting notes are as follows:..."],
  },
});

// False directs to not exclude child runs
await parentRun.patchRun();
```

## Evaluation

#### Create a Dataset from Existing Runs

Once your runs are stored in LangSmith, you can convert them into a dataset.
For this example, we will do so using the Client, but you can also do this using
the web interface, as explained in the [LangSmith docs](https://docs.smith.langchain.com/docs/).

```typescript
import { Client } from "langsmith/client";
const client = new Client({
  // apiUrl: "https://api.langchain.com", // Defaults to the LANGSMITH_ENDPOINT env var
  // apiKey: "my_api_key", // Defaults to the LANGSMITH_API_KEY env var
  /* callerOptions: {
         maxConcurrency?: Infinity; // Maximum number of concurrent requests to make
         maxRetries?: 6; // Maximum number of retries to make
    */
});
const datasetName = "Example Dataset";
// We will only use examples from the top level AgentExecutor run here,
// and exclude runs that errored.
const runs = await client.listRuns({
  projectName: "my_project",
  executionOrder: 1,
  error: false,
});

const dataset = await client.createDataset(datasetName, {
  description: "An example dataset",
});

for (const run of runs) {
  await client.createExample(run.inputs, run.outputs ?? {}, {
    datasetId: dataset.id,
  });
}
```

## Additional Documentation

To learn more about the LangSmith platform, check out the [docs](https://docs.smith.langchain.com/docs/).
