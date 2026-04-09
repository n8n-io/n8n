# better-ajv-errors

## 1.2.0

### Minor Changes

- 3918d58: Add integration with ajv-errors

### Patch Changes

- 6120105: Remove for...in loop to prevent possible enumeration errors

## 1.1.2

### Patch Changes

- a1cafc8: :wrench: Fix esm build

## 1.1.1

### Patch Changes

- 7c83bf6: :bug: Fix cli return type

## 1.1.0

### Minor Changes

- ade58e0: :package: Swap `json-to-ast` with `momoa`

  |                        |   `json-to-ast` |         `momoa` |
  | ---------------------- | --------------: | --------------: |
  | **Small JSON** `23B`   | 254,556 ops/sec | 329,012 ops/sec |
  | **Medium JSON** `55KB` |     226 ops/sec |     246 ops/sec |
  | **Large JSON** `25MB`  |    0.19 ops/sec |    0.29 ops/sec |

### Patch Changes

- abee681: :package: Restrict `leven` version to < 4

  `leven@4` only ships `esm` module which is not compatible with this library.

## 1.0.0

### Major Changes

- 146a859: :package: better-ajv-errors v1

  ### Breaking Changes

  - Dropped support for Node.js `< 12.13.0`
  - Default import in CommonJS format no longer supported

    **:no_entry_sign: Wrong**

    ```js
    const betterAjvErrors = require('better-ajv-errors');
    ```

    **:white_check_mark: Correct**

    ```js
    const betterAjvErrors = require('better-ajv-errors').default;
    // Or
    const { default: betterAjvErrors } = require('better-ajv-errors');
    ```

  ### Other Changes

  - Added ESM support
  - Moved from `babel` to `esbuild` _(99% faster build: from `2170ms` to `20ms`)_
    - https://github.com/atlassian/better-ajv-errors/pull/101#issuecomment-963129931
  - Bumped all `dependencies` & `devDependencies`

- ad60e6b: :nail_care: Improve typings and add test

  ### Breaking Changes

  - New TypeScript types are not fully backward compatible

### Patch Changes

- 768ce0f: Bump ws from 5.2.2 to 5.2.3
- dc45eb7: Bump tar from 4.4.10 to 4.4.19
- 5ef7b1e: Bump path-parse from 1.0.6 to 1.0.7
- 3ef2bbc: Bump tmpl from 1.0.4 to 1.0.5
- 46b57d3: Bump color-string from 1.5.3 to 1.6.0
- d568784: Bump lodash from 4.17.10 to 4.17.21
- e71f114: Bump browserslist from 4.7.0 to 4.17.6

## 0.8.2

### Patch Changes

- 2513443: :fire_engine: Bump `jsonpointer` - CVE-2021-23807

## 0.8.1

### Patch Changes

- 25cf308: :fire_engine: Bump `jsonpointer` - CVE-2021-23807

## 0.8.0

### Minor Changes

- 8846dda: ajv 8 support

## 0.7.0

### Minor Changes

- 4e6e4c7: Support json option to get accurate line/column listings

## 0.6.7

### Patch Changes

- 234c01d: Handle primitive values in EnumValidationError

## 0.6.6

### Patch Changes

- 84517c3: Fix a bug where enum error shows duplicate allowed values

## 0.6.5

### Patch Changes

- f2e0424: Fix a bug where nested errors were ignored when top level had enum errors
