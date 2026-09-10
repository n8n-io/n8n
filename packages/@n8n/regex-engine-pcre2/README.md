# @n8n/regex-engine-pcre2

A [PCRE2](https://github.com/PCRE2Project/pcre2) regular expression engine, compiled to WebAssembly, behind a synchronous API shaped like native JS `RegExp`.

## Install

```bash
npm install @n8n/regex-engine-pcre2
```

## Usage

```ts
import { initPcre2Engine, createPcre2RegexEngine } from '@n8n/regex-engine-pcre2';

await initPcre2Engine(); // loads the wasm module once; idempotent, safe to call again

const engine = createPcre2RegexEngine({ jsFlags: ['g'] });

engine.test('a+b', 'xxaaabxx'); // true
engine.exec('a+b', 'xxaaabxx'); // ['aaab', index: 2, input: 'xxaaabxx']
engine.replace('a', 'banana', 'g', 'X'); // 'bXnXnX'
engine.matchAll('a+', 'a aa aaa'); // three exec-array-like results
engine.split(',', 'a,b,c'); // ['a', 'b', 'c']
```

- `initPcre2Engine()` must resolve before `createPcre2RegexEngine()` is called.
- Compiled patterns are cached internally by pattern + flags.
- `replace` delegates to `RegExp.prototype[Symbol.replace]`: `$&`, `$$`, `$1`-`$99`, `` $` ``, `$'`, `$<name>` all work.

### API

```ts
interface RegexEngine {
  test(pattern: string, input: string, flags?: string): boolean;
  exec(pattern: string, input: string, flags?: string): Pcre2ExecArray | null;
  replace(pattern: string, input: string, flags: string | undefined, replacement: string): string;
  matchAll(pattern: string, input: string, flags?: string): Pcre2ExecArray[];
  split(pattern: string, input: string, flags?: string): (string | undefined)[];
}
```

`createPcre2RegexEngine(options?: Pcre2EngineOptions)`:

```ts
interface Pcre2EngineOptions {
  compileOptions?: Pcre2CompileOption[]; // default: none
  jsFlags?: Pcre2JsFlag[];               // default: none
}
```

### Errors

| Error | Thrown when |
| --- | --- |
| `Pcre2CompileError` | Pattern is invalid, or uses an unsupported flag. Mirrors `new RegExp(pattern)` throwing `SyntaxError`. |
| `Pcre2BudgetExceededError` | Matching exceeds `match_limit` (1,000,000), `depth_limit` (1,000,000), or `heap_limit` (20,000 KB). `.kind` says which. |

## Flags and options

Pattern flags string:

| Flag | Effect | Engine flag |
| --- | --- | --- |
| `i` | case-insensitive | always accepted |
| `m` | multiline `^`/`$` | always accepted |
| `s` | `.` matches newline | always accepted |
| `x` | extended (whitespace/comments ignored) | always accepted |
| `g` | global | `jsFlags: ['g']` |
| `u` | unicode mode | `jsFlags: ['u']` |

Any other flag character (e.g. `y`, `d`) always throws `Pcre2CompileError`.

`compileOptions` (all off by default):

| Option | Effect |
| --- | --- |
| `altBsux` | accepts `\u`, `\u{...}`, `\x{...}` escape syntax |
| `matchUnsetBackref` | a backreference to a not-yet-participated group matches empty instead of failing |
| `ucp` | `\w`/`\d`/`\s`/`\b` become Unicode-aware |
| `dollarEndonly` | `$` (without `m`) never matches before a trailing `\n` |
| `newlineAnyCrlf` | `\r`, `\n`, `\r\n` all count as a line ending for `.`/`^`/`$`/`\R` |
| `g` | Enables `g` (global, custom) |
| `u` | Enables `u` (Unicode mode) |

`PCRE2_UTF` is always on regardless of options (subjects are always UTF-8).

## Architecture

```
native/pcre2_wrapper.cpp   C++ shim: compile, match, report named groups and budget exhaustion
native/pcre2_wrapper.h
native/*_bindings.cpp      Embind bindings exposed to JS
vendor/pcre2/              PCRE2 C library, vendored as a pinned git submodule
vendor/rust-regex/         rust-regex's TOML test corpus, vendored as a pinned git submodule (test-only)
src/generated/             Prebuilt wasm binary and Emscripten JS glue (committed, see below)
src/pcre2-engine.ts        Public TS API: caching, flag handling, RegexEngine implementation
```

## Building the wasm binary

`src/generated/pcre2_wrapper.{js,wasm}` is prebuilt and committed. Rebuild only when changing `native/pcre2_wrapper.cpp` or bumping the vendored PCRE2 version.

```bash
pnpm build:wasm          # rebuild
pnpm build:wasm:verify   # rebuild and fail if it differs from what's committed (CI check)
```

To bump the PCRE2 version:

```bash
cd vendor/pcre2 && git checkout pcre2-<new-version> && cd .. && git add vendor/pcre2
pnpm pcre2:verify-tag    # confirm the tag is GPG-signed by PCRE2's release key (10.45+)
pnpm build:wasm
```

Before committing a bump, also check [GitHub Security Advisories](https://github.com/PCRE2Project/pcre2/security/advisories) for the target version and skim `vendor/pcre2/ChangeLog` for security-relevant fixes between the old and new tag.

To update the vendored rust-regex test corpus:

```bash
pnpm corpus:update-rust-regex [ref]   # default ref: origin/master
```

This checks out `ref` in `vendor/rust-regex`, stages the submodule pointer, and regenerates the corpus.

## Testing

```bash
pnpm test           # run the test suite
pnpm corpus:build   # regenerate fixtures after a native or compile-option change
```

## License

MIT for this package's own code. See [LICENSE](./LICENSE).

This package embeds a compiled binary of PCRE2, BSD-3-Clause-with-exception licensed. See [NOTICE](./NOTICE).

`vendor/rust-regex/` is [rust-lang/regex](https://github.com/rust-lang/regex)'s test corpus, dual MIT/Apache-2.0 licensed (see `test/fixtures/corpus/rust-regex/LICENSE-MIT`), used only to build the test suite (not shipped in the published package).
