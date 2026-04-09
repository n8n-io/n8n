---
title: valibotSchema
description: Helper function for creating Valibot schemas
---

# `valibotSchema()`

`valibotSchema` is a helper function that converts a Valibot schema into a JSON schema object
that is compatible with the AI SDK.
It takes a Valibot schema as input, and returns a typed schema.

You can use it to [generate structured data](/docs/ai-sdk-core/generating-structured-data) and
in [tools](/docs/ai-sdk-core/tools-and-tool-calling).

## Example

```ts
import { valibotSchema } from '@ai-sdk/valibot';
import { object, string, array } from 'valibot';

const recipeSchema = valibotSchema(
  object({
    name: string(),
    ingredients: array(
      object({
        name: string(),
        amount: string(),
      }),
    ),
    steps: array(string()),
  }),
);
```

## Import

<Snippet
  text={`import { valibotSchema } from "@ai-sdk/valibot"`}
  prompt={false}
/>

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'valibotSchema',
      type: 'GenericSchema<unknown, T>',
      description: 'The Valibot schema definition.',
    },
  ]}
/>

### Returns

A Schema object that is compatible with the AI SDK, containing both the JSON schema representation and validation functionality.
