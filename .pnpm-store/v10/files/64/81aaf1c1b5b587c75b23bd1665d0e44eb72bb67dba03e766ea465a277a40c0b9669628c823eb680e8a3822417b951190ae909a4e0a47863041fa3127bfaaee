---
title: AI_ToolCallNotFoundForApprovalError
description: Learn how to fix AI_ToolCallNotFoundForApprovalError
---

# AI_ToolCallNotFoundForApprovalError

This error occurs when a tool approval request references a tool call that was not found. This can happen when processing provider-emitted approval requests (e.g., MCP flows) where the referenced tool call ID does not exist.

## Properties

- `toolCallId`: The tool call ID that was not found
- `approvalId`: The approval request ID

## Checking for this Error

You can check if an error is an instance of `AI_ToolCallNotFoundForApprovalError` using:

```typescript
import { ToolCallNotFoundForApprovalError } from 'ai';

if (ToolCallNotFoundForApprovalError.isInstance(error)) {
  // Handle the error
}
```
