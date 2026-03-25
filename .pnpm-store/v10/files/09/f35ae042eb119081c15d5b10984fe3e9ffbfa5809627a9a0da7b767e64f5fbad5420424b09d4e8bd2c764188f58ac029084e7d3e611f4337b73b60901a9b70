# 🦜🍎️ @langchain/core

![npm](https://img.shields.io/npm/dm/@langchain/core) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Twitter](https://img.shields.io/twitter/url/https/twitter.com/langchain.svg?style=social&label=Follow%20%40LangChain)](https://x.com/langchain)

`@langchain/core` contains the core abstractions and schemas of LangChain.js, including base classes for language models,
chat models, vectorstores, retrievers, and runnables.

## 💾 Quick Install

```bash
pnpm install @langchain/core
```

## 🤔 What is this?

`@langchain/core` contains the base abstractions that power the rest of the LangChain ecosystem.
These abstractions are designed to be as modular and simple as possible.
Examples of these abstractions include those for language models, document loaders, embedding models, vectorstores, retrievers, and more.
The benefit of having these abstractions is that any provider can implement the required interface and then easily be used in the rest of the LangChain ecosystem.

For example, you can install other provider-specific packages like this:

```bash
pnpm install @langchain/openai
```

And use them as follows:

```typescript
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

const prompt = ChatPromptTemplate.fromTemplate(
  `Answer the following question to the best of your ability:\n{question}`
);

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.8,
});

const outputParser = new StringOutputParser();

const chain = prompt.pipe(model).pipe(outputParser);

const stream = await chain.stream({
  question: "Why is the sky blue?",
});

for await (const chunk of stream) {
  console.log(chunk);
}

/*
The
 sky
 appears
 blue
 because
 of
 a
 phenomenon
 known
 as
 Ray
leigh
 scattering
*/
```

Note that for compatibility, all used LangChain packages (including the base LangChain package, which itself depends on core!) must share the same version of `@langchain/core`.
This means that you may need to install/resolve a specific version of `@langchain/core` that matches the dependencies of your used packages.

## 📦 Creating your own package

Other LangChain packages should add this package as a dependency and extend the classes within.
For an example, see the [@langchain/anthropic](https://github.com/langchain-ai/langchainjs/tree/main/libs/providers/langchain-anthropic) in this repo.

Because all used packages must share the same version of core, packages should never directly depend on `@langchain/core`. Instead they should have core as a peer dependency and a dev dependency. We suggest using a tilde dependency to allow for different (backwards-compatible) patch versions:

```json
{
  "name": "@langchain/anthropic",
  "version": "0.0.3",
  "description": "Anthropic integrations for LangChain.js",
  "type": "module",
  "author": "LangChain",
  "license": "MIT",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.10.0"
  },
  "peerDependencies": {
    "@langchain/core": "~0.3.0"
  },
  "devDependencies": {
    "@langchain/core": "~0.3.0"
  }
}
```

We suggest making all packages cross-compatible with ESM and CJS using a build step like the one in
[@langchain/anthropic](https://github.com/langchain-ai/langchainjs/tree/main/libs/providers/langchain-anthropic), then running `pnpm build` before running `npm publish`.

## 💁 Contributing

Because `@langchain/core` is a low-level package whose abstractions will change infrequently, most contributions should be made in the higher-level LangChain package.

Bugfixes or suggestions should be made using the same guidelines as the main package.
See [here](https://github.com/langchain-ai/langchainjs/tree/main/CONTRIBUTING.md) for detailed information.

Please report any security issues or concerns following our [security guidelines](https://github.com/langchain-ai/.github/blob/main/SECURITY.md).
