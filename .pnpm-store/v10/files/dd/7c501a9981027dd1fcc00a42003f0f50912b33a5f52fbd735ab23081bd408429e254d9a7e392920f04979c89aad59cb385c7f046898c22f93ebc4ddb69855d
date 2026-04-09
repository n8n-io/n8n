---
title: zodSchema
description: Helper function for creating Zod schemas
---

# `zodSchema()`

`zodSchema` is a helper function that converts a Zod schema into a JSON schema object that is compatible with the AI SDK.
It takes a Zod schema and optional configuration as inputs, and returns a typed schema.

You can use it to [generate structured data](/docs/ai-sdk-core/generating-structured-data) and in [tools](/docs/ai-sdk-core/tools-and-tool-calling).

<Note>
  You can also pass Zod objects directly to the AI SDK functions. Internally,
  the AI SDK will convert the Zod schema to a JSON schema using `zodSchema()`.
  However, if you want to specify options such as `useReferences`, you can pass
  the `zodSchema()` helper function instead.
</Note>

<Note type="warning">
  When using `.meta()` or `.describe()` to add metadata to your Zod schemas,
  make sure these methods are called **at the end** of the schema chain.
  
  metadata is attached to a specific schema
  instance, and most schema methods (`.min()`, `.optional()`, `.extend()`, etc.)
  return a new schema instance that does not inherit metadata from the previous one.
  Due to Zod's immutability, metadata is only included in the JSON schema output
  if `.meta()` or `.describe()` is the last method in the chain.

```ts
// ❌ Metadata will be lost - .min() returns a new instance without metadata
z.string().meta({ describe: 'first name' }).min(1);

// ✅ Metadata is preserved - .meta() is the final method
z.string().min(1).meta({ describe: 'first name' });
```

</Note>

## Example with recursive schemas

```ts
import { zodSchema } from 'ai';
import { z } from 'zod';

// Define a base category schema
const baseCategorySchema = z.object({
  name: z.string(),
});

// Define the recursive Category type
type Category = z.infer<typeof baseCategorySchema> & {
  subcategories: Category[];
};

// Create the recursive schema using z.lazy
const categorySchema: z.ZodType<Category> = baseCategorySchema.extend({
  subcategories: z.lazy(() => categorySchema.array()),
});

// Create the final schema with useReferences enabled for recursive support
const mySchema = zodSchema(
  z.object({
    category: categorySchema,
  }),
  { useReferences: true },
);
```

## Import

<Snippet text={`import { zodSchema } from "ai"`} prompt={false} />

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'zodSchema',
      type: 'z.Schema',
      description: 'The Zod schema definition.',
    },
    {
      name: 'options',
      type: 'object',
      description: 'Additional options for the schema conversion.',
      properties: [
        {
          type: 'object',
          parameters: [
            {
              name: 'useReferences',
              isOptional: true,
              type: 'boolean',
              description:
                'Enables support for references in the schema. This is required for recursive schemas, e.g. with `z.lazy`. However, not all language models and providers support such references. Defaults to `false`.',
            },
          ],
        },
      ],
    },
  ]}
/>

### Returns

A Schema object that is compatible with the AI SDK, containing both the JSON schema representation and validation functionality.
