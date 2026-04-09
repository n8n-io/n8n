---
title: Tool Invocation Missing Result Error
description: How to fix the "ToolInvocation must have a result" error when using tools without execute functions
---

# Tool Invocation Missing Result Error

## Issue

When using `generateText()` or `streamText()`, you may encounter the error "ToolInvocation must have a result" when a tool without an `execute` function is called.

## Cause

The error occurs when you define a tool without an `execute` function and don't provide the result through other means (like `useChat`'s `onToolCall` or `addToolOutput` functions).

Each time a tool is invoked, the model expects to receive a result before continuing the conversation. Without a result, the model cannot determine if the tool call succeeded or failed and the conversation state becomes invalid.

## Solution

You have two options for handling tool results:

1. Server-side execution using tools with an `execute` function:

```tsx
const tools = {
  weather: tool({
    description: 'Get the weather in a location',
    parameters: z.object({
      location: z
        .string()
        .describe('The city and state, e.g. "San Francisco, CA"'),
    }),
    execute: async ({ location }) => {
      // Fetch and return weather data
      return { temperature: 72, conditions: 'sunny', location };
    },
  }),
};
```

2. Client-side execution with `useChat` (omitting the `execute` function), you must provide results using `addToolOutput`:

```tsx
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';

const { messages, sendMessage, addToolOutput } = useChat({
  // Automatically submit when all tool results are available
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,

  // Handle tool calls in onToolCall
  onToolCall: async ({ toolCall }) => {
    if (toolCall.toolName === 'getLocation') {
      try {
        const result = await getLocationData();

        // Important: Don't await inside onToolCall to avoid deadlocks
        addToolOutput({
          tool: 'getLocation',
          toolCallId: toolCall.toolCallId,
          output: result,
        });
      } catch (err) {
        // Important: Don't await inside onToolCall to avoid deadlocks
        addToolOutput({
          tool: 'getLocation',
          toolCallId: toolCall.toolCallId,
          state: 'output-error',
          errorText: 'Failed to get location',
        });
      }
    }
  },
});
```

```tsx
// For interactive UI elements:
const { messages, sendMessage, addToolOutput } = useChat({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
});

// Inside your JSX, when rendering tool calls:
<button
  onClick={() =>
    addToolOutput({
      tool: 'myTool',
      toolCallId, // must provide tool call ID
      output: {
        /* your tool result */
      },
    })
  }
>
  Confirm
</button>;
```

<Note type="warning">
  Whether handling tools on the server or client, each tool call must have a
  corresponding result before the conversation can continue.
</Note>
