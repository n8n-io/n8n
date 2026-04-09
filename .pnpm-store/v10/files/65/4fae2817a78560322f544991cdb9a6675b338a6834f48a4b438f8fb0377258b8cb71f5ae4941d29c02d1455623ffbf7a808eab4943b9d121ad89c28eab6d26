---
title: DefaultGeneratedFile
description: API Reference for DefaultGeneratedFile.
---

# `DefaultGeneratedFile`

A concrete implementation of the `GeneratedFile` interface that provides lazy conversion between base64 and Uint8Array formats.

```ts
import { DefaultGeneratedFile } from 'ai';

const file = new DefaultGeneratedFile({
  data: uint8ArrayData,
  mediaType: 'image/png',
});

console.log(file.base64); // Automatically converted to base64
console.log(file.uint8Array); // Original Uint8Array
```

## Import

<Snippet text={`import { DefaultGeneratedFile } from "ai"`} prompt={false} />

## Constructor

### Parameters

<PropertiesTable
  content={[
    {
      name: 'data',
      type: 'string | Uint8Array',
      description:
        'The file data as either a base64 encoded string or Uint8Array.',
    },
    {
      name: 'mediaType',
      type: 'string',
      description: 'The IANA media type of the file.',
    },
  ]}
/>

## Properties

<PropertiesTable
  content={[
    {
      name: 'base64',
      type: 'string',
      description:
        'File as a base64 encoded string. Lazily converted from Uint8Array if needed.',
    },
    {
      name: 'uint8Array',
      type: 'Uint8Array',
      description:
        'File as a Uint8Array. Lazily converted from base64 if needed.',
    },
    {
      name: 'mediaType',
      type: 'string',
      description: 'The IANA media type of the file.',
    },
  ]}
/>
