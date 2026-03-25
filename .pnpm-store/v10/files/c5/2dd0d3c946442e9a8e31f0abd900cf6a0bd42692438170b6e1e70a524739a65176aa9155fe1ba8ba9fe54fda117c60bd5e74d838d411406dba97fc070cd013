# @langchain/core

## 1.1.34

### Patch Changes

- [#10312](https://github.com/langchain-ai/langchainjs/pull/10312) [`bfb7944`](https://github.com/langchain-ai/langchainjs/commit/bfb7944a105470eee98fe4a0eef91e586600e1de) Thanks [@jacoblee93](https://github.com/jacoblee93)! - feat(core): Add all invocation params as part of metadata

## 1.1.33

### Patch Changes

- [#10412](https://github.com/langchain-ai/langchainjs/pull/10412) [`6db417b`](https://github.com/langchain-ai/langchainjs/commit/6db417b03ecb5e2ace413389d982294e0ac88433) Thanks [@pawel-twardziak](https://github.com/pawel-twardziak)! - fix(core): respect timeout option in streamEvents v2

- [#10424](https://github.com/langchain-ai/langchainjs/pull/10424) [`d69dfcc`](https://github.com/langchain-ai/langchainjs/commit/d69dfcca97503cf1c0b7e70ccf5fb7d507c60982) Thanks [@pawel-twardziak](https://github.com/pawel-twardziak)! - fix(core): preserve multimodal content in getBufferString as placeholders

## 1.1.32

### Patch Changes

- [#10330](https://github.com/langchain-ai/langchainjs/pull/10330) [`26488b5`](https://github.com/langchain-ai/langchainjs/commit/26488b596f01b7b7fe2f1d97d07164e52365ade5) Thanks [@hntrl](https://github.com/hntrl)! - fix(core): treat empty string tool call chunk IDs as missing during merge

  Fixed `_mergeLists` in message base to treat empty string `""` IDs the same as `null`/`undefined` when merging tool call chunks. This fixes old completions-style streaming where follow-up chunks carry `id: ""` instead of `undefined`, which previously prevented chunks from being merged by index.

- [#10167](https://github.com/langchain-ai/langchainjs/pull/10167) [`ca826f6`](https://github.com/langchain-ai/langchainjs/commit/ca826f6fecae6087bf0dee7781ee80b587396ec1) Thanks [@colifran](https://github.com/colifran)! - feat: implement type inference for tool streams

- [#10334](https://github.com/langchain-ai/langchainjs/pull/10334) [`a602c42`](https://github.com/langchain-ai/langchainjs/commit/a602c42db75d7e7e01cab38b12e0b65b9c0cce95) Thanks [@maahir30](https://github.com/maahir30)! - fix(core): add JSDoc docstrings to fakeModel builder API and export FakeBuiltModel

- [#10254](https://github.com/langchain-ai/langchainjs/pull/10254) [`db7d017`](https://github.com/langchain-ai/langchainjs/commit/db7d017f7ce13cb937147aabcbfa3847d80bde9d) Thanks [@pawel-twardziak](https://github.com/pawel-twardziak)! - fix(core): preserve thoughtSignature in array content during streaming with thinking models

## 1.1.31

### Patch Changes

- [#10271](https://github.com/langchain-ai/langchainjs/pull/10271) [`7373b4c`](https://github.com/langchain-ai/langchainjs/commit/7373b4cd6a78bee105a952a11838c573fd1aafae) Thanks [@jacoblee93](https://github.com/jacoblee93)! - feat(core): Use uuid7 instead of v4 for generating run ids

- [#10262](https://github.com/langchain-ai/langchainjs/pull/10262) [`b0175a5`](https://github.com/langchain-ai/langchainjs/commit/b0175a5d3b68e8fba44a85bc23879bd06def2f52) Thanks [@maahir30](https://github.com/maahir30)! - fix: Move fakeModel from utils/testing to testing namespace
  move to updated namespace

- [#10185](https://github.com/langchain-ai/langchainjs/pull/10185) [`414f6ed`](https://github.com/langchain-ai/langchainjs/commit/414f6ed402ac6f1c0fd6cce4bed64fa3708eea3d) Thanks [@maahir30](https://github.com/maahir30)! - feat: add custom Vitest matchers for LangChain message and tool call assertions

  Adds a new `@langchain/core/testing/matchers` export containing custom Vitest matchers (`toBeHumanMessage`, `toBeAIMessage`, `toBeSystemMessage`, `toBeToolMessage`, `toHaveToolCalls`, `toHaveToolCallCount`, `toContainToolCall`, `toHaveToolMessages`, `toHaveBeenInterrupted`, `toHaveStructuredResponse`) that external users can register via `expect.extend(langchainMatchers)` in their Vitest setup files. Re-exported from `langchain` for convenience.

## 1.1.30

### Patch Changes

- [#10243](https://github.com/langchain-ai/langchainjs/pull/10243) [`96c630d`](https://github.com/langchain-ai/langchainjs/commit/96c630dfd009f2546d5bc36f5067ff868bb4067f) Thanks [@hntrl](https://github.com/hntrl)! - fix: add explicit `: symbol` type annotations to Symbol.for() declarations for cross-version compatibility

  TypeScript infers `unique symbol` type when Symbol.for() is used without an explicit type annotation, causing type incompatibility when multiple versions of the same package are present in a dependency tree. By adding explicit `: symbol` annotations, all declarations now use the general symbol type, making them compatible across versions while maintaining identical runtime behavior.

  Changes:
  - Added `: symbol` to `MESSAGE_SYMBOL` in messages/base.ts
  - Added `: symbol` to `MIDDLEWARE_BRAND` in agents/middleware/types.ts (also changed from Symbol() to Symbol.for() for cross-realm compatibility)

- [#10256](https://github.com/langchain-ai/langchainjs/pull/10256) [`a8b9ccc`](https://github.com/langchain-ai/langchainjs/commit/a8b9ccca5a85984a5a30008acd09f9991e591638) Thanks [@colifran](https://github.com/colifran)! - fix(core): standard schema type guards don't support callable schemas

- [#10204](https://github.com/langchain-ai/langchainjs/pull/10204) [`a1f22bb`](https://github.com/langchain-ai/langchainjs/commit/a1f22bba907731a18dca23c31cec5333444a3f55) Thanks [@colifran](https://github.com/colifran)! - feat(core): implement standard schema support for structured output

## 1.1.29

### Patch Changes

- [#10106](https://github.com/langchain-ai/langchainjs/pull/10106) [`9f30267`](https://github.com/langchain-ai/langchainjs/commit/9f30267e95a2a42fac71f1d3674b84c5a190dbbc) Thanks [@hntrl](https://github.com/hntrl)! - Add package version metadata to runnable traces. Each package now stamps its version in `this.metadata.versions` at construction time, making version info available in LangSmith trace metadata.

- [#10154](https://github.com/langchain-ai/langchainjs/pull/10154) [`403a99f`](https://github.com/langchain-ai/langchainjs/commit/403a99fd826383f30300809ae077e1c967023520) Thanks [@kanweiwei](https://github.com/kanweiwei)! - fix(core): add usage_metadata to AIMessage lc_aliases

- [#10169](https://github.com/langchain-ai/langchainjs/pull/10169) [`3b1fd54`](https://github.com/langchain-ai/langchainjs/commit/3b1fd5458a4aa29c398122829f383f21b5ac39da) Thanks [@hntrl](https://github.com/hntrl)! - fix(core, langchain): bump uuid dependency from ^10.0.0 to ^11.0.0 to fix Metro bundler error

  The `uuid` v10 package has ambiguous `exports` in its `package.json` which causes Metro (used by Expo/React Native) to resolve the wrong entry point, resulting in `Cannot read properties of undefined (reading 'v1')`. The `uuid` v11 package fixes its exports map to work correctly with Metro's package exports resolution.

- [#10044](https://github.com/langchain-ai/langchainjs/pull/10044) [`77bd982`](https://github.com/langchain-ai/langchainjs/commit/77bd98274a885e947d76f7a9c6dd0b3763453218) Thanks [@hntrl](https://github.com/hntrl)! - fix(core): remove inherited LangChainTracer handlers when tracingEnabled is false

  When a RunTree explicitly disables tracing via `tracingEnabled: false`, `CallbackManager._configureSync` now strips any inherited `LangChainTracer` handlers so child runs don't produce traces.

## 1.1.28

### Patch Changes

- [#10140](https://github.com/langchain-ai/langchainjs/pull/10140) [`10a876c`](https://github.com/langchain-ai/langchainjs/commit/10a876c7d5ff27d8f2889761ee20e95f76a50518) Thanks [@hntrl](https://github.com/hntrl)! - Merge content blocks by string index during streaming.

- [#10102](https://github.com/langchain-ai/langchainjs/pull/10102) [`b46d96a`](https://github.com/langchain-ai/langchainjs/commit/b46d96a508a8bf212561dbb6f025e35c75f16257) Thanks [@colifran](https://github.com/colifran)! - feat: implement aynchronous generator tool calling for streaming partial tool results

## 1.1.27

### Patch Changes

- [#10104](https://github.com/langchain-ai/langchainjs/pull/10104) [`fb2226e`](https://github.com/langchain-ai/langchainjs/commit/fb2226e6decdaba21e78b3f01877b45fa1eed6d3) Thanks [@hntrl](https://github.com/hntrl)! - Revert "chore(deps): bump ansi-styles from 5.2.0 to 6.2.3"

## 1.1.26

### Patch Changes

- [#10085](https://github.com/langchain-ai/langchainjs/pull/10085) [`ed6ea53`](https://github.com/langchain-ai/langchainjs/commit/ed6ea53c38a004b65e30c0f5888a0ac7d8ee7028) Thanks [@colifran](https://github.com/colifran)! - fix(google): tool_calls are not preserved when concatenating AIMessageChunks

## 1.1.25

### Patch Changes

- [#10002](https://github.com/langchain-ai/langchainjs/pull/10002) [`27186c5`](https://github.com/langchain-ai/langchainjs/commit/27186c54884cfe7c2522fa50b42c3ca0ccaefdba) Thanks [@aditya-gg04](https://github.com/aditya-gg04)! - fix(core): support reasoning/thinking blocks in StringOutputParser

- [#10077](https://github.com/langchain-ai/langchainjs/pull/10077) [`05396f7`](https://github.com/langchain-ai/langchainjs/commit/05396f7ce0a91c49a3bae4bbcd3dbdd6cbd18089) Thanks [@christian-bromann](https://github.com/christian-bromann)! - feat(core): add ContextOverflowError, raise in anthropic and openai

- [#10081](https://github.com/langchain-ai/langchainjs/pull/10081) [`5a6f26b`](https://github.com/langchain-ai/langchainjs/commit/5a6f26bbaed80195dc538c538b96219a8b03f38f) Thanks [@hntrl](https://github.com/hntrl)! - feat(core): add namespace-based symbol branding for error class hierarchies

  Introduces `createNamespace` utility for hierarchical symbol-based branding of class hierarchies.
  All LangChain error classes now use this pattern, replacing hand-rolled duck-type `isInstance` checks
  with reliable cross-realm `Symbol.for`-based identity.
  - New `LangChainError` base class that all LangChain errors extend
  - New `createNamespace` / `Namespace` API in `@langchain/core/utils/namespace`
  - Refactored `ModelAbortError`, `ContextOverflowError` to use namespace branding
  - Added `ContextOverflowError.fromError()` static factory method
  - Deprecated `addLangChainErrorFields` in favor of `LangChainError` subclasses
  - Migrated Google provider errors (`GoogleError`, `ConfigurationError`, etc.) to namespace branding
  - Updated Anthropic and OpenAI providers to use `ContextOverflowError.fromError()`

## 1.1.24

### Patch Changes

- [#9978](https://github.com/langchain-ai/langchainjs/pull/9978) [`70a4400`](https://github.com/langchain-ai/langchainjs/commit/70a440085b4bc2d036726ed12d9dc7841e914061) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(core): fix web_search_call and file_search_call contentBlocks for OpenAI Responses API

## 1.1.23

### Patch Changes

- [#10000](https://github.com/langchain-ai/langchainjs/pull/10000) [`71d08c0`](https://github.com/langchain-ai/langchainjs/commit/71d08c0a3a2597bd5a084eb35a7830e5ea1a2b29) Thanks [@hntrl](https://github.com/hntrl)! - feat(google): add `@langchain/google` -- unified Google/Gemini integration

  New package that replaces the fragmented `@langchain/google-genai` / `@langchain/google-common` / Vertex AI package stack with a single integration.

  Published as 0.1.0 (early release). Existing Google packages will continue to receive maintenance updates.

## 1.1.22

### Patch Changes

- [#9995](https://github.com/langchain-ai/langchainjs/pull/9995) [`8f166b1`](https://github.com/langchain-ai/langchainjs/commit/8f166b159343ae6fd0d6d44c0835ab56c0b153f4) Thanks [@kaigritun](https://github.com/kaigritun)! - fix(core): skip empty text blocks in ChatOpenAI contentBlocks

## 1.1.21

### Patch Changes

- [#9990](https://github.com/langchain-ai/langchainjs/pull/9990) [`d5e3db0`](https://github.com/langchain-ai/langchainjs/commit/d5e3db0d01ab321ec70a875805b2f74aefdadf9d) Thanks [@hntrl](https://github.com/hntrl)! - feat(core): Add SSRF protection module (`@langchain/core/utils/ssrf`) with utilities for validating URLs against private IPs, cloud metadata endpoints, and localhost.

  fix(community): Harden `RecursiveUrlLoader` against SSRF attacks by integrating `validateSafeUrl` and replacing string-based URL comparison with origin-based `isSameOrigin` from the shared SSRF module.

## 1.1.20

### Patch Changes

- [#9957](https://github.com/langchain-ai/langchainjs/pull/9957) [`71c3cba`](https://github.com/langchain-ai/langchainjs/commit/71c3cba843ab16d877299d158a1de0c7d22f3fb9) Thanks [@jacoblee93](https://github.com/jacoblee93)! - feat(langchain,core): Update prompt pulling params, LangSmith version

## 1.1.19

### Patch Changes

- [#9905](https://github.com/langchain-ai/langchainjs/pull/9905) [`41bfea5`](https://github.com/langchain-ai/langchainjs/commit/41bfea51cf119573a3b956ee782d2731fe71c681) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(classic/community/core): avoid long lived abort signals

## 1.1.18

### Patch Changes

- [#9900](https://github.com/langchain-ai/langchainjs/pull/9900) [`a9b5059`](https://github.com/langchain-ai/langchainjs/commit/a9b50597186002221aaa4585246e569fa44c27c8) Thanks [@hntrl](https://github.com/hntrl)! - fix(core): update method signatures to use `Partial<CallOptions>` for options parameters

  Updated `invoke`, `stream`, `generate`, and `generatePrompt` method signatures across `Runnable`, `BaseChatModel`, and `BaseLLM` to correctly accept `Partial<CallOptions>` instead of full `CallOptions`. This aligns the implementation with the `RunnableInterface` specification and allows users to pass partial options (e.g., `{ signal: abortedSignal }`) without TypeScript errors.

- [#9900](https://github.com/langchain-ai/langchainjs/pull/9900) [`a9b5059`](https://github.com/langchain-ai/langchainjs/commit/a9b50597186002221aaa4585246e569fa44c27c8) Thanks [@hntrl](https://github.com/hntrl)! - Improved abort signal handling for chat models:
  - Added `ModelAbortError` class in `@langchain/core/errors` that contains partial output when a model invocation is aborted mid-stream
  - `invoke()` now throws `ModelAbortError` with accumulated `partialOutput` when aborted during streaming (when using streaming callback handlers)
  - `stream()` throws a regular `AbortError` when aborted (since chunks are already yielded to the caller)
  - All provider implementations now properly check and propagate abort signals in both `_generate()` and `_streamResponseChunks()` methods
  - Added standard tests for abort signal behavior

## 1.1.17

### Patch Changes

- [#9842](https://github.com/langchain-ai/langchainjs/pull/9842) [`05a9733`](https://github.com/langchain-ai/langchainjs/commit/05a9733448a10764c0bfd070af859c33e623b998) Thanks [@encodedz](https://github.com/encodedz)! - Adding `on_tool_error` event into EventStreamCallbackHandler

## 1.1.16

### Patch Changes

- [#9830](https://github.com/langchain-ai/langchainjs/pull/9830) [`70387a1`](https://github.com/langchain-ai/langchainjs/commit/70387a144464539d65a546c8130cf51dfad025a1) Thanks [@bracesproul](https://github.com/bracesproul)! - fix: More undefined null errors and tests

- [#9679](https://github.com/langchain-ai/langchainjs/pull/9679) [`a7c6ec5`](https://github.com/langchain-ai/langchainjs/commit/a7c6ec51ab9baa186ab5ebf815599c08f5c7e8ab) Thanks [@christian-bromann](https://github.com/christian-bromann)! - feat(openai): elevate OpenAI image generation outputs to proper image content blocks

- [#9817](https://github.com/langchain-ai/langchainjs/pull/9817) [`5e04543`](https://github.com/langchain-ai/langchainjs/commit/5e045435a783fdae44bc9a43e01a8e5eb7100db2) Thanks [@Ashx098](https://github.com/Ashx098)! - read error.status when response.status is absent to avoid retrying OpenAI SDK 4xx

- [#9819](https://github.com/langchain-ai/langchainjs/pull/9819) [`40b4467`](https://github.com/langchain-ai/langchainjs/commit/40b446762445575844610ee528abc77c247b2c43) Thanks [@MrDockal](https://github.com/MrDockal)! - Tool call content returns compacted json

- [#9815](https://github.com/langchain-ai/langchainjs/pull/9815) [`17e30bd`](https://github.com/langchain-ai/langchainjs/commit/17e30bd7f4c7bdf87c9c30304b3b9e121cc1fbbc) Thanks [@hntrl](https://github.com/hntrl)! - fix(core): respect tracingEnabled=false from RunTree when env tracing is enabled

## 1.1.15

### Patch Changes

- [#9781](https://github.com/langchain-ai/langchainjs/pull/9781) [`230462d`](https://github.com/langchain-ai/langchainjs/commit/230462d28c3a8b5ccadf433ea2f523eb6e658de6) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(core): preserve index and timestamp fields in \_mergeDicts

## 1.1.14

### Patch Changes

- [#9797](https://github.com/langchain-ai/langchainjs/pull/9797) [`bd1ab45`](https://github.com/langchain-ai/langchainjs/commit/bd1ab45364391f69ce93ecba36a4a15dafca2b76) Thanks [@christian-bromann](https://github.com/christian-bromann)! - handle undefined error objects in async-caller

## 1.1.13

### Patch Changes

- [#9777](https://github.com/langchain-ai/langchainjs/pull/9777) [`3efe79c`](https://github.com/langchain-ai/langchainjs/commit/3efe79c62ff2ffe0ada562f7eecd85be074b649a) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(core): properly elevate reasoning tokens

- [#9789](https://github.com/langchain-ai/langchainjs/pull/9789) [`b8561c1`](https://github.com/langchain-ai/langchainjs/commit/b8561c17556bdf7a3ff8d70bc307422642a9172e) Thanks [@hntrl](https://github.com/hntrl)! - source JsonOutputParser content from text accessor

## 1.1.12

### Patch Changes

- [#9517](https://github.com/langchain-ai/langchainjs/pull/9517) [`23be5af`](https://github.com/langchain-ai/langchainjs/commit/23be5afd59b5f4806edef11937ce5e2ba300f7ee) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(@langchain/core): add literal name type inference to tool()

## 1.1.11

### Patch Changes

- [#9753](https://github.com/langchain-ai/langchainjs/pull/9753) [`a46a249`](https://github.com/langchain-ai/langchainjs/commit/a46a24983fd0fea649d950725a2673b3c435275f) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(core): allow shared object references in serialization

## 1.1.10

### Patch Changes

- [#9746](https://github.com/langchain-ai/langchainjs/pull/9746) [`817fc9a`](https://github.com/langchain-ai/langchainjs/commit/817fc9a56d4699f3563a6e153b13eadf7bcc661b) Thanks [@bracesproul](https://github.com/bracesproul)! - fix: `_mergeDicts` error when merging undefined values

## 1.1.9

### Patch Changes

- [#9725](https://github.com/langchain-ai/langchainjs/pull/9725) [`56600b9`](https://github.com/langchain-ai/langchainjs/commit/56600b94f8e185f44d4288b7a9b66c55778938dd) Thanks [@Orenoid](https://github.com/Orenoid)! - fix(langchain): update merge logic for numeric values in `mergeDicts`

- [#9736](https://github.com/langchain-ai/langchainjs/pull/9736) [`dc5c2ac`](https://github.com/langchain-ai/langchainjs/commit/dc5c2ac00f86dd2feeba9843d708926a5f38202e) Thanks [@hntrl](https://github.com/hntrl)! - fix(core): handle circular references in `load`

- [#9739](https://github.com/langchain-ai/langchainjs/pull/9739) [`c28d24a`](https://github.com/langchain-ai/langchainjs/commit/c28d24a8770f6d0e543cde116b0e38b3baf21301) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(core): use getBufferString for message summarization

- [#9702](https://github.com/langchain-ai/langchainjs/pull/9702) [`bfcb87d`](https://github.com/langchain-ai/langchainjs/commit/bfcb87d23c580c7881f650960a448fe2e54a30b3) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(core): improve interop with Zod

## 1.1.8

### Patch Changes

- [#9707](https://github.com/langchain-ai/langchainjs/pull/9707) [`e5063f9`](https://github.com/langchain-ai/langchainjs/commit/e5063f9c6e9989ea067dfdff39262b9e7b6aba62) Thanks [@hntrl](https://github.com/hntrl)! - add security hardening for `load`

- [#9684](https://github.com/langchain-ai/langchainjs/pull/9684) [`8996647`](https://github.com/langchain-ai/langchainjs/commit/89966470e8c0b112ce4f9a326004af6a4173f9e6) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(core): document purpose of name in base message

## 1.1.7

### Patch Changes

- [#9686](https://github.com/langchain-ai/langchainjs/pull/9686) [`df9c42b`](https://github.com/langchain-ai/langchainjs/commit/df9c42b3ab61b85309ab47256e1d93c3188435ee) Thanks [@hntrl](https://github.com/hntrl)! - add usage_metadata to metadata in LangChainTracer

- [#9665](https://github.com/langchain-ai/langchainjs/pull/9665) [`8d2982b`](https://github.com/langchain-ai/langchainjs/commit/8d2982bb94c0f4e4314ace3cc98a1ae87571b1ed) Thanks [@jacoblee93](https://github.com/jacoblee93)! - feat(core): Make runnable transform trace in a single payload in LangChainTracer

- [#9675](https://github.com/langchain-ai/langchainjs/pull/9675) [`af664be`](https://github.com/langchain-ai/langchainjs/commit/af664becc0245b2315ea2f784c9a6c1d7622dbb4) Thanks [@jacoblee93](https://github.com/jacoblee93)! - Bump LangSmith dep to 0.4.0

- [#9673](https://github.com/langchain-ai/langchainjs/pull/9673) [`ffb2402`](https://github.com/langchain-ai/langchainjs/commit/ffb24026cd93e58219519ee24c6e23ea57cb5bde) Thanks [@hntrl](https://github.com/hntrl)! - add `context` utility

## 1.1.6

### Patch Changes

- [#9668](https://github.com/langchain-ai/langchainjs/pull/9668) [`a7b2a7d`](https://github.com/langchain-ai/langchainjs/commit/a7b2a7db5ef57df3731ae6c9931f4b663e909505) Thanks [@bracesproul](https://github.com/bracesproul)! - fix: Cannot merge two undefined objects error

- [#9657](https://github.com/langchain-ai/langchainjs/pull/9657) [`a496c5f`](https://github.com/langchain-ai/langchainjs/commit/a496c5fc64d94cc0809216325b0f1bfde3f92c45) Thanks [@dqbd](https://github.com/dqbd)! - fix(core): avoid writing to TransformStream in EventStreamCallbackHandler when underlying ReadableStream is closed

- [#9658](https://github.com/langchain-ai/langchainjs/pull/9658) [`1da1325`](https://github.com/langchain-ai/langchainjs/commit/1da1325aea044fb37af54a9de1f4ae0b9f47d4a2) Thanks [@dqbd](https://github.com/dqbd)! - fix(core): ensure streaming test chat models respect AbortSignal

## 1.1.5

### Patch Changes

- [#9641](https://github.com/langchain-ai/langchainjs/pull/9641) [`005c729`](https://github.com/langchain-ai/langchainjs/commit/005c72903bcdf090e0f4c58960c8c243481f9874) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(community/core): various security fixes

- [#7907](https://github.com/langchain-ai/langchainjs/pull/7907) [`ab78246`](https://github.com/langchain-ai/langchainjs/commit/ab782462753e6c3ae5d55c0c251f795af32929d5) Thanks [@jasonphillips](https://github.com/jasonphillips)! - fix(core): handle subgraph nesting better in graph_mermaid

- [#9589](https://github.com/langchain-ai/langchainjs/pull/9589) [`8cc81c7`](https://github.com/langchain-ai/langchainjs/commit/8cc81c7cee69530f7a6296c69123edbe227b2fce) Thanks [@nathannewyen](https://github.com/nathannewyen)! - test(core): add test for response_metadata in streamEvents

- [#9644](https://github.com/langchain-ai/langchainjs/pull/9644) [`f32e499`](https://github.com/langchain-ai/langchainjs/commit/f32e4991d0e707324e3f6af287a1ee87ab833b7e) Thanks [@hntrl](https://github.com/hntrl)! - add bindTools to FakeListChatModel

- [#9508](https://github.com/langchain-ai/langchainjs/pull/9508) [`a28d83d`](https://github.com/langchain-ai/langchainjs/commit/a28d83d49dd1fd31e67b52a44abc70f2cc2a2026) Thanks [@shubham-021](https://github.com/shubham-021)! - Fix toFormattedString() to properly display nested objects in tool call arguments instead of [object Object]

- [#9165](https://github.com/langchain-ai/langchainjs/pull/9165) [`2e5ad70`](https://github.com/langchain-ai/langchainjs/commit/2e5ad70d16c1f13eaaea95336bbe2ec4a4a4954a) Thanks [@pawel-twardziak](https://github.com/pawel-twardziak)! - fix(mcp-adapters): preserve timeout from RunnableConfig in MCP tool calls

- [#9647](https://github.com/langchain-ai/langchainjs/pull/9647) [`e456c66`](https://github.com/langchain-ai/langchainjs/commit/e456c661aa1ab8f1ed4a98c40616f5a13270e88e) Thanks [@hntrl](https://github.com/hntrl)! - handle missing parent runs in tracer to prevent LangSmith 400 errors

- [#9597](https://github.com/langchain-ai/langchainjs/pull/9597) [`1cfe603`](https://github.com/langchain-ai/langchainjs/commit/1cfe603e97d8711343ae5f1f5a75648e7bd2a16e) Thanks [@hntrl](https://github.com/hntrl)! - use uuid7 for run ids

## 1.1.4

### Patch Changes

- [#9575](https://github.com/langchain-ai/langchainjs/pull/9575) [`0bade90`](https://github.com/langchain-ai/langchainjs/commit/0bade90ed47c7988ed86f1e695a28273c7b3df50) Thanks [@hntrl](https://github.com/hntrl)! - bin p-retry

- [#9574](https://github.com/langchain-ai/langchainjs/pull/9574) [`6c40d00`](https://github.com/langchain-ai/langchainjs/commit/6c40d00e926f377d249c2919549381522eac8ed1) Thanks [@hntrl](https://github.com/hntrl)! - Revert "fix(@langchain/core): update and bundle dependencies (#9534)"

## 1.1.3

### Patch Changes

- [#9534](https://github.com/langchain-ai/langchainjs/pull/9534) [`bd2c46e`](https://github.com/langchain-ai/langchainjs/commit/bd2c46e09e661d9ac766c09e71bc6687d6fc811c) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(@langchain/core): update and bundle `p-retry`, `ansi-styles`, `camelcase` and `decamelize` dependencies

- [#9544](https://github.com/langchain-ai/langchainjs/pull/9544) [`487378b`](https://github.com/langchain-ai/langchainjs/commit/487378bf14277659c8ca0ef06ea0f9836b818ff4) Thanks [@hntrl](https://github.com/hntrl)! - fix tool chunk concat behavior (#9450)

- [#9505](https://github.com/langchain-ai/langchainjs/pull/9505) [`138e7fb`](https://github.com/langchain-ai/langchainjs/commit/138e7fb6280705457079863bedb238b16b322032) Thanks [@chosh-dev](https://github.com/chosh-dev)! - feat: replace btoa with toBase64Url for encoding in drawMermaidImage

## 1.1.2

### Patch Changes

- [#9511](https://github.com/langchain-ai/langchainjs/pull/9511) [`833f578`](https://github.com/langchain-ai/langchainjs/commit/833f57834dc3aa64e4cfdd7499f865b2ab41462a) Thanks [@dqbd](https://github.com/dqbd)! - allow parsing more partial JSON

## 1.1.1

### Patch Changes

- [#9495](https://github.com/langchain-ai/langchainjs/pull/9495) [`636b994`](https://github.com/langchain-ai/langchainjs/commit/636b99459bf843362298866211c63a7a15c2a319) Thanks [@gsriram24](https://github.com/gsriram24)! - fix: use dynamic import for p-retry to support CommonJS environments

- [#9531](https://github.com/langchain-ai/langchainjs/pull/9531) [`38f0162`](https://github.com/langchain-ai/langchainjs/commit/38f0162b7b2db2be2c3a75ae468728adcb49fdfb) Thanks [@hntrl](https://github.com/hntrl)! - add `extras` to tools

## 1.1.0

### Minor Changes

- [#9475](https://github.com/langchain-ai/langchainjs/pull/9475) [`708d360`](https://github.com/langchain-ai/langchainjs/commit/708d360df1869def7e4caaa5995d6e907bbf54cd) Thanks [@christian-bromann](https://github.com/christian-bromann)! - allow to concat system messages

### Patch Changes

- [#9416](https://github.com/langchain-ai/langchainjs/pull/9416) [`0fe9beb`](https://github.com/langchain-ai/langchainjs/commit/0fe9bebee6710f719e47f913eec1ec4f638e4de4) Thanks [@hntrl](https://github.com/hntrl)! - fix 'moduleResultion: "node"' compatibility

- [#9463](https://github.com/langchain-ai/langchainjs/pull/9463) [`10fa2af`](https://github.com/langchain-ai/langchainjs/commit/10fa2afec0b81efd3467e61b59ba5c82e1043de5) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(core): update p-retry to fix memory leak

## 1.0.6

### Patch Changes

- [#9431](https://github.com/langchain-ai/langchainjs/pull/9431) [`5709cb6`](https://github.com/langchain-ai/langchainjs/commit/5709cb64cc3e4eb300bde5ec8ae90686d2aa3d8e) Thanks [@dqbd](https://github.com/dqbd)! - fix(core): `store` should be accessible from tools

## 1.0.5

### Patch Changes

- [#9308](https://github.com/langchain-ai/langchainjs/pull/9308) [`04bd55c`](https://github.com/langchain-ai/langchainjs/commit/04bd55c63d8a0cb56f85da0b61a6bd6169b383f3) Thanks [@ro0sterjam](https://github.com/ro0sterjam)! - respect JSON schema references in interopZodTransformInputSchema

- [#9387](https://github.com/langchain-ai/langchainjs/pull/9387) [`ac0d4fe`](https://github.com/langchain-ai/langchainjs/commit/ac0d4fe3807e05eb2185ae8a36da69498e6163d4) Thanks [@hntrl](https://github.com/hntrl)! - Add `ModelProfile` and `.profile` properties to ChatModel

## 1.0.4

### Patch Changes

- 8319201: Export standard converter function utility

## 1.0.3

### Patch Changes

- 0a8a23b: feat(@langchain/core): support of ToolRuntime

## 1.0.2

### Patch Changes

- 6426eb6: fix chunks constructed with tool calls + chunks
- 619ae64: Add `BaseMessage.toFormattedString()`

## 1.0.1

### Patch changes

- cacc137: remove bad import map exports

## 1.0.0

🎉 **LangChain v1.0** is here! This release provides a focused, production-ready foundation for building agents with significant improvements to the core abstractions and APIs. See the [release notes](https://docs.langchain.com/oss/javascript/releases/langchain-v1) for more details.

### ✨ Major Features

#### Standard content blocks

A new unified API for accessing modern LLM features across all providers:

- **New `contentBlocks` property**: Provides provider-agnostic access to reasoning traces, citations, built-in tools (web search, code interpreters, etc.), and other advanced LLM features
- **Type-safe**: Full TypeScript support with type hints for all content block types
- **Backward compatible**: Content blocks can be loaded lazily with no breaking changes to existing code

Example:

```typescript
const response = await model.invoke([
  { role: "user", content: "What is the weather in Tokyo?" },
]);

// Access structured content blocks
for (const block of response.contentBlocks) {
  if (block.type === "thinking") {
    console.log("Model reasoning:", block.thinking);
  } else if (block.type === "text") {
    console.log("Response:", block.text);
  }
}
```

For more information, see our guide on [content blocks](https://docs.langchain.com/oss/javascript/langchain/messages#content).

#### Enhanced Message API

Improvements to the core message types:

- **Structured content**: Better support for multimodal content with the new content blocks API
- **Provider compatibility**: Consistent message format across all LLM providers
- **Rich metadata**: Enhanced metadata support for tracking message provenance and transformations

### 🔧 Improvements

- **Better structured output generation**: Core abstractions for generating structured outputs in the main agent loop
- **Improved type safety**: Enhanced TypeScript definitions across all core abstractions
- **Performance optimizations**: Reduced overhead in message processing and runnable composition
- **Better error handling**: More informative error messages and better error recovery

### 📦 Package Changes

The `@langchain/core` package remains focused on essential abstractions:

- Core message types and content blocks
- Base runnable abstractions
- Tool definitions and schemas
- Middleware infrastructure
- Callback system
- Output parsers
- Prompt templates

### 🔄 Migration Notes

**Backward Compatibility**: This release maintains backward compatibility with existing code. Content blocks are loaded lazily, so no changes are required to existing applications.

**New Features**: To take advantage of new features like content blocks and middleware:

1. Update to `@langchain/core@next`:

   ```bash
   npm install @langchain/core@1.0.0
   ```

2. Use the new `contentBlocks` property to access rich content:

   ```typescript
   const response = await model.invoke(messages);
   console.log(response.contentBlocks); // New API
   console.log(response.content); // Legacy API still works
   ```

3. For middleware and `createAgent`, install `langchain@next`:

   ```bash
   npm install langchain@1.0.0 @langchain/core@1.0.0
   ```

### 📚 Additional Resources

- [LangChain 1.0 Announcement](https://blog.langchain.com/langchain-langchain-1-0-alpha-releases/)
- [Migration Guide](https://docs.langchain.com/oss/javascript/migrate/langchain-v1)
- [Content Blocks Documentation](https://docs.langchain.com/oss/javascript/langchain/messages#content)
- [Agents Documentation](https://docs.langchain.com/oss/javascript/langchain/agents)

---

## 0.3.79

### Patch Changes

- 1063b43: fix chunks constructed with tool calls + chunks

## 0.3.78

### Patch Changes

- 1519a97: update chunk concat logic to match on missing ID fields
- 079e11d: omit tool call chunks without tool call id

## 0.3.76

### Patch Changes

- 41bd944: support base64 embeddings format
- e90bc0a: fix(core): prevent tool call chunks from merging incorrectly in AIMes…
- 3a99a40: Fix deserialization of RemoveMessage if represented as a plain object
- 58e9522: make mustache prompt with nested object working correctly
- e44dc1b: handle backticks in structured output

## 0.3.75

### Patch Changes

- d6d841f: fix(core): Fix deep nesting of runnables within traceables

## 0.3.74

### Patch Changes

- 4e53005: fix(core): Always inherit parent run id onto callback manager from context

## 0.3.73

### Patch Changes

- a5a2e10: add root export to satisfy bundler requirements
