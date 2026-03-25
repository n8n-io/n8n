![npm](https://img.shields.io/npm/dw/%40getzep/zep-cloud) [![ci](https://github.com/getzep/zep-js/actions/workflows/ci.yml/badge.svg)](https://github.com/getzep/zep-js/actions/workflows/ci.yml) [![CodeQL](https://github.com/getzep/zep-js/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/getzep/zep-js/actions/workflows/github-code-scanning/codeql) [![fern shield](https://img.shields.io/badge/%F0%9F%8C%BF-SDK%20generated%20by%20Fern-brightgreen)](https://buildwithfern.com/?utm_source=getzep/zep-js/readme)


<p align="center">
  <a href="https://www.getzep.com/">
    <img src="https://raw.githubusercontent.com/getzep/zep/main/assets/zep-logo-icon-gradient-rgb.svg" width="150" alt="Zep Logo">
  </a>
</p>

<h1 align="center">
Zep: Long-Term Memory for ‍AI Assistants.
</h1>
<h2 align="center">Recall, understand, and extract data from chat histories. Power personalized AI experiences.</h2>
<br />

<p align="center">
<a href="https://help.getzep.com">Documentation</a> | 
<a href="https://help.getzep.com/langchain/overview">LangChain</a> |
<a href="https://discord.gg/W8Kw6bsgXQ">Discord</a><br />
<a href="https://www.getzep.com">www.getzep.com</a>
</p>

## What is Zep? 💬
Zep is a long-term memory service for AI Assistant apps. With Zep, you can provide AI assistants with the ability to recall past conversations, no matter how distant, while also reducing hallucinations, latency, and cost.

### Installation Notes
Main branch contains the latest version of zep-cloud sdk. You can install it by running:
```bash
npm install @getzep/zep-cloud
```

Open Source Compatible SDK is available in the [oss](https://github.com/getzep/zep-js/tree/oss) branch, where you can also find Open Source compatible examples. You can install it by running:
```bash
npm install @getzep/zep-js
```

### How Zep works

Zep persists and recalls chat histories, and automatically generates summaries and other artifacts from these chat histories. It also embeds messages and summaries, enabling you to search Zep for relevant context from past conversations. Zep does all of this asynchronously, ensuring these operations don't impact your user's chat experience. Data is persisted to database, allowing you to scale out when growth demands.

Zep also provides a simple, easy to use abstraction for document vector search called Document Collections. This is designed to complement Zep's core memory features, but is not designed to be a general purpose vector database.

Zep allows you to be more intentional about constructing your prompt:
1. automatically adding a few recent messages, with the number customized for your app;
2. a summary of recent conversations prior to the messages above;
3. and/or contextually relevant summaries or messages surfaced from the entire chat session.
4. and/or relevant Business data from Zep Document Collections.

Zep Cloud offers:
- **Fact Extraction:** Automatically build fact tables from conversations, without having to define a data schema upfront.
- **Dialog Classification:** Instantly and accurately classify chat dialog. Understand user intent and emotion, segment users, and more. Route chains based on semantic context, and trigger events.
- **Structured Data Extraction:** Quickly extract business data from chat conversations using a schema you define. Understand what your Assistant should ask for next in order to complete its task.

You will also need to provide a Zep Project API key to your zep client.
You can find out about zep projects in our [cloud docs](https://help.getzep.com/projects.html)

### Using langchain zep classes with `zep-cloud`:
`zep-cloud` sdk comes with `ZepChatMessageHistory`, `ZepVectorStore` and `ZepMemory`
classes that are compatible with [`Langchain's JS expression language`](https://js.langchain.com/docs/expression_language/)

In order to use these classes in your application, you need to make sure that you have
`langchain` package installed:

```bash
npm install langchain@^0.1.23
```

You can import these classes in the following way:

```typescript
import { ZepChatMessageHistory, ZepVectorStore, ZepMemory } from "@getzep/zep-cloud/langchain"
```

