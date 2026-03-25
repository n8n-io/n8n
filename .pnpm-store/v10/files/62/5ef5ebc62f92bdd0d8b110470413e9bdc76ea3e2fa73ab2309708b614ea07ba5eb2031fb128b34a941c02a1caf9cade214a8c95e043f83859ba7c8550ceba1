# @langchain/classic

This package contains functionality from LangChain v0.x that has been moved out of the main `langchain` package as part of the v1.0 release. It exists to provide backward compatibility for existing applications while the core `langchain` package focuses on the essential building blocks for modern agent development.

## When to use this package

Use `@langchain/classic` if you:

- Have existing code that uses legacy chains (e.g., `LLMChain`, `ConversationalRetrievalQAChain`, `RetrievalQAChain`)
- Use the indexing API
- Depend on functionality from `@langchain/community` that was previously re-exported from `langchain`
- Are maintaining an existing application and not yet ready to migrate to the new `createAgent` API

## When NOT to use this package

**For new projects, use `langchain` v1.0 instead.** The new APIs provide:

- **`createAgent`**: A cleaner, more powerful way to build agents with middleware support
- **Better performance**: Optimized for modern agent workflows
- **Focused API surface**: Less complexity, easier to learn
- **Active development**: New features and improvements will focus on v1.0 APIs

See the [LangChain v1.0 release notes](https://docs.langchain.com/oss/javascript/releases/langchain-v1) for more information.

## Installation

```bash npm2yarn
npm install @langchain/classic
```

This package requires `@langchain/core` as a peer dependency:

```bash npm2yarn
npm install @langchain/core
```

## What's included

### Legacy Chains

All chain implementations from v0.x, including:

- `LLMChain` - Basic chain for calling an LLM with a prompt template
- `ConversationalRetrievalQAChain` - Chain for conversational question-answering over documents
- `RetrievalQAChain` - Chain for question-answering over documents without conversation memory
- `StuffDocumentsChain` - Chain for stuffing documents into a prompt
- `MapReduceDocumentsChain` - Chain for map-reduce operations over documents
- `RefineDocumentsChain` - Chain for iterative refinement over documents
- And many more...

### Indexing API

The `RecordManager` and related indexing functionality for managing document updates in vector stores.

### Community Integrations

Re-exports from `@langchain/community` that were previously available in the main `langchain` package.

### Other Deprecated Functionality

Various utilities and abstractions that have been replaced by better alternatives in v1.0.

## Migration

### From `langchain` v0.x to `@langchain/classic`

If you're upgrading to `langchain` v1.0 but want to keep using legacy functionality:

1. Install `@langchain/classic`:

   ```bash npm2yarn
   npm install @langchain/classic
   ```

2. Update your imports:

   ```typescript
   // Before (v0.x)
   import { LLMChain } from "langchain/chains";
   import { ConversationalRetrievalQAChain } from "langchain/chains";

   // After (v1.0)
   import { LLMChain } from "@langchain/classic/chains";
   import { ConversationalRetrievalQAChain } from "@langchain/classic/chains";
   ```

   Or if you imported from the root:

   ```typescript
   // Before (v0.x)
   import { LLMChain } from "langchain";

   // After (v1.0)
   import { LLMChain } from "@langchain/classic";
   ```

### From `@langchain/classic` to `langchain` v1.0

**For new development, we recommend using `createAgent` instead of legacy chains.**

Example migration from `LLMChain`:

```typescript
// Before (using LLMChain)
import { LLMChain } from "@langchain/classic/chains";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

const model = new ChatOpenAI({ model: "gpt-4" });
const prompt = PromptTemplate.fromTemplate(
  "What is a good name for a company that makes {product}?"
);
const chain = new LLMChain({ llm: model, prompt });
const result = await chain.call({ product: "colorful socks" });

// After (using createAgent)
import { createAgent } from "langchain";

const agent = createAgent({
  model: "openai:gpt-4",
  systemPrompt: "You are a creative assistant that helps name companies.",
});

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "What is a good name for a company that makes colorful socks?",
    },
  ],
});
```

For more complex migrations, see the [migration guide](https://docs.langchain.com/oss/javascript/migrate/langchain-v1).

## Support and Maintenance

`@langchain/classic` will receive:

- **Bug fixes**: Critical bugs will be fixed
- **Security updates**: Security vulnerabilities will be patched
- **No new features**: New functionality will focus on `langchain` v1.0 APIs

This package is in **maintenance mode**. For new features and active development, use `langchain` v1.0.

## Examples

### Using a legacy chain

```typescript
import { LLMChain } from "@langchain/classic/chains";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

const model = new ChatOpenAI({ model: "gpt-4" });

const prompt = PromptTemplate.fromTemplate(
  "Tell me a {adjective} joke about {content}."
);

const chain = new LLMChain({ llm: model, prompt });

const result = await chain.call({
  adjective: "funny",
  content: "chickens",
});

console.log(result.text);
```

### Using ConversationalRetrievalQAChain

```typescript
import { ConversationalRetrievalQAChain } from "@langchain/classic/chains";
import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

// Create vector store with documents
const vectorStore = await MemoryVectorStore.fromTexts(
  ["Document 1 text...", "Document 2 text..."],
  [{ id: 1 }, { id: 2 }],
  new OpenAIEmbeddings()
);

// Create chain
const model = new ChatOpenAI({ model: "gpt-4" });
const chain = ConversationalRetrievalQAChain.fromLLM(
  model,
  vectorStore.asRetriever()
);

// Use chain
const result = await chain.call({
  question: "What is in the documents?",
  chat_history: [],
});

console.log(result.text);
```

## Resources

- [LangChain v1.0 Release Notes](https://docs.langchain.com/oss/javascript/releases/langchain-v1)
- [Migration Guide](https://docs.langchain.com/oss/javascript/migrate/langchain-v1)
- [LangChain v1.0 Documentation](https://docs.langchain.com/oss/javascript/langchain/agents)
- [GitHub Repository](https://github.com/langchain-ai/langchainjs)

## Support

For bug reports and issues, please open an issue on [GitHub](https://github.com/langchain-ai/langchainjs/issues).

For questions and discussions, join our [Discord community](https://discord.gg/langchain).

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE) file for details.
