# Change Log - @rushstack/problem-matcher

This log was last generated on Fri, 20 Feb 2026 00:15:04 GMT and should not be manually modified.

## 0.2.1
Fri, 20 Feb 2026 00:15:04 GMT

### Patches

- Add `"node"` condition before `"import"` in the `"exports"` map so that Node.js uses the CJS output (which handles extensionless imports), while bundlers still use ESM via `"import"`. Fixes https://github.com/microsoft/rushstack/issues/5644.

## 0.2.0
Thu, 19 Feb 2026 00:04:53 GMT

### Minor changes

- Normalize package layout. CommonJS is now under `lib-commonjs`, DTS is now under `lib-dts`, and ESM is now under `lib-esm`. Imports to `lib` still work as before, handled by the `"exports"` field in `package.json`.

## 0.1.1
Tue, 30 Sep 2025 23:57:45 GMT

### Patches

- Fix multi-line looping problem matcher message parsing

## 0.1.0
Tue, 30 Sep 2025 20:33:51 GMT

### Minor changes

- Add @rushstack/problem-matcher library to parse and use VS Code style problem matchers

