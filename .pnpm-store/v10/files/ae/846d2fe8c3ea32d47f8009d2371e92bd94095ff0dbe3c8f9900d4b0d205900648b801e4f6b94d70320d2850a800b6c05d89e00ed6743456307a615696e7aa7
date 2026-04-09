---
title: createStreamableUI
description: Reference for the createStreamableUI function from the AI SDK RSC
---

# `createStreamableUI`

<Note type="warning">
  AI SDK RSC is currently experimental. We recommend using [AI SDK
  UI](/docs/ai-sdk-ui/overview) for production. For guidance on migrating from
  RSC to UI, see our [migration guide](/docs/ai-sdk-rsc/migrating-to-ui).
</Note>

Create a stream that sends UI from the server to the client. On the client side, it can be rendered as a normal React node.

## Import

<Snippet
  text={`import { createStreamableUI } from "@ai-sdk/rsc"`}
  prompt={false}
/>

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'initialValue',
      type: 'ReactNode',
      isOptional: true,
      description: 'The initial value of the streamable UI.',
    },
  ]}
/>

### Returns

<PropertiesTable
  content={[
    {
      name: 'value',
      type: 'ReactNode',
      description:
        'The value of the streamable UI. This can be returned from a Server Action and received by the client.',
    },
  ]}
/>

### Methods

<PropertiesTable
  content={[
    {
      name: 'update',
      type: '(ReactNode) => void',
      description:
        'Updates the current UI node. It takes a new UI node and replaces the old one.',
    },
    {
      name: 'append',
      type: '(ReactNode) => void',
      description:
        'Appends a new UI node to the end of the old one. Once appended a new UI node, the previous UI node cannot be updated anymore.',
    },
    {
      name: 'done',
      type: '(ReactNode | null) => void',
      description:
        'Marks the UI node as finalized and closes the stream. Once called, the UI node cannot be updated or appended anymore. This method is always required to be called, otherwise the response will be stuck in a loading state.',
    },
    {
      name: 'error',
      type: '(Error) => void',
      description:
        'Signals that there is an error in the UI stream. It will be thrown on the client side and caught by the nearest error boundary component.',
    },
  ]}
/>

## Examples

<ExampleLinks
  examples={[
    {
      title: 'Render a React component during a tool call',
      link: '/examples/next-app/tools/render-interface-during-tool-call',
    },
  ]}
/>
