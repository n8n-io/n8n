# @langchain/aws

This package contains the LangChain.js integrations for AWS through their SDK.

## Installation

```bash
npm install @langchain/aws
```

This package, along with the main LangChain package, depends on [`@langchain/core`](https://npmjs.com/package/@langchain/core/).
If you are using this package with other LangChain packages, you should make sure that all of the packages depend on the same instance of @langchain/core.
You can do so by adding appropriate fields to your project's `package.json` like this:

```json
{
  "name": "your-project",
  "version": "0.0.0",
  "dependencies": {
    "@langchain/aws": "^0.0.1",
    "@langchain/core": "^0.3.0"
  },
  "resolutions": {
    "@langchain/core": "^0.3.0"
  },
  "overrides": {
    "@langchain/core": "^0.3.0"
  },
  "pnpm": {
    "overrides": {
      "@langchain/core": "^0.3.0"
    }
  }
}
```

The field you need depends on the package manager you're using, but we recommend adding a field for the common `yarn`, `npm`, and `pnpm` to maximize compatibility.

## Chat Models

This package contains the `ChatBedrockConverse` class, which is the recommended way to interface with the AWS Bedrock Converse series of models.

To use, install the requirements, and configure your environment following the traditional authentication methods.

```bash
export BEDROCK_AWS_REGION=
export BEDROCK_AWS_SECRET_ACCESS_KEY=
export BEDROCK_AWS_ACCESS_KEY_ID=
```

Alternatively, set the `AWS_BEARER_TOKEN_BEDROCK` environment variable locally for API Key authentication. For additional API key details, refer to [docs](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html).

```bash
export BEDROCK_AWS_REGION=
export AWS_BEARER_TOKEN_BEDROCK=
```

Then initialize

```typescript
import { ChatBedrockConverse } from "@langchain/aws";

const model = new ChatBedrockConverse({
  region: process.env.BEDROCK_AWS_REGION ?? "us-east-1",
  credentials: {
    secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID,
  },
});

const response = await model.invoke(new HumanMessage("Hello world!"));
```

### Streaming

```typescript
import { ChatBedrockConverse } from "@langchain/aws";

const model = new ChatBedrockConverse({
  region: process.env.BEDROCK_AWS_REGION ?? "us-east-1",
  credentials: {
    secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID,
  },
});

const response = await model.stream(new HumanMessage("Hello world!"));
```

## Development

To develop the AWS package, you'll need to follow these instructions:

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
pnpm build --filter @langchain/aws
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

## Publishing

After running `pnpm build`, publish a new version with:

```bash
$ npm publish
```
