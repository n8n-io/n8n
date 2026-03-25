# `@apm-js-collab/code-transformer`

This is a fork of
[`DataDog/orchestrion-js`](https://github.com/DataDog/orchestrion-js/).

This is a library to aid in instrumenting Node.js libraries at build or load
time.

It uses SWC's Rust AST walker to inject code that calls Node.js
[`TracingChannel`](https://nodejs.org/api/diagnostics_channel.html#class-tracingchannel).

You likely don't want to use this library directly; instead, consider using:

- [`@apm-js-collab/tracing-hooks/`](https://github.com/apm-js-collab/tracing-hooks/)
  - ESM and `require` hooks to instrument modules as they are loaded.
- [`apm-js-collab/code-transformer-bundler-plugins`](https://github.com/apm-js-collab/code-transformer-bundler-plugins)
  - Bundler plugins for webpack, Vite, Rollup and esbuild to instrument modules
    at build time.

## JavaScript

`@apm-js-collab/code-transformer` exposes the Rust library as a WebAssembly
module.

### Building

To build the JavaScript module:

- Ensure you have [Rust installed](https://www.rust-lang.org/tools/install)
- Install the wasm toolchain\
  `rustup target add wasm32-unknown-unknown --toolchain stable`
- Install dependencies and build the module\
  `npm install && npm run build`

### Usage

```javascript
import * as codeTransformer from "@apm-js-collab/code-transformer";

// The full instrumentation config
const instrumentation = {
    // The name of the diagnostics channel
    channelName: "my-channel",
    // Define the module you'd like to inject tracing channels into
    module: {
        name: "my-module",
        versionRange: ">=1.0.0",
        filePath: "./dist/index.js",
    },
    // Define the function you'd like to instrument
    // (e.g., match a method named 'foo' that returns a Promise)
    functionQuery: {
        methodName: "fetch",
        kind: "Async",
    },
};

// Create an InstrumentationMatcher with an array of instrumentation configs
const matcher = codeTransformer.create([instrumentation]);

// Get a transformer for a specific module
const transformer = matcher.getTransformer(
    "my-module",
    "1.2.3",
    "./dist/index.js",
);

if (transformer === undefined) {
    throw new Error("No transformer found for module");
}

// Transform code
const inputCode = "async function fetch() { return 42; }";
const result = transformer.transform(inputCode, "unknown");
console.log(result.code);

// Both the matcher and transformer should be freed after use!
matcher.free();
transformer.free();
```

### API Reference

```ts
type ModuleType = "esm" | "cjs" | "unknown";
type FunctionKind = "Sync" | "Async";
```

#### **`FunctionQuery` Variants**

```ts
type FunctionQuery =
    | // Match class constructor
    { className: string; index?: number }
    | // Match class method
    {
        className: string;
        methodName: string;
        kind: FunctionKind;
        index?: number;
    }
    | // Match method on objects
    { methodName: string; kind: FunctionKind; index?: number }
    | // Match standalone function
    { functionName: string; kind: FunctionKind; index?: number }
    | // Match arrow function or function expression
    { expressionName: string; kind: FunctionKind; index?: number };
```

#### **`ModuleMatcher`**

```ts
type ModuleMatcher = {
    name: string; // Module name
    versionRange: string; // Matching semver range
    filePath: string; // Path to the file from the module root
};
```

#### **`InstrumentationConfig`**

```ts
type InstrumentationConfig = {
    channelName: string; // Name of the diagnostics channel
    module: ModuleMatcher;
    functionQuery: FunctionQuery;
};
```

### Functions

```ts
create(configs: InstrumentationConfig[], dc_module?: string | null): InstrumentationMatcher;
```

Create a matcher for one or more instrumentation configurations.

- `configs` - Array of instrumentation configurations.
- `dc_module` - Optional module to import `diagnostics_channel` API from.

#### **`InstrumentationMatcher`**

```ts
getTransformer(module_name: string, version: string, file_path: string): Transformer | undefined;
```

Gets a transformer for a specific module and file.

Returns a `Transformer` for the given module, or `undefined` if there were no
matching instrumentation configurations.

- `module_name` - Name of the module.
- `version` - Version of the module.
- `file_path` - Path to the file from the module root.

```ts
free(): void;
```

Free the matcher memory when it's no longer needed.

#### **`Transformer`**

```ts
transform(code: string, module_type: ModuleType, sourcemap?: string | undefined): TransformOutput;
```

Transforms the code, injecting tracing as configured.

Returns `{ code, map }`. `map` will be undefined if no sourcemap was supplied.

- `code` - The JavaScript/TypeScript code to transform.
- `module_type` - The type of module being transformed.
- `sourcemap` - Optional existing source map for the code.

```ts
free(): void;
```

Free the transformer memory when it's no longer needed.

## License

See LICENSE
