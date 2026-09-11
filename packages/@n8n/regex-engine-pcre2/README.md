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
- Compiled patterns are cached internally by pattern + flags, bounded and evicted least-recently-used first. Call `engine.dispose()` to free everything the engine holds.
- Offsets (`.index`, `split` slice points) are UTF-16 code-unit indices, the same units a native `RegExp` reports: PCRE2 is built as the 16-bit library, so no offset conversion happens at the boundary.
- `replace` delegates to `RegExp.prototype[Symbol.replace]`: `$&`, `$$`, `$1`-`$99`, `` $` ``, `$'`, `$<name>` all work.

### API

```ts
interface RegexEngine {
  test(pattern: string, input: string, flags?: string): boolean;
  exec(pattern: string, input: string, flags?: string): Pcre2ExecArray | null;
  replace(pattern: string, input: string, flags: string | undefined, replacement: string): string;
  matchAll(pattern: string, input: string, flags?: string): Pcre2ExecArray[];
  split(pattern: string, input: string, flags?: string): (string | undefined)[];
  dispose(): void;
}
```

`createPcre2RegexEngine(options?: Pcre2EngineOptions)`:

```ts
interface Pcre2EngineOptions {
  compileOptions?: Pcre2CompileOption[]; // default: none
  jsFlags?: Pcre2JsFlag[];               // default: none
  operationTimeoutMs?: number;           // default: 1000
  maxMatchesPerOperation?: number;       // default: 1_000_000
  maxCachedPatterns?: number;            // default: 1000
}
```

`match_limit`/`depth_limit`/`heap_limit` bound one native match. `operationTimeoutMs` and
`maxMatchesPerOperation` bound a whole `matchAll`/`replace`/`split` call, which runs one
native match per match found.

### Errors

| Error | Thrown when |
| --- | --- |
| `Pcre2CompileError` | Pattern is invalid, or uses an unsupported flag. Mirrors `new RegExp(pattern)` throwing `SyntaxError`. |
| `Pcre2BudgetExceededError` | Matching exceeds `match_limit` (1,000,000), `depth_limit` (1,000,000), `heap_limit` (20,000 KB), or a looping operation's own time/match-count budget. `.kind` says which. |
| `Pcre2MatchError` | PCRE2 reported an error that is neither a compile failure nor a budget hit (for example a malformed UTF-16 subject under the `u` flag). |
| `Pcre2InternalError` | The wasm module trapped while matching. The module is reloaded and every cached handle is dropped. |
| `Pcre2NotInitializedError` | The synchronous API was used before `initPcre2Engine()` resolved. |

## Flags and options

Pattern flags string:

| Flag | Effect | Engine flag |
| --- | --- | --- |
| `i` | case-insensitive | always accepted |
| `m` | multiline `^`/`$` | always accepted |
| `s` | `.` matches newline | always accepted |
| `x` | extended (whitespace/comments ignored) | always accepted |
| `g` | global | `jsFlags: ['g']` |
| `u` | turns on `PCRE2_UTF`: a surrogate pair is one code point. Without it, every UTF-16 code unit (lone surrogates included) is one character, as a native `RegExp` without `u` treats it. | `jsFlags: ['u']` |

Any other flag character (e.g. `y`, `d`) always throws `Pcre2CompileError`.

`compileOptions` (all off by default):

| Option | Effect |
| --- | --- |
| `altBsux` | accepts `\u`, `\u{...}`, `\x{...}` escape syntax |
| `matchUnsetBackref` | a backreference to a not-yet-participated group matches empty instead of failing |
| `ucp` | `\w`/`\d`/`\s`/`\b` become Unicode-aware |
| `dollarEndonly` | `$` (without `m`) never matches before a trailing `\n` |
| `newlineAnyCrlf` | `\r`, `\n`, `\r\n` all count as a line ending for `.`/`^`/`$`/`\R` |

`PCRE2_UTF` comes from the `u` flag alone; no compile option turns it on.

## Architecture

```
native/pcre2_wrapper.cpp   C++ shim: compile, match, report named groups and budget exhaustion
native/pcre2_wrapper.h
native/*_bindings.cpp      Embind bindings exposed to JS
vendor/pcre2/              PCRE2 C library (16-bit build), vendored as a pinned git submodule
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
