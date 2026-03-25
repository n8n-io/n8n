# @langchain/classic

## 1.0.17

### Patch Changes

- Updated dependencies [[`6939dab`](https://github.com/langchain-ai/langchainjs/commit/6939dabc8dc6481942e7e2c19e3dc61bc374d65a), [`ad581c7`](https://github.com/langchain-ai/langchainjs/commit/ad581c76138ea12ebdaee444c0dcdc4f6a280624)]:
  - @langchain/openai@1.2.7

## 1.0.16

### Patch Changes

- [#9786](https://github.com/langchain-ai/langchainjs/pull/9786) [`8ee833c`](https://github.com/langchain-ai/langchainjs/commit/8ee833c1fb99891565832ead4990e246b30022a6) Thanks [@SkrOYC](https://github.com/SkrOYC)! - fix: resolve flaky tests and configuration issues
  - @langchain/turbopuffer: Allow tests to pass when no test files are found (vitest --passWithNoTests)
  - @langchain/model-profiles: Fix broken import path in generator test
  - @langchain/classic: Fix AutoGPTPrompt test to be locale-independent by forcing en-US locale

- Updated dependencies [[`16d691c`](https://github.com/langchain-ai/langchainjs/commit/16d691c7f8196e1d6322f051c25b2219ff2953b6), [`1058574`](https://github.com/langchain-ai/langchainjs/commit/1058574b723f0d060eb9b3ca25be5aeeabbe51aa)]:
  - @langchain/openai@1.2.6
  - @langchain/textsplitters@1.0.1

## 1.0.15

### Patch Changes

- [#9763](https://github.com/langchain-ai/langchainjs/pull/9763) [`8f0757f`](https://github.com/langchain-ai/langchainjs/commit/8f0757f06b2ed9fe810f636333fc71ffcedb3feb) Thanks [@AdamParker19](https://github.com/AdamParker19)! - fix(langchain): resolve className collision in MODEL_PROVIDER_CONFIG

  Refactored `getChatModelByClassName` to accept an optional `modelProvider` parameter for direct lookup, avoiding the className collision issue where multiple providers share the same className (e.g., `google-vertexai` and `google-vertexai-web` both use `"ChatVertexAI"`). When `modelProvider` is provided, the function uses direct config lookup instead of searching by className. Backward compatibility is maintained for existing callers that only pass `className`. This eliminates the duplicated import logic that was previously in `_initChatModelHelper`.

- Updated dependencies [[`0870ca0`](https://github.com/langchain-ai/langchainjs/commit/0870ca0719dacd8a555b3341e581d6c15cd6faf3), [`cf46089`](https://github.com/langchain-ai/langchainjs/commit/cf46089d250b1ec87f99956f5cd87e2615ac25c5)]:
  - @langchain/openai@1.2.5

## 1.0.14

### Patch Changes

- [#9905](https://github.com/langchain-ai/langchainjs/pull/9905) [`41bfea5`](https://github.com/langchain-ai/langchainjs/commit/41bfea51cf119573a3b956ee782d2731fe71c681) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(classic/community/core): avoid long lived abort signals

- Updated dependencies []:
  - @langchain/textsplitters@1.0.1
  - @langchain/openai@1.2.4

## 1.0.13

### Patch Changes

- Updated dependencies [[`1fa865b`](https://github.com/langchain-ai/langchainjs/commit/1fa865b1cb8a30c2269b83cdb5fc84d374c3fca9), [`28efb57`](https://github.com/langchain-ai/langchainjs/commit/28efb57448933368094ca41c63d9262ac0f348a6), [`4e42452`](https://github.com/langchain-ai/langchainjs/commit/4e42452e4c020408bd6687667e931497b05aaff5), [`a9b5059`](https://github.com/langchain-ai/langchainjs/commit/a9b50597186002221aaa4585246e569fa44c27c8), [`a9b5059`](https://github.com/langchain-ai/langchainjs/commit/a9b50597186002221aaa4585246e569fa44c27c8)]:
  - @langchain/openai@1.2.4
  - @langchain/textsplitters@1.0.1

## 1.0.12

### Patch Changes

- [#9888](https://github.com/langchain-ai/langchainjs/pull/9888) [`1d58bf2`](https://github.com/langchain-ai/langchainjs/commit/1d58bf2bcb14055a64189af7e251bb93fa9d5aa0) Thanks [@jacoblee93](https://github.com/jacoblee93)! - fix(classic): Fix typo in package.json

## 1.0.11

### Patch Changes

- [#9844](https://github.com/langchain-ai/langchainjs/pull/9844) [`a496cc0`](https://github.com/langchain-ai/langchainjs/commit/a496cc09d2b4d28a8eb0c4b96bd3555ab1cc47dc) Thanks [@VoVaVc](https://github.com/VoVaVc)! - Add support for Aurora Postgres DataSource

## 1.0.10

### Patch Changes

- Updated dependencies [[`a7c6ec5`](https://github.com/langchain-ai/langchainjs/commit/a7c6ec51ab9baa186ab5ebf815599c08f5c7e8ab), [`04923f9`](https://github.com/langchain-ai/langchainjs/commit/04923f9835e5b3677c180b601ae8f3e7d8be0236), [`e16c218`](https://github.com/langchain-ai/langchainjs/commit/e16c218b81980a1c576af5192342019975bb95b9)]:
  - @langchain/openai@1.2.3
  - @langchain/textsplitters@1.0.1

## 1.0.9

### Patch Changes

- Updated dependencies [[`3efe79c`](https://github.com/langchain-ai/langchainjs/commit/3efe79c62ff2ffe0ada562f7eecd85be074b649a)]:
  - @langchain/openai@1.2.2
  - @langchain/textsplitters@1.0.1

## 1.0.8

### Patch Changes

- [#9715](https://github.com/langchain-ai/langchainjs/pull/9715) [`cc502e1`](https://github.com/langchain-ai/langchainjs/commit/cc502e1b67dbadcd123a7ea2964c791c2bbad581) Thanks [@jacoblee93](https://github.com/jacoblee93)! - fix(langchain): Add secretsFromEnv and secrets for prompt pulling
  fix(@langchain/classic): Add secretsFromEnv and secrets for prompt pulling
- Updated dependencies [[`13c9d5b`](https://github.com/langchain-ai/langchainjs/commit/13c9d5bfa3acac7ffb37642e9a50d84dc9004e88), [`75b3b90`](https://github.com/langchain-ai/langchainjs/commit/75b3b90c5fa62cbbfa678dfb01f031caed4488ef)]:
  - @langchain/openai@1.2.1
  - @langchain/textsplitters@1.0.1

## 1.0.7

### Patch Changes

- [#9675](https://github.com/langchain-ai/langchainjs/pull/9675) [`af664be`](https://github.com/langchain-ai/langchainjs/commit/af664becc0245b2315ea2f784c9a6c1d7622dbb4) Thanks [@jacoblee93](https://github.com/jacoblee93)! - Bump LangSmith dep to 0.4.0

- Updated dependencies []:
  - @langchain/textsplitters@1.0.1
  - @langchain/openai@1.2.0

## 1.0.6

### Patch Changes

- [#9596](https://github.com/langchain-ai/langchainjs/pull/9596) [`316392e`](https://github.com/langchain-ai/langchainjs/commit/316392ea5666008873ab88971f599469ea7a2765) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(@langchain/classic): add langsmith as external dependency

- [#9606](https://github.com/langchain-ai/langchainjs/pull/9606) [`41b26a4`](https://github.com/langchain-ai/langchainjs/commit/41b26a499625f5f6cd817433832a8d2c2639d2fb) Thanks [@patrykkopycinski](https://github.com/patrykkopycinski)! - bin p-retry

- Updated dependencies [[`5a01b5b`](https://github.com/langchain-ai/langchainjs/commit/5a01b5b705f6933958f61318b22f00b5f4763be8), [`eab88a5`](https://github.com/langchain-ai/langchainjs/commit/eab88a5ab7610f5b63212f753ebcbeee2f393622), [`5f79bc5`](https://github.com/langchain-ai/langchainjs/commit/5f79bc50aebc093c90b6716c0aebf5c4813d0171), [`7b301c0`](https://github.com/langchain-ai/langchainjs/commit/7b301c00ac851c286a13c2a908757cb40180c768), [`bb2f422`](https://github.com/langchain-ai/langchainjs/commit/bb2f422cd8e0d709d82baca44565980abb57120f), [`2a5ba50`](https://github.com/langchain-ai/langchainjs/commit/2a5ba50d240e7d6181546facf088142fbb7b4977), [`47edf3f`](https://github.com/langchain-ai/langchainjs/commit/47edf3fc673eb0627ec585a3a5c2b9381e234527), [`2e563e3`](https://github.com/langchain-ai/langchainjs/commit/2e563e332772aa0468f610c334cbedd7f3513ce8), [`72795fe`](https://github.com/langchain-ai/langchainjs/commit/72795fe76b515d9edc7d78fb28db59df844ce0c3), [`f97b488`](https://github.com/langchain-ai/langchainjs/commit/f97b488200b34c485b15a743277984ecacc62160), [`29a8480`](https://github.com/langchain-ai/langchainjs/commit/29a8480799d4c3534892a29cef4a135c437deb9b), [`3ecc1e7`](https://github.com/langchain-ai/langchainjs/commit/3ecc1e716704a032e941e670d1d9fbf5370d57aa), [`6baa851`](https://github.com/langchain-ai/langchainjs/commit/6baa851176b5dde5da19891df114a4645dfe7481), [`a552cad`](https://github.com/langchain-ai/langchainjs/commit/a552cad1a463239a0d1d1b5da7798978722738cf), [`69a1045`](https://github.com/langchain-ai/langchainjs/commit/69a1045e1e14aed9273a1a4085ac35e601a1ecc7)]:
  - @langchain/openai@1.2.0
  - @langchain/textsplitters@1.0.1

## 1.0.5

### Patch Changes

- [#9416](https://github.com/langchain-ai/langchainjs/pull/9416) [`0fe9beb`](https://github.com/langchain-ai/langchainjs/commit/0fe9bebee6710f719e47f913eec1ec4f638e4de4) Thanks [@hntrl](https://github.com/hntrl)! - fix 'moduleResultion: "node"' compatibility

- [#9463](https://github.com/langchain-ai/langchainjs/pull/9463) [`10fa2af`](https://github.com/langchain-ai/langchainjs/commit/10fa2afec0b81efd3467e61b59ba5c82e1043de5) Thanks [@christian-bromann](https://github.com/christian-bromann)! - fix(core): update p-retry to fix memory leak

- Updated dependencies [[`0fe9beb`](https://github.com/langchain-ai/langchainjs/commit/0fe9bebee6710f719e47f913eec1ec4f638e4de4)]:
  - @langchain/openai@1.1.3
  - @langchain/textsplitters@1.0.1

## 1.0.4

### Patch Changes

- [#9379](https://github.com/langchain-ai/langchainjs/pull/9379) [`34c472d`](https://github.com/langchain-ai/langchainjs/commit/34c472d129c9c3d58042fad6479fd15e0763feaf) Thanks [@kenowessels](https://github.com/kenowessels)! - OpenAPIToJSONSchema required from nested schema

- Updated dependencies [[`415cb0b`](https://github.com/langchain-ai/langchainjs/commit/415cb0bfd26207583befdb02367bd12a46b33d51), [`a2ad61e`](https://github.com/langchain-ai/langchainjs/commit/a2ad61e787a06a55a615f63589a65ada05927792)]:
  - @langchain/openai@1.1.2

## 1.0.3

### Patch Changes

- Updated dependencies [[`04bd55c`](https://github.com/langchain-ai/langchainjs/commit/04bd55c63d8a0cb56f85da0b61a6bd6169b383f3), [`ac0d4fe`](https://github.com/langchain-ai/langchainjs/commit/ac0d4fe3807e05eb2185ae8a36da69498e6163d4), [`39dbe63`](https://github.com/langchain-ai/langchainjs/commit/39dbe63e3d8390bb90bb8b17f00755fa648c5651), [`dfbe45f`](https://github.com/langchain-ai/langchainjs/commit/dfbe45f3cfade7a1dbe15b2d702a8e9f8e5ac93a)]:
  - @langchain/openai@1.1.1
  - @langchain/textsplitters@1.0.0

## 1.0.2

### Patch Changes

- Updated dependencies [8319201]
- Updated dependencies [4906522]
  - @langchain/openai@1.1.0
  - @langchain/textsplitters@1.0.0

## 1.0.1

### Patch Changes

- dda9ea4: reinstate `OpenAIModerationChain`
  - @langchain/textsplitters@1.0.0
  - @langchain/openai@1.0.0

## 1.0.0

This release updates the package for compatibility with LangChain v1.0. See the v1.0 [release notes](https://docs.langchain.com/oss/javascript/releases/langchain-v1) for details on what's new.
