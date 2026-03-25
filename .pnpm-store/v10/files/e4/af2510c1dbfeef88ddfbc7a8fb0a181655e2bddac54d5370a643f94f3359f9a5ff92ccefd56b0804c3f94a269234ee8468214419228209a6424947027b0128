# @langchain/openai

## 1.2.7

### Patch Changes

- [#9954](https://github.com/langchain-ai/langchainjs/pull/9954) [`6939dab`](https://github.com/langchain-ai/langchainjs/commit/6939dabc8dc6481942e7e2c19e3dc61bc374d65a) Thanks [@akintunero](https://github.com/akintunero)! - fix(openai): store response.output in response_metadata for reasoning model round-trips

- [#9898](https://github.com/langchain-ai/langchainjs/pull/9898) [`ad581c7`](https://github.com/langchain-ai/langchainjs/commit/ad581c76138ea12ebdaee444c0dcdc4f6a280624) Thanks [@Muhammad-Kamran-Khan](https://github.com/Muhammad-Kamran-Khan)! - fix(openai): pass service_tier to API when using Responses API

## 1.2.6

### Patch Changes

- [#9972](https://github.com/langchain-ai/langchainjs/pull/9972) [`16d691c`](https://github.com/langchain-ai/langchainjs/commit/16d691c7f8196e1d6322f051c25b2219ff2953b6) Thanks [@hntrl](https://github.com/hntrl)! - fix(openai): drop Anthropic `tool_use` content blocks when converting messages for OpenAI

  When messages originating from Anthropic (e.g. via `ChatAnthropic`) are passed to `ChatOpenAI`, Anthropic-native `tool_use` blocks in `message.content` are now filtered out during conversion. These blocks are already represented in `message.tool_calls` and would cause an OpenAI API error if passed through.

- [#9940](https://github.com/langchain-ai/langchainjs/pull/9940) [`1058574`](https://github.com/langchain-ai/langchainjs/commit/1058574b723f0d060eb9b3ca25be5aeeabbe51aa) Thanks [@saakshigupta2002](https://github.com/saakshigupta2002)! - fix(openai): correctly convert annotations back to OpenAI format in Responses API multi-turn conversations

## 1.2.5

### Patch Changes

- [#9743](https://github.com/langchain-ai/langchainjs/pull/9743) [`0870ca0`](https://github.com/langchain-ai/langchainjs/commit/0870ca0719dacd8a555b3341e581d6c15cd6faf3) Thanks [@d2201](https://github.com/d2201)! - fix(openai): include encrypted reasoning in ZDR responses input

- [#9934](https://github.com/langchain-ai/langchainjs/pull/9934) [`cf46089`](https://github.com/langchain-ai/langchainjs/commit/cf46089d250b1ec87f99956f5cd87e2615ac25c5) Thanks [@hntrl](https://github.com/hntrl)! - feat(openai): update openai SDK to ^6.18.0
  - Adds support for codex 5.3
  - Added `action` option to image generation tool (`generate`, `edit`, `auto`)
  - Removed `@ts-expect-error` for `gpt-image-1.5` model (now in SDK types)
  - Auto-route codex models (`codex-mini-latest`, `gpt-5-codex`, `gpt-5.1-codex`, etc.) to Responses API
  - Added `shell_call` and `local_shell_call` to streaming converter and input reconstruction
  - Added unit tests for `isReasoningModel` and `_modelPrefersResponsesAPI`

## 1.2.4

### Patch Changes

- [#9887](https://github.com/langchain-ai/langchainjs/pull/9887) [`1fa865b`](https://github.com/langchain-ai/langchainjs/commit/1fa865b1cb8a30c2269b83cdb5fc84d374c3fca9) Thanks [@Muhammad-Kamran-Khan](https://github.com/Muhammad-Kamran-Khan)! - Fix validation to allow file_url and file_id without filename metadata in Responses API, and prevent sending filename when not allowed.

- [#9873](https://github.com/langchain-ai/langchainjs/pull/9873) [`28efb57`](https://github.com/langchain-ai/langchainjs/commit/28efb57448933368094ca41c63d9262ac0f348a6) Thanks [@hntrl](https://github.com/hntrl)! - Add `reasoningEffort` call option as a convenience shorthand for `reasoning.effort`
  - Adds `reasoningEffort` to `BaseChatOpenAICallOptions` for easier configuration of reasoning models
  - Automatically coalesces `reasoningEffort` into `reasoning.effort` when calling reasoning models (o1, o3, etc.)
  - If both `reasoningEffort` and `reasoning.effort` are provided, `reasoning.effort` takes precedence
  - Marked as `@deprecated` to encourage use of the full `reasoning.effort` option

- [#9876](https://github.com/langchain-ai/langchainjs/pull/9876) [`4e42452`](https://github.com/langchain-ai/langchainjs/commit/4e42452e4c020408bd6687667e931497b05aaff5) Thanks [@sflanker](https://github.com/sflanker)! - fix(openai): pass runManager to responses.\_generate function in ChatOpenAI

- [#9900](https://github.com/langchain-ai/langchainjs/pull/9900) [`a9b5059`](https://github.com/langchain-ai/langchainjs/commit/a9b50597186002221aaa4585246e569fa44c27c8) Thanks [@hntrl](https://github.com/hntrl)! - Improved abort signal handling for chat models:
  - Added `ModelAbortError` class in `@langchain/core/errors` that contains partial output when a model invocation is aborted mid-stream
  - `invoke()` now throws `ModelAbortError` with accumulated `partialOutput` when aborted during streaming (when using streaming callback handlers)
  - `stream()` throws a regular `AbortError` when aborted (since chunks are already yielded to the caller)
  - All provider implementations now properly check and propagate abort signals in both `_generate()` and `_streamResponseChunks()` methods
  - Added standard tests for abort signal behavior

- [#9900](https://github.com/langchain-ai/langchainjs/pull/9900) [`a9b5059`](https://github.com/langchain-ai/langchainjs/commit/a9b50597186002221aaa4585246e569fa44c27c8) Thanks [@hntrl](https://github.com/hntrl)! - fix(providers): add proper abort signal handling for invoke and stream operations
  - Added early abort check (`signal.throwIfAborted()`) at the start of `_generate` methods to immediately throw when signal is already aborted
  - Added abort signal checks inside streaming loops in `_streamResponseChunks` to return early when signal is aborted
  - Propagated abort signals to underlying SDK calls where applicable (Google GenAI, Google Common/VertexAI, Cohere)
  - Added standard tests for abort signal behavior in `@langchain/standard-tests`

  This enables proper cancellation behavior for both invoke and streaming operations, and allows fallback chains to correctly proceed to the next runnable when the previous one is aborted.

## 1.2.3

### Patch Changes

- [#9679](https://github.com/langchain-ai/langchainjs/pull/9679) [`a7c6ec5`](https://github.com/langchain-ai/langchainjs/commit/a7c6ec51ab9baa186ab5ebf815599c08f5c7e8ab) Thanks [@christian-bromann](https://github.com/christian-bromann)! - feat(openai): elevate OpenAI image generation outputs to proper image content blocks

- [#9810](https://github.com/langchain-ai/langchainjs/pull/9810) [`04923f9`](https://github.com/langchain-ai/langchainjs/commit/04923f9835e5b3677c180b601ae8f3e7d8be0236) Thanks [@christian-bromann](https://github.com/christian-bromann)! - Cb/OpenAI reasoning fix

- [#9827](https://github.com/langchain-ai/langchainjs/pull/9827) [`e16c218`](https://github.com/langchain-ai/langchainjs/commit/e16c218b81980a1c576af5192342019975bb95b9) Thanks [@sanjaiyan-dev](https://github.com/sanjaiyan-dev)! - optimize stream chunk aggregation and remove redundant sorting

## 1.2.2

### Patch Changes

- [#9777](https://github.com/langchain-ai/langchainjs/pull/9777) [`3efe79c`](https://github.com/langchain-ai/langchainjs/commit/3efe79c62ff2ffe0ada562f7eecd85be074b649a) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(core): properly elevate reasoning tokens

## 1.2.1

### Patch Changes

- [#9730](https://github.com/langchain-ai/langchainjs/pull/9730) [`13c9d5b`](https://github.com/langchain-ai/langchainjs/commit/13c9d5bfa3acac7ffb37642e9a50d84dc9004e88) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(openai): pass through provider-native content in ToolMessage without stringification

- [#9737](https://github.com/langchain-ai/langchainjs/pull/9737) [`75b3b90`](https://github.com/langchain-ai/langchainjs/commit/75b3b90c5fa62cbbfa678dfb01f031caed4488ef) Thanks [@hntrl](https://github.com/hntrl)! - fix(openai): pass runManager to \_streamResponseChunks in responses API

## 1.2.0

### Minor Changes

- [#9541](https://github.com/langchain-ai/langchainjs/pull/9541) [`eab88a5`](https://github.com/langchain-ai/langchainjs/commit/eab88a5ab7610f5b63212f753ebcbeee2f393622) Thanks [@christian-bromann](https://github.com/christian-bromann)! - feat(openai): add support for fileSearch tool

- [#9541](https://github.com/langchain-ai/langchainjs/pull/9541) [`5f79bc5`](https://github.com/langchain-ai/langchainjs/commit/5f79bc50aebc093c90b6716c0aebf5c4813d0171) Thanks [@christian-bromann](https://github.com/christian-bromann)! - feat(openai): support web search tool

- [#9541](https://github.com/langchain-ai/langchainjs/pull/9541) [`7b301c0`](https://github.com/langchain-ai/langchainjs/commit/7b301c00ac851c286a13c2a908757cb40180c768) Thanks [@christian-bromann](https://github.com/christian-bromann)! - feat(openai): add support for shell tool

- [#9541](https://github.com/langchain-ai/langchainjs/pull/9541) [`bb2f422`](https://github.com/langchain-ai/langchainjs/commit/bb2f422cd8e0d709d82baca44565980abb57120f) Thanks [@christian-bromann](https://github.com/christian-bromann)! - feat(openai): support code interpreter tool

- [#9541](https://github.com/langchain-ai/langchainjs/pull/9541) [`2a5ba50`](https://github.com/langchain-ai/langchainjs/commit/2a5ba50d240e7d6181546facf088142fbb7b4977) Thanks [@christian-bromann](https://github.com/christian-bromann)! - feat(openai): add support for local shell tool

- [#9634](https://github.com/langchain-ai/langchainjs/pull/9634) [`47edf3f`](https://github.com/langchain-ai/langchainjs/commit/47edf3fc673eb0627ec585a3a5c2b9381e234527) Thanks [@christian-bromann](https://github.com/christian-bromann)! - feat(openai): add 'moderateContent' to ChatOpenAI for content moderation #9410

- [#9541](https://github.com/langchain-ai/langchainjs/pull/9541) [`2e563e3`](https://github.com/langchain-ai/langchainjs/commit/2e563e332772aa0468f610c334cbedd7f3513ce8) Thanks [@christian-bromann](https://github.com/christian-bromann)! - feat(openai): add support for apply patch tool

- [#9541](https://github.com/langchain-ai/langchainjs/pull/9541) [`f97b488`](https://github.com/langchain-ai/langchainjs/commit/f97b488200b34c485b15a743277984ecacc62160) Thanks [@christian-bromann](https://github.com/christian-bromann)! - feat(openai): support for MCP connector tool

- [#9541](https://github.com/langchain-ai/langchainjs/pull/9541) [`6baa851`](https://github.com/langchain-ai/langchainjs/commit/6baa851176b5dde5da19891df114a4645dfe7481) Thanks [@christian-bromann](https://github.com/christian-bromann)! - feat(langchain): add support for image generation tool

- [#9541](https://github.com/langchain-ai/langchainjs/pull/9541) [`69a1045`](https://github.com/langchain-ai/langchainjs/commit/69a1045e1e14aed9273a1a4085ac35e601a1ecc7) Thanks [@christian-bromann](https://github.com/christian-bromann)! - add support for computer use tool

### Patch Changes

- [#9636](https://github.com/langchain-ai/langchainjs/pull/9636) [`5a01b5b`](https://github.com/langchain-ai/langchainjs/commit/5a01b5b705f6933958f61318b22f00b5f4763be8) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix content in AIMessage for tool and function calls

- [#9570](https://github.com/langchain-ai/langchainjs/pull/9570) [`72795fe`](https://github.com/langchain-ai/langchainjs/commit/72795fe76b515d9edc7d78fb28db59df844ce0c3) Thanks [@ddewaele](https://github.com/ddewaele)! - fixes filename / base64 conversions in openai completions converters (#9512)

- [#9648](https://github.com/langchain-ai/langchainjs/pull/9648) [`29a8480`](https://github.com/langchain-ai/langchainjs/commit/29a8480799d4c3534892a29cef4a135c437deb9b) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): allow to set strict tag manually in providerStrategy #9578

- [#9631](https://github.com/langchain-ai/langchainjs/pull/9631) [`3ecc1e7`](https://github.com/langchain-ai/langchainjs/commit/3ecc1e716704a032e941e670d1d9fbf5370d57aa) Thanks [@jacoblee93](https://github.com/jacoblee93)! - feat(openai): Prefer responses API for 5.2 pro

- [#9591](https://github.com/langchain-ai/langchainjs/pull/9591) [`a552cad`](https://github.com/langchain-ai/langchainjs/commit/a552cad1a463239a0d1d1b5da7798978722738cf) Thanks [@Ayushsingla1](https://github.com/Ayushsingla1)! - add prompt cache retention support

## 1.1.3

### Patch Changes

- [#9416](https://github.com/langchain-ai/langchainjs/pull/9416) [`0fe9beb`](https://github.com/langchain-ai/langchainjs/commit/0fe9bebee6710f719e47f913eec1ec4f638e4de4) Thanks [@hntrl](https://github.com/hntrl)! - fix 'moduleResultion: "node"' compatibility

## 1.1.2

### Patch Changes

- [#9408](https://github.com/langchain-ai/langchainjs/pull/9408) [`415cb0b`](https://github.com/langchain-ai/langchainjs/commit/415cb0bfd26207583befdb02367bd12a46b33d51) Thanks [@sinedied](https://github.com/sinedied)! - Fix missing and inconsistent user agent headers

- [#9301](https://github.com/langchain-ai/langchainjs/pull/9301) [`a2ad61e`](https://github.com/langchain-ai/langchainjs/commit/a2ad61e787a06a55a615f63589a65ada05927792) Thanks [@sinedied](https://github.com/sinedied)! - support callable function for apiKey

## 1.1.1

### Patch Changes

- [#9308](https://github.com/langchain-ai/langchainjs/pull/9308) [`04bd55c`](https://github.com/langchain-ai/langchainjs/commit/04bd55c63d8a0cb56f85da0b61a6bd6169b383f3) Thanks [@ro0sterjam](https://github.com/ro0sterjam)! - respect JSON schema references in interopZodTransformInputSchema

- [#9387](https://github.com/langchain-ai/langchainjs/pull/9387) [`ac0d4fe`](https://github.com/langchain-ai/langchainjs/commit/ac0d4fe3807e05eb2185ae8a36da69498e6163d4) Thanks [@hntrl](https://github.com/hntrl)! - Add `ModelProfile` and `.profile` properties to ChatModel

- [#9383](https://github.com/langchain-ai/langchainjs/pull/9383) [`39dbe63`](https://github.com/langchain-ai/langchainjs/commit/39dbe63e3d8390bb90bb8b17f00755fa648c5651) Thanks [@hntrl](https://github.com/hntrl)! - export converters

- [#9397](https://github.com/langchain-ai/langchainjs/pull/9397) [`dfbe45f`](https://github.com/langchain-ai/langchainjs/commit/dfbe45f3cfade7a1dbe15b2d702a8e9f8e5ac93a) Thanks [@hntrl](https://github.com/hntrl)! - bump sdk version

## 1.1.0

### Minor Changes

- 8319201: hoist message/tool conversion utilities from classes

### Patch Changes

- 4906522: fix(openai): pair reasoning with function_call id

## 1.0.0

This release updates the package for compatibility with LangChain v1.0. See the v1.0 [release notes](https://docs.langchain.com/oss/javascript/releases/langchain-v1) for details on what's new.

## 0.6.16

### Patch Changes

- b8ffc1e: fix(openai): Remove raw OpenAI fields from token usage

## 0.6.15

### Patch Changes

- e63c7cc: fix(openai): Convert OpenAI responses API usage to tracing format

## 0.6.14

### Patch Changes

- d38e9d6: fix(openai): fix streaming in openai

## 0.6.12

### Patch Changes

- 41bd944: support base64 embeddings format
- 707a768: handle undefined disableStreaming to restore streaming functionality

## 0.6.11

### Patch Changes

- 65459e3: use proper casing for reasoning effort param

## 0.6.10

### Patch Changes

- 4a3f5af: add verbosity to json schema response format (#8754)
- 424360b: re-add reasoning_effort param
