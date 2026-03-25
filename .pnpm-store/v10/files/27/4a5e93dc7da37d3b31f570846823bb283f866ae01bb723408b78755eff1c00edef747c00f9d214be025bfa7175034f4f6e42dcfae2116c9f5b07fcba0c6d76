# @langchain/google-common

## 2.1.24

### Patch Changes

- [#10208](https://github.com/langchain-ai/langchainjs/pull/10208) [`745b09a`](https://github.com/langchain-ai/langchainjs/commit/745b09a1b0c92643cbc99e773012924948438629) Thanks [@colifran](https://github.com/colifran)! - feat(google-common): implement standard schema support for structured output

- Updated dependencies [[`96c630d`](https://github.com/langchain-ai/langchainjs/commit/96c630dfd009f2546d5bc36f5067ff868bb4067f), [`a8b9ccc`](https://github.com/langchain-ai/langchainjs/commit/a8b9ccca5a85984a5a30008acd09f9991e591638), [`a1f22bb`](https://github.com/langchain-ai/langchainjs/commit/a1f22bba907731a18dca23c31cec5333444a3f55)]:
  - @langchain/core@1.1.30

## 2.1.23

### Patch Changes

- [#10194](https://github.com/langchain-ai/langchainjs/pull/10194) [`d43194b`](https://github.com/langchain-ai/langchainjs/commit/d43194b625f19acf79cbe958300dadb7b0a6a89d) Thanks [@colifran](https://github.com/colifran)! - fix(google): strip internal fields from text content blocks before sending to Anthropic API

## 2.1.22

### Patch Changes

- [#10187](https://github.com/langchain-ai/langchainjs/pull/10187) [`3590ee3`](https://github.com/langchain-ai/langchainjs/commit/3590ee3229a9a55b0c818c1e396f6445b2368103) Thanks [@colifran](https://github.com/colifran)! - fix(google): streaming chunks missing index produces empty text blocks when using ChatVertexAI with Claude models

## 2.1.21

### Patch Changes

- [#10106](https://github.com/langchain-ai/langchainjs/pull/10106) [`9f30267`](https://github.com/langchain-ai/langchainjs/commit/9f30267e95a2a42fac71f1d3674b84c5a190dbbc) Thanks [@hntrl](https://github.com/hntrl)! - Add package version metadata to runnable traces. Each package now stamps its version in `this.metadata.versions` at construction time, making version info available in LangSmith trace metadata.

- [#10152](https://github.com/langchain-ai/langchainjs/pull/10152) [`e0e5a02`](https://github.com/langchain-ai/langchainjs/commit/e0e5a02ea1b855ad7b8d562d1c7770f984100a5d) Thanks [@hntrl](https://github.com/hntrl)! - fix(google-common): preserve anthropic tool_use blocks and avoid duplicates in Claude Vertex formatting

  Improve Anthropic message conversion in the Vertex Claude path by preserving `tool_use` blocks from assistant content and deduplicating `tool_use` entries when they also appear in `tool_calls`.

  Add regression tests for Anthropic formatting with multi-turn/tool message flows.

- Updated dependencies [[`9f30267`](https://github.com/langchain-ai/langchainjs/commit/9f30267e95a2a42fac71f1d3674b84c5a190dbbc), [`403a99f`](https://github.com/langchain-ai/langchainjs/commit/403a99fd826383f30300809ae077e1c967023520), [`3b1fd54`](https://github.com/langchain-ai/langchainjs/commit/3b1fd5458a4aa29c398122829f383f21b5ac39da), [`77bd982`](https://github.com/langchain-ai/langchainjs/commit/77bd98274a885e947d76f7a9c6dd0b3763453218)]:
  - @langchain/core@1.1.29

## 2.1.20

### Patch Changes

- Updated dependencies [[`fb2226e`](https://github.com/langchain-ai/langchainjs/commit/fb2226e6decdaba21e78b3f01877b45fa1eed6d3)]:
  - @langchain/core@1.1.27

## 2.1.19

### Patch Changes

- [#10078](https://github.com/langchain-ai/langchainjs/pull/10078) [`7be50a7`](https://github.com/langchain-ai/langchainjs/commit/7be50a7014d7622e0ab8d303dfc9c633ebc96333) Thanks [@christian-bromann](https://github.com/christian-bromann)! - chore(\*): update model profiles

- Updated dependencies [[`27186c5`](https://github.com/langchain-ai/langchainjs/commit/27186c54884cfe7c2522fa50b42c3ca0ccaefdba), [`05396f7`](https://github.com/langchain-ai/langchainjs/commit/05396f7ce0a91c49a3bae4bbcd3dbdd6cbd18089), [`5a6f26b`](https://github.com/langchain-ai/langchainjs/commit/5a6f26bbaed80195dc538c538b96219a8b03f38f)]:
  - @langchain/core@1.1.25

## 2.1.18

### Patch Changes

- [#9948](https://github.com/langchain-ai/langchainjs/pull/9948) [`58c00aa`](https://github.com/langchain-ai/langchainjs/commit/58c00aa51994e421741c88f51f6e9d2726433a03) Thanks [@aditya-gg04](https://github.com/aditya-gg04)! - support input_audio content for Gemini

- Updated dependencies [[`71d08c0`](https://github.com/langchain-ai/langchainjs/commit/71d08c0a3a2597bd5a084eb35a7830e5ea1a2b29)]:
  - @langchain/core@1.1.23

## 2.1.17

### Patch Changes

- [#9985](https://github.com/langchain-ai/langchainjs/pull/9985) [`e2ed407`](https://github.com/langchain-ai/langchainjs/commit/e2ed40729c54d132b91b7abecfb787fe5f09461e) Thanks [@turnerdev](https://github.com/turnerdev)! - Set the correct `_llmType` for Google models

- Updated dependencies [[`d5e3db0`](https://github.com/langchain-ai/langchainjs/commit/d5e3db0d01ab321ec70a875805b2f74aefdadf9d)]:
  - @langchain/core@1.1.21

## 2.1.16

### Patch Changes

- [#9973](https://github.com/langchain-ai/langchainjs/pull/9973) [`5681181`](https://github.com/langchain-ai/langchainjs/commit/568118119f44cc4509a2c04dff2891230e874f46) Thanks [@hntrl](https://github.com/hntrl)! - fix(google-common): surface actual API error when GAuthClient's gaxios throws for non-2xx responses

  Previously, when `GAuthClient._fetch` (via `google-auth-library`/gaxios) threw a `GaxiosError` for non-2xx
  responses, the error bypassed `_request()`'s `!res.ok` formatting and propagated with an empty/undefined
  message. Users saw "undefined" in their traces instead of the actual Google API error. This was particularly
  impactful for `image_url`/`fileData` content where Gemini returns descriptive errors like
  "Cannot fetch content from the provided URL" when it can't access the image.

  The fix wraps `_fetch()` in a try/catch that extracts the status and response body from the thrown error and
  re-throws with the same well-formatted message used by the existing `!res.ok` path. Both paths now funnel
  through a shared `_throwRequestError()` helper.

- Updated dependencies [[`71c3cba`](https://github.com/langchain-ai/langchainjs/commit/71c3cba843ab16d877299d158a1de0c7d22f3fb9)]:
  - @langchain/core@1.1.20

## 2.1.15

### Patch Changes

- Updated dependencies [[`41bfea5`](https://github.com/langchain-ai/langchainjs/commit/41bfea51cf119573a3b956ee782d2731fe71c681)]:
  - @langchain/core@1.1.19

## 2.1.14

### Patch Changes

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

- [#9864](https://github.com/langchain-ai/langchainjs/pull/9864) [`e10c6cb`](https://github.com/langchain-ai/langchainjs/commit/e10c6cb9cbbf420c95855225f4872c2e738bbd92) Thanks [@yukukotani](https://github.com/yukukotani)! - support nullable object types in zod to gemini schema conversion

- Updated dependencies [[`a9b5059`](https://github.com/langchain-ai/langchainjs/commit/a9b50597186002221aaa4585246e569fa44c27c8), [`a9b5059`](https://github.com/langchain-ai/langchainjs/commit/a9b50597186002221aaa4585246e569fa44c27c8)]:
  - @langchain/core@1.1.18

## 2.1.13

### Patch Changes

- Updated dependencies [[`05a9733`](https://github.com/langchain-ai/langchainjs/commit/05a9733448a10764c0bfd070af859c33e623b998)]:
  - @langchain/core@1.1.17

## 2.1.12

## 2.1.11

### Patch Changes

- Updated dependencies [[`70387a1`](https://github.com/langchain-ai/langchainjs/commit/70387a144464539d65a546c8130cf51dfad025a1), [`a7c6ec5`](https://github.com/langchain-ai/langchainjs/commit/a7c6ec51ab9baa186ab5ebf815599c08f5c7e8ab), [`5e04543`](https://github.com/langchain-ai/langchainjs/commit/5e045435a783fdae44bc9a43e01a8e5eb7100db2), [`40b4467`](https://github.com/langchain-ai/langchainjs/commit/40b446762445575844610ee528abc77c247b2c43), [`17e30bd`](https://github.com/langchain-ai/langchainjs/commit/17e30bd7f4c7bdf87c9c30304b3b9e121cc1fbbc)]:
  - @langchain/core@1.1.16

## 2.1.10

### Patch Changes

- Updated dependencies [[`230462d`](https://github.com/langchain-ai/langchainjs/commit/230462d28c3a8b5ccadf433ea2f523eb6e658de6)]:
  - @langchain/core@1.1.15

## 2.1.9

### Patch Changes

- Updated dependencies [[`bd1ab45`](https://github.com/langchain-ai/langchainjs/commit/bd1ab45364391f69ce93ecba36a4a15dafca2b76)]:
  - @langchain/core@1.1.14

## 2.1.8

### Patch Changes

- Updated dependencies [[`3efe79c`](https://github.com/langchain-ai/langchainjs/commit/3efe79c62ff2ffe0ada562f7eecd85be074b649a), [`b8561c1`](https://github.com/langchain-ai/langchainjs/commit/b8561c17556bdf7a3ff8d70bc307422642a9172e)]:
  - @langchain/core@1.1.13

## 2.1.7

### Patch Changes

- Updated dependencies [[`23be5af`](https://github.com/langchain-ai/langchainjs/commit/23be5afd59b5f4806edef11937ce5e2ba300f7ee)]:
  - @langchain/core@1.1.12

## 2.1.6

### Patch Changes

- Updated dependencies [[`a46a249`](https://github.com/langchain-ai/langchainjs/commit/a46a24983fd0fea649d950725a2673b3c435275f)]:
  - @langchain/core@1.1.11

## 2.1.5

### Patch Changes

- Updated dependencies [[`817fc9a`](https://github.com/langchain-ai/langchainjs/commit/817fc9a56d4699f3563a6e153b13eadf7bcc661b)]:
  - @langchain/core@1.1.10

## 2.1.4

### Patch Changes

- [#9738](https://github.com/langchain-ai/langchainjs/pull/9738) [`8ef1525`](https://github.com/langchain-ai/langchainjs/commit/8ef152555a945c95322f28209957b69605c04c91) Thanks [@hntrl](https://github.com/hntrl)! - feat(google-common): support thinkingLevel parameter for Gemini models

- Updated dependencies [[`56600b9`](https://github.com/langchain-ai/langchainjs/commit/56600b94f8e185f44d4288b7a9b66c55778938dd), [`dc5c2ac`](https://github.com/langchain-ai/langchainjs/commit/dc5c2ac00f86dd2feeba9843d708926a5f38202e), [`c28d24a`](https://github.com/langchain-ai/langchainjs/commit/c28d24a8770f6d0e543cde116b0e38b3baf21301), [`bfcb87d`](https://github.com/langchain-ai/langchainjs/commit/bfcb87d23c580c7881f650960a448fe2e54a30b3)]:
  - @langchain/core@1.1.9

## 2.1.3

### Patch Changes

- Updated dependencies [[`e5063f9`](https://github.com/langchain-ai/langchainjs/commit/e5063f9c6e9989ea067dfdff39262b9e7b6aba62), [`8996647`](https://github.com/langchain-ai/langchainjs/commit/89966470e8c0b112ce4f9a326004af6a4173f9e6)]:
  - @langchain/core@1.1.8

## 2.1.2

### Patch Changes

- Updated dependencies [[`df9c42b`](https://github.com/langchain-ai/langchainjs/commit/df9c42b3ab61b85309ab47256e1d93c3188435ee), [`8d2982b`](https://github.com/langchain-ai/langchainjs/commit/8d2982bb94c0f4e4314ace3cc98a1ae87571b1ed), [`af664be`](https://github.com/langchain-ai/langchainjs/commit/af664becc0245b2315ea2f784c9a6c1d7622dbb4), [`ffb2402`](https://github.com/langchain-ai/langchainjs/commit/ffb24026cd93e58219519ee24c6e23ea57cb5bde)]:
  - @langchain/core@1.1.7

## 2.1.1

### Patch Changes

- Updated dependencies [[`a7b2a7d`](https://github.com/langchain-ai/langchainjs/commit/a7b2a7db5ef57df3731ae6c9931f4b663e909505), [`a496c5f`](https://github.com/langchain-ai/langchainjs/commit/a496c5fc64d94cc0809216325b0f1bfde3f92c45), [`1da1325`](https://github.com/langchain-ai/langchainjs/commit/1da1325aea044fb37af54a9de1f4ae0b9f47d4a2)]:
  - @langchain/core@1.1.6

## 2.1.0

### Minor Changes

- [#9518](https://github.com/langchain-ai/langchainjs/pull/9518) [`cc7051b`](https://github.com/langchain-ai/langchainjs/commit/cc7051b61503cdae91a2b74b41889d8d0f26a6e9) Thanks [@yukukotani](https://github.com/yukukotani)! - Add jsonSchema method support to withStructuredOutput in langchain-google-common and VertexAI

### Patch Changes

- [#8951](https://github.com/langchain-ai/langchainjs/pull/8951) [`a2a0088`](https://github.com/langchain-ai/langchainjs/commit/a2a00880b80119eb926de05e9c556a44fd56632e) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(google-common): handle unsupported Zod schema features for Gemini tools

- Updated dependencies [[`005c729`](https://github.com/langchain-ai/langchainjs/commit/005c72903bcdf090e0f4c58960c8c243481f9874), [`ab78246`](https://github.com/langchain-ai/langchainjs/commit/ab782462753e6c3ae5d55c0c251f795af32929d5), [`8cc81c7`](https://github.com/langchain-ai/langchainjs/commit/8cc81c7cee69530f7a6296c69123edbe227b2fce), [`f32e499`](https://github.com/langchain-ai/langchainjs/commit/f32e4991d0e707324e3f6af287a1ee87ab833b7e), [`a28d83d`](https://github.com/langchain-ai/langchainjs/commit/a28d83d49dd1fd31e67b52a44abc70f2cc2a2026), [`2e5ad70`](https://github.com/langchain-ai/langchainjs/commit/2e5ad70d16c1f13eaaea95336bbe2ec4a4a4954a), [`e456c66`](https://github.com/langchain-ai/langchainjs/commit/e456c661aa1ab8f1ed4a98c40616f5a13270e88e), [`1cfe603`](https://github.com/langchain-ai/langchainjs/commit/1cfe603e97d8711343ae5f1f5a75648e7bd2a16e)]:
  - @langchain/core@1.1.5

## 2.0.4

### Patch Changes

- Updated dependencies [[`0bade90`](https://github.com/langchain-ai/langchainjs/commit/0bade90ed47c7988ed86f1e695a28273c7b3df50), [`6c40d00`](https://github.com/langchain-ai/langchainjs/commit/6c40d00e926f377d249c2919549381522eac8ed1)]:
  - @langchain/core@1.1.4

## 2.0.3

### Patch Changes

- Updated dependencies [[`bd2c46e`](https://github.com/langchain-ai/langchainjs/commit/bd2c46e09e661d9ac766c09e71bc6687d6fc811c), [`487378b`](https://github.com/langchain-ai/langchainjs/commit/487378bf14277659c8ca0ef06ea0f9836b818ff4), [`138e7fb`](https://github.com/langchain-ai/langchainjs/commit/138e7fb6280705457079863bedb238b16b322032)]:
  - @langchain/core@1.1.3

## 2.0.2

### Patch Changes

- Updated dependencies [[`833f578`](https://github.com/langchain-ai/langchainjs/commit/833f57834dc3aa64e4cfdd7499f865b2ab41462a)]:
  - @langchain/core@1.1.2

## 2.0.1

### Patch Changes

- Updated dependencies [[`636b994`](https://github.com/langchain-ai/langchainjs/commit/636b99459bf843362298866211c63a7a15c2a319), [`38f0162`](https://github.com/langchain-ai/langchainjs/commit/38f0162b7b2db2be2c3a75ae468728adcb49fdfb)]:
  - @langchain/core@1.1.1

## 1.0.4

### Patch Changes

- [#9416](https://github.com/langchain-ai/langchainjs/pull/9416) [`0fe9beb`](https://github.com/langchain-ai/langchainjs/commit/0fe9bebee6710f719e47f913eec1ec4f638e4de4) Thanks [@hntrl](https://github.com/hntrl)! - fix 'moduleResultion: "node"' compatibility

- [#9440](https://github.com/langchain-ai/langchainjs/pull/9440) [`21a8374`](https://github.com/langchain-ai/langchainjs/commit/21a83742af89e6a7f29d303f63729d0e31b59fdd) Thanks [@manekinekko](https://github.com/manekinekko)! - update polynomial regex to mitigate ReDoS vulnerability in SseStream

- Updated dependencies [[`708d360`](https://github.com/langchain-ai/langchainjs/commit/708d360df1869def7e4caaa5995d6e907bbf54cd), [`0fe9beb`](https://github.com/langchain-ai/langchainjs/commit/0fe9bebee6710f719e47f913eec1ec4f638e4de4), [`10fa2af`](https://github.com/langchain-ai/langchainjs/commit/10fa2afec0b81efd3467e61b59ba5c82e1043de5)]:
  - @langchain/core@1.1.0

## 1.0.3

## 1.0.2

## 1.0.1

### Patch Changes

- [#9387](https://github.com/langchain-ai/langchainjs/pull/9387) [`ac0d4fe`](https://github.com/langchain-ai/langchainjs/commit/ac0d4fe3807e05eb2185ae8a36da69498e6163d4) Thanks [@hntrl](https://github.com/hntrl)! - Add `ModelProfile` and `.profile` properties to ChatModel

## 1.0.0

This release updates the package for compatibility with LangChain v1.0. See the v1.0 [release notes](https://docs.langchain.com/oss/javascript/releases/langchain-v1) for details on what's new.

## 0.2.18

### Patch Changes

- 0092a79: compute per-chunk token deltas while streaming

## 0.2.17

### Patch Changes

- 4a3f5af: add handling for well known content blocks (#8781)
