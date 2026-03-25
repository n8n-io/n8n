# @langchain/cohere

This package contains the LangChain.js integrations for Cohere through their SDK.

## Installation

```bash npm2yarn
npm install @langchain/cohere @langchain/core
```

This package, along with the main LangChain package, depends on [`@langchain/core`](https://npmjs.com/package/@langchain/core/).
If you are using this package with other LangChain packages, you should make sure that all of the packages depend on the same instance of @langchain/core.
You can do so by adding appropriate field to your project's `package.json` like this:

```json
{
  "name": "your-project",
  "version": "0.0.0",
  "dependencies": {
    "@langchain/cohere": "^0.0.1",
    "@langchain/core": "^0.3.0"
  },
  "resolutions": {
    "@langchain/core": "0.3.0"
  },
  "overrides": {
    "@langchain/core": "0.3.0"
  },
  "pnpm": {
    "overrides": {
      "@langchain/core": "0.3.0"
    }
  }
}
```

The field you need depends on the package manager you're using, but we recommend adding a field for the common `yarn`, `npm`, and `pnpm` to maximize compatibility.

## Chat Models

This package contains the `ChatCohere` class, which is the recommended way to interface with the Cohere series of models.

To use, install the requirements, and configure your environment.

```bash
export COHERE_API_KEY=your-api-key
```

Then initialize

```typescript
import { HumanMessage } from "@langchain/core/messages";
import { ChatCohere } from "@langchain/cohere";

const model = new ChatCohere({
  apiKey: process.env.COHERE_API_KEY,
});
const response = await model.invoke([new HumanMessage("Hello world!")]);
```

### Streaming

```typescript
import { HumanMessage } from "@langchain/core/messages";
import { ChatCohere } from "@langchain/cohere";

const model = new ChatCohere({
  apiKey: process.env.COHERE_API_KEY,
});
const response = await model.stream([new HumanMessage("Hello world!")]);
```

## Embeddings

This package also adds support for `CohereEmbeddings` embeddings model.

```typescript
import { CohereEmbeddings } from "@langchain/cohere";

const embeddings = new CohereEmbeddings({
  apiKey: process.env.COHERE_API_KEY,
});
const res = await embeddings.embedQuery("Hello world");
```

## Development

To develop the `@langchain/cohere` package, you'll need to follow these instructions:

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
pnpm build --filter @langchain/cohere
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
