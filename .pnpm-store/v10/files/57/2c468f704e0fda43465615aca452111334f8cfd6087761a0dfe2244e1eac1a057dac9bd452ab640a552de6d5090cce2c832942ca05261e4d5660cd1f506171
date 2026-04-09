---
title: Migrate AI SDK 4.1 to 4.2
description: Learn how to upgrade AI SDK 4.1 to 4.2.
---

# Migrate AI SDK 4.1 to 4.2

<Note>
  Check out the [AI SDK 4.2 release blog
  post](https://vercel.com/blog/ai-sdk-4-2) for more information about the
  release.
</Note>

This guide will help you upgrade to AI SDK 4.2:

## Stable APIs

The following APIs have been moved to stable and no longer have the `experimental_` prefix:

- `customProvider`
- `providerOptions` (renamed from `providerMetadata` for provider-specific inputs)
- `providerMetadata` (for provider-specific outputs)
- `toolCallStreaming` option for `streamText`

## Dependency Versions

AI SDK requires a non-optional `zod` dependency with version `^3.23.8`.

## UI Message Parts

In AI SDK 4.2, we've redesigned how `useChat` handles model outputs with message parts and multiple steps.
This is a significant improvement that simplifies rendering complex, multi-modal AI responses in your UI.

### What's Changed

Assistant messages with tool calling now get combined into a single message with multiple parts, rather than creating separate messages for each step.
This change addresses two key developments in AI applications:

1. **Diverse Output Types**: Models now generate more than just text; they produce reasoning steps, sources, and tool calls.
2. **Interleaved Outputs**: In multi-step agent use-cases, these different output types are frequently interleaved.

### Benefits of the New Approach

Previously, `useChat` stored different output types separately, which made it challenging to maintain the correct sequence in your UI when these elements were interleaved in a response,
and led to multiple consecutive assistant messages when there were tool calls. For example:

```javascript
message.content = "Final answer: 42";
message.reasoning = "First I'll calculate X, then Y...";
message.toolInvocations = [{toolName: "calculator", args: {...}}];
```

This structure was limiting. The new message parts approach replaces separate properties with an ordered array that preserves the exact sequence:

```javascript
message.parts = [
  { type: "text", text: "Final answer: 42" },
  { type: "reasoning", reasoning: "First I'll calculate X, then Y..." },
  { type: "tool-invocation", toolInvocation: { toolName: "calculator", args: {...} } },
];
```

### Migration

Existing applications using the previous message format will need to update their UI components to handle the new `parts` array.
The fields from the previous format are still available for backward compatibility, but we recommend migrating to the new format for better support of multi-modal and multi-step interactions.

You can use the `useChat` hook with the new message parts as follows:

```javascript
function Chat() {
  const { messages } = useChat();
  return (
    <div>
      {messages.map(message =>
        message.parts.map((part, i) => {
          switch (part.type) {
            case 'text':
              return <p key={i}>{part.text}</p>;
            case 'source':
              return <p key={i}>{part.source.url}</p>;
            case 'reasoning':
              return <div key={i}>{part.reasoning}</div>;
            case 'tool-invocation':
              return <div key={i}>{part.toolInvocation.toolName}</div>;
            case 'file':
              return (
                <img
                  key={i}
                  src={`data:${part.mediaType};base64,${part.data}`}
                />
              );
          }
        }),
      )}
    </div>
  );
}
```
