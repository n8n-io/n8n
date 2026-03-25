# `ast-v8-to-istanbul`

[![Version][version-badge]][npm-url]
[![Downloads][downloads-url]][npm-url]

> - Speed of V8 coverage 🏎
> - Accuracy of Istanbul coverage 🔍

[Ignoring code](#ignoring-code) | [Source maps](#source-maps) | [Istanbul Compatibility](#istanbul-compatibility) | [Limitations](#limitations)

---

AST-aware [`v8-to-istanbul`](https://www.npmjs.com/package/v8-to-istanbul).

Unopinionated - _bring-your-own_ AST parser and source maps.

Passes all 195 tests<sup>[*](#istanbul-compatibility)</sup> of [`istanbul-lib-instrument`](https://github.com/istanbuljs/istanbuljs/tree/main/packages/istanbul-lib-instrument/test/specs). ✅

Test cases run against:
- `vite/parseAst` ✅
- `acorn` ✅
- `oxc-parser` ✅
- `@babel/parser` ✅

See example report at https://ariperkkio.github.io/ast-v8-to-istanbul.

```ts
import { convert } from "ast-v8-to-istanbul";
import { parseAstAsync } from "vite";
import type { CoverageMapData } from "istanbul-lib-coverage";

const data: CoverageMapData = await convert({
  // Bring-your-own AST parser
  ast: parseAstAsync(<code>),

  // Code of the executed file (not the source file)
  code: "function sum(a, b) {\n  return a + b ...",

  // Execution wrapper offset
  wrapperLength: 0,

  // Script coverage of the executed file
  coverage: {
    scriptId: "123",
    url: "file:///absolute/path/to/dist/index.js",
    functions: [
      {
        functionName: "sum",
        ranges: [{ startOffset: 223, endOffset: 261, count: 0 }],
        isBlockCoverage: false,
      },
      // ... etc
    ],
  },

  // Source map of the executed file
  sourceMap: {
    version: 3,
    sources: ["../sources.ts"],
    sourcesContent: ["export function sum(a: number, b: number) {\n..."],
    mappings: ";AAAO,SAAS,...",
    names: [],
  },
});
```

## Ignoring code

### Ignoring source code

#### Ignore hints

See live example at https://ariperkkio.github.io/ast-v8-to-istanbul/ignore-examples.html.

The typical ignore hints from `nyc` are supported: https://github.com/istanbuljs/nyc?tab=readme-ov-file#parsing-hints-ignoring-lines:

> * `/* istanbul ignore if */`: ignore the next if statement.
> * `/* istanbul ignore else */`: ignore the else portion of an if statement.
> * `/* istanbul ignore next */`: ignore the next _thing_ in the source-code (functions, if statements, classes, you name it).
> * `/* istanbul ignore file */`: ignore an entire source-file (this should be placed at the top of the file).

In addition to `istanbul` keyword, you can use `v8`, `c8` and `node:coverage`:

- `/* istanbul ignore if */`
- `/* v8 ignore else */`
- `/* c8 ignore file */`
- `/* node:coverage ignore next */`

Also `start` and `stop` ignore hints from original [`v8-to-istanbul`](https://www.npmjs.com/package/v8-to-istanbul) are supported.
These ignore hints are checked from the original sources instead of transpiled code.

> * `/* v8 ignore start */`: start ignoring lines
> * `/* v8 ignore stop */`: stop ignoring lines
> * `<!-- /* v8 ignore start */ -->`: start ignoring lines
> * `<!-- /* v8 ignore stop */ -->`: stop ignoring lines
> * `anything /* v8 ignore start */ anything`: start ignoring lines
> * `anything /* v8 ignore stop */ anything`: stop ignoring lines

#### Class methods

The `ignore-class-method` from `nyc` is also supported: https://github.com/istanbuljs/nyc?tab=readme-ov-file#ignoring-methods

> You can ignore every instance of a method simply by adding its name to the `ignore-class-method` array in your `nyc` config.

```ts
import { convert } from "ast-v8-to-istanbul";

await convert({
  ignoreClassMethods: ['render']
});
```

#### Ignore after remapping

You can ignore source code after coverage results have been remapped back to original sources using `ignoreSourceCode`.
This is a high level API that can be exposed to end-users by tooling developers.

It's mostly intended for excluding code that is incorrectly shown in coverage report when compilers add generated code in the source maps.

Note that as the exclusion happens after remapping, this option is slower than [`ignoreNode`](#ignoring-generated-code) option.

```ts
function ignoreSourceCode(
  code: string,
  type: "function" | "statement" | "branch",
  location: Record<"start" | "end", { line: number; column: number }>,
): boolean | void;
```

```ts
import { convert } from "ast-v8-to-istanbul";

await convert({
  ignoreSourceCode: (code, type, location) => {
    // Ignore all "noop()" calls
    if(type === "function" && code.includes("noop(")) {
      return true;
    }

    // In Vue "<script>" tags generate code that is incorrectly left in source maps - exclude it
    if(code === '<script>') {
      return true;
    }

    // Ignore anything above line 5
    return location.start.line < 5;
  },
});
```

### Ignoring generated code

This API is mostly for developers integrating `ast-v8-to-istanbul` with other tooling.

If your code transform pipeline is adding generated code that's included in the source maps, it will be included in coverage too.
You can exclude these known patterns by defining `ignoreNode` for filtering such nodes.

By returning `"ignore-this-and-nested-nodes"` from the handler, you can ignore all nested nodes too.
This can be useful when you need to ignore everything a certain node wraps, e.g. `IfStatement`.

```ts
function ignoreNode(
  node: Node,
  type: "branch" | "function" | "statement"
): boolean | "ignore-this-and-nested-nodes" | void;
```

```ts
import { convert } from "ast-v8-to-istanbul";

await convert({
  ignoreNode: (node, type) => {
    // Ignore all `await __vite_ssr_import__( ... )` calls that Vite SSR transform adds
    return (
      type === "statement" &&
      node.type === "AwaitExpression" &&
      node.argument.type === "CallExpression" &&
      node.argument.callee.type === "Identifier" &&
      node.argument.callee.name === "__vite_ssr_import__"
    );
  },
});
```

## Source maps

Source maps are optional and supported by various ways:

- Pass directly to `convert` as argument:
  ```ts
  import { convert } from "ast-v8-to-istanbul";

  await convert({
    sourceMap: {
      version: 3,
      sources: ["../sources.ts"],
      sourcesContent: ["export function sum(a: number, b: number) {\n..."],
      mappings: ";AAAO,SAAS,...",
      names: [],
    }
  });
  ```
- Include base64 encoded inline maps in `code`:
  ```ts
  await convert({
    code: `\
    function hello() {}
    //# sourceMappingURL=data:application/json;base64,eyJzb3VyY2VzIjpbIi9zb21lL...
    `
  });
  ```
- Include inline maps with filename in `code`:
  ```ts
  await convert({
    code: `\
    function hello() {}
    //# sourceMappingURL=some-file-on-file-system.js.map
    `
  });
  ```
- Don't use source maps at all, and pass original source code in `code`:
  ```ts
  await convert({
    code: `function hello() {}`,
    sourceMap: undefined,
  });
  ```

## Istanbul Compatibility

This project tests itself against test cases of `istanbul-lib-instrument` and verifies coverage maps are 100% identical. Some cases, like [deprecated `with()` statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/with) and edge cases of strict mode are skipped, as all tests are run in strict mode.

100% istanbul compatibility guarantees that coverage reports between V8 and Istanbul can be merged together.

<img src="https://github.com/user-attachments/assets/f74f129c-d63a-403e-8091-aefa53f6f97e" width="400" />

## Limitations

The way how V8 reports runtime coverage has some limitations when compared to pre-instrumented coverage:

- Unable to detect uncovered `AssignmentPattern`'s if line is otherwise covered
  - https://github.com/nodejs/node/issues/57435

- Unable to detect uncovered parts when block execution stops due to function throwing:
  - ```js
    function first() {
      throws()

      // unreachable, but incorrectly covered
      return "first";
    }

    const throws = ()  => { throw new Error() }

    try { first(1) } catch {}
    ```
  - ```json
    [
      {
        "ranges": [{ "startOffset": 0, "endOffset": 165, "count": 1 }],
        "isBlockCoverage": true
      },
      {
        "functionName": "first",
        "ranges": [{ "startOffset": 0, "endOffset": 92, "count": 1 }],
        "isBlockCoverage": true
      },
      {
        "functionName": "throws",
        "ranges": [{ "startOffset": 109, "endOffset": 137, "count": 1 }],
        "isBlockCoverage": true
      }
    ]
    ```

[version-badge]: https://img.shields.io/npm/v/ast-v8-to-istanbul
[npm-url]: https://www.npmjs.com/package/ast-v8-to-istanbul
[downloads-url]: https://img.shields.io/npm/dm/ast-v8-to-istanbul
