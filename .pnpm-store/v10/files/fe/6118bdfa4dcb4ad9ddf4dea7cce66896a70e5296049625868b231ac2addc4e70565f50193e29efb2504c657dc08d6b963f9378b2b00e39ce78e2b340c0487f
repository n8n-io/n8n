---
title: useActions
description: Reference for the useActions function from the AI SDK RSC
---

# `useActions`

<Note type="warning">
  AI SDK RSC is currently experimental. We recommend using [AI SDK
  UI](/docs/ai-sdk-ui/overview) for production. For guidance on migrating from
  RSC to UI, see our [migration guide](/docs/ai-sdk-rsc/migrating-to-ui).
</Note>

It is a hook to help you access your Server Actions from the client. This is particularly useful for building interfaces that require user interactions with the server.

It is required to access these server actions via this hook because they are patched when passed through the context. Accessing them directly may result in a [Cannot find Client Component error](/docs/troubleshooting/server-actions-in-client-components).

## Import

<Snippet text={`import { useActions } from "@ai-sdk/rsc"`} prompt={false} />

## API Signature

### Returns

`Record<string, Action>`, a dictionary of server actions.

## Examples

<ExampleLinks
  examples={[
    {
      title: 'Learn to manage AI and UI states in Next.js',
      link: '/examples/next-app/state-management/ai-ui-states',
    },
    {
      title:
        'Learn to route React components using a language model in Next.js',
      link: '/examples/next-app/interface/route-components',
    },
  ]}
/>
