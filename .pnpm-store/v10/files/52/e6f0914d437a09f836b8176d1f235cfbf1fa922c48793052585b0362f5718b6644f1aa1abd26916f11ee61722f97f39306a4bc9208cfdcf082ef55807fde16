---
title: Migrate AI SDK 3.1 to 3.2
description: Learn how to upgrade AI SDK 3.1 to 3.2.
---

# Migrate AI SDK 3.1 to 3.2

<Note>
  Check out the [AI SDK 3.2 release blog
  post](https://vercel.com/blog/introducing-vercel-ai-sdk-3-2) for more
  information about the release.
</Note>

This guide will help you upgrade to AI SDK 3.2:

- Experimental `StreamingReactResponse` functionality has been removed
- Several features have been deprecated
- UI framework integrations have moved to their own Node modules

## Upgrading

### AI SDK

To update to AI SDK version 3.2, run the following command using your preferred package manager:

<Snippet text="pnpm add ai@latest" />

## Removed Functionality

The experimental `StreamingReactResponse` has been removed. You can use [AI SDK RSC](/docs/ai-sdk-rsc/overview) to build streaming UIs.

## Deprecated Functionality

The `nanoid` export has been deprecated. Please use [`generateId`](/docs/reference/ai-sdk-core/generate-id) instead.

## UI Package Separation

AI SDK UI supports several frameworks: [React](https://react.dev/), [Svelte](https://svelte.dev/), [Vue.js](https://vuejs.org/), and [SolidJS](https://www.solidjs.com/).

The integrations (other than React and RSC) have moved to separate Node modules. You need to update the import and require statements as follows:

- Change `ai/svelte` to `@ai-sdk/svelte`
- Change `ai/vue` to `@ai-sdk/vue`
- Change `ai/solid` to `@ai-sdk/solid`

The old exports are still available but will be removed in a future release.
