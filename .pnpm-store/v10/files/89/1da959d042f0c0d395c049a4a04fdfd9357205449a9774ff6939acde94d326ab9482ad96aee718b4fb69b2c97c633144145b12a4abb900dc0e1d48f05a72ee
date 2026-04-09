---
title: Migrate AI SDK 3.2 to 3.3
description: Learn how to upgrade AI SDK 3.2 to 3.3.
---

# Migrate AI SDK 3.2 to 3.3

<Note>
  Check out the [AI SDK 3.3 release blog
  post](https://vercel.com/blog/vercel-ai-sdk-3-3) for more information about
  the release.
</Note>

No breaking changes in this release.

The following changelog encompasses all changes made in the 3.2.x series,
introducing significant improvements and new features across the AI SDK and its associated libraries:

## New Features

### Open Telemetry Support

- Added experimental [OpenTelemetry support](/docs/ai-sdk-core/telemetry#telemetry) for all [AI SDK Core functions](/docs/ai-sdk-core/overview#ai-sdk-core-functions), enabling better observability and tracing capabilities.

### AI SDK UI Improvements

- Introduced the experimental **`useObject`** hook (for React) that can be used in conjunction with **`streamObject`** on the backend to enable seamless streaming of structured data.
- Enhanced **`useChat`** with experimental support for attachments and streaming tool calls, providing more versatile chat functionalities.
- Patched **`useChat`** to prevent empty submissions, improving the quality of user interactions by ensuring that only intended inputs are processed.
- Fix **`useChat`**'s **`reload`** function, now correctly sending data, body, and headers.
- Implemented **`setThreadId`** helper for **`useAssistant`**, simplifying thread management.
- Documented the stream data protocol for **`useChat`** and **`useCompletion`**, allowing developers to use these functions with any backend. The stream data protocol also enables the use of custom frontends with **`streamText`**.
- Added support for custom fetch functions and request body customization, offering greater control over API interactions.
- Added **`onFinish`** to **`useChat`** hook for access to token usage and finish reason.

### Core Enhancements

- Implemented support for sending custom request headers, enabling more tailored API requests.
- Added raw JSON schema support alongside existing Zod support, providing more options for schema and data validation.
- Introduced usage information for **`embed`** and **`embedMany`** functions, offering insights into token usage.
- Added support for additional settings including **`stopSequences`** and **`topK`**, allowing for finer control over text generation.
- Provided access to information for all steps on **`generateText`**, providing access to intermediate tool calls and results.

### New Providers

- [AWS Bedrock provider](/providers/ai-sdk-providers/amazon-bedrock).

### Provider Improvements

- Enhanced existing providers including Anthropic, Google, Azure, and OpenAI with various improvements and bug fixes.
- Upgraded the LangChain adapter with StreamEvent v2 support and introduced the **`toDataStreamResponse`** function, enabling conversion of LangChain output streams to data stream responses.
- Added legacy function calling support to the OpenAI provider.
- Updated Mistral AI provider with fixes and improvements for tool calling support.

### UI Framework Support Expansion

- SolidJS: Updated **`useChat`** and **`useCompletion`** to achieve feature parity with React implementations.
- Vue.js: Introduced **`useAssistant`** hook.
- Vue.js / Nuxt: [Updated examples](https://github.com/vercel/ai/tree/main/examples/nuxt-openai) to showcase latest features and best practices.
- Svelte: Added tool calling support to **`useChat`.**

## Fixes and Improvements

- Resolved various issues across different components of the SDK, including race conditions, error handling, and state management.
