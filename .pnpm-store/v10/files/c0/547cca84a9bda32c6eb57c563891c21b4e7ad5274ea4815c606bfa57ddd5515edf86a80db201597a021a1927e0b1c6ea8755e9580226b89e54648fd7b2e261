---
title: getMutableAIState
description: Reference for the getMutableAIState function from the AI SDK RSC
---

# `getMutableAIState`

<Note type="warning">
  AI SDK RSC is currently experimental. We recommend using [AI SDK
  UI](/docs/ai-sdk-ui/overview) for production. For guidance on migrating from
  RSC to UI, see our [migration guide](/docs/ai-sdk-rsc/migrating-to-ui).
</Note>

Get a mutable copy of the AI state. You can use this to update the state in the server.

## Import

<Snippet
  text={`import { getMutableAIState } from "@ai-sdk/rsc"`}
  prompt={false}
/>

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'key',
      isOptional: true,
      type: 'string',
      description:
        "Returns the value of the specified key in the AI state, if it's an object.",
    },
  ]}
/>

### Returns

The mutable AI state.

### Methods

<PropertiesTable
  content={[
    {
      name: 'update',
      type: '(newState: any) => void',
      description: 'Updates the AI state with the new state.',
    },
    {
      name: 'done',
      type: '(newState: any) => void',
      description:
        'Updates the AI state with the new state, marks it as finalized and closes the stream.',
    },
  ]}
/>

## Examples

<ExampleLinks
  examples={[
    {
      title: 'Learn to persist and restore states AI and UI states in Next.js',
      link: '/examples/next-app/state-management/save-and-restore-states',
    },
  ]}
/>
