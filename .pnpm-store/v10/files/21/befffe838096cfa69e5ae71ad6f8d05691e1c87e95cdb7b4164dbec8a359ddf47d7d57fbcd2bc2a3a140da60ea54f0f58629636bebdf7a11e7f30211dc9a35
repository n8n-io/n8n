---
title: createAI
description: Reference for the createAI function from the AI SDK RSC
---

# `createAI`

<Note type="warning">
  AI SDK RSC is currently experimental. We recommend using [AI SDK
  UI](/docs/ai-sdk-ui/overview) for production. For guidance on migrating from
  RSC to UI, see our [migration guide](/docs/ai-sdk-rsc/migrating-to-ui).
</Note>

Creates a client-server context provider that can be used to wrap parts of your application tree to easily manage both UI and AI states of your application.

## Import

<Snippet text={`import { createAI } from "@ai-sdk/rsc"`} prompt={false} />

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'actions',
      type: 'Record<string, Action>',
      description: 'Server side actions that can be called from the client.',
    },
    {
      name: 'initialAIState',
      type: 'any',
      description: 'Initial AI state to be used in the client.',
    },
    {
      name: 'initialUIState',
      type: 'any',
      description: 'Initial UI state to be used in the client.',
    },
    {
      name: 'onGetUIState',
      type: '() => UIState',
      description: 'is called during SSR to compare and update UI state.',
    },
    {
      name: 'onSetAIState',
      type: '(Event) => void',
      description:
        'is triggered whenever an update() or done() is called by the mutable AI state in your action, so you can safely store your AI state in the database.',
      properties: [
        {
          type: 'Event',
          parameters: [
            {
              name: 'state',
              type: 'AIState',
              description: 'The resulting AI state after the update.',
            },
            {
              name: 'done',
              type: 'boolean',
              description:
                'Whether the AI state updates have been finalized or not.',
            },
          ],
        },
      ],
    },
  ]}
/>

### Returns

It returns an `<AI/>` context provider.

## Examples

<ExampleLinks
  examples={[
    {
      title: 'Learn to manage AI and UI states in Next.js',
      link: '/examples/next-app/state-management/ai-ui-states',
    },
    {
      title: 'Learn to persist and restore states UI/AI states in Next.js',
      link: '/examples/next-app/state-management/save-and-restore-states',
    },
  ]}
/>
