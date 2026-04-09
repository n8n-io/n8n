---
title: Missing Tool Results Error
description: How to fix the "Tool results are missing for tool calls" error when using the AI SDK.
---

# Missing Tool Results Error

## Issue

You encounter the error `AI_MissingToolResultsError` with a message like:

> Tool results are missing for tool calls: ...

## Cause

This error occurs when you attempt to send a new message to the Large Language Model (LLM) while there are pending tool calls from a previous turn that have not yet been resolved.

The AI SDK core logic validates that all `tool-call` parts in the conversation history are resolved before proceeding. "Resolved" typically means:

1. The tool has been executed and a `tool-result` has been added to the history.
2. Or, the tool call has triggered a `tool-approval-response` (if using tool approvals).

If a tool call is found without a corresponding result or approval response, this error is thrown to prevent sending an invalid conversation history to the model.

## Solution

Ensure that every tool call in your conversation history is properly handled.

### 1. Provide Tool Results

For standard tool calls, ensure that you provide the output of the tool execution.

```typescript
const messages = [
  { role: 'user', content: 'What is the weather in NY?' },
  {
    role: 'assistant',
    content: [
      {
        type: 'tool-call',
        toolCallId: 'call_123',
        toolName: 'getWeather',
        args: { location: 'New York' },
      },
    ],
  },
  // You MUST include this tool message with the result:
  {
    role: 'tool',
    content: [
      {
        type: 'tool-result',
        toolCallId: 'call_123',
        toolName: 'getWeather',
        result: 'Sunny, 25°C',
      },
    ],
  },
  // Now you can add a new user message
  { role: 'user', content: 'And in London?' },
];
```

### 2. Handle Tool Approvals

If you are using the tool approval workflow, ensure that you include the `tool-approval-response`.

```typescript
const messages = [
  // ... assistant requests tool execution (needs approval)
  {
    role: 'tool',
    content: [
      {
        type: 'tool-approval-response',
        approvalId: 'approval_123',
        approved: true, // or false
      },
    ],
  },
];
```
