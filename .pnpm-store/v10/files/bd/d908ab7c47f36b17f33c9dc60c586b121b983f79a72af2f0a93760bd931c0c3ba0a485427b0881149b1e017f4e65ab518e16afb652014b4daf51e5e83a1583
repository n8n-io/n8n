---
title: Server Action Plain Objects Error
description: Troubleshooting errors related to using AI SDK Core functions with Server Actions.
---

# "Only plain objects can be passed from client components" Server Action Error

## Issue

I am using [`streamText`](/docs/reference/ai-sdk-core/stream-text) with Server Actions, and I am getting a `"only plain objects and a few built ins can be passed from client components"` error.

## Background

This error occurs when you're trying to return a non-serializable object from a Server Action to a Client Component. The streamText function likely returns an object with methods or complex structures that can't be directly serialized and passed to the client.

## Solution

To fix this issue, you need to ensure that you're only returning serializable data from your Server Action. Here's how you can modify your approach:

1. Instead of returning the entire result object from streamText, extract only the necessary serializable data.
2. Use the [`createStreamableValue`](/docs/reference/ai-sdk-rsc/create-streamable-value) function to create a streamable value that can be safely passed to the client.

Here's an example that demonstrates how to implement this solution: [Streaming Text Generation](/examples/next-app/basics/streaming-text-generation).

This approach ensures that only serializable data (the text) is passed to the client, avoiding the "only plain objects" error.
