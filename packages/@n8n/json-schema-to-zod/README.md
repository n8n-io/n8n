# Json-Schema-to-Zod

Fork of [`json-schema-to-zod`](https://github.com/StefanTerdell/json-schema-to-zod) that converts JSON schema into real Zod objects instead strings of JS code.

## Installation

```sh
npm install @n8n/json-schema-to-zod
```

## Summary

A runtime package to convert JSON schema (draft 4+) objects or files into Zod schemas in the form of Zod objects.

### Simple example

```typescript
import { jsonSchemaToZod } from "json-schema-to-zod";

const jsonSchema = {
  type: "object",
  properties: {
    hello: {
      type: "string",
    },
  },
};

const zodSchema = jsonSchemaToZod(myObject);
```

### Overriding a parser

You can pass a function to the `overrideParser` option, which represents a function that receives the current schema node and the reference object, and should return a zod object when it wants to replace a default output. If the default output should be used for the node just return undefined.
