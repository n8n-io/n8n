# Examples

Below is a guide how to run the examples if you have cloned this repo.

## Prerequisites

- Node.js v18+

## How to run the examples locally

### Install the npm dependencies or the repository and the `examples` directory

```properties
npm install && npm install --prefix examples
```

### Set your environment variables

```properties
cp examples/.env.template examples/.env
# Edit your .env file
```

### [Dev only] Link the local `mistralai` package

If you want to use the local `mistralai` package, you can link it to the examples directory. From the repository's root:

```properties
npm run build
npm link
(cd examples/src && npm link @mistralai/mistralai)
```

### Run the examples

```properties
npm run test --prefix examples
```

If you just want to run one example file, you can do so with:

```properties
npm run test --prefix examples -- --files src/stag_async_moderation.ts
```
