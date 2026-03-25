# @langchain/weaviate

This package contains the LangChain.js integrations for Weaviate with the `weaviate-client` SDK.

## Installation

```bash npm2yarn
npm install @langchain/weaviate @langchain/core
```

## Vectorstore

This package adds support for Weaviate vectorstore.

To follow along with this example install the `@langchain/openai` package for their Embeddings model.

```bash
npm install @langchain/openai
```

Now set the necessary environment variables (or pass them in via the client object):

```bash
export WEAVIATE_SCHEME=
export WEAVIATE_HOST=
export WEAVIATE_API_KEY=
```

```typescript
import weaviate, { ApiKey } from "weaviate-client";
import { WeaviateStore } from "@langchain/weaviate";

// Weaviate SDK has a TypeScript issue so we must do this.
const client = (weaviate as any).client({
  scheme: process.env.WEAVIATE_SCHEME || "https",
  host: process.env.WEAVIATE_HOST || "localhost",
  apiKey: new ApiKey(process.env.WEAVIATE_API_KEY || "default"),
});

// Create a store and fill it with some texts + metadata
await WeaviateStore.fromTexts(
  ["hello world", "hi there", "how are you", "bye now"],
  [{ foo: "bar" }, { foo: "baz" }, { foo: "qux" }, { foo: "bar" }],
  new OpenAIEmbeddings(),
  {
    client,
    indexName: "Test",
    textKey: "text",
    metadataKeys: ["foo"],
  }
);
```

## Development

To develop the `@langchain/weaviate` package, you'll need to follow these instructions:

### Install dependencies

```bash
pnpm install
```

### Build the package

```bash
pnpm build
```

Or from the repo root:

```bash
pnpm build --filter @langchain/weaviate
```

### Run tests

Test files should live within a `tests/` file in the `src/` folder. Unit tests should end in `.test.ts` and integration tests should
end in `.int.test.ts`:

```bash
$ pnpm test
$ pnpm test:int
```

### Lint & Format

Run the linter & formatter to ensure your code is up to standard:

```bash
pnpm lint && pnpm format
```

### Adding new entrypoints

If you add a new file to be exported, either import & re-export from `src/index.ts`, or add it to the `exports` field in the `package.json` file and run `pnpm build` to generate the new entrypoint.
