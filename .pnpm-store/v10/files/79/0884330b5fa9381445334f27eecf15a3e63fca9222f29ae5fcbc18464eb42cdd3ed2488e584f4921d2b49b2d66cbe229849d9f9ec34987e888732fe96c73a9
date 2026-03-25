# langchain

## 1.2.30

### Patch Changes

- [#10262](https://github.com/langchain-ai/langchainjs/pull/10262) [`b0175a5`](https://github.com/langchain-ai/langchainjs/commit/b0175a5d3b68e8fba44a85bc23879bd06def2f52) Thanks [@maahir30](https://github.com/maahir30)! - fix: Move fakeModel from utils/testing to testing namespace
  move to updated namespace

- [#10185](https://github.com/langchain-ai/langchainjs/pull/10185) [`414f6ed`](https://github.com/langchain-ai/langchainjs/commit/414f6ed402ac6f1c0fd6cce4bed64fa3708eea3d) Thanks [@maahir30](https://github.com/maahir30)! - feat: add custom Vitest matchers for LangChain message and tool call assertions

  Adds a new `@langchain/core/testing/matchers` export containing custom Vitest matchers (`toBeHumanMessage`, `toBeAIMessage`, `toBeSystemMessage`, `toBeToolMessage`, `toHaveToolCalls`, `toHaveToolCallCount`, `toContainToolCall`, `toHaveToolMessages`, `toHaveBeenInterrupted`, `toHaveStructuredResponse`) that external users can register via `expect.extend(langchainMatchers)` in their Vitest setup files. Re-exported from `langchain` for convenience.

- Updated dependencies [[`7373b4c`](https://github.com/langchain-ai/langchainjs/commit/7373b4cd6a78bee105a952a11838c573fd1aafae), [`b0175a5`](https://github.com/langchain-ai/langchainjs/commit/b0175a5d3b68e8fba44a85bc23879bd06def2f52), [`414f6ed`](https://github.com/langchain-ai/langchainjs/commit/414f6ed402ac6f1c0fd6cce4bed64fa3708eea3d)]:
  - @langchain/core@1.1.31

## 1.2.29

### Patch Changes

- [#10245](https://github.com/langchain-ai/langchainjs/pull/10245) [`48dfa1d`](https://github.com/langchain-ai/langchainjs/commit/48dfa1dd08c0c2c801356a8fd0d17f08c85f967e) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(agents): propagate structured output retry Command through wrapModelCall middleware

- [#10243](https://github.com/langchain-ai/langchainjs/pull/10243) [`96c630d`](https://github.com/langchain-ai/langchainjs/commit/96c630dfd009f2546d5bc36f5067ff868bb4067f) Thanks [@hntrl](https://github.com/hntrl)! - fix: add explicit `: symbol` type annotations to Symbol.for() declarations for cross-version compatibility

  TypeScript infers `unique symbol` type when Symbol.for() is used without an explicit type annotation, causing type incompatibility when multiple versions of the same package are present in a dependency tree. By adding explicit `: symbol` annotations, all declarations now use the general symbol type, making them compatible across versions while maintaining identical runtime behavior.

  Changes:
  - Added `: symbol` to `MESSAGE_SYMBOL` in messages/base.ts
  - Added `: symbol` to `MIDDLEWARE_BRAND` in agents/middleware/types.ts (also changed from Symbol() to Symbol.for() for cross-realm compatibility)

- [#10252](https://github.com/langchain-ai/langchainjs/pull/10252) [`0bf01a2`](https://github.com/langchain-ai/langchainjs/commit/0bf01a29bca124f76b08ee52a7795b2eafbc5272) Thanks [@colifran](https://github.com/colifran)! - feat: implement standard schema support for structured output

- Updated dependencies [[`96c630d`](https://github.com/langchain-ai/langchainjs/commit/96c630dfd009f2546d5bc36f5067ff868bb4067f), [`a8b9ccc`](https://github.com/langchain-ai/langchainjs/commit/a8b9ccca5a85984a5a30008acd09f9991e591638), [`a1f22bb`](https://github.com/langchain-ai/langchainjs/commit/a1f22bba907731a18dca23c31cec5333444a3f55)]:
  - @langchain/core@1.1.30

## 1.2.28

### Patch Changes

- [#10169](https://github.com/langchain-ai/langchainjs/pull/10169) [`3b1fd54`](https://github.com/langchain-ai/langchainjs/commit/3b1fd5458a4aa29c398122829f383f21b5ac39da) Thanks [@hntrl](https://github.com/hntrl)! - fix(core, langchain): bump uuid dependency from ^10.0.0 to ^11.0.0 to fix Metro bundler error

  The `uuid` v10 package has ambiguous `exports` in its `package.json` which causes Metro (used by Expo/React Native) to resolve the wrong entry point, resulting in `Cannot read properties of undefined (reading 'v1')`. The `uuid` v11 package fixes its exports map to work correctly with Metro's package exports resolution.

- [#10165](https://github.com/langchain-ai/langchainjs/pull/10165) [`01a84ae`](https://github.com/langchain-ai/langchainjs/commit/01a84ae4b73ee2e3add940250aca2236213eaab2) Thanks [@hntrl](https://github.com/hntrl)! - fix(agents): propagate store and checkpointer in ReactAgent
  - Added `checkpointer` and `store` getter/setter pairs on `ReactAgent` that forward to the internal compiled graph. This fixes an issue where the LangGraph API server's checkpointer injection was silently ignored, causing thread state to be lost across server restarts.
  - Propagate `store` and `configurable` from the LangGraph config into the middleware `runtime` object. Previously, `runtime.store` was always `undefined` even when a store was provided to `createAgent()`.

- [#10146](https://github.com/langchain-ai/langchainjs/pull/10146) [`67cc069`](https://github.com/langchain-ai/langchainjs/commit/67cc069af19844d8c2676f6ae36117af7c7740d4) Thanks [@eddienubes](https://github.com/eddienubes)! - docs: update an outdated middleware example

- Updated dependencies [[`9f30267`](https://github.com/langchain-ai/langchainjs/commit/9f30267e95a2a42fac71f1d3674b84c5a190dbbc), [`403a99f`](https://github.com/langchain-ai/langchainjs/commit/403a99fd826383f30300809ae077e1c967023520), [`3b1fd54`](https://github.com/langchain-ai/langchainjs/commit/3b1fd5458a4aa29c398122829f383f21b5ac39da), [`77bd982`](https://github.com/langchain-ai/langchainjs/commit/77bd98274a885e947d76f7a9c6dd0b3763453218)]:
  - @langchain/core@1.1.29

## 1.2.27

### Patch Changes

- [#10137](https://github.com/langchain-ai/langchainjs/pull/10137) [`87a585e`](https://github.com/langchain-ai/langchainjs/commit/87a585e4b5d36fa2f82e34a92caa6e7c4289f370) Thanks [@hntrl](https://github.com/hntrl)! - fix(agents): infer StateSchema value types in middleware hooks

- Updated dependencies [[`10a876c`](https://github.com/langchain-ai/langchainjs/commit/10a876c7d5ff27d8f2889761ee20e95f76a50518), [`b46d96a`](https://github.com/langchain-ai/langchainjs/commit/b46d96a508a8bf212561dbb6f025e35c75f16257)]:
  - @langchain/core@1.1.28

## 1.2.26

### Patch Changes

- [#10108](https://github.com/langchain-ai/langchainjs/pull/10108) [`e7576ee`](https://github.com/langchain-ai/langchainjs/commit/e7576ee9e6408c399c08d271db43f63e622da10f) Thanks [@hntrl](https://github.com/hntrl)! - fix: replace retired Anthropic model IDs with active replacements
  - Update default model in ChatAnthropic from `claude-3-5-sonnet-latest` to `claude-sonnet-4-5-20250929`
  - Regenerate model profiles with latest data from models.dev API
  - Replace retired `claude-3-5-haiku-20241022`, `claude-3-7-sonnet-20250219`, `claude-3-5-sonnet-20240620`, and `claude-3-5-sonnet-20241022` in tests, docstrings, and examples

- [#10114](https://github.com/langchain-ai/langchainjs/pull/10114) [`0050c91`](https://github.com/langchain-ai/langchainjs/commit/0050c91481267327d88c430f5aacf57bd336facf) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): reset shared currentSystemMessage on middleware handler retry

## 1.2.25

### Patch Changes

- [#10083](https://github.com/langchain-ai/langchainjs/pull/10083) [`219b38d`](https://github.com/langchain-ai/langchainjs/commit/219b38d6d95977f3f9bf19625e72f42036d24df0) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): export ModelRequest interface

- [#10084](https://github.com/langchain-ai/langchainjs/pull/10084) [`7cae8a9`](https://github.com/langchain-ai/langchainjs/commit/7cae8a9ee6aece5f2df0fc6417ffd799bce4d1ca) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): persist underscore-prefixed middleware state fields across graph steps

- Updated dependencies [[`ed6ea53`](https://github.com/langchain-ai/langchainjs/commit/ed6ea53c38a004b65e30c0f5888a0ac7d8ee7028)]:
  - @langchain/core@1.1.26

## 1.2.24

### Patch Changes

- [#10034](https://github.com/langchain-ai/langchainjs/pull/10034) [`8eea9d4`](https://github.com/langchain-ai/langchainjs/commit/8eea9d462d2e782e62455973d6b0907aa917b41e) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): fix streaming types

## 1.2.23

### Patch Changes

- [#10010](https://github.com/langchain-ai/langchainjs/pull/10010) [`bf6eac4`](https://github.com/langchain-ai/langchainjs/commit/bf6eac40179f87da18fd122b4efc2ee48cd44b6c) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): fix structured output on opus

- Updated dependencies [[`70a4400`](https://github.com/langchain-ai/langchainjs/commit/70a440085b4bc2d036726ed12d9dc7841e914061)]:
  - @langchain/core@1.1.24

## 1.2.22

### Patch Changes

- [#10008](https://github.com/langchain-ai/langchainjs/pull/10008) [`5283513`](https://github.com/langchain-ai/langchainjs/commit/5283513740ff93063f9c1eaa583365f590ec5994) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): re-export missing interface

- Updated dependencies [[`71d08c0`](https://github.com/langchain-ai/langchainjs/commit/71d08c0a3a2597bd5a084eb35a7830e5ea1a2b29)]:
  - @langchain/core@1.1.23

## 1.2.21

### Patch Changes

- [#9996](https://github.com/langchain-ai/langchainjs/pull/9996) [`5113204`](https://github.com/langchain-ai/langchainjs/commit/5113204bba5eb1d0b23a4d3aae2c02ba3caf8b6b) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): propagate subagent name in metadata

- Updated dependencies [[`8f166b1`](https://github.com/langchain-ai/langchainjs/commit/8f166b159343ae6fd0d6d44c0835ab56c0b153f4)]:
  - @langchain/core@1.1.22

## 1.2.20

### Patch Changes

- [#9983](https://github.com/langchain-ai/langchainjs/pull/9983) [`ea7e791`](https://github.com/langchain-ai/langchainjs/commit/ea7e791ff6c93188b7febbd98ea22359fa96eb20) Thanks [@encodedz](https://github.com/encodedz)! - Support concurrent `agentNode` dynamic prompts properly.

- [#9986](https://github.com/langchain-ai/langchainjs/pull/9986) [`8a52dad`](https://github.com/langchain-ai/langchainjs/commit/8a52dad1eace191b19d24cc5683acb22a5b9e964) Thanks [@brettshollenberger](https://github.com/brettshollenberger)! - Don't re-emit input state from middleware hooks that return void

- [#9982](https://github.com/langchain-ai/langchainjs/pull/9982) [`4558fa6`](https://github.com/langchain-ai/langchainjs/commit/4558fa6438749b9f6eca980099241d97c56b1a8f) Thanks [@hntrl](https://github.com/hntrl)! - feat(langchain): add optional `tools` parameter to `countTokensApproximately` for more accurate token estimates when tools are bound to a model

- [#9981](https://github.com/langchain-ai/langchainjs/pull/9981) [`5f28338`](https://github.com/langchain-ai/langchainjs/commit/5f283389c0dba1822f37139f0913016d77167734) Thanks [@hntrl](https://github.com/hntrl)! - feat(agents): support returning Command from wrapModelCall middleware

  Allow `wrapModelCall` middleware hooks to return `Command` objects for advanced
  control flow (routing, state updates), matching the existing `wrapToolCall`
  pattern. The framework tracks the effective AIMessage through the middleware
  chain so outer middleware always receive an AIMessage from `handler()`, even
  when an inner middleware returns a Command.

- Updated dependencies [[`d5e3db0`](https://github.com/langchain-ai/langchainjs/commit/d5e3db0d01ab321ec70a875805b2f74aefdadf9d)]:
  - @langchain/core@1.1.21

## 1.2.19

### Patch Changes

- [#9957](https://github.com/langchain-ai/langchainjs/pull/9957) [`71c3cba`](https://github.com/langchain-ai/langchainjs/commit/71c3cba843ab16d877299d158a1de0c7d22f3fb9) Thanks [@jacoblee93](https://github.com/jacoblee93)! - feat(langchain,core): Update prompt pulling params, LangSmith version

- Updated dependencies [[`71c3cba`](https://github.com/langchain-ai/langchainjs/commit/71c3cba843ab16d877299d158a1de0c7d22f3fb9)]:
  - @langchain/core@1.1.20

## 1.2.18

### Patch Changes

- [#9763](https://github.com/langchain-ai/langchainjs/pull/9763) [`8f0757f`](https://github.com/langchain-ai/langchainjs/commit/8f0757f06b2ed9fe810f636333fc71ffcedb3feb) Thanks [@AdamParker19](https://github.com/AdamParker19)! - fix(langchain): resolve className collision in MODEL_PROVIDER_CONFIG

  Refactored `getChatModelByClassName` to accept an optional `modelProvider` parameter for direct lookup, avoiding the className collision issue where multiple providers share the same className (e.g., `google-vertexai` and `google-vertexai-web` both use `"ChatVertexAI"`). When `modelProvider` is provided, the function uses direct config lookup instead of searching by className. Backward compatibility is maintained for existing callers that only pass `className`. This eliminates the duplicated import logic that was previously in `_initChatModelHelper`.

## 1.2.17

### Patch Changes

- [#9916](https://github.com/langchain-ai/langchainjs/pull/9916) [`3516592`](https://github.com/langchain-ai/langchainjs/commit/3516592c51c44eb55e477c0d63ffdab5672ae97e) Thanks [@hntrl](https://github.com/hntrl)! - feat(langchain): add withConfig() method to ReactAgent

  Adds a `withConfig()` method to ReactAgent following the same pattern as LangGraph's `Pregel.withConfig()`. This allows setting default configuration values (like `recursionLimit`, `tags`, or `configurable`) that get merged with invocation-time config.

- Updated dependencies [[`41bfea5`](https://github.com/langchain-ai/langchainjs/commit/41bfea51cf119573a3b956ee782d2731fe71c681)]:
  - @langchain/core@1.1.19

## 1.2.16

### Patch Changes

- [#9885](https://github.com/langchain-ai/langchainjs/pull/9885) [`913893f`](https://github.com/langchain-ai/langchainjs/commit/913893f678f1fae2a1b9bf964c9d93ffd0176680) Thanks [@Ambas-T](https://github.com/Ambas-T)! - fix: filter pregel keys from cache key to avoid OOM

- Updated dependencies [[`a9b5059`](https://github.com/langchain-ai/langchainjs/commit/a9b50597186002221aaa4585246e569fa44c27c8), [`a9b5059`](https://github.com/langchain-ai/langchainjs/commit/a9b50597186002221aaa4585246e569fa44c27c8)]:
  - @langchain/core@1.1.18

## 1.2.15

### Patch Changes

- [#9891](https://github.com/langchain-ai/langchainjs/pull/9891) [`983b212`](https://github.com/langchain-ai/langchainjs/commit/983b2123eeaa32011b7021643ba8c37698dfe2be) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): support StateSchema in middleware pipeline

## 1.2.14

### Patch Changes

- [#9870](https://github.com/langchain-ai/langchainjs/pull/9870) [`070b4d1`](https://github.com/langchain-ai/langchainjs/commit/070b4d14121ee5d1f24c8ad980cd4548f39f19eb) Thanks [@maahir30](https://github.com/maahir30)! - fix(langchain): StateSchema handling in AgentNode middleware
  - Added `toPartialZodObject` helper that correctly handles both Zod objects and LangGraph's StateSchema when parsing middleware state in AgentNode .

## 1.2.13

### Patch Changes

- [#9854](https://github.com/langchain-ai/langchainjs/pull/9854) [`160b5bf`](https://github.com/langchain-ai/langchainjs/commit/160b5bfe49f31190d28ec10a95075ef845c49fa3) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(anthropic): apply cache_control at final formatting layer

- [#9850](https://github.com/langchain-ai/langchainjs/pull/9850) [`b56bf9e`](https://github.com/langchain-ai/langchainjs/commit/b56bf9e05a3190be58835e336ffb775c5d585fca) Thanks [@joeljohn159](https://github.com/joeljohn159)! - Fix `ToolNode` to route missing tool errors through `handleToolErrors` instead of throwing, allowing agents to recover when LLMs hallucinate tool names.

- [#9847](https://github.com/langchain-ai/langchainjs/pull/9847) [`9cd35ae`](https://github.com/langchain-ai/langchainjs/commit/9cd35ae6ed878be88d3e68371df92cebc8d880ee) Thanks [@christian-bromann](https://github.com/christian-bromann)! - feat(langchain): add dynamic tool registration via middleware

- [#9839](https://github.com/langchain-ai/langchainjs/pull/9839) [`134121a`](https://github.com/langchain-ai/langchainjs/commit/134121a6fc7e0ad1653bb5ce2ec347c61638c4df) Thanks [@maahir30](https://github.com/maahir30)! - ## Add state schema support to agents
  - Introduce `createAgentState` function replacing `createAgentAnnotationConditional`
  - Migrate from Zod-based schemas to LangGraph's native `StateSchema`, `ReducedValue`, and `UntrackedValue` primitives
  - Support both `StateSchema` and Zod v3/v4 objects as input schemas
  - Automatically merge state fields from user-provided schemas and middleware
  - Properly handle reducer metadata extraction from Zod v4 schemas via `schemaMetaRegistry`
  - Generate separate input/output schemas to avoid channel conflicts with reducers
  - Add comprehensive test coverage for state schema functionality

- Updated dependencies [[`05a9733`](https://github.com/langchain-ai/langchainjs/commit/05a9733448a10764c0bfd070af859c33e623b998)]:
  - @langchain/core@1.1.17

## 1.2.12

### Patch Changes

- [#9848](https://github.com/langchain-ai/langchainjs/pull/9848) [`3d26f58`](https://github.com/langchain-ai/langchainjs/commit/3d26f58e5b705f7c81104a6f1145c64e791d238b) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): bubble up graph interrupt errors as is

## 1.2.11

### Patch Changes

- [#9812](https://github.com/langchain-ai/langchainjs/pull/9812) [`b8e3da6`](https://github.com/langchain-ai/langchainjs/commit/b8e3da6618ca27e86d384a3ce6d01520861916af) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): tag summarization model calls with lc_source metadata

- Updated dependencies [[`70387a1`](https://github.com/langchain-ai/langchainjs/commit/70387a144464539d65a546c8130cf51dfad025a1), [`a7c6ec5`](https://github.com/langchain-ai/langchainjs/commit/a7c6ec51ab9baa186ab5ebf815599c08f5c7e8ab), [`5e04543`](https://github.com/langchain-ai/langchainjs/commit/5e045435a783fdae44bc9a43e01a8e5eb7100db2), [`40b4467`](https://github.com/langchain-ai/langchainjs/commit/40b446762445575844610ee528abc77c247b2c43), [`17e30bd`](https://github.com/langchain-ai/langchainjs/commit/17e30bd7f4c7bdf87c9c30304b3b9e121cc1fbbc)]:
  - @langchain/core@1.1.16

## 1.2.10

### Patch Changes

- [#9806](https://github.com/langchain-ai/langchainjs/pull/9806) [`cf56fc9`](https://github.com/langchain-ai/langchainjs/commit/cf56fc98aebf55a798e80cbd5c30259ffaf8ca47) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): don't concatenate middleware error, instead use cause

- Updated dependencies [[`230462d`](https://github.com/langchain-ai/langchainjs/commit/230462d28c3a8b5ccadf433ea2f523eb6e658de6)]:
  - @langchain/core@1.1.15

## 1.2.9

### Patch Changes

- Updated dependencies [[`bd1ab45`](https://github.com/langchain-ai/langchainjs/commit/bd1ab45364391f69ce93ecba36a4a15dafca2b76)]:
  - @langchain/core@1.1.14

## 1.2.8

### Patch Changes

- [#9779](https://github.com/langchain-ai/langchainjs/pull/9779) [`bb80067`](https://github.com/langchain-ai/langchainjs/commit/bb80067874af359d7347b07b75f5caa0ee246aea) Thanks [@hntrl](https://github.com/hntrl)! - add lc_source tag to summarization middleware messages

- [#9784](https://github.com/langchain-ai/langchainjs/pull/9784) [`9a68b93`](https://github.com/langchain-ai/langchainjs/commit/9a68b933c13be556376244e83b18f61f051e6a5c) Thanks [@weiliddat](https://github.com/weiliddat)! - preserve reducer metadata in createAgent state schema

- Updated dependencies [[`3efe79c`](https://github.com/langchain-ai/langchainjs/commit/3efe79c62ff2ffe0ada562f7eecd85be074b649a), [`b8561c1`](https://github.com/langchain-ai/langchainjs/commit/b8561c17556bdf7a3ff8d70bc307422642a9172e)]:
  - @langchain/core@1.1.13

## 1.2.7

### Patch Changes

- [#9517](https://github.com/langchain-ai/langchainjs/pull/9517) [`23be5af`](https://github.com/langchain-ai/langchainjs/commit/23be5afd59b5f4806edef11937ce5e2ba300f7ee) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): Refactored agent generics to use type bag pattern (AgentTypeConfig, MiddlewareTypeConfig) with new helper types for type extraction.

- [#9761](https://github.com/langchain-ai/langchainjs/pull/9761) [`e0360d9`](https://github.com/langchain-ai/langchainjs/commit/e0360d9bdc0e7725d59625902bcfc98c39931e2a) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): ensure models only make on write_todo call at a time

- Updated dependencies [[`23be5af`](https://github.com/langchain-ai/langchainjs/commit/23be5afd59b5f4806edef11937ce5e2ba300f7ee)]:
  - @langchain/core@1.1.12

## 1.2.6

### Patch Changes

- Updated dependencies [[`a46a249`](https://github.com/langchain-ai/langchainjs/commit/a46a24983fd0fea649d950725a2673b3c435275f)]:
  - @langchain/core@1.1.11

## 1.2.5

### Patch Changes

- Updated dependencies [[`817fc9a`](https://github.com/langchain-ai/langchainjs/commit/817fc9a56d4699f3563a6e153b13eadf7bcc661b)]:
  - @langchain/core@1.1.10

## 1.2.4

### Patch Changes

- [#9739](https://github.com/langchain-ai/langchainjs/pull/9739) [`c28d24a`](https://github.com/langchain-ai/langchainjs/commit/c28d24a8770f6d0e543cde116b0e38b3baf21301) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(core): use getBufferString for message summarization

- [#9729](https://github.com/langchain-ai/langchainjs/pull/9729) [`536c7dd`](https://github.com/langchain-ai/langchainjs/commit/536c7ddacd6c7f80d2edf18ab9caeeab71827ccd) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): default strict to true in providerStrategy for OpenAI compatibility

- [#9728](https://github.com/langchain-ai/langchainjs/pull/9728) [`5cfbedf`](https://github.com/langchain-ai/langchainjs/commit/5cfbedf064ffdc960cb2e5a97e37d7a5900560de) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): support callbacks property in stream

- [#9715](https://github.com/langchain-ai/langchainjs/pull/9715) [`cc502e1`](https://github.com/langchain-ai/langchainjs/commit/cc502e1b67dbadcd123a7ea2964c791c2bbad581) Thanks [@jacoblee93](https://github.com/jacoblee93)! - fix(langchain): Add secretsFromEnv and secrets for prompt pulling
  fix(@langchain/classic): Add secretsFromEnv and secrets for prompt pulling

- [#9703](https://github.com/langchain-ai/langchainjs/pull/9703) [`5d1b874`](https://github.com/langchain-ai/langchainjs/commit/5d1b874e1bb0a038f23576d5ff6d8335b755bce1) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): properly pass on schema title

- [#9702](https://github.com/langchain-ai/langchainjs/pull/9702) [`bfcb87d`](https://github.com/langchain-ai/langchainjs/commit/bfcb87d23c580c7881f650960a448fe2e54a30b3) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(core): improve interop with Zod

- [#9714](https://github.com/langchain-ai/langchainjs/pull/9714) [`42b138f`](https://github.com/langchain-ai/langchainjs/commit/42b138fe20a8d711938058a69669e1c29b18bd50) Thanks [@r77wu](https://github.com/r77wu)! - use parseJumpToTarget in 'afterModel' Router

- [#9740](https://github.com/langchain-ai/langchainjs/pull/9740) [`f697451`](https://github.com/langchain-ai/langchainjs/commit/f6974516b041ed12befd26e1a4cbe457865a2780) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): keep tool call / AIMessage pairings when summarizing

- Updated dependencies [[`56600b9`](https://github.com/langchain-ai/langchainjs/commit/56600b94f8e185f44d4288b7a9b66c55778938dd), [`dc5c2ac`](https://github.com/langchain-ai/langchainjs/commit/dc5c2ac00f86dd2feeba9843d708926a5f38202e), [`c28d24a`](https://github.com/langchain-ai/langchainjs/commit/c28d24a8770f6d0e543cde116b0e38b3baf21301), [`bfcb87d`](https://github.com/langchain-ai/langchainjs/commit/bfcb87d23c580c7881f650960a448fe2e54a30b3)]:
  - @langchain/core@1.1.9

## 1.2.3

### Patch Changes

- [#9707](https://github.com/langchain-ai/langchainjs/pull/9707) [`e5063f9`](https://github.com/langchain-ai/langchainjs/commit/e5063f9c6e9989ea067dfdff39262b9e7b6aba62) Thanks [@hntrl](https://github.com/hntrl)! - add security hardening for `load`

- Updated dependencies [[`e5063f9`](https://github.com/langchain-ai/langchainjs/commit/e5063f9c6e9989ea067dfdff39262b9e7b6aba62), [`8996647`](https://github.com/langchain-ai/langchainjs/commit/89966470e8c0b112ce4f9a326004af6a4173f9e6)]:
  - @langchain/core@1.1.8

## 1.2.2

### Patch Changes

- [#9675](https://github.com/langchain-ai/langchainjs/pull/9675) [`af664be`](https://github.com/langchain-ai/langchainjs/commit/af664becc0245b2315ea2f784c9a6c1d7622dbb4) Thanks [@jacoblee93](https://github.com/jacoblee93)! - Bump LangSmith dep to 0.4.0

- [#9673](https://github.com/langchain-ai/langchainjs/pull/9673) [`ffb2402`](https://github.com/langchain-ai/langchainjs/commit/ffb24026cd93e58219519ee24c6e23ea57cb5bde) Thanks [@hntrl](https://github.com/hntrl)! - add `context` utility

- Updated dependencies [[`df9c42b`](https://github.com/langchain-ai/langchainjs/commit/df9c42b3ab61b85309ab47256e1d93c3188435ee), [`8d2982b`](https://github.com/langchain-ai/langchainjs/commit/8d2982bb94c0f4e4314ace3cc98a1ae87571b1ed), [`af664be`](https://github.com/langchain-ai/langchainjs/commit/af664becc0245b2315ea2f784c9a6c1d7622dbb4), [`ffb2402`](https://github.com/langchain-ai/langchainjs/commit/ffb24026cd93e58219519ee24c6e23ea57cb5bde)]:
  - @langchain/core@1.1.7

## 1.2.1

### Patch Changes

- Updated dependencies [[`a7b2a7d`](https://github.com/langchain-ai/langchainjs/commit/a7b2a7db5ef57df3731ae6c9931f4b663e909505), [`a496c5f`](https://github.com/langchain-ai/langchainjs/commit/a496c5fc64d94cc0809216325b0f1bfde3f92c45), [`1da1325`](https://github.com/langchain-ai/langchainjs/commit/1da1325aea044fb37af54a9de1f4ae0b9f47d4a2)]:
  - @langchain/core@1.1.6

## 1.2.0

### Minor Changes

- [#9651](https://github.com/langchain-ai/langchainjs/pull/9651) [`348c37c`](https://github.com/langchain-ai/langchainjs/commit/348c37c01a048c815fea1827c084878744e20742) Thanks [@christian-bromann](https://github.com/christian-bromann)! - feat(langchain): allow to set strict tag manually in providerStrategy #9578

## 1.1.6

### Patch Changes

- [#9586](https://github.com/langchain-ai/langchainjs/pull/9586) [`bc8e90f`](https://github.com/langchain-ai/langchainjs/commit/bc8e90f4f77d71f739c8faf3e6c22ab7e54ffc3c) Thanks [@hntrl](https://github.com/hntrl)! - patch prompts created from runs fix

- [#9623](https://github.com/langchain-ai/langchainjs/pull/9623) [`ade8b8a`](https://github.com/langchain-ai/langchainjs/commit/ade8b8af0b32a9afd5c5a0bf6c4543d3cb7fd848) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): properly retrieve structured output from thinking block

- [#9637](https://github.com/langchain-ai/langchainjs/pull/9637) [`88bb788`](https://github.com/langchain-ai/langchainjs/commit/88bb7882fadf185bad927277810c682c2eee8d01) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): Prevent functions from being accidentally assignable to AgentMiddleware

- [#8964](https://github.com/langchain-ai/langchainjs/pull/8964) [`38ff1b5`](https://github.com/langchain-ai/langchainjs/commit/38ff1b55d353196b8af7f64f7b854b8f643e3de9) Thanks [@jnjacobson](https://github.com/jnjacobson)! - add support for anyOf, allOf, oneOf in openapi conversion

- [#9640](https://github.com/langchain-ai/langchainjs/pull/9640) [`aa8c4f8`](https://github.com/langchain-ai/langchainjs/commit/aa8c4f867abe79b1c6de09a7b51a69163d0972aa) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): prevent summarization middleware from leaking streaming events

- [#9648](https://github.com/langchain-ai/langchainjs/pull/9648) [`29a8480`](https://github.com/langchain-ai/langchainjs/commit/29a8480799d4c3534892a29cef4a135c437deb9b) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): allow to set strict tag manually in providerStrategy #9578

- [#9630](https://github.com/langchain-ai/langchainjs/pull/9630) [`a2df2d4`](https://github.com/langchain-ai/langchainjs/commit/a2df2d422e040485da61120bbbda6ced543e578b) Thanks [@nephix](https://github.com/nephix)! - fix(summary-middleware): use summaryPrefix or fall back to default prefix

- Updated dependencies [[`005c729`](https://github.com/langchain-ai/langchainjs/commit/005c72903bcdf090e0f4c58960c8c243481f9874), [`ab78246`](https://github.com/langchain-ai/langchainjs/commit/ab782462753e6c3ae5d55c0c251f795af32929d5), [`8cc81c7`](https://github.com/langchain-ai/langchainjs/commit/8cc81c7cee69530f7a6296c69123edbe227b2fce), [`f32e499`](https://github.com/langchain-ai/langchainjs/commit/f32e4991d0e707324e3f6af287a1ee87ab833b7e), [`a28d83d`](https://github.com/langchain-ai/langchainjs/commit/a28d83d49dd1fd31e67b52a44abc70f2cc2a2026), [`2e5ad70`](https://github.com/langchain-ai/langchainjs/commit/2e5ad70d16c1f13eaaea95336bbe2ec4a4a4954a), [`e456c66`](https://github.com/langchain-ai/langchainjs/commit/e456c661aa1ab8f1ed4a98c40616f5a13270e88e), [`1cfe603`](https://github.com/langchain-ai/langchainjs/commit/1cfe603e97d8711343ae5f1f5a75648e7bd2a16e)]:
  - @langchain/core@1.1.5

## 1.1.5

### Patch Changes

- Updated dependencies [[`0bade90`](https://github.com/langchain-ai/langchainjs/commit/0bade90ed47c7988ed86f1e695a28273c7b3df50), [`6c40d00`](https://github.com/langchain-ai/langchainjs/commit/6c40d00e926f377d249c2919549381522eac8ed1)]:
  - @langchain/core@1.1.4

## 1.1.4

### Patch Changes

- Updated dependencies [[`bd2c46e`](https://github.com/langchain-ai/langchainjs/commit/bd2c46e09e661d9ac766c09e71bc6687d6fc811c), [`487378b`](https://github.com/langchain-ai/langchainjs/commit/487378bf14277659c8ca0ef06ea0f9836b818ff4), [`138e7fb`](https://github.com/langchain-ai/langchainjs/commit/138e7fb6280705457079863bedb238b16b322032)]:
  - @langchain/core@1.1.3

## 1.1.3

### Patch Changes

- [#9532](https://github.com/langchain-ai/langchainjs/pull/9532) [`3424293`](https://github.com/langchain-ai/langchainjs/commit/34242933ade61304481d055605af06ec54c8f5e4) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): improve state rendering in LangSmith studio

- [#9529](https://github.com/langchain-ai/langchainjs/pull/9529) [`0d2f74a`](https://github.com/langchain-ai/langchainjs/commit/0d2f74aeef2c05ddcf74dc6286bfa8eabf785ed2) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(langchain): better detect invoke response in agent node

- [#9523](https://github.com/langchain-ai/langchainjs/pull/9523) [`95a8f78`](https://github.com/langchain-ai/langchainjs/commit/95a8f78179b38b69419079c7b9315844f49aab0c) Thanks [@LiteracyFanatic](https://github.com/LiteracyFanatic)! - Fix detection of models with native support for structured output

- Updated dependencies [[`833f578`](https://github.com/langchain-ai/langchainjs/commit/833f57834dc3aa64e4cfdd7499f865b2ab41462a)]:
  - @langchain/core@1.1.2

## 1.1.2

### Patch Changes

- Updated dependencies [[`636b994`](https://github.com/langchain-ai/langchainjs/commit/636b99459bf843362298866211c63a7a15c2a319), [`38f0162`](https://github.com/langchain-ai/langchainjs/commit/38f0162b7b2db2be2c3a75ae468728adcb49fdfb)]:
  - @langchain/core@1.1.1

## 1.1.1

### Patch Changes

- [#9487](https://github.com/langchain-ai/langchainjs/pull/9487) [`4827945`](https://github.com/langchain-ai/langchainjs/commit/48279457ee44f36cdde175a537e2b12f5866627f) Thanks [@hntrl](https://github.com/hntrl)! - constrain lower bound core peer dep

## 1.1.0

### Minor Changes

- [#9476](https://github.com/langchain-ai/langchainjs/pull/9476) [`2a47c77`](https://github.com/langchain-ai/langchainjs/commit/2a47c77c29a873c4c4d4940458e0d5fb3b2e45ce) Thanks [@christian-bromann](https://github.com/christian-bromann)! - add new modelRetryMiddleware

- [#9475](https://github.com/langchain-ai/langchainjs/pull/9475) [`708d360`](https://github.com/langchain-ai/langchainjs/commit/708d360df1869def7e4caaa5995d6e907bbf54cd) Thanks [@christian-bromann](https://github.com/christian-bromann)! - Support `SystemMessage` as `systemPrompt`

- [#9475](https://github.com/langchain-ai/langchainjs/pull/9475) [`708d360`](https://github.com/langchain-ai/langchainjs/commit/708d360df1869def7e4caaa5995d6e907bbf54cd) Thanks [@christian-bromann](https://github.com/christian-bromann)! - Add OpenAI content moderation middleware

### Patch Changes

- [#9467](https://github.com/langchain-ai/langchainjs/pull/9467) [`2750e08`](https://github.com/langchain-ai/langchainjs/commit/2750e08547614de366019584940fdb1ba93e581c) Thanks [@hntrl](https://github.com/hntrl)! - allow overriding profiles in `initChatModel`

- [#9467](https://github.com/langchain-ai/langchainjs/pull/9467) [`2750e08`](https://github.com/langchain-ai/langchainjs/commit/2750e08547614de366019584940fdb1ba93e581c) Thanks [@hntrl](https://github.com/hntrl)! - cache model instance imports for `initChatModel`

- [#9416](https://github.com/langchain-ai/langchainjs/pull/9416) [`0fe9beb`](https://github.com/langchain-ai/langchainjs/commit/0fe9bebee6710f719e47f913eec1ec4f638e4de4) Thanks [@hntrl](https://github.com/hntrl)! - fix 'moduleResultion: "node"' compatibility

- [#9467](https://github.com/langchain-ai/langchainjs/pull/9467) [`2750e08`](https://github.com/langchain-ai/langchainjs/commit/2750e08547614de366019584940fdb1ba93e581c) Thanks [@hntrl](https://github.com/hntrl)! - pass model profiles from chat models in `initChatModel`

## 1.0.6

### Patch Changes

- [#9434](https://github.com/langchain-ai/langchainjs/pull/9434) [`f7cfece`](https://github.com/langchain-ai/langchainjs/commit/f7cfecec29bf0f121e1a8b0baface5327d731122) Thanks [@deepansh946](https://github.com/deepansh946)! - Updated error handling behaviour of AgentNode

## 1.0.5

### Patch Changes

- [#9403](https://github.com/langchain-ai/langchainjs/pull/9403) [`944bf56`](https://github.com/langchain-ai/langchainjs/commit/944bf56ff0926e102c56a3073bfde6b751c97794) Thanks [@christian-bromann](https://github.com/christian-bromann)! - improvements to toolEmulator middleware

- [#9388](https://github.com/langchain-ai/langchainjs/pull/9388) [`831168a`](https://github.com/langchain-ai/langchainjs/commit/831168a5450bff706a319842626214281204346d) Thanks [@hntrl](https://github.com/hntrl)! - use `profile.maxInputTokens` in summarization middleware

- [#9393](https://github.com/langchain-ai/langchainjs/pull/9393) [`f1e2f9e`](https://github.com/langchain-ai/langchainjs/commit/f1e2f9eeb365bae78c8b5991ed41bfed58f25da6) Thanks [@christian-bromann](https://github.com/christian-bromann)! - align context editing with summarization interface

- [#9427](https://github.com/langchain-ai/langchainjs/pull/9427) [`bad7aea`](https://github.com/langchain-ai/langchainjs/commit/bad7aea86d3f60616952104c34a33de9561867c7) Thanks [@dqbd](https://github.com/dqbd)! - fix(langchain): add tool call contents and tool call ID to improve token count approximation

- [#9396](https://github.com/langchain-ai/langchainjs/pull/9396) [`ed6b581`](https://github.com/langchain-ai/langchainjs/commit/ed6b581e525cdf5d3b29abb1e17ca6169554c1b5) Thanks [@christian-bromann](https://github.com/christian-bromann)! - rename exit behavior from throw to error

## 1.0.4

### Patch Changes

- b401680: avoid invalid message order after summarization
- f63fc0f: fix(langchain): export ToolRuntime from langchain

## 1.0.3

### Patch Changes

- f1583cd: allow for model strings in summarization middleware
- e960f97: check message property when pulling chat models for vercel compat
- 66fc10c: fix(langchain): don't allow default or optional context schemas
- 0a8a23b: feat(@langchain/core): support of ToolRuntime
- b38be50: Add missing ToolMessage in toolStrategy structured output
- 42930b5: fix(langchain): improved state schema typing

## 1.0.2

### Patch Changes

- 2e45c43: fix(langchain): remove bad dynamic import for LS
- 28eceac: preserve full model name when deciding model provider

## 1.0.0

🎉 **LangChain v1.0** is here! This release provides a focused, production-ready foundation for building agents. We've streamlined the framework around three core improvements: **`createAgent`**, **standard content blocks**, and a **simplified package structure**. See the [release notes](https://docs.langchain.com/oss/javascript/releases/langchain-v1) for complete details.

### ✨ Major Features

#### `createAgent` - A new standard for building agents

`createAgent` is the new standard way to build agents in LangChain 1.0. It provides a simpler interface than `createReactAgent` from LangGraph while offering greater customization potential through middleware.

**Key features:**

- **Clean, intuitive API**: Build agents with minimal boilerplate
- **Built on LangGraph**: Get persistence, streaming, human-in-the-loop, and time travel out of the box
- **Middleware-first design**: Highly customizable through composable middleware
- **Improved structured output**: Generate structured outputs in the main agent loop without additional LLM calls

Example:

```typescript
import { createAgent } from "langchain";

const agent = createAgent({
  model: "anthropic:claude-sonnet-4-5-20250929",
  tools: [getWeather],
  systemPrompt: "You are a helpful assistant.",
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "What is the weather in Tokyo?" }],
});

console.log(result.content);
```

Under the hood, `createAgent` is built on the basic agent loop—calling a model using LangGraph, letting it choose tools to execute, and then finishing when it calls no more tools.

**Built on LangGraph features (work out of the box):**

- **Persistence**: Conversations automatically persist across sessions with built-in checkpointing
- **Streaming**: Stream tokens, tool calls, and reasoning traces in real-time
- **Human-in-the-loop**: Pause agent execution for human approval before sensitive actions
- **Time travel**: Rewind conversations to any point and explore alternate paths

**Structured output improvements:**

- Generate structured outputs in the main loop instead of requiring an additional LLM call
- Models can choose between calling tools or using provider-side structured output generation
- Significant cost reduction by eliminating extra LLM calls

Example:

```typescript
import { createAgent } from "langchain";
import * as z from "zod";

const weatherSchema = z.object({
  temperature: z.number(),
  condition: z.string(),
});

const agent = createAgent({
  model: "openai:gpt-4o-mini",
  tools: [getWeather],
  responseFormat: weatherSchema,
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "What is the weather in Tokyo?" }],
});

console.log(result.structuredResponse);
```

For more information, see [Agents documentation](https://docs.langchain.com/oss/javascript/langchain/agents).

#### Middleware

Middleware is what makes `createAgent` highly customizable, raising the ceiling for what you can build. Great agents require **context engineering**—getting the right information to the model at the right time. Middleware helps you control dynamic prompts, conversation summarization, selective tool access, state management, and guardrails through a composable abstraction.

**Prebuilt middleware** for common patterns:

```typescript
import {
  createAgent,
  summarizationMiddleware,
  humanInTheLoopMiddleware,
  piiRedactionMiddleware,
} from "langchain";

const agent = createAgent({
  model: "anthropic:claude-sonnet-4-5-20250929",
  tools: [readEmail, sendEmail],
  middleware: [
    piiRedactionMiddleware({ patterns: ["email", "phone", "ssn"] }),
    summarizationMiddleware({
      model: "anthropic:claude-sonnet-4-5-20250929",
      maxTokensBeforeSummary: 500,
    }),
    humanInTheLoopMiddleware({
      interruptOn: {
        sendEmail: {
          allowedDecisions: ["approve", "edit", "reject"],
        },
      },
    }),
  ] as const,
});
```

**Custom middleware** with lifecycle hooks:

| Hook            | When it runs             | Use cases                               |
| --------------- | ------------------------ | --------------------------------------- |
| `beforeAgent`   | Before calling the agent | Load memory, validate input             |
| `beforeModel`   | Before each LLM call     | Update prompts, trim messages           |
| `wrapModelCall` | Around each LLM call     | Intercept and modify requests/responses |
| `wrapToolCall`  | Around each tool call    | Intercept and modify tool execution     |
| `afterModel`    | After each LLM response  | Validate output, apply guardrails       |
| `afterAgent`    | After agent completes    | Save results, cleanup                   |

Example custom middleware:

```typescript
import { createMiddleware } from "langchain";

const contextSchema = z.object({
  userExpertise: z.enum(["beginner", "expert"]).default("beginner"),
});

const expertiseBasedToolMiddleware = createMiddleware({
  wrapModelCall: async (request, handler) => {
    const userLevel = request.runtime.context.userExpertise;
    if (userLevel === "expert") {
      const tools = [advancedSearch, dataAnalysis];
      return handler(request.replace("openai:gpt-5", tools));
    }
    const tools = [simpleSearch, basicCalculator];
    return handler(request.replace("openai:gpt-5-nano", tools));
  },
});

const agent = createAgent({
  model: "anthropic:claude-sonnet-4-5-20250929",
  tools: [simpleSearch, advancedSearch, basicCalculator, dataAnalysis],
  middleware: [expertiseBasedToolMiddleware],
  contextSchema,
});
```

For more information, see the [complete middleware guide](https://docs.langchain.com/oss/javascript/langchain/middleware).

#### Simplified Package

LangChain v1 streamlines the `langchain` package namespace to focus on essential building blocks for agents. The package exposes only the most useful and relevant functionality (most re-exported from `@langchain/core` for convenience).

**What's in the core `langchain` package:**

- `createAgent` and agent-related utilities
- Core message types and content blocks
- Middleware infrastructure
- Tool definitions and schemas
- Prompt templates
- Output parsers
- Base runnable abstractions

### 🔄 Migration Notes

#### `@langchain/classic` for Legacy Functionality

Legacy functionality has moved to [`@langchain/classic`](https://www.npmjs.com/package/@langchain/classic) to keep the core package lean and focused.

**What's in `@langchain/classic`:**

- Legacy chains and chain implementations
- The indexing API
- [`@langchain/community`](https://www.npmjs.com/package/@langchain/community) exports
- Other deprecated functionality

**To migrate legacy code:**

1. Install `@langchain/classic`:

   ```bash
   npm install @langchain/classic
   ```

2. Update your imports:

   ```typescript
   import { ... } from "langchain"; // [!code --]
   import { ... } from "@langchain/classic"; // [!code ++]

   import { ... } from "langchain/chains"; // [!code --]
   import { ... } from "@langchain/classic/chains"; // [!code ++]
   ```

#### Upgrading to v1

Install the v1 packages:

```bash
npm install langchain@1.0.0 @langchain/core@1.0.0
```

### 📚 Additional Resources

- [LangChain 1.0 Announcement](https://blog.langchain.com/langchain-langchain-1-0-alpha-releases/)
- [Migration Guide](https://docs.langchain.com/oss/javascript/migrate/langchain-v1)
- [Agents Documentation](https://docs.langchain.com/oss/javascript/langchain/agents)
- [Middleware Guide](https://blog.langchain.com/agent-middleware/)

---

## 0.3.36

### Patch Changes

- cabd762: fix(langchain): add ChatMistralAI to well known models
- Updated dependencies [e63c7cc]
- Updated dependencies [b8ffc1e]
  - @langchain/openai@0.6.16

## 0.3.35

### Patch Changes

- fd4691f: use `keyEncoder` instead of insecure cache key getter
- 2f19cd5: feat: Add Perplexity support to universal chat model
- 3c94076: fix(langchain): Bind schemas for other types of pulled hub prompts
- Updated dependencies [d38e9d6]
  - @langchain/openai@0.6.14

## 0.3.34

### Patch Changes

- 6019a7d: update JSONL loader to support complex json structures
- caf5579: prevent ConfigurableModel mutation when using withStructuredOutput or bindTools
- d60f40f: infer mistralai models
- Updated dependencies [41bd944]
- Updated dependencies [707a768]
  - @langchain/openai@0.6.12

## 0.3.33

### Patch Changes

- d2c7f09: support prompts not created from RunnableBinding

## 0.3.32

### Patch Changes

- e0bd88c: add support for conversion of ref in array schema
- Updated dependencies [4a3f5af]
- Updated dependencies [424360b]
  - @langchain/openai@0.6.10
