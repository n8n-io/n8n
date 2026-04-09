---
title: createIdGenerator
description: Create a customizable unique identifier generator (API Reference)
---

# `createIdGenerator()`

Creates a customizable ID generator function. You can configure the alphabet, prefix, separator, and default size of the generated IDs.

```ts
import { createIdGenerator } from 'ai';

const generateCustomId = createIdGenerator({
  prefix: 'user',
  separator: '_',
});

const id = generateCustomId(); // Example: "user_1a2b3c4d5e6f7g8h"
```

## Import

<Snippet text={`import { createIdGenerator } from "ai"`} prompt={false} />

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'options',
      type: 'object',
      description:
        'Optional configuration object with the following properties:',
    },
    {
      name: 'options.alphabet',
      type: 'string',
      description:
        'The characters to use for generating the random part of the ID. Defaults to alphanumeric characters (0-9, A-Z, a-z).',
    },
    {
      name: 'options.prefix',
      type: 'string',
      description:
        'A string to prepend to all generated IDs. Defaults to none.',
    },
    {
      name: 'options.separator',
      type: 'string',
      description:
        'The character(s) to use between the prefix and the random part. Defaults to "-".',
    },
    {
      name: 'options.size',
      type: 'number',
      description:
        'The default length of the random part of the ID. Defaults to 16.',
    },
  ]}
/>

### Returns

Returns a function that generates IDs based on the configured options.

### Notes

- The generator uses non-secure random generation and should not be used for security-critical purposes.
- The separator character must not be part of the alphabet to ensure reliable prefix checking.

## Example

```ts
// Create a custom ID generator for user IDs
const generateUserId = createIdGenerator({
  prefix: 'user',
  separator: '_',
  size: 8,
});

// Generate IDs
const id1 = generateUserId(); // e.g., "user_1a2b3c4d"
```

## See also

- [`generateId()`](/docs/reference/ai-sdk-core/generate-id)
