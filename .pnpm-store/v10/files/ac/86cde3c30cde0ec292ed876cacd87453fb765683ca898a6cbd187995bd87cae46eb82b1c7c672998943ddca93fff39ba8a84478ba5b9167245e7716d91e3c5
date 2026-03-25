# @langchain/mongodb

This package contains the LangChain.js integrations for MongoDB through their SDK.

## Installation

```bash npm2yarn
npm install @langchain/mongodb @langchain/core
```

This package, along with the main LangChain package, depends on [`@langchain/core`](https://npmjs.com/package/@langchain/core/).
If you are using this package with other LangChain packages, you should make sure that all of the packages depend on the same instance of @langchain/core.
You can do so by adding appropriate field to your project's `package.json` like this:

```json
{
  "name": "your-project",
  "version": "0.0.0",
  "dependencies": {
    "@langchain/core": "^0.3.0",
    "@langchain/mongodb": "^0.0.0"
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

## Development

To develop the MongoDB package, you'll need to follow these instructions:

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
pnpm build --filter @langchain/mongodb
```

### Run tests

Test files should live within a `tests/` file in the `src/` folder. Unit tests should end in `.test.ts` and integration tests should
end in `.int.test.ts`:

```bash
$ pnpm test
$ pnpm test:int
```

The tests in this package require an instance of MongoDB Atlas running, either running locally or as a remote Atlas cluster. A URI pointing to
an existing Atlas cluster can be provided to the tests by specifying the `MONGODB_ATLAS_URI` environment variable:

```bash
MONGODB_ATLAS_URI='<atlas URI>' pnpm test:int
```

If running against a remote Atlas cluster, the user must have readWrite permissions on the `langchain` database.

If no `MONGODB_ATLAS_URI` is provided, the test suite will attempt to launch an instance of local Atlas in a container using [testcontainers](https://testcontainers.com/). This requires a container engine, see the [testcontainer backing engine documentation](https://node.testcontainers.org/supported-container-runtimes/) for details.

### Lint & Format

Run the linter & formatter to ensure your code is up to standard:

```bash
pnpm lint && pnpm format
```

### Adding new entrypoints

If you add a new file to be exported, either import & re-export from `src/index.ts`, or add it to the `exports` field in the `package.json` file and run `pnpm build` to generate the new entrypoint.
