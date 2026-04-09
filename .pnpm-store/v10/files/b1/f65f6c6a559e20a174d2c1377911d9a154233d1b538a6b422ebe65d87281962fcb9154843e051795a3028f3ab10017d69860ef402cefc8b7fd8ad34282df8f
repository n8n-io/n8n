# @langchain/langgraph-sdk

## 1.0.3

### Patch Changes

- 5ae7552: Adding support to skip auto loading api key when set to null on sdk client create

## 1.0.2

### Patch Changes

- 1f6efc5: Ensure `isLoading` is set to `false` when cancelling the stream due to thread ID change

## 1.0.1

### Patch Changes

- b9be526: Adding functionality to search assistants by name in the in-memory server implementation.
- cc9dc28: Add `values` parameter to thread search

## 1.0.0

### Major Changes

- 1e1ecbb: This release updates the package for compatibility with LangGraph v1.0. See the [v1.0 release notes](https://docs.langchain.com/oss/javascript/releases/langgraph-v1) for details on what's new.

## 0.1.10

### Patch Changes

- 47cdce7: Fix stale values being received by optimistic values callback in `stream.submit(...)`

## 0.1.9

### Patch Changes

- 02beb41: Add support for creating stateless runs

## 0.1.8

### Patch Changes

- 90dcb8b: Add support for managing thread state manually outside of useStream hook via `experimental_thread` option

## 0.1.7

### Patch Changes

- bbc90e6: Fix thread history state being kept stale when changing `thread_id`

## 0.1.6

### Patch Changes

- 5603276: Fix `useStream()` keeping stale thread history when switching threads mid-stream (#1632)
- b65c80b: Add `transport` option to useStream, allowing custom endpoints, that emit compatible Server-Sent Events to be used with `useStream`.
- 5603276: Fix `stop()` behavior when cancelling a resumable stream via `useStream()` (#1610)

## 0.1.5

### Patch Changes

- f21fd04: Fix mutate function in `onCustomEvent` and in `onUpdateEvent` receiving incorrect previous value

## 0.1.4

### Patch Changes

- 599a8c5: Add support for streaming of RemoveMessage in useStream
- 15afabe: Allow `@langchain/core@1.0.0-alpha` installed alongside SDK

## 0.1.3

### Patch Changes

- ba7682f: Add TTL support to ThreadsClient in TypeScript to match Python SDK:

  - `threads.create({ ttl })` now accepts either a number (minutes) or an object `{ ttl: number, strategy?: "delete" }`.
  - `threads.update(threadId, { ttl })` accepts the same forms.

  Numeric TTL values are normalized to `{ ttl, strategy: "delete" }` in the request payload.

## 0.1.2

### Patch Changes

- 3b1e137: Add `description` field for assistants auth handlers

## 0.1.1

### Patch Changes

- 7de6680: Fix `onRequest` not being called when streaming runs or threads (#1585)
- df8b662: Fix interrupts not being exposed in `useStream["interrupt"]` when `fetchStateHistory: false`
- 572de43: feat(threads): add `ids` filter to Threads.search

  - SDK: `ThreadsClient.search` now accepts `ids?: string[]` and forwards it to `/threads/search`.
  - API: `/threads/search` schema accepts `ids` and storage filters by provided thread IDs.

  This enables fetching a specific set of threads directly via the search endpoint, while remaining backward compatible.

## 0.1.0

### Minor Changes

- 35a0f1c: feat(sdk): set default limit of fetch history to 10
- 35a0f1c: feat(sdk): set default of `fetchStateHistory` to `false`

### Patch Changes

- 35a0f1c: chore(sdk): decouple stream manager from React
- 35a0f1c: fix(sdk): prevent partial history from hiding all values

## 0.0.112

### Patch Changes

- a50e02e: feat(sdk): add thread streaming endpoint
- 7e210a1: feat(sdk): add durability param to run methods
- 5766b62: Fix `isThreadLoading: false` when initially mounting in useStream

## 0.0.111

### Patch Changes

- b5f14d0: Add methods to connect with the /count endpoints

## 0.0.109

### Patch Changes

- e8b4540: Add support for select statements in the search endpoints
- 9c57526: fix(sdk): expose subgraph events in useStream callbacks

## 0.0.107

### Patch Changes

- 72386a4: feat(sdk): expose stream metadata from messages via `getMessagesMetadata`
- 3ee5c20: fix(sdk): avoid setting `messages-tuple` if only `getMessagesMetadata` is requested.

## 0.0.106

### Patch Changes

- feat(sdk): allow setting `checkpoint: null` when submitting a run via useStream

## 0.0.105

### Patch Changes

- 7054a6a: add context to assistantBase interface

## 0.0.104

### Patch Changes

- af9ec5a: feat(sdk): add `isThreadLoading` option to `useStream`, handle thread error fetching
- 8e1ec9e: feat(sdk): add Context API support for useStream
- f43e48c: fix(sdk): handle subgraph custom events in stream processing of useStream

## 0.0.103

### Patch Changes

- f1bcec7: Add support for context API

## 0.0.102

### Patch Changes

- 030698f: feat(api): add support for injecting `langgraph_node` in structured logs, expose structlog

## 0.0.101

### Patch Changes

- f5e87cb: fix(sdk): allow async authorize callback

## 0.0.100

### Patch Changes

- a0efb98: Rename `interrupt_id` to `id`

## 0.0.99

### Patch Changes

- 768e2e2: feat(sdk): expose interrupt_id in types

## 0.0.98

### Patch Changes

- ee1defa: feat(sdk): add typing for "tasks" and "checkpoints" stream mode

## 0.0.97

### Patch Changes

- ac7b067: fix(sdk): use `kind` when checking for Studio user

## 0.0.96

### Patch Changes

- 53b8c30: fix(sdk): `runs.join()` returns the thread values

## 0.0.95

### Patch Changes

- 39cc88f: useStream should receive and merge messages from subgraphs
- c1ddda1: Fix fetching state with `fetchStateHistory: false` causing crash if thread is empty

## 0.0.94

### Patch Changes

- 11e95e0: Add isStudioUser for custom auth

## 0.0.93

### Patch Changes

- d53c891: Fix useStream race condition when flushing messages

## 0.0.92

### Patch Changes

- 603daa6: Make history fetching configurable in useStream via `fetchStateHistory`

## 0.0.91

### Patch Changes

- 2f26f2f: Send metadata when creating a new thread

## 0.0.90

### Patch Changes

- c8d7a0a: Add missing optional peer dependency on react-dom
