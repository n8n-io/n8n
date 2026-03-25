# @langchain/langgraph

## 1.0.2

### Patch Changes

- 4a6bde2: remove interrupt deprecations docs

## 1.0.1

### Patch Changes

- 4c4125c: undeprecate `ToolNode`

## 1.0.0

### Major Changes

- 1e1ecbb: Make Zod a peer dependency of @langchain/langgraph
- 1e1ecbb: This release updates the package for compatibility with LangGraph v1.0. See the [v1.0 release notes](https://docs.langchain.com/oss/javascript/releases/langgraph-v1) for details on what's new.

### Patch Changes

- 1e1ecbb: Fix type issue with defining `interrupt` and `writer` in StateGraph constructor when using Annotation.Root
- 1e1ecbb: Add `pushMessage` method for manually publishing to messages stream channel
- 1e1ecbb: chore(prebuilt): deprecate createReactAgent
- 1e1ecbb: Improve performance of scheduling tasks with large graphs
- 1e1ecbb: Improve graph execution performance by avoiding unnecessary cloning of checkpoints after every tick
- 1e1ecbb: fix(@langchain/langgraph): export missing `CommandParams` symbol
- 1e1ecbb: Add `stream.encoding` option to emit LangGraph API events as Server-Sent Events. This allows for sending events through the wire by piping the stream to a `Response` object.
- 1e1ecbb: fix(@langchain/langgraph): export missing `CommandInstance` symbol
- 1e1ecbb: Update troubleshooting link for common errors, add MISSING_CHECKPOINTER troubleshooting page
- 1e1ecbb: Fix `stateKey` property in `pushMessage` being ignored when RunnableConfig is automatically inherited
- 1e1ecbb: Improve tick performance by detecting interrupts faster within a tick.
- 1e1ecbb: Improve tick performance by calling `maxChannelMapVersion` only once
- 1e1ecbb: feat(langgraph): add `toLangGraphEventStream` method to stream events in LGP compatible format
- 1e1ecbb: fix(createReactAgent): update deprecation messages to contain reactAgent
- 1e1ecbb: `writer`, `interrupt` and `signal` is no longer an optional property of `Runtime`
- 1e1ecbb: Add support for defining multiple interrupts in StateGraph constructor. Interrupts from the map can be picked from the `Runtime` object, ensuring type-safety across multiple interrupts.
- 1e1ecbb: Channels are now part of the public API, allowing users to customise behaviour of checkpointing per channel (#976)
- 1e1ecbb: Allow defining types for interrupt and custom events upfront
- 1e1ecbb: Fix performance regression due to deferred nodes
- Updated dependencies [1e1ecbb]
  - @langchain/langgraph-checkpoint@1.0.0
  - @langchain/langgraph-sdk@1.0.0

## 1.0.0-alpha.5

### Patch Changes

- b6d6701: fix(@langchain/langgraph): export missing `CommandParams` symbol
- d5be09c: fix(@langchain/langgraph): export missing `CommandInstance` symbol

## 1.0.0-alpha.4

### Patch Changes

- c3f326d: Add support for defining multiple interrupts in StateGraph constructor. Interrupts from the map can be picked from the `Runtime` object, ensuring type-safety across multiple interrupts.

## 1.0.0-alpha.3

### Patch Changes

- 05619e2: Add `stream.encoding` option to emit LangGraph API events as Server-Sent Events. This allows for sending events through the wire by piping the stream to a `Response` object.
- 14cb042: Fix `stateKey` property in `pushMessage` being ignored when RunnableConfig is automatically inherited

## 1.0.0-alpha.2

### Patch Changes

- a5bcd74: Fix type issue with defining `interrupt` and `writer` in StateGraph constructor when using Annotation.Root
- 5184725: Add `pushMessage` method for manually publishing to messages stream channel

## 1.0.0-alpha.1

### Patch Changes

- a05436d: Improve performance of scheduling tasks with large graphs
- d35db59: Improve graph execution performance by avoiding unnecessary cloning of checkpoints after every tick
- 7e01d08: Update troubleshooting link for common errors, add MISSING_CHECKPOINTER troubleshooting page
- a527fc7: Improve tick performance by detecting interrupts faster within a tick.
- 27934c0: Improve tick performance by calling `maxChannelMapVersion` only once
- dc2e5f2: fix(createReactAgent): update deprecation messages to contain reactAgent
- e8f5084: `writer`, `interrupt` and `signal` is no longer an optional property of `Runtime`
- 20f1d64: Channels are now part of the public API, allowing users to customise behaviour of checkpointing per channel (#976)
- 2311efc: Allow defining types for interrupt and custom events upfront
- c6f75b6: Fix performance regression due to deferred nodes

## 1.0.0-alpha.0

### Major Changes

- 445c2ae: Make Zod a peer dependency of @langchain/langgraph

### Patch Changes

- 5f9b5a0: Deprecate createReactAgent in favour of `langchain` package.
- dcc117f: feat(langgraph): add `toLangGraphEventStream` method to stream events in LGP compatible format

## 0.4.9

### Patch Changes

- Updated dependencies [35a0f1c]
- Updated dependencies [35a0f1c]
- Updated dependencies [35a0f1c]
- Updated dependencies [35a0f1c]
  - @langchain/langgraph-sdk@0.1.0

## 0.4.8

### Patch Changes

- bb0df7c: Fix "This stream has already been locked for exclusive reading by another reader" error when using `web-streams-polyfill`

## 0.4.7

### Patch Changes

- 60e9258: fix(langgraph): task result from stream mode debug / tasks should match format from getStateHistory / getState
- 07a5b2f: fix(langgraph): avoid accepting incorrect keys in withLangGraph
- Updated dependencies [b5f14d0]
  - @langchain/langgraph-sdk@0.0.111

## 0.4.6

### Patch Changes

- 5f1db81: fix(langgraph): `withConfig` should accept `context`
- c53ca47: Avoid iterating on channels if no managed values are present
- a3707fb: fix(langgraph): allow `updateState` after resuming from an interrupt
- Updated dependencies [e8b4540]
- Updated dependencies [9c57526]
  - @langchain/langgraph-sdk@0.0.109

## 0.4.5

### Patch Changes

- d22113a: fix(pregel/utils): propagate abort reason in combineAbortSignals
- 2284045: fix(langgraph): send checkpoint namespace when yielding custom events in subgraphs
- 4774013: fix(langgraph): persist resume map values

## 0.4.4

### Patch Changes

- 8f4acc0: feat(langgraph): speed up prepareSingleTask by 20x
- 8152a15: Use return type of nodes for streamMode: updates types
- 4e854b2: fix(langgraph): set status for tool messages generated by ToolNode
- cb4b17a: feat(langgraph): use createReactAgent description for supervisor agent handoffs
- Updated dependencies [72386a4]
- Updated dependencies [3ee5c20]
  - @langchain/langgraph-sdk@0.0.107

## 0.4.3

### Patch Changes

- f69bf6d: feat(langgraph): createReactAgent v2: use Send for each of the tool calls
- 9940200: feat(langgraph): Allow partially applying tool calls via postModelHook
- e8c61bb: feat(langgraph): add dynamic model choice to createReactAgent

## 0.4.2

### Patch Changes

- c911c5f: fix(langgraph): handle empty messages

## 0.4.1

### Patch Changes

- f2cc704: fix(langgraph): RemotePregel serialization fix
- Updated dependencies [7054a6a]
  - @langchain/langgraph-sdk@0.0.105

## 0.4.0

### Minor Changes

- 5f7ee26: feat(langgraph): cleanup of interrupt interface
- 10432a4: chore(langgraph): remove SharedValue / managed values
- f1bcec7: chore(langgraph): introduce `context` field and `Runtime` type
- 14dd523: fix(langgraph): auto-inference of configurable fields
- fa78796: Add `durability` checkpointer mode
- 565f472: Mark StateGraph({ channel }) constructor deprecated

### Patch Changes

- Updated dependencies [ccbcbc1]
- Updated dependencies [10f292a]
- Updated dependencies [f1bcec7]
- Updated dependencies [3fd7f73]
- Updated dependencies [773ec0d]
  - @langchain/langgraph-checkpoint@0.1.0
  - @langchain/langgraph-sdk@0.0.103

## 0.3.12

### Patch Changes

- 034730f: fix(langgraph): add support for new interrupt ID

## 0.3.11

### Patch Changes

- a0efb98: Relax `when` type for `Interrupt`
- Updated dependencies [a0efb98]
  - @langchain/langgraph-sdk@0.0.100

## 0.3.10

### Patch Changes

- a12c1fb: fix(langgraph): stop suggesting public properties and methods of Command when calling invoke
- Updated dependencies [ee1defa]
  - @langchain/langgraph-sdk@0.0.98

## 0.3.9

### Patch Changes

- 430ae93: feat(langgraph): validate if messages present in user provided schema
- 4aed3f4: fix(langgraph): dispose unused combined signals
- 02f9e02: fix(langgraph): preModelHook `llmInputMessages` should not keep concatenating messages
- 6e616f5: fix(langgraph): respect strict option in responseFormat inside createReactAgent
- 6812b50: feat(langgraph): allow extending state with Zod schema
- 8166703: add UpdateType type utility for Zod, improve Zod 4 and Zod 4 mini support
- Updated dependencies [53b8c30]
  - @langchain/langgraph-sdk@0.0.96

## 0.3.8

### Patch Changes

- fix(langgraph): Ensure resuming only happens with matching run ids by @hinthornw in https://github.com/langchain-ai/langgraphjs/pull/1381

## 0.3.7

### Patch Changes

- fix(langgraph): Handle wrapped LLM models in createReactAgent (RunnableSequence, withConfig, ...etc) by @dqbd in https://github.com/langchain-ai/langgraphjs/pull/1369
- fix(langgraph): avoid calling \_emit for runs without metadata by @dqbd in https://github.com/langchain-ai/langgraphjs/pull/1340
- fix(langgraph): fail fast when interrupt is called without checkpointer by @dqbd in https://github.com/langchain-ai/langgraphjs/pull/1343
- fix(langgraph): handle wrapped LLM models in createReactAgent by @dqbd in https://github.com/langchain-ai/langgraphjs/pull/1369
