---
title: InferUITools
description: API Reference for InferUITools.
---

# InferUITools

Infers the input and output types of a `ToolSet`.

This type helper is useful when working with tools in TypeScript to ensure type safety for your tool inputs and outputs in `UIMessage`s.

## Import

```tsx
import { InferUITools } from 'ai';
```

## API Signature

### Type Parameters

<PropertiesTable
  content={[
    {
      name: 'TOOLS',
      type: 'ToolSet',
      description: 'The tool set to infer types from.',
    },
  ]}
/>

### Returns

A type that maps each tool in the tool set to its inferred input and output types.

The resulting type has the shape:

```typescript
{
  [NAME in keyof TOOLS & string]: {
    input: InferToolInput<TOOLS[NAME]>;
    output: InferToolOutput<TOOLS[NAME]>;
  };
}
```

## Examples

### Basic Usage

```tsx
import { InferUITools } from 'ai';
import { z } from 'zod';

const tools = {
  weather: {
    description: 'Get the current weather',
    inputSchema: z.object({
      location: z.string().describe('The city and state'),
    }),
    execute: async ({ location }) => {
      return `The weather in ${location} is sunny.`;
    },
  },
  calculator: {
    description: 'Perform basic arithmetic',
    inputSchema: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
      a: z.number(),
      b: z.number(),
    }),
    execute: async ({ operation, a, b }) => {
      switch (operation) {
        case 'add':
          return a + b;
        case 'subtract':
          return a - b;
        case 'multiply':
          return a * b;
        case 'divide':
          return a / b;
      }
    },
  },
};

// Infer the types from the tool set
type MyUITools = InferUITools<typeof tools>;
// This creates a type with:
// {
//   weather: { input: { location: string }; output: string };
//   calculator: { input: { operation: 'add' | 'subtract' | 'multiply' | 'divide'; a: number; b: number }; output: number };
// }
```

## Related

- [`InferUITool`](/docs/reference/ai-sdk-ui/infer-ui-tool) - Infer types for a single tool
- [`useChat`](/docs/reference/ai-sdk-ui/use-chat) - Chat hook that supports typed tools
