---
title: createStreamableValue
description: Reference for the createStreamableValue function from the AI SDK RSC
---

# `createStreamableValue`

<Note type="warning">
  AI SDK RSC is currently experimental. We recommend using [AI SDK
  UI](/docs/ai-sdk-ui/overview) for production. For guidance on migrating from
  RSC to UI, see our [migration guide](/docs/ai-sdk-rsc/migrating-to-ui).
</Note>

Create a stream that sends values from the server to the client. The value can be any serializable data.

## Import

<Snippet
  text={`import { createStreamableValue } from "@ai-sdk/rsc"`}
  prompt={false}
/>

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'value',
      type: 'any',
      description: 'Any data that RSC supports. Example, JSON.',
    },
  ]}
/>

### Returns

<PropertiesTable
  content={[
    {
      name: 'value',
      type: 'StreamableValue',
      description:
        'The value of the streamable. This can be returned from a Server Action and received by the client. To read the streamed values, use the `readStreamableValue` or `useStreamableValue` APIs.',
    },
  ]}
/>

### Methods

<PropertiesTable
  content={[
    {
      name: 'update',
      type: '(value: T) => StreamableValueWrapper',
      description: 'Updates the current value with a new one.',
    },
    {
      name: 'append',
      type: '(value: T) => StreamableValueWrapper',
      description:
        'Appends a delta string to the current value. It requires the current value of the streamable to be a string.',
    },
    {
      name: 'done',
      type: '(value?: T) => StreamableValueWrapper',
      description:
        'Marks the value as finalized. You can either call it without any parameters or with a new value as the final state. Once called, the value cannot be updated or appended anymore. This method is always required to be called, otherwise the response will be stuck in a loading state.',
    },
    {
      name: 'error',
      type: '(error: any) => StreamableValueWrapper',
      description:
        'Signals that there is an error in the value stream. It will be thrown on the client side when consumed via `readStreamableValue` or `useStreamableValue`.',
    },
  ]}
/>
