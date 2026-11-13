# Compiled workflow engine: shared specification (PoC)

Status: proof of concept. This file is the contract between the compiler
(`packages/@n8n/workflow-lang`, TypeScript) and the runtime
(`workflow-runtime/`, Zig 0.17). If the code and this file disagree, fix one
of them in the same change.

All binary formats are little-endian. All sizes are in bytes.

## 1. Workflow language

A workflow is one TypeScript file. Its default export is
`workflow({ triggers, credentials?, durability?, run })`. `run(ctx, trigger)`
is ordinary sequential code in the subset below.

### 1.1 Subset

| Area | Allowed | Rejected (code) |
|---|---|---|
| Data | number, string, boolean, null, undefined, arrays, plain objects, `Date` (section 4.5) | classes, `this`, `new` except `new Error(m)` and `new Date(...)`, getters, symbols, Map, Set (`WL001`) |
| Variables | `const`, `let`, destructuring with defaults, closures (arrow and function declarations inside `run`) | `var` (`WL002`), module-level mutable state (`WL003`) |
| Control flow | `if`, `switch`, `for`, `for...of` over arrays, `while`, `do...while`, `break`, `continue`, `try/catch/finally`, `throw`, `return`, `?:`, `&&`, `\|\|`, `??`, `?.` | labels (`WL004`), `for...in` (`WL005`), generators (`WL006`), `==`/`!=` except against `null` (`WL007`) |
| Async | `await` on a ctx call or on a call to an async function declared in `run`; `Promise.all([...])` over ctx calls or calls of async functions; `Promise.all(arr.map(async (x) => ...))` | any other promise, timers, callbacks with `await` outside `Promise.all` (`WL010`) |
| Time and randomness | `ctx.now()`, `ctx.random()`, `new Date()`, `Date.now()` (the batch clock) | `Math.random` (`WL011`); Date uses that a number cannot model (`WL013`, section 4.5) |
| I/O | `ctx.node`, `ctx.code`, `ctx.wait`, `ctx.approval`, `ctx.respond`, `ctx.http` | `fetch`, imports other than `@n8n/workflow-lang`, `require`, file access (`WL012`) |
| Library | the lists in sections 4.3 and 4.4 | anything else (`WL020`) |
| Recursion | calls deeper than the call-depth limit fail at run time | – |

A step `name` must be a string literal that is unique in the workflow
(`WL030`, `WL031`). An optional `id` string literal overrides the step id.
Every rejection carries a code, a message, a source range and a suggested
replacement.

### 1.2 ctx calls

| Call | Effect kind | Result |
|---|---|---|
| `await ctx.node({ name, type, typeVersion?, parameters, items?, idempotent?, retry?, credential?, host? })` | `node` (0) or a linked library node | array of plain JSON objects |
| `await ctx.http({ name, method, url, headers?, qs?, body?, credential?, idempotent?, timeoutMs? })` | `http` (1) | `{ status, headers, body }` |
| `await ctx.code({ name, code, items? })` | `code` (2) | array of plain JSON objects |
| `await ctx.wait({ name, duration?: number ms, until?: number ms epoch })` | `wait` (3) | `undefined` |
| `await ctx.approval({ name, message, via?, timeout? })` | `approval` (4) | `{ approved: boolean, by?: string, data?: object }` |
| `await ctx.respond({ name, status?, body, headers? })` | `respond` (5) | `undefined` |
| `await ctx.service({ name, service, op, args? })` | `service` (6) | the JSON result of the service (9.9) |
| `ctx.now()` | none | number, ms since epoch, from the batch clock |
| `ctx.random()` | none | number in [0, 1), from the execution PRNG |

`ctx.node` with type `n8n-nodes-base.httpRequest` (and every node in the
compiled node library) is linked at compile time: the call becomes a call to
a library function written in the subset, which performs `http` effects. The
library function runs under the step of the `ctx.node` call.

The step id is the `id` option, or else the step name.

### 1.3 Semantics that the runtime must match exactly

* Numbers are IEEE 754 doubles. `ToString(number)` follows ECMAScript
  Number::toString (shortest round-trip digits; exponent form below 1e-6 and
  at or above 1e21; `-0` prints `0`; `NaN`, `Infinity`, `-Infinity`).
* String `length`, indexing, `slice`, `substring`, `indexOf`, `charAt`,
  `charCodeAt` use UTF-16 code unit positions. The runtime stores UTF-8.
* Object key order: canonical array-index keys first in ascending order, then
  other keys in insertion order.
* `JSON.stringify`: no whitespace unless an indent argument is given;
  `undefined` and functions are dropped from objects and become `null` in
  arrays; `NaN` and infinities become `null`; strings escape `"`, `\`, and
  control characters as in ECMAScript (`\b \f \n \r \t`, else `\u00XX`
  lowercase hex).
* `Array.prototype.sort` without a comparator compares `ToString` values by
  UTF-16 code units and is stable; `undefined` values go last. With a
  comparator it is stable; the compiler lowers it to the prelude merge sort.
* `replace` and `replaceAll` expand `$$`, `$&`, `` $` `` and `$'` in the
  replacement string, as in ECMAScript.
* `Promise.all` rejects with the error of the lowest-index failing branch.
* `new Error(m)` creates `{ name: 'Error', message: m }`. `message` is `''`
  when `m` is `undefined`, else `String(m)`. A failed effect throws
  `{ name: 'NodeError', message, step }`, where `step` is the step name.
* A store into a property of a string, number or boolean does nothing, as
  in sloppy JavaScript (n8n runs Code nodes in sloppy mode). A store into
  `null` or `undefined` throws `Cannot set properties of …`.
* Fuel, memory and call depth limits end the execution with status
  `limit`. They are never exceptions that workflow code can catch.

### 1.4 Triggers

`triggers` is an array literal. Each element is a call of `webhook(...)` or
`schedule(...)` with one object literal. All option values must be literals:
strings, numbers, booleans, `null`, and arrays and objects of literals. The
compiler writes the triggers to the META `triggers` array (section 3.2), in
source order. The runtime reads that array.

`webhook<TBody>({ path, method?, respond? })` starts an execution for an HTTP
request. `run` receives `{ body, headers, query }`. META holds
`{ "kind": "webhook", ...options }` with the options as written. When
`method` is not given, the runtime uses `POST`.

`schedule({ cron?, every?, timezone? })` starts an execution at each slot.
`run` receives `{ scheduledAt }`, the time of the slot in milliseconds since
the epoch. Give exactly one of `cron` and `every`:

```ts
schedule({ cron: '0 9 * * mon-fri', timezone: 'Europe/Berlin' })
schedule({ every: { unit: 'hours', value: 1, atMinute: 15 } })
```

META holds a normalised object. The key order is fixed. `timezone` is always
present. Its default is `"UTC"`. In `every`, only the optional keys that the
source gives are written, in the order `atHour`, `atMinute`, `onWeekdays`,
`onDayOfMonth`:

```json
{"kind":"schedule","cron":"0 9 * * mon-fri","timezone":"Europe/Berlin"}
{"kind":"schedule","every":{"unit":"hours","value":1,"atMinute":15},"timezone":"UTC"}
```

`cron` is written as the source gives it. The compiler accepts the syntax of
the `cron` npm package v4.4.0, which n8n uses:

* The text is not case-sensitive.
* Presets: `@yearly`, `@monthly`, `@weekly`, `@daily`, `@hourly`,
  `@minutely`, `@secondly`, `@weekdays`, `@weekends`.
* Names: `jan`..`dec` and `sun`..`sat`. Other letters are errors, so `?`, `L`
  and `W` are errors.
* 5 or 6 fields, separated by whitespace. With 5 fields, the second is 0.
* Each field is a comma list of `*`, `N`, `N-M`, `N/S`, `N-M/S` and `*/S`.
  `N/S` runs from `N` to the end of the range. A `*` must be the first
  character of its list item.
* Ranges: second 0-59, minute 0-59, hour 0-23, day of month 1-31, month
  1-12, day of week 0-7. 7 is Sunday.
* A step of 0, a range with lower > upper and a value out of range are
  errors.
* When day of week is not restricted, the compiler also rejects an
  expression that never fires because each allowed day of month is after the
  end of each allowed month (for example `0 0 30 2 *`). 29 February is
  valid.

`every` follows the interval modes of n8n's Schedule Trigger:

| Key | Values | Allowed for |
|---|---|---|
| `unit` | `seconds`, `minutes`, `hours`, `days`, `weeks`, `months` | all |
| `value` | integer: seconds 1-59, minutes 1-59, hours 1-23, days 1-31, weeks >= 1, months >= 1 | all |
| `atHour` | integer 0-23 | days, weeks, months |
| `atMinute` | integer 0-59 | hours, days, weeks, months |
| `onWeekdays` | array of integers 0 (Sunday) to 6 | weeks |
| `onDayOfMonth` | integer 1-31 | months |

Other keys are errors. `timezone` is an IANA name or `UTC`. The compiler
accepts each name that `Intl.supportedValuesOf('timeZone')` lists, and each
name that `new Intl.DateTimeFormat('en-US', { timeZone })` accepts.

Diagnostics:

| Code | Cause |
|---|---|
| `WL050` | `triggers` is not an array literal, an element is not a `webhook(...)` or `schedule(...)` call with one object literal, an option value is not a literal, or a schedule option is unknown |
| `WL051` | `schedule` has both or none of `cron` and `every` |
| `WL052` | the cron expression is not valid. The message gives the reason |
| `WL053` | `every` is not valid: unknown unit or key, value out of range, or a key that the unit does not allow |
| `WL054` | the time zone is unknown |

Mapping from n8n's Schedule Trigger. Each entry of `rule.interval[]` becomes
one `schedule` trigger, so a node with several intervals becomes several
triggers. The node's time zone (the workflow setting, else the instance
default) becomes `timezone`.

| n8n `field` | n8n parameters | `schedule` options |
|---|---|---|
| `seconds` | `secondsInterval` | `every: { unit: 'seconds', value: secondsInterval }` |
| `minutes` | `minutesInterval` | `every: { unit: 'minutes', value: minutesInterval }` |
| `hours` | `hoursInterval`, `triggerAtMinute` | `every: { unit: 'hours', value: hoursInterval, atMinute: triggerAtMinute }` |
| `days` | `daysInterval`, `triggerAtHour`, `triggerAtMinute` | `every: { unit: 'days', value: daysInterval, atHour: triggerAtHour, atMinute: triggerAtMinute }` |
| `weeks` | `weeksInterval`, `triggerAtDay`, `triggerAtHour`, `triggerAtMinute` | `every: { unit: 'weeks', value: weeksInterval, onWeekdays: triggerAtDay, atHour: triggerAtHour, atMinute: triggerAtMinute }` |
| `months` | `monthsInterval`, `triggerAtDayOfMonth`, `triggerAtHour`, `triggerAtMinute` | `every: { unit: 'months', value: monthsInterval, onDayOfMonth: triggerAtDayOfMonth, atHour: triggerAtHour, atMinute: triggerAtMinute }` |
| `cronExpression` | `expression` | `cron: expression` |

Leave out a key when the n8n parameter is not set. n8n defaults: field
`days`, `secondsInterval` 30, `minutesInterval` 5, the other intervals 1,
`triggerAtDay` `[0]`. An empty `triggerAtDay` means each day of the week.
Write these defaults explicitly when you convert.

n8n fills a missing second, minute, hour or day of month with a stable
pseudo-random value. It derives the value from the workflow id and the node
id (`stableInt`), to spread the load. The compiled form does not do this. It
uses second 0, minute `atMinute ?? 0`, hour `atHour ?? 0` and day of month
`onDayOfMonth ?? 1`. Thus a converted schedule can fire at a different
second, minute, hour or day than the n8n node.

## 2. Execution model

* An execution has one or more fibres. A fibre is a stack of frames. A frame
  is a function index, a program counter and a register window.
* `SUSPEND` parks the current fibre on an effect. Glue between effects runs
  without I/O and is never persisted on its own.
* `FORK` makes a new runnable fibre. `JOIN` parks the current fibre until all
  named fibres finish. Runnable fibres run in creation order.
* The run queue is FIFO. `FORK` puts the new fibre at the back; the forking
  fibre continues. A fibre that `SUSPEND`s goes to the back when its effect
  completes. `JOIN` always parks: the joining fibre goes to the back when the
  last named fibre finishes (at once if they all have finished). A fibre runs
  until it parks or finishes. In `wfrt run` and in the reference runner, an
  effect completes as soon as its fibre parks on it, so effects are recorded
  in the order of their `SUSPEND`s.
* A run of a step is identified by `(step id, occurrence)`. `occurrence` is
  the count of earlier effects of that step in the execution (0-based). The
  idempotency key is `hex(sha256(execution id ‖ step id ‖ occurrence))[0..32]`.
* Effect failure: if the SUSPEND site is inside a try region in any frame of
  its fibre, the error is thrown at the await. Otherwise the execution moves
  to `needs_attention` at that step, and an operator chooses retry, skip
  (with a supplied result) or fail.
* An effect is retried by the runtime when the step has `retry.max > 0`, with
  `retry.delayMs` between attempts, before the rules above apply.
* A try region is the range of a `try` block. `catch` and `finally` code is
  not in that region (it can be in an outer one).

## 3. Module format (`.wfm`)

### 3.1 Header (48 bytes)

| Offset | Type | Field |
|---|---|---|
| 0 | u32 | magic `0x4D57384E` (bytes `N8WM`) |
| 4 | u16 | format version, `1` |
| 6 | u16 | flags. bit 0: native (no step needs the fallback host) |
| 8 | u32 | section count |
| 12 | u32 | reserved, 0 |
| 16 | [32]u8 | SHA-256 of all bytes after the header |

A section table follows: `section count` entries of `{ id: u32, offset: u32,
length: u32 }`. Offsets are from the start of the file and are 8-aligned.
Unknown section ids are ignored. The module hash (the header hash) addresses
the module.

### 3.2 Sections

| Id | Name | Encoding |
|---|---|---|
| 1 | STRINGS | `count: u32`, then `count + 1` u32 offsets relative to the byte area, then the UTF-8 byte area |
| 2 | NUMBERS | `count: u32`, `pad: u32`, then `count` f64 |
| 3 | FUNCTIONS | `count: u32`, `pad: u32`, then 32-byte entries (3.3) |
| 4 | CODE | `count: u32`, `pad: u32`, then `count` 8-byte instructions |
| 5 | TRIES | `count: u32`, `pad: u32`, then 16-byte entries `{ start: u32, end: u32, handler: u32, catch_reg: u16, pad: u16 }` |
| 6 | STEPS | `count: u32`, `pad: u32`, then 32-byte entries (3.4) |
| 7 | SUSPENDS | `count: u32`, then entries `{ func: u32, pc: u32, step: u32, live: u32 }` each followed by `live` × `{ reg: u32, name: u32, type: u32 }` (string indices). `step` is `0xFFFFFFFF` when the step comes from a register at run time (library nodes). The live registers exclude `R[a]` of the SUSPEND |
| 8 | PATHS | `count: u32`, then `count` u32 string indices of read paths such as `body.items[].sku` |
| 9 | META | one u32 string index of a JSON document: `{ compilerVersion, sourceHash, triggers, credentials, durability }`. Section 1.4 describes `triggers` |

### 3.3 Function entry (32 bytes)

`name: u32 (string)`, `nparams: u16`, `nregs: u16`, `ncaps: u16`,
`flags: u16 (bit 0 async)`, `code_start: u32`, `code_len: u32`,
`try_start: u32`, `try_count: u32`, `pad: u32`.

Function 0 is `run`. Its single parameter (register 0) is the trigger value.
Parameters occupy registers `0..nparams-1`. Missing arguments are
`undefined`. Every other register starts as `undefined`. Try entries of a
function are ordered innermost first. Program counters in jumps and try
entries are relative to `code_start`. `code_start` and `code_len` count
instructions in CODE; `try_start` and `try_count` count entries in TRIES.
A try entry covers `[start, end)`. One `try` block can have more than one
entry, because inlined `finally` code is outside the region.

### 3.4 Step entry (32 bytes)

`id: u32 (string)`, `name: u32 (string)`, `node_type: u32 (string or
0xFFFFFFFF)`, `kind: u8`, `idempotent: u8`, `retry_max: u8`, `pad: u8`,
`retry_delay_ms: u32`, `src_start: u32`, `src_end: u32`, `pad: u32`.
`src_start` and `src_end` are UTF-16 offsets into the workflow source.

### 3.5 Instructions (8 bytes)

`op: u8`, `x: u8`, `a: u16`, `b: u16`, `c: u16`. `bc` is `b | (c << 16)` read
as u32 (or i32 for `LOADI`). `R[n]` is register `n` of the current frame.
`S[n]` is string constant `n`.

| Op | Name | Meaning |
|---|---|---|
| 0 | NOP | |
| 1 | LOADK | `R[a] = numbers[bc]` |
| 2 | LOADS | `R[a] = S[bc]` |
| 3 | LOADI | `R[a] = i32(bc)` |
| 4 | LOADUNDEF | `R[a] = undefined` |
| 5 | LOADNULL | `R[a] = null` |
| 6 | LOADBOOL | `R[a] = x != 0` |
| 7 | MOV | `R[a] = R[b]` |
| 8–13 | ADD SUB MUL DIV MOD POW | `R[a] = R[b] op R[c]` (ADD is JS `+`) |
| 14–19 | BAND BOR BXOR SHL SHR USHR | `R[a] = R[b] op R[c]` (int32 semantics) |
| 20 | NEG | `R[a] = -R[b]` |
| 21 | TONUM | `R[a] = +R[b]` |
| 22 | BNOT | `R[a] = ~R[b]` |
| 23 | NOT | `R[a] = !R[b]` |
| 24 | TYPEOF | `R[a] = typeof R[b]` |
| 25 | TOSTR | `R[a] = String(R[b])` |
| 26–31 | SEQ SNE LT LE GT GE | `R[a] = R[b] op R[c]` (`===`, `!==`, relational) |
| 32 | ISNULLISH | `R[a] = R[b] == null` |
| 33 | JMP | `pc = bc` |
| 34 | JT | if truthy `R[a]`, `pc = bc` |
| 35 | JF | if falsy `R[a]`, `pc = bc` |
| 36 | JNULLISH | if `R[a] == null`, `pc = bc` |
| 40 | NEWOBJ | `R[a] = {}` |
| 41 | NEWARR | `R[a] = []` |
| 42 | GETPROP | `R[a] = R[b][S[c]]` (`length` of strings and arrays included) |
| 43 | SETPROP | `R[a][S[b]] = R[c]` |
| 44 | GETELEM | `R[a] = R[b][R[c]]` |
| 45 | SETELEM | `R[a][R[b]] = R[c]` |
| 46 | DELPROP | `delete R[a][R[b]]` |
| 47 | HASPROP | `R[a] = R[c] in R[b]` |
| 48 | PUSH | `R[a].push(R[b])` |
| 49 | SPREADARR | `R[a].push(...R[b])` |
| 50 | SPREADOBJ | `Object.assign(R[a], R[b])` |
| 55 | CLOSURE | `R[a] = closure(function b, captures R[c..c+ncaps-1])` |
| 56 | GETCAP | `R[a] = captures[b]` |
| 57 | NEWCELL | `R[a] = cell(R[b])` |
| 58 | GETCELL | `R[a] = R[b].value` |
| 59 | SETCELL | `R[a].value = R[b]` |
| 60 | CALL | `R[a] = R[b](R[c..c+x-1])` |
| 61 | CALLM | `R[a] = R[c].<S[b]>(R[c+1..c+x])` (method; section 4.4) |
| 62 | CALLN | `R[a] = <S[b]>(R[c..c+x-1])` (library function; section 4.3; `S[b]` is the dotted name, for example `Math.floor`) |
| 63 | RET | return `R[a]` |
| 64 | THROW | throw `R[a]` |
| 65 | NEWERR | `R[a] = { name: ['Error','TypeError','RangeError'][x], message: R[b] }` |
| 70 | SUSPEND | `R[a] = await effect(kind x, step R[b], args R[c])` |
| 71 | FORK | `R[a] = fibre id of R[b](R[c])` |
| 72 | JOIN | `R[a] = results of fibres listed in array R[b]` |
| 73 | NOW | `R[a] = ctx.now()` |
| 74 | RANDOM | `R[a] = ctx.random()` |
| 75 | TRACE | `ctx.trace(String(R[a]), R[b])`. Glue: it does not suspend and is not logged. Without tracing it does nothing (section 9.3) |
| 76 | EXEC | `R[a] = ctx.execution()`, a new object `{ id, mode, resumeUrl, resumeFormUrl }` (section 9.5) |
| 77 | VARS | `R[a] = ctx.vars()`, a new object from the variables captured when the execution started (section 9.5) |

Fuel is charged on every instruction, and checked on backward jumps and
calls. The verifier rejects a module when an operand is out of range: a
register at or above `nregs`, a constant index, a function index, a jump
target outside the function, or an unknown library or method name.

## 4. Library

### 4.1 Prelude

The compiler links prelude functions written in the subset, for every
higher-order array method: `map`, `filter`, `forEach`, `reduce`, `some`,
`every`, `find`, `findIndex`, `flatMap`, and `sort` with a comparator (stable
merge sort). The runtime never calls back into bytecode from native code.

### 4.2 Node library

Library nodes are subset modules in `packages/@n8n/workflow-lang/src/nodes/`
(hand ports) and `src/nodes/declarative/` (generated by
`scripts/translate-declarative.ts` from declarative node descriptions).
`docs/node-coverage.md` lists them. Each module is
`export default defineNode({ type, version, supports?, run })`. `run` takes
`(parameters, items, credential)` and uses `ctx.http`. The compiled function
takes a fourth hidden parameter, the step index of the caller, and passes it
to its `SUSPEND`s. `credential` is the name of a credential slot; the runtime
applies the credential to the request (section 7). A library module can
import only from `@n8n/workflow-lang`, so each module holds its own helpers.

* Linking. `src/generated/sources.generated.ts` holds the module sources and
  an index from node type to module. The compiler and the reference runner
  load only the modules whose type the workflow source names in a string
  literal.
* `supports` lists the supported operations, keyed `resource.operation`
  (`operation` for a node without resources), with the parameter names that
  each one accepts (`options.limit` names a member of a collection), and the
  default resource and operations. A name can also limit the values:
  `simple=true` accepts `simple` only as the literal `true`, and
  `format="a"|"b"` lists JSON values. A call with another value, or with an
  expression for that parameter, runs in the fallback host. The converter
  also runs a node version older than the library node's in the fallback
  host when the versions behave differently. For a `ctx.node` call with literal
  parameters, the compiler checks the operation and the parameter names:
  * without `host`, an unsupported call is not linked: it is an ordinary
    `node` effect that the fallback host runs, and the compiler reports
    warning `WL061` (`CompileResult.warnings`);
  * `host: 'library'` makes an unsupported call error `WL060`;
  * `host: 'fallback'` never links.
  A non-literal resource, operation or `parameters` value is checked at run
  time by the library node, which throws.
* A library node sends the requests that the v1 node sends for the
  parameters it supports. `src/nodes/__tests__/equivalence.test.ts` compares
  them with requests recorded from n8n's real node code.

### 4.3 Library functions (CALLN)

`Math.floor ceil round trunc abs min max pow sqrt sign log exp`,
`JSON.stringify` (value, replacer `null`, optional indent: the compiler
passes the arguments as written), `JSON.parse`, `Object.keys`,
`Object.values`, `Object.entries`, `Object.assign` (into a new object only),
`Array.isArray`, `Number`, `String`, `Boolean`, `parseInt`, `parseFloat`,
`isNaN`, `Number.isInteger`, `Number.isFinite`, `RegExp.exec` (section 4.6).

Text codecs, with the results and errors of JavaScript: `btoa`, `atob`
(`InvalidCharacterError`), `encodeURI`, `encodeURIComponent`,
`decodeURIComponent` (`URIError`), `escape`, `unescape`.
`Base64.encodeUtf8(text)` is `btoa(unescape(encodeURIComponent(text)))` in
one pass, with the same `URIError` for a lone surrogate.

ASCII checks for library nodes, in place of `charCodeAt` loops:
`Ascii.is(text)` is true when every character is in U+0000 to U+007F, and
`Ascii.isPrintable(text)` when every character is in U+0020 to U+007E. They are native and linear: the base64
of UTF-8 text is `btoa(unescape(encodeURIComponent(s)))`, and the way back
is `decodeURIComponent(escape(atob(b)))`.

XML, for library nodes:

* `XML.parse(text)` gives the value that xml2js 0.5 gives with its default
  options on sax 1.2.4 (strict): `_` for text, `$` for attributes, an array
  for each child name, an element with only text as that text. Tag and
  attribute names `__proto__`, `constructor` and `prototype` get the prefix
  `sanitized_`, as n8n does. Text with no root element gives `null`. The
  first syntax error throws an `Error` with the message of sax (`Line`,
  `Column`, `Char`). The runtime parses without recursion, with a nesting
  cap of 256 elements.
* `XML.snippet(html)` is rss-parser's `getSnippet`: block tags become line
  breaks, other tags go, HTML entities are decoded (entities 2.2), and the
  result is trimmed.
* `XML.content(value)` is rss-parser's `getContent`: the `_` text of an
  element, or the element rendered under `<div>` by xml2js's Builder.

Date (section 4.5). The receiver of a `Date.prototype` function is its
first argument. CALLN passes the argument count, and the count matters, as
in JavaScript (`d.setHours(h)` keeps the minutes):

| Name | Source form |
|---|---|
| `Date.fromValue` | `new Date(v)`: a number is clipped, a string is parsed, other values are converted as in JavaScript |
| `Date.fromParts` | `new Date(y, m, d?, h?, mi?, s?, ms?)` |
| `Date.UTC`, `Date.parse` | the same |
| `Date.json` | a Date that escapes into a JSON place: `d.toJSON()`. A value that is not a number passes through |
| `Date.text` | a Date in a string place: `d.toString()`. A value that is not a number gets `String(v)` |
| `Date.prototype.<m>` | `d.<m>(...)` for each method `m` of section 4.5 |

`new Date()` and `Date.now()` compile to `NOW`.

`Date.zoneOffset(zone, t)` gives the offset in minutes from UTC of the IANA
time zone `zone` at time value `t` (NaN for NaN). `UTC` gives 0. The zone
must be in the workflow option `zones: [...]` (a literal array of IANA
names, checked at compile time with `WL054`), which the compiler writes to
META `zones`. The shell sends the TZif data of these zones before the module
loads (section 8.3), as for schedules. Another zone throws `RangeError`
`Invalid time zone specified: <zone>`. The bytecode VM and the reference
runner read the zone data of the ICU of Node.js.

### 4.4 Methods (CALLM)

* String: `toUpperCase toLowerCase trim trimStart trimEnd startsWith endsWith
  includes indexOf slice substring split (string separator) replace
  replaceAll (string pattern) padStart padEnd repeat charAt charCodeAt
  concat at`.
* Array: `push pop shift unshift slice concat join includes indexOf reverse
  sort (no comparator) at flat`.
* Number: `toFixed toString`.

Date methods are not CALLM methods: the compiler lowers them to CALLN
(sections 4.3 and 4.5).

### 4.5 Date

A Date is a number at run time: its time value, in ms since the epoch, or
NaN for an invalid date. There is no Date object. The compiler uses the type
checker to find each expression of type `Date` (or `Date` with `null` or
`undefined`) and lowers it by its position.

**Time zone.** Workflows run in UTC. Local-time methods equal the UTC
methods: `getHours` is `getUTCHours`, `getTimezoneOffset` is `0`, a date-time
string without an offset is UTC, and `toString` prints
`GMT+0000 (Coordinated Universal Time)`. The reference runner sets
`process.env.TZ = 'UTC'`, so Node.js gives the same results.

**Clock.** `new Date()` and `Date.now()` read the batch clock, as
`ctx.now()` does. A replay gives the same value.

**Supported.**

* Construction: `new Date()`, `new Date(ms | string | Date)`,
  `new Date(y, m, d?, h?, mi?, s?, ms?)` (years 0 to 99 mean 1900 to 1999),
  `Date.now()`, `Date.UTC(...)`, `Date.parse(s)`.
* Getters: `getTime valueOf getFullYear getMonth getDate getDay getHours
  getMinutes getSeconds getMilliseconds getTimezoneOffset` and each
  `getUTC*` form.
* Setters: `setTime setMilliseconds setSeconds setMinutes setHours setDate
  setMonth setFullYear` and each `setUTC*` form. They return the new time
  value.
* Text: `toISOString` (RangeError `Invalid time value` on an invalid date),
  `toJSON` (null on an invalid date), `toString toUTCString toGMTString
  toDateString toTimeString`, and `toLocaleString toLocaleDateString
  toLocaleTimeString` with no argument or `'en-US'`. The locale forms are
  `M/D/YYYY, h:mm:ss AM`; years before 1 print as era years (year 0 is
  `1`), as ICU does. Invalid dates print `Invalid Date`.
* Years outside 0 to 9999 print as in V8: `+010000-01-01T00:00:00.000Z`,
  `-000001-…`; `toString` prints `-0001`.
* Parsing follows the V8 date parser (`src/date/dateparser*`), which the
  runtime ports: ES5 ISO forms (a date-only form is UTC; a date-time form
  without an offset is local, which is UTC here), and the legacy forms that
  V8 accepts, such as `toString` and `toUTCString` output, `March 7, 2020
  10:00 PM`, `1/2/2020` and `GMT+0100`. The result is clipped to
  ±8.64e15 ms. Other text gives NaN.
* Comparison with `<`, `<=`, `>`, `>=`, unary `+`, and `Number(d)` work on
  the number.

**Escapes.** When a Date goes into an untyped or JSON place, the compiler
inserts `Date.json(d)`: an object or array literal member, a store into an
object or array, `push`/`unshift`/`concat`, `JSON.stringify(d)`, a ctx call,
a callback result (for example `map`), the return value of `run`, and an
`unknown` variable or parameter. When a Date goes into a string place, the
compiler inserts `Date.text(d)`: a template, `+` (JavaScript adds a Date as
its `toString` text), `String(d)`, and `new Error(d)`.

**Setters.** A setter stores the new time value back into its variable:
`d.setHours(0)` becomes `d = Date.prototype.setHours(d, 0)`. Because a
number has no identity, the compiler rejects a setter unless JavaScript
would give the same result:

* the receiver is a local variable (not a parameter, a property or an array
  element);
* the variable starts as `new Date(...)`, and each assignment to it is
  `new Date(...)`;
* the variable is not copied: not into another variable, a function
  argument, the return value of a local function, or an object or array,
  except a literal that a ctx call, `JSON.stringify` or the return of `run`
  reads at once.

A closure that captures the variable sees the change, as in JavaScript.

**Rejected (`WL013`).** A use where a number and a Date object differ:

* `===`, `!==`, `==`, `!=` between a Date and a value other than `null` or
  `undefined` (JavaScript compares identity), and `switch` on a Date;
* a Date in a condition (`if`, `?:`, `!`, left of `&&` and `||`: a Date is
  always true in JavaScript), and `typeof d`;
* a Date read from an object, an array, a destructuring pattern, a `for...of`
  variable or a callback parameter of a library method (the value there is
  the ISO string);
* text from an array of Dates (`join`, templates, `String`), and
  `includes`/`indexOf` with a Date;
* a value of type `any` used as a Date (use `new Date(value)`), and `as`
  from or to `Date`;
* a Date passed to another library function (`Object.keys(d)`), spread, used
  as a key, or as the accumulator of `reduce`;
* `Date` as a value, `Date()` without `new`, a method reference without a
  call (`d.getTime`), and a locale method with options or another locale;
* a type that mixes `Date` with types other than `null` and `undefined`.

`instanceof` stays rejected (`WL001`). TypeScript itself rejects arithmetic
such as `d2 - d1`; write `d2.getTime() - d1.getTime()`.

**Known differences.** A Date stored in an object, an array or an `unknown`
variable is its ISO string from that point on. JSON output is exact, but
`String(x)` of such a value gives the ISO string, where JavaScript gives the
`toString` text. Trigger and effect results are JSON, so they never hold a
Date.

`toUpperCase` and `toLowerCase` use the full Unicode default case
conversion, as V8 does: the one-to-many mappings (`ß` becomes `SS`) and the
Final_Sigma rule. `workflow-runtime/src/core/unicase.zig` holds the tables,
which `gen_unicase.mjs` makes from Node.js.

An object spread (`{ ...v }`) of a string copies its UTF-16 units under the
index keys, as in JavaScript.

`normalize(form)` gives the forms NFC (the default), NFD, NFKC and NFKD, as
V8 does. Another form throws a RangeError with V8's message.
`workflow-runtime/src/core/normalize_tables.zig` holds the decompositions,
the order of the combining classes and the composition pairs, which
`gen_normalize.mjs` makes from Node.js. Bytes that are not UTF-8 (lone
surrogates) stay as they are.

`a.localeCompare(b)` uses the CLDR root collation, as V8 does without a
locale, with "en" and with the default options: NFD, the collation elements
of CLDR 48 (`allkeys_CLDR.txt`) with contractions and expansions, Han
ideographs in radical-stroke order, implicit weights for other code points,
and three levels (base letters, accents, case). It gives -1, 0 or 1.
`workflow-runtime/src/core/collate_tables.zig` holds the tables, which
`gen_collate.mjs` makes from the CLDR files (pinned by SHA-256). A converted
Code node keeps the host step for a tailored locale, a computed locale or
options. Known difference: a few texts with Tibetan contractions and marks
out of canonical order compare as their NFD, where V8 does not.

Errors have V8's messages where code can read them: property reads and
writes of `undefined` and `null`, `JSON.parse` (the message, its position,
line and column, and the context around the token;
`workflow-runtime/src/core/json_error.zig`), iteration of a value that is not
iterable, and `Object.keys` of `null`.

### 4.6 Regular expressions

There is no RegExp object. One library function finds matches:

`RegExp.exec(source, flags, input, lastIndex)` finds the first match of the
pattern at or after `lastIndex` (with the `y` flag, only at `lastIndex`). It
returns `null`, or an array of UTF-16 positions: the start and end of the
match, then the start and end of each capture group, with `-1, -1` for a
group that did not take part. A `lastIndex` outside `[0, input.length]`
gives `null`. In the Unicode mode, a `lastIndex` on the low half of a
surrogate pair starts at the high half, as in V8.

The engine (`workflow-runtime/src/core/regex.zig`) is a backtracking matcher
with the semantics of ECMAScript: ordered alternation, greedy and lazy
quantifiers, the reset of the captures of a quantified atom on each
iteration, the empty-iteration check, lookahead, backreferences (also to
named groups) and `Canonicalize` for the `i` flag. Supported:

* Flags `g i m s y u`. Not `u` with `i`, not `d` or `v`.
* Not: lookbehind, Unicode property escapes (`\p{…}`), legacy octal escapes,
  quantified assertions, a class range with a class escape (`[\d-x]`),
  counts above 1000 in `{n,m}`.
* The Annex B forms `]`, `{` and `}` as plain characters, `\cX`, `\xHH`,
  `\uHHHH` (and `\u{…}` in the Unicode mode).

A pattern that the engine does not support throws `SyntaxError`. One call
counts at most 10,000,000 matcher steps; more ends the execution with
status `limit` (fuel). The steps also count as fuel, one for each 16 steps.

The converter (native Code nodes) checks each pattern at convert time with
`src/convert/code-native/regex-syntax.ts`, which accepts the same set, and
writes `test`, `exec`, `match`, `matchAll`, `search`, `replace`,
`replaceAll` and `split` as subset helpers over `RegExp.exec`. A match is a
plain array: it has no `index`, `input` or `groups` property, so the
converter keeps code that reads them in the fallback host.

## 5. Value format (runtime internal, logs and snapshots)

In registers a value is one 8-byte word. A non-NaN f64 is a number. Otherwise
the top 16 bits hold `0xFFF8 | kind` and the low 32 bits hold the payload:
kind 1 undefined, 2 null, 3 boolean, 4 string, 5 array, 6 object, 7
function/cell. Handles at or above `0x8000_0000` point to module string
constants. Other handles are byte offsets into the execution's region.

On disk and on the wire the PoC uses two forms. A snapshot is the
execution's region after a compacting copy (`workflow-runtime/src/core/heap.zig`):
every reference is an offset, so it is restored with one copy and no pointer
fix-up. Log records (`logfmt.zig`) carry event payloads as JSON text, and the
fallback host protocol is length-prefixed JSON. A shared tagged binary value
format, as the plan proposed, is not built.

## 6. Differential test fixtures

Each corpus workflow has a fixture `{ trigger, now, seed, effects, trace?, execution?, vars?, staticData? }`.
`effects[stepName]` is a list of results, used in order of occurrence and
cyclically. A result `{ "$error": message }` makes the effect fail. Both the
Node.js reference runner and the runtime's `wfrt run` command produce:

```json
{ "status": "ok" | "error" | "needs_attention" | "limit",
  "result": <return value or error object>,
  "effects": [ { "step": name, "kind": "node" | "http" | "code" | "wait" | "approval" | "respond", "args": <args> } ],
  "trace": [ { "step": name, "items": <value> } ] }
```

`trace` is present only when the fixture has `"trace": true`. The execution
then runs with tracing on, and `trace` lists the `ctx.trace` calls in the
order they ran. `step` is `String(name)`. `items` is a JSON copy of the
value: `undefined` and functions drop out of objects and become `null` in
arrays, and an `items` value of `undefined` or a function becomes `null`.
Without `"trace": true`, `ctx.trace` does nothing and the output has no
`trace` member.

`execution` sets what `ctx.execution()` gives:
`{ mode?: 'test' | 'production', id?, resumeUrlBase?, resumeFormUrlBase? }`.
`mode` defaults to `production`; the id is then `wfrt-1` (the first id that
the runtime makes). With `test`, the run is a manual run with the n8n id
`id` (a decimal string, default `1`). `resumeUrl` is `<resumeUrlBase>/<id>`
(default base `/resume`); `resumeFormUrl` is `<resumeFormUrlBase>/<id>`
(default: the resume base). `vars` is the object of variables that
`ctx.vars()` gives (default `{}`). `staticData` is the workflow static data
at the start (9.7); the output then has `staticData`, the document at the end.
`wfrt run` loads the module as a workflow with these settings, as n8n does.

`args` is the options object of the ctx call, or for an `http` effect made by
a library node, the request `{ method, url, headers, qs, body, credential }`.
A step with no list in `effects` gets `undefined`. With `retry.max > 0`, each
attempt records one effect and uses the next result of the list.

`ctx.random()` uses splitmix64 seeded with `seed`: `state += 0x9E3779B97F4A7C15;
z = state; z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9; z = (z ^ (z >> 27)) *
0x94D049BB133111EB; z ^= z >> 31;` and returns `(z >> 11) * 2^-53`.
`ctx.now()` returns the fixture clock. The clock starts at `now`.
`ctx.wait({ duration })` adds `duration` to the clock, and
`ctx.wait({ until })` sets the clock to `max(clock, until)`. No other call
moves the clock. Outputs are compared as `JSON.stringify` text, so the key
order is `status`, `result`, `effects`, `trace`, and `result` is left out when it is
`undefined`. A `needs_attention` result is `{ "step": <step name> }`.

## 7. Credentials (phase 2)

A workflow names credential slots (`credentials: { slack: { type: 'slackApi' } }`).
A step refers to a slot by name (`credential: 'slack'`). The compiled module
never holds a secret. The runtime and the fallback host read one credentials
file at start (`wfrt serve --credentials <file>`,
`WF_FALLBACK_CREDENTIALS=<file>`):

```json
{
  "<slot>": {
    "type": "slackApi",
    "data": { "accessToken": "xoxb-…" },
    "inject": {
      "headers": { "Authorization": "Bearer {{$credentials.accessToken}}" },
      "qs": { "api_key": "{{$credentials.apiKey}}" },
      "basicAuth": { "user": "{{$credentials.user}}", "password": "{{$credentials.password}}" }
    }
  }
}
```

* `data` is the decrypted n8n credential data. The fallback host gives it to
  v1 nodes. The host also accepts the old form `{ "<slot>": { …data } }`.
* `inject` is optional. Each member is optional. The runtime applies it to
  every `http` effect whose `credential` is the slot: it sets the headers,
  adds the query parameters, sets `Authorization: Basic …`, and adds the
  members of `body` (string templates) to a JSON object body (for the few
  credential types that authenticate in the body, for example `beeminderApi`).
* Template: `{{$credentials.<path>}}` is replaced with the string value of
  `data.<path>`. A path is field names joined by dots, for example
  `oauthTokenData.access_token`. A number or boolean is written as JSON text. There is no other template syntax. The runtime also replaces
  templates in the `url`, `headers`, `qs` and string values of `body` of an
  `http` effect with a credential (for example the Telegram bot URL).
* `wfl credentials` (TypeScript) builds this file from the output of
  `n8n export:credentials --decrypted` and the `authenticate` property of the
  n8n credential types.
* Derived values. A template reads one field as it is, with no default and
  no condition. When a v1 node builds a value from several credential fields,
  the builder writes the result into `data.n8nDerived` (`src/credentials/derived.ts`),
  and a library node reads it with `{{$credentials.n8nDerived.<name>}}`. For
  example, `n8nDerived.outlookApiUrl` of `microsoftOutlookOAuth2Api` is the
  Microsoft Graph URL of the mailbox (`graphApiBaseUrl`, `useShared`,
  `userPrincipalName`). Derived values come only from fields that are not
  secret.
* An effect that names a slot that is not in the file fails with
  `credential "<slot>" is not configured`.
* Limits of the PoC: the file is plain text on disk. OAuth2 uses the stored
  access token and does not refresh it.

### 7.1 The `http` effect in the runtime

* `timeoutMs` bounds the whole request: queueing, connect, TLS, the send
  and the response. Without it the request gets the origin's `timeout-ms`
  (an `--egress-origin` rule) or `--egress-timeout-ms` (300 000). A request
  that times out fails with `http: the request timed out after <n> ms`.
* `qsFormat` sets how `qs` goes into the URL:
  * `"repeat"` (the default): one pair per member; an array repeats the key
    (`a=1&a=2`); an object is sent as JSON text; values are encoded as Node.js
    `querystring.escape` does.
  * `"brackets"`: as the qs library's `stringify` with n8n's options (its
    defaults, `arrayFormat: "indices"`), which n8n's request helpers use without
    `useQuerystring`. Nested objects and arrays become
    `sort%5B0%5D%5Bfield%5D=name` (`sort[0][field]`, the key encoded too);
    `null` is `key=`; empty arrays and objects write nothing; every byte but
    `A-Z a-z 0-9 - . _ ~` is percent-encoded. At most 32 levels.
* Binary bodies. `body: { $binary: { data, id?, mimeType? } }` sends the
  bytes of a binary entry as the body, with `mimeType` as the content type
  unless a header sets one. `multipart: [ { name, value } | { name, binary:
  { data, id?, mimeType?, fileName? } } ]` sends `multipart/form-data` with a
  boundary that the runtime makes; it replaces a `content-type` header, and
  `body` and `multipart` together are an error. When `data` is the marker
  of n8n's file store (`filesystem-v2` or `filesystem`), the bytes are the
  file of `id` under `WFRT_BINARY_DATA_STORAGE_PATH` (else
  `N8N_BINARY_DATA_STORAGE_PATH`; the id must be
  `filesystem-v2:workflows/<wf>/executions/<e>/binary_data/<file>`), read into the
  request buffer; otherwise `data` is base64. The limit is
  `--egress-max-body-mb`. The library HTTP Request node sends them for
  `contentType: binaryData` and `multipart-form-data` (version 3 and later,
  a fixed method other than GET and HEAD, no pagination). A file part gets
  the file name of the binary property (its base name, default `file`) and
  its MIME type (default `application/octet-stream`).
  `http-request-files.test.ts` compares the bytes with v1's.
* The runtime limits outbound requests per origin (scheme, host, port):
  connections, requests on the wire, waiting requests, a request rate, and
  connect and read timeouts (`wfrt serve --egress-origin`, workflow-runtime
  README). A request over a limit waits; it is not failed. A full queue, or
  no free request slot, fails the effect with a message that names the
  flag. Such a failure is an effect error, so the step's `retry` applies.
* Any status, 429 and 503 included, is a result `{ status, headers, body }`,
  as in v1. The runtime never sends a request again because of its status.
  The only requests it sends again are ones that cannot have been applied:
  a kept-alive HTTP/1.1 connection that closed before any response byte (for
  idempotent methods or a step with an idempotency key), and HTTP/2 streams
  that the server refused (REFUSED_STREAM) or did not process (above the
  last stream id of a GOAWAY), for any method (RFC 9113 8.7).
* 429 and 503 slow later requests to the origin: the requests it may have
  on the wire halve, then grow back by one per round trip (AIMD). With
  `Retry-After`, retries of failed steps (`attempt > 0`) to the origin wait
  until it passes, at most 60 s. This changes when requests go out, never
  their results.
* HTTP/2 is used when an https server chooses it with ALPN. The result has
  the same shape; header names are lower case either way. Differences that a
  workflow can see: an HTTP/2 response has no `transfer-encoding`,
  `connection` or `keep-alive` headers, and the server sees the host as
  `:authority`, not as a `host` header.

### 7.2 Connection sharing and isolation between executions

Outbound connections are pooled. These rules keep one workflow's data and
secrets out of another's.

* **Pool key.** Requests share a connection only when they have the same
  scheme, host and port, and the same pool key. The TLS settings (trust
  store, `--ca-file`, `--insecure-tls`) are the same for every request of a
  process, and SNI is the URL host, so they are part of every key.
  `--egress-pool` sets the rest:
  * `shared`: all workflows share connections to an origin.
  * `workflow`: each workflow (its n8n id; with `--module`, its module) has
    its own connections. Use it when one runtime runs workflows of more than
    one project or tenant. n8n does not send project ids to `wfrt` yet, so
    per-project pools need that first; per-workflow pools isolate more.
  * `credential`: each credential slot of each credential store has its own
    connections; requests without a credential share.
  The trade-off: each pool opens its own connections (and TLS handshakes,
  about 0.5 ms of CPU each), so `workflow` with many workflows to one vendor
  costs connections and memory. HTTP/2 makes the cost small: one connection
  carries about 100 or more streams.
* **Connection-bound authentication.** The runtime supports no
  authentication that binds to a connection (NTLM, Negotiate, Kerberos,
  client certificates, mutual TLS). When it does, those connections must be
  pooled per credential id and never carry another credential.
* **HPACK.** The encoder never adds to the server's dynamic table, so no
  request can learn another request's header from compression. Every
  request header except `accept`, `accept-encoding`, `accept-language`,
  `content-type`, `content-length`, `user-agent`, `idempotency-key` and
  `te` goes out as a never-indexed literal (RFC 7541 7.1.3): credentials,
  cookies, API keys and every header a credential template filled. The
  decoder's table is per connection, at most `--egress-h2` table size (4 KB),
  and starts empty on each connection.
* **Stream ownership.** Each stream records the request that opened it and
  the request slot's generation. A frame reaches only that request, with an
  assertion; a stream whose request was cancelled or timed out is reset
  (RST_STREAM CANCEL) and its later frames are dropped. On RST_STREAM,
  GOAWAY, a timeout or a cancel, the response bytes of the stream are
  cleared (safe builds fill them) before the slot is used again, and only
  the exact response is passed to the step.
* **No shared response state.** There is no cookie jar and no cache.
  Redirects are followed per request, and credentials are dropped on a
  redirect to another host.

## 8. Schedule triggers in the runtime

The runtime reads META `triggers` when it loads a module
(`workflow-runtime/src/core/module.zig`). Section 1.4 gives the format.

### 8.1 Slots

A slot is an instant, in whole seconds, at which a schedule starts an
execution. `nextSlot(spec, after, zone)` (`src/core/cron.zig`) gives the
first slot strictly after `after`. It is a pure function. It searches at
most eight years ahead, as the `cron` npm package does. A spec with no slot
in that time never fires.

* Matching uses local wall time in the zone of the trigger.
* When day of month and day of week are both restricted, a day matches when
  either field matches (as in Vixie cron and the npm package).
* `every` becomes a spec as n8n's `toCronExpression` makes it. For example
  `{ unit: 'hours', value: 6, atMinute: 15 }` is `0 15 */6 * * *`.
* n8n fires an interval that does not divide its parent unit (every 7
  minutes, every 5 hours, every 2 days, every 2 weeks, every 5 months) more
  often and skips fires in `recurrenceCheck`, from the time of the last fire.
  The runtime uses a filter without state instead: the local unit number
  since 1970-01-01 must be a multiple of the value. Weeks start on Sunday.
  Thus the rhythm is the same as in n8n, but the first fire can be at a
  different slot. A restart or a new version does not move the rhythm.

### 8.2 Daylight saving time

The runtime matches the `cron` npm package v4.4.0:

* **A local time in a spring-forward gap** fires once, at the end of the
  gap. For example `30 2 * * *` in America/New_York fires at 03:00 EDT on
  the day of the change. Several matches in one gap give one fire. In zones
  where January has daylight time (the southern hemisphere), the package
  instead fires the first match shifted by the gap (02:30 becomes 03:30 in
  Australia/Sydney). The runtime does the same.
* **A local time that occurs twice** (fall back) fires on its first pass.
  The second pass fires only when the hour field allows both the repeated
  hour and the hour after it. Thus `30 1 * * *` fires once, and
  `*/15 * * * *` and `0 * * * *` keep their rhythm in absolute time and
  fire in both passes.

Differences from the package. The differential test found only these:

* The package also fires once in the second pass when the hour field allows
  the hour after the repeated hour but not the repeated hour. For example
  `0 2 * * *` in America/New_York fires at 01:00 EST and again at 02:00 EST
  on the day of the change. The runtime fires once, at 02:00 EST.
* In zones with a 30-minute change (Australia/Lord_Howe), the package moves
  some slots near the change back by 30 minutes. The runtime does not.
* The package resolves a repeated local time with the zone offset of the
  current date (luxon). In daylight time, it can return a slot before its
  start. The runtime does not depend on the current date. The differential
  test pins the date of the package to standard time.
* The package searches eight years from the current date. The runtime
  searches eight years from `after`.

Differential test: `node scripts/cron-diff.ts --cases 1000 --seed N`
compares the next 50 slots of random expressions in 15 time zones, with
half of the starts near DST changes. Six runs (6,000 cases, about 300,000
slots): 5,994 cases identical, 6 differ at a DST change, all of them in the
two classes above, 0 differ elsewhere.

### 8.3 Time zones

The core has no file access. For each time zone of a module, the shell
reads `$TZDIR/<name>` (default `/usr/share/zoneinfo`) and sends a
`timezone` event (kind 12) before the `load_module` event. Its payload is
the name, a newline and the TZif bytes. The core parses the TZif data
(RFC 8536) and the POSIX rule of its footer, for times after the table
(`src/core/tz.zig`). The log keeps the bytes, so a replay gives the same
slots on a machine with other zone files. The first copy of a zone wins.
`UTC` needs no file. A schedule whose zone has not arrived does not fire
until it arrives.

### 8.4 Fires and durability

* The core keeps, for each schedule, the next slot (`next_at`) and the last
  slot that fired (`last_fired`). It computes `next_at` when it loads the
  module, from the batch clock.
* Before each batch, the shell calls `dueSchedules(state, now)`. It changes
  nothing. For each schedule with `next_at <= now`, it gives a `schedule`
  event (kind 13): `aux` is the module index, `seq` the trigger index in
  META, and `conn` the slot in ms. The shell adds the events to the batch.
  Thus each fire is an input in the log, and a replay makes the same fires
  at the same point.
* The core applies a `schedule` event only when its slot is after
  `last_fired`. It then sets `last_fired`, computes the next slot after
  `max(slot, now)`, and starts an execution with trigger
  `{"scheduledAt":<slot>}`. A repeated or older event changes nothing and
  is not logged.
* The shell syncs the log of a batch that has a `schedule` event before it
  performs any action of that batch, whatever the durability tier. Thus a
  crash before the sync loses the fire and its effects together, and the
  next batch fires the slot again. A crash after the sync keeps it: a replay
  restores `last_fired`, and the slot does not fire again.
* For the `none` tier, the event is logged with `start_reserve_flag` and no
  payload. A replay then moves the schedule and the execution id, and runs
  nothing.
* Catch-up policy "once" (n8n calls it "Run the most recent missed
  execution"): after downtime, a schedule fires once, for the latest missed
  slot, and then continues with the first slot after now.
* With no free execution slot, the event is not applied or logged. The
  shell offers it again in the next batch.
* The fixture runner (`wfrt run`, `wfrt corpus`) does not fire schedules.
  The fixture `trigger` is the event value.

### 8.5 Webhook triggers

`wfrt serve` adds a route `<method> /<path>` for each webhook trigger in
META, when no `--route` flag names a route for that module and the log has
no routes yet. `--route` still works and replaces the META routes of its
module. A webhook without `method` uses `POST`.

## 9. n8n integration (phase 3)

A workflow with `settings.engineType: 'compiled'` runs on `wfrt`. The user
edits the canvas as usual. On each save, n8n converts the workflow JSON to
workflow source (`src/convert`), compiles it, and keeps the module. n8n
starts `wfrt` and the fallback host as child processes. The backend module
`compiled-engine` (`packages/cli/src/modules/compiled-engine`) owns this.

### 9.1 Admin API of `wfrt`

`wfrt serve --admin-port <p> --admin-secret-env <VAR> --log-dir <dir>`
listens on 127.0.0.1 only. The secret comes from the environment variable,
never from the command line, and must have 16 bytes or more. Each request
carries `authorization: Bearer <secret>`; else the answer is 401. The admin
port needs `--shards 1`. Bodies are JSON. Errors are `{ "error": s }`.

| Request | Body | Result |
|---|---|---|
| `PUT /_admin/workflows/<workflowId>` | `{ "versionId": s, "module": <base64 .wfm>, "active": bool, "webhookPrefix": "/webhook", "saveData"?: bool, "credentials"?: <section 7 document>, "resumeUrlBase"?: s, "resumeFormUrlBase"?: s }` | 200 `{ "ok": true }`. Loads or replaces the workflow. 400: bad body or module. 409: another active workflow has one of its webhook paths (nothing changes). 507: the module does not verify, or there is no room |
| `DELETE /_admin/workflows/<workflowId>` | — | 200, or 404 when it is not loaded. Stops its triggers. Running and parked executions finish on their version |
| `GET /_admin/workflows` | — | `[{ workflowId, versionId, active, executions, routes: ["POST /webhook/…"], schedules }]`. `executions` counts the live and parked executions of the current version |
| `PUT /_admin/credentials` | the credentials document of section 7 | 200. Replaces the global credentials, in memory only |
| `PUT /_admin/variables` | `{ "<key>": "<value>" }` | 200; 400 when it is not an object. Replaces the variables (`$vars`, 9.5). The log keeps them |
| `POST /_admin/executions` | `{ "workflowId": s, "versionId"?: s, "executionId": s, "trigger": <value>, "trace"?: bool }` | 202 `{ "executionId": s }`. Starts one execution of the current version (manual run), also when the workflow is not active. 400: the id is not a numeric string. 404: unknown workflow. 409: `versionId` is not the current version, or a live or parked execution has the id |
| `DELETE /_admin/executions/<executionId>` | — | 202. Cancels a live or parked execution (`finished` with status `cancelled`). 404 when unknown |
| `GET /_admin/events` | — | A stream of newline-separated JSON events (9.2), `content-type: application/x-ndjson`. One client at a time; a second gets 409 |
| `POST /_admin/resume/<executionId>/<effectSeq>?signature=<s>` | the resume value | 202 `{ "status": "resumed" }`. Completes the waiting effect (an approval) with the body. 403: the signature is missing or wrong. 404: unknown execution |
| `POST /_admin/resume/<executionId>?signature=<s>` | the resume value | The same, for the one approval that the execution waits for now (9.4). 409 when it waits for none or several |

The public port also accepts `POST /resume/<executionId>/<effectSeq>?signature=<s>`
(the `resumeUrl` of a `waiting` event) and `POST /resume/<executionId>?signature=<s>`.
Every resume needs the execution's signature (9.4).

**Versions.** A workflow has one current version. A PUT with a new module
loads it and retires the old one: the old module stays in memory while a
live or parked execution uses it, so those executions finish on the version
they started on, also after a restart. A PUT with the same module bytes
changes only `versionId`, `active`, `saveData` and the webhook prefix.

**Triggers.** Webhook and schedule triggers run only when `active` is true.
Each META webhook trigger gets the route `<method> <webhookPrefix>/<path>`,
with n8n's rules (`packages/cli/src/webhooks/webhook.service.ts`):

* Leading and trailing slashes of `path` are dropped. A request path with a
  trailing slash matches the path without it.
* A path is dynamic when a segment starts with `:`. When the META trigger
  also has `webhookId`, the route is `<prefix>/<webhookId>/<path>`, as n8n
  builds it (`webhook({ path: 'items/:id', webhookId })`). Without a webhook
  id, the route is `<prefix>/<path>`.
* A static route matches the exact path and wins. Else a dynamic route with
  the same number of segments matches when its prefix and webhook id match
  by position and its other static segments are all in the request (n8n
  compares them as a set). The route with the most static segments wins. A
  route of only parameters matches when no other route does.
* `method` defaults to `POST`. Two active workflows cannot have the same
  method and path: the PUT gets 409.

A webhook execution receives
`{ method, path, headers, params, query, body, $binary? }`, close to the
item that n8n's Webhook node gives:

* `headers` has lower-case names. `params` holds the `:name` segments,
  URL-decoded. `query` holds the query string, URL-decoded (`+` is a
  space); a repeated key gives an array of its values.
* `body` follows n8n's body parser (`packages/cli/src/middlewares/body-parser.ts`)
  and the node (`Webhook.node.ts`, `utils.ts`). An empty body is `{}`.
  `application/json` is parsed (also a body that starts with `{` or `[` and
  has no content type). `application/x-www-form-urlencoded` is an object, with
  arrays for repeated keys. `text/plain` is the text. XML is the text, not an
  object (a difference from n8n).
* `multipart/form-data`: text fields go to `body`, one string per field, an
  array when the field repeats. Files go to `$binary`. A file's property is
  its field name without a trailing `[]`; `data<count>` when the name is
  empty; `<name>0`, `<name>1`, … when several files share a field name;
  `<binaryPropertyName><count>` when the trigger has that option (`count`
  counts all files of the request). A file input left empty (`filename=""`
  and no bytes) is dropped. A body that is not valid multipart gives 400.
* Another content type, or the trigger option `binaryData: true`: `body` is
  `{}` and the whole body is the binary property `binaryPropertyName`
  (default `data`). Its `fileName` comes from `Content-Disposition`. An empty
  body gives no binary.
* The trigger option `rawBody: true` also gives the raw body as binary
  `data`, with the request's media type (default `application/json`).

A binary property is n8n's in-memory form (section 10):
`{ data: <base64>, mimeType, fileName?, fileExtension?, bytes }`. `mimeType`
is the media type without parameters (a file part without a type gets
`application/octet-stream`). `fileExtension` is the text after the last dot
of `fileName`. The META webhook trigger can hold the node options
`binaryPropertyName`, `rawBody` and `binaryData`; the converter writes them.

Size: a request, headers included, can have up to `--max-request-mb`
(32 MB by default); a larger one gets 413. A request that does not fit the
connection's small buffer (`--rbuf-kb`, 16 KB) is read into a large buffer
from a pool of `--request-big-slots` (2); when all are in use the request
gets 503. The pages of a large buffer go back to the system after use. The
base64 text of the files must fit in the execution memory (32 MB at most),
so a file of up to about 20 MB works. A `Content-Type`
whose boundary is a quoted string with backslash escapes is not read.

**Credentials.** The `credentials` member of a workflow PUT is that
workflow's own document. A slot that it does not have comes from the global
document. A PUT without `credentials` keeps the workflow's document; `null`
also keeps it. DELETE of the workflow drops it. Credentials are held in
memory only: they are never in the log, so n8n sends them again after a
restart of `wfrt`.

**Durability.** Loads, replacements, unloads and manual runs are input
events of the log (kinds `load_workflow`, `unload_workflow`, `manual`,
`set_vars`). A
restart replays them, so the workflow set, the parked executions and their
versions come back. This needs `--log-dir`. A rejected request changes
nothing and is not logged.

**Execution ids.** Ids are strings on this API. n8n gives the id of a manual
run: a decimal string (n8n execution ids), below 2^62. `wfrt` keeps it as
`2^62 | id` internally, so it cannot collide with the ids that `wfrt` makes.
For trigger runs (webhook, schedule), `wfrt` makes the id `wfrt-<n>` and
reports it in the `started` event; n8n then creates the execution row and
keeps the mapping. `wfrt-<n>` is never a valid id for a manual run.

**Fallback host frames.** A `node` or `code` step goes to the fallback host
as one frame `{ id, kind, step, key, args, credential?, credentials? }`.
`args` is the options object of the `ctx.node` or `ctx.code` call, as the
core encodes it, with no change: `parameters`, `items`, `inputs`,
`outputs`, `subNodes` and the other members reach the host as written. The
runtime adds the credentials that the step names, so n8n does not write a
credentials file for the host:

* `credential`: `{ "type": s, "data": object }` of the slot in
  `args.credential`. It is kept for older hosts.
* `credentials`: `{ "<slot>": { "type": s, "data": object } }` for each slot
  in `args.credential`, `args.subNodes[].credential` (AI clusters) and
  `args.subNodes[].slots[]` (the slots of a workflow that a tool sub-node
  embeds), each slot once.

Each slot comes from the workflow's document first, then from the global
one. A slot that neither document has is left out. `type` is `null` when
the document gives none.

**Fallback host connections (protocol version 2).** A frame is a 4-byte
little-endian length, then JSON. `wfrt` starts each connection with
`{"hello":{"version":2}}` and sends nothing else until the answer.

* A host of version 2 answers `{"hello":{"version":2,"workers":N,"worker":k}}`
  and hands the connection to worker process `k`, which reads and writes it
  from then on. `wfrt` keeps `N` connections (at least 1, at most 8) and
  sends each step on the open connection with the fewest steps in flight.
  Several frames can share one write.
* A host of version 1 answers the hello with an error frame. `wfrt` then
  keeps one connection, and the host's server process runs each step
  through its worker pool.
* `{"goaway":{}}` from a worker: `wfrt` sends no new steps on that
  connection, closes it when its last step has ended, and opens a new one.
* `{"worker_lost":{"reason":"<text>"}}`: the worker of the connection
  stopped. The host's server process writes it, then closes the connection.
* The blame rule. When a connection closes with `k` steps in flight:
  * `k` = 1 and `worker_lost` came: the step caused the stop. It fails with
    `The step stopped its host worker: <reason>`, not retryable.
  * `k` = 1 without `worker_lost` (the whole host or its server process
    stopped): no step is to blame. The step fails as retryable.
  * `k` > 1: nobody knows which step caused the stop. `wfrt` sends each
    step again, alone on an idle connection, from a copy that it keeps. A
    step that then stops its worker again is the cause. So a host step can
    run twice; host steps run at least once.
* Supervision stays in the host's server process: pings, the heap and
  resident memory limits, and new workers. The worker enforces the time
  limit of each step.

**Webhook responses.** `ctx.respond({ name, status?, headers?, body?,
binary? })` answers the webhook request.

* `headers` is an object of header names and values. A value is a string, a
  number or a boolean. A `Content-Type` header replaces the default type.
  The runtime drops, and counts in its log (names and values are not
  logged), a header whose name is not an HTTP token, whose value has CR, LF
  or NUL or is not a scalar, and every `Content-Length` and
  `Transfer-Encoding`: the runtime frames the body itself.
* `body` is sent as JSON, with `content-type: application/json` unless
  `headers` gives another type.
* `binary: { data, mimeType?, fileName? }` (Respond to Webhook in binary
  mode) replaces `body`. `data` is the base64 text of n8n's in-memory
  binary form, that is, the `data` member of one property of an item's
  `$binary`. The runtime sends the decoded bytes. The content type is the
  one in `headers`, else `mimeType`, else `application/octet-stream`.
  `fileName` is accepted but not sent. Data that is not base64 gives status
  500. The SDK type `RespondCall` does not have `binary` yet.

### 9.2 Events

```json
{ "type": "started",  "executionId": s, "workflowId": s, "versionId": s, "mode": "manual" | "trigger", "trigger": <value>, "at": ms }
{ "type": "step",     "executionId": s, "step": name, "status": "started" | "completed" | "failed" | "retrying", "args": <value>?, "result": <value>?, "error": s?, "at": ms }
{ "type": "trace",    "executionId": s, "step": name, "items": <value>, "at": ms }
{ "type": "waiting",  "executionId": s, "step": name, "resumeUrl": s?, "signature": s?, "waitTill": ms?, "at": ms }
{ "type": "finished", "executionId": s, "status": "ok" | "error" | "needs_attention" | "limit" | "cancelled", "result": <value>?, "step": name?, "at": ms }
{ "type": "dropped",  "count": n, "at": ms }
```

* `step` events come for each effect: `started` (with `args`), then
  `completed` (with `result`), `failed` (with `error`, the message) or
  `retrying`. `respond` effects have `started` (with `args`) and
  `completed` at once. A `wait` gives a `waiting` event with `waitTill`
  instead.
* `step` events go out for an execution that someone watches: it has
  `trace: true`, or the workflow PUT had `saveData: true`. Other executions
  send only `started` and `finished`, plus `step` events with `failed` and
  `waiting` events. `wfrt serve --step-events-sample N` also sends all `step`
  events of 1 in N other executions (default 0: none), as sampled history.
  The choice depends on the execution id only.
* `args`, `result` and `error` are sent only when the execution has
  `trace: true` or the workflow PUT had `saveData: true`.
* `trace` events come only from executions with `trace: true` (9.3).
* An approval gives `waiting` with `signature` and `resumeUrl`
  `/resume/<executionId>/<effectSeq>?signature=<signature>` (the public
  port). n8n resumes it with
  `POST /_admin/resume/<executionId>/<effectSeq>?signature=<signature>`.
* `finished` with `needs_attention` has `step`: an effect failed outside a
  try block. A `step` event with `status: "failed"` and the `error` comes
  first. The execution stays parked and keeps its workflow version loaded
  until it ends.
* A `finished` event can come twice after a crash (section 4 of the PoC
  report): n8n writes history by execution id, so a repeat does no harm.

Events are written in the order the core makes them: for one execution,
`started` comes first and `finished` last. While no client reads the stream,
`wfrt` keeps the events in a queue bounded by `--event-queue-mb` (64 MB) and
1,048,576 lines. When it is full, the oldest `step` and `trace` events are
dropped first; `started` and `finished` are dropped only when they alone
fill four times the bound. The next client first gets a `dropped` event
with the count. The queue is in memory: events not sent before a crash are
lost.

### 9.3 `ctx.trace`

`ctx.trace(name: string, items: unknown): void` is a glue-only call. It does
not suspend and is not an effect. When the execution has `trace: true`, the
runtime emits a `trace` event with a copy of `items`. Otherwise it does
nothing. It is not logged. The compiler lowers it to `TRACE` (3.5); the
differential fixtures test it with `"trace": true` (section 6). The converter emits one `ctx.trace` for each core
node that becomes code (IF, Set, Merge…), so the canvas shows the output
items of every node, not only of steps.

Converted workflows call it as `ctx.trace('<node name>', items)`. For a node
with one output, `items` is its item list. For a node with several outputs
(IF, Switch, Filter with the discarded output, Loop Over Items), `items` has
one item list for each output, as v1 `data.main`
(`[[...true items], [...false items]]` for IF). A node that runs more than
once (a loop, or one run for each parent) calls it once for each run, in run
order. Nodes of a sub-workflow have the name `<workflow> / <node>`. The
converter option `trace` sets which nodes call it: `core` (the default) skips
the nodes whose output is the result of one `ctx.node` or `ctx.code` step;
`all` traces every node; `none` traces nothing.

### 9.4 Waits that n8n resumes

The converter writes Wait (resume on a webhook call or a form), Form pages and
the "send and wait" operations of message nodes as `ctx.approval({ name,
message, via, timeout? })`. `via` is `webhook`, `form`, or the node type
without its package (`slack`, `gmail`, `telegram`, `chat`, …). `timeout` is
the time limit of the node in ms. The runtime parks the execution and emits a
`waiting` event. n8n maps the event to its `/webhook-waiting/<executionId>`
(and form) URL and resumes the effect with
`POST /_admin/resume/<executionId>/<effectSeq>`. The resume value is the raw
JSON body of the request that resumed the wait. The generated helper
`resumeItem` turns it into the item that the v1 node gives:

| Node | Resume value | Node output |
|---|---|---|
| Wait, webhook | the request body, or a request object `{ headers, query, body, params? }` | `[{ headers, params, query, body }]`; a plain body gets `{}` for the other members |
| Wait, form; Form page; Chat send and wait | the submitted fields (Chat: the chat item) | `[value]` |
| Other send and wait | `{ approved, data? }`; `data` is the `data` member of the v1 output (`{ approved }`, `{ text }`, form fields) | `[{ data }]`, else `[{ data: { approved } }]` |

A value `{ approved, data }` with only these keys gives `data` (the envelope
of the approval API). The value `{ "approved": false }` alone means that the
time limit ended the wait: Wait and Form then give their input items. n8n
sends the message of a send-and-wait node when the approval has no `node`.

**Send and wait.** `ctx.approval({ ..., node: { type, typeVersion?,
parameters?, credential? } })` sends the message itself. When the runtime
dispatches the approval, it first sends `node` to the fallback host as a
host step: a frame `{ id: "<exec>:<seq>:send", kind: "node", step, key,
args: <node>, credential?, credentials?, execution }`. `execution` is
`{ id, mode, resumeUrl, resumeFormUrl }`, as `ctx.execution()` gives it, so
the host can put the resume URL in the message. The execution waits for the
resume in any case; the host's result is not used. When the host answers
with an error, or no host is connected, the approval step fails with that
error, like any other step (retry, try block, or `needs_attention`). After a
crash, an approval in doubt is sent again, with the same `key`.

**Signature.** A resume URL is not guessable: each execution has a
signature, and every resume (admin or public, with or without the effect
seq) must give it as the query parameter `signature`. A missing or wrong
signature gets 403; the compare takes constant time. The signature is 32
lower-case hex characters (128 bits): the first 16 bytes of
`HMAC-SHA256(key, executionId as u64 little-endian)`. The key is 32 bytes
from the operating system's CSPRNG. `wfrt` makes it once and gives it to the
core as a logged `secret` event, so after a restart the same execution has
the same signature. The log holds the key; no signature is logged. One
signature serves all the waits of an execution, because `ctx.execution()`
must give the URL before the execution knows which wait comes next.
Fixture runs have no key and no signature.

**Resume token.** n8n does not need the effect seq: `resumeUrl` of
`ctx.execution()` is `<base>/<executionId>?signature=<signature>`, and
`POST /_admin/resume/<executionId>?signature=<signature>` (or
`/resume/<executionId>?…` on the public port) resumes the one approval that
the execution waits for. A waiting execution has one approval at a time
unless the workflow waits in parallel branches (`Promise.all`); then n8n
uses the `effectSeq` form.

### 9.5 Execution data in the context

Expressions read `$execution.id`, `.mode`, `.resumeUrl`, `.resumeFormUrl` and
`$vars`. Two glue-only calls give them; they do not suspend and are not
logged:

```ts
ctx.execution(): { id: string; mode: 'test' | 'production'; resumeUrl: string; resumeFormUrl: string }
ctx.vars(): Record<string, string>
```

* `id` is the id on the admin API: the n8n id of a manual run, `wfrt-<n>`
  for a trigger run.
* `mode` is n8n's `$execution.mode`: `test` for a manual run, else
  `production`.
* `resumeUrl` is `<resumeUrlBase>/<id>?signature=<signature>` and
  `resumeFormUrl` is `<resumeFormUrlBase>/<id>?signature=<signature>`
  (9.4; without a key, as in fixture runs, there is no query). n8n gives the bases in
  `PUT /_admin/workflows` (for example `https://host/webhook-waiting` and
  `https://host/form-waiting`). The defaults are `/resume` and the resume
  base, which is the resume token on the public port. n8n maps a call of
  its URL to `POST /_admin/resume/<id>` (9.4).
* `ctx.vars()` gives a new object each time, from the variables of the last
  `PUT /_admin/variables` before the execution started. They are captured at
  the start, and the PUT is a logged event, so a replay gives the same
  values. An execution of a module that never calls `ctx.vars()` captures
  nothing.

`$execution.customData` and `$env` are not built: the converter can still
read them from a fallback host step.

### 9.7 Workflow static data

n8n keeps one JSON document for each workflow in `workflow.staticData`:
`{ "global": {...}, "node:<node name>": {...} }`. Poll triggers keep their
cursor there (the last time or id that they saw), and Code nodes use
`$getWorkflowStaticData` for deduplication. The runtime keeps the same
document and the same rules.

```ts
ctx.staticData(type: 'global' | 'node', node?: string): Record<string, unknown>
```

* `ctx.staticData('global')` and `ctx.staticData('node', name)` give the
  objects of `$getWorkflowStaticData('global')` and of a node's
  `$getWorkflowStaticData('node')`. The call is glue. It creates an empty
  object for a key that is not there, as n8n does, and gives the same object
  each time.
* Another type, or `node` without a name, throws an `Error`:
  ``Unknown context type. Only `global` and `node` are supported.`` and
  `The node name is missing for static data of type "node"`.

**Snapshot and commit.** An execution captures the document of its
workflow when it starts. Steps change a working copy. When the execution
ends with `ok` or `error`, and the working copy is different from the
document at the start, the execution commits the working copy. The last
writer wins: two executions that overlap both commit, in the order that
they end. This is the v1 rule: v1 saves the static data in
`workflowExecuteAfter` for successful and failed runs, and not for
cancelled runs. The runtime does not keep the changes of these runs:

* manual runs (`POST /_admin/executions`), as in v1;
* cancelled runs, and runs that end with `limit` or `needs_attention`.

A run that waits commits only when it ends. v1 also saves at the wait.
After a long wait, the commit can therefore replace changes that other runs
made during the wait.

**Durability.** Commits apply at the end of the batch, in order. Each one
goes out as a `static_data` action, and the shell writes it to the log as a
`static_data` event (the workflow id, a newline, the document) in the same
record as the batch. A replay applies the logged commits at the end of the
same batch, and ignores the commits of the executions that it runs again.
Executions of the `none` tier are not replayed, so their commits come from
the log too.

**Storage and limits.** Each shard has a table with one entry for each
workflow that has static data, and a fixed capacity for each document.
Both are reserved at startup:

* `--max-static-data N` (default 1,024): workflows with static data;
* `--static-data-kb K` (default 64): the largest document, in KB.

A `PUT /_admin/workflows` with a document that is too large fails with 413.
A PUT with a new workflow when the table is full fails with 507. A commit
that does not fit is not kept: the run ends as it would, and the event
stream gets `{"type":"staticDataRejected","message":...}` with a message
that names the flag.

**One owner per workflow.** The table belongs to one shard, and the admin
API needs one shard per process (9.1). When n8n runs several `wfrt`
processes, each workflow has one owner process: only the owner loads the
workflow, and n8n forwards the workflow's webhooks and runs to the owner's
port. A request that reaches another process gets 404, so a misrouted run
fails instead of starting from another copy of the static data. The owner
is a stable function of the workflow id (a hash modulo the process count).
When the count changes, n8n moves a workflow with an unload from the old
owner (`DELETE`) and a load on the new one with n8n's copy (`PUT` with
`staticData`).

Two other designs were rejected:

* A shared port (SO_REUSEPORT) with the workflow on every process splits
  the static data: each process counts its own runs.
  `bench/cloud/synth/static-owner-test.ts --shared` shows this.
* One process that owns the static data for all the others would need a
  round trip for each run start and each commit, with a lock across
  processes. That costs latency on every run and is a new failure mode.

Routing by owner costs nothing at run time, and each document keeps a
single writer.

**n8n integration.**

* `PUT /_admin/workflows/<id>` takes `staticData`, n8n's copy, which
  replaces the shard's document. Without it, the shard keeps its own copy.
  `{}` or `null` clears it.
* `DELETE /_admin/workflows/<id>` drops the document. n8n keeps its copy and
  sends it again with the next PUT.
* Each commit goes out on the event stream as
  `{"type":"staticData","workflowId":"<id>","staticData":{...}}`. n8n stores
  it in `workflow.staticData` (`WorkflowStaticDataService.saveStaticDataById`),
  so a switch back to v1 keeps it.
* `GET /_admin/workflows/<id>/static-data` gives the current document (`{}`
  when there is none). n8n reads it after a gap in the event stream.

**Host steps.** A `ctx.node` or `ctx.code` call with `staticData: true`
gets the working copy in its frame as `args.$staticData`. In the host, n8n
nodes read it through `this.getWorkflowStaticData` (the host runs each step
with its own document, `static-data.ts`), and Code steps read it through
`$getWorkflowStaticData`. When the step changed it, the reply has
`"staticData": {...}`, and the document replaces the working copy. An
object from an earlier `ctx.staticData` call is then out of date: call
`ctx.staticData` again after such a step. The converter adds
`staticData: true` to poll steps and to Code steps whose code calls
`$getWorkflowStaticData`.

**Fixtures.** A fixture can give `staticData`, the document at the start.
The output then has `staticData`, the document at the end (section 6).

### 9.8 Native polling (design, not built yet)

Today a production workflow with a poll trigger does not convert: the
converter puts a stand-in webhook in place of the trigger (`unsupported-trigger`),
so n8n keeps such workflows on v1. Gym and manual runs poll once in the
host (`poll: true`, now with `staticData: true`). Native polling needs
three parts, in this order:

1. **Poll triggers in META.** A trigger `{ kind: 'poll', schedules: [...] }`
   with the `pollTimes` of the node as cron specs (the converter maps them
   as it maps the Cron node). The core fires it as a schedule (section 8).
2. **Runs that find nothing leave no execution.** v1 starts no execution
   when `poll` returns `null`. The run of a poll trigger starts quiet: the
   core holds back its `started` event and its step events until the poll
   phase ends. `ctx.skip()` (glue) then ends the run with the status
   `skipped`: no reply, no event on the stream, nothing for n8n to record.
   The static data commit still applies (v1 saves the cursor after an empty
   poll too). Any other end, or a step after the poll phase, sends the held
   `started` event first.
3. **Library polls.** A library function for each trigger reads and moves
   the cursor in `ctx.staticData('node', <trigger name>)` with the rules of
   the v1 node, and uses the library `getAll` requests:
   * Gmail Trigger: `lastTimeChecked`, `lastTimeCheckedIsBounded` and
     `possibleDuplicates`, the `after:` query, and the version branches of
     `GmailTrigger.node.ts` (1.0 to 1.4).
   * Google Sheets Trigger, `rowAdded` only: `lastIndexChecked` over the
     values of the sheet. `rowUpdate` and `anyUpdate` compare two Drive
     revisions exported as XLSX, so they stay in the host.

Each library poll needs request-equivalence cases against v1, with the
static data before and after, as for the other library nodes.

### 9.9 Service calls (`ctx.service`)

Some nodes use stores that n8n owns: the data tables of a project, and the
deduplication store (Remove Duplicates, "seen in previous executions"). The
runtime does not copy these stores. A `service` effect (kind 6) asks the
admin client, which is n8n, or the engine-test adapter in the test bed:

```ts
await ctx.service({ name, service: 'dataTable', op: 'getManyRowsAndCount', args: { dataTableId, options } })
// in a library node: await ctx.service({ service, op, args })
```

* **Services.**
  * `dataTable`: `op` and `args` are the `kind` and the other fields of the
    engine v2 data-table call (`packages/cli/src/modules/engine-v2/engine-data-tables.contract.ts`):
    `getManyAndCount` (`options`), `getColumns`, `getManyRowsAndCount`
    (`options`), `insertRows` (`rows`, `returnType`), `updateRows`,
    `upsertRow`, `deleteRows` (`options`), with `dataTableId`. Dates are ISO
    text. The result is the JSON of the service's return value.
  * `deduplication`: `op` is a call of n8n-workflow's `IDataDeduplicator`:
    `checkProcessedAndRecord` (gives `{ new, processed }`),
    `removeProcessed`, `clearAllProcessedItems`, `getProcessedDataCount`
    (gives a number). `args` has `items` (for the first two), `scope`
    (`node` or `workflow`), `node: { id }` for the scope `node`, and
    `options: { mode, maxEntries? }` (`entries`, `latestIncrementalKey`,
    `latestDate`). The backend runs the call for the workflow of the
    execution, never for a workflow that the args name. The backends:
    n8n's `DeduplicationHelper` on `processed_data`, and the fallback
    host's file store in the test bed (`runDeduplicationCall`).
* **No secrets.** Arguments and results are workflow data. `wfrt` adds no
  credentials.

**Wire format.**

1. The effect starts: `wfrt` keeps the call and sends an event. It is never
   sampled out, and the queue drops it only as it drops `started` and
   `finished` lines:

   ```json
   { "type": "service", "executionId": s, "workflowId": s, "step": name,
     "callId": "<executionId>:<effectSeq>", "attempt": n, "service": s, "op": s, "args": <value>, "at": ms }
   ```

   `attempt` counts the retries of the step (its `retry` policy). A retry is
   a new call with the same `callId`.
2. The client answers on the admin port:

   ```
   POST /_admin/services/<callId>
   { "ok": true, "result": <value> }
   { "ok": false, "error": { "message": s, "description": s? } }
   ```

   `wfrt` replies `200 {"ok":true}`, `404` when it waits for no such call
   (answered already, timed out, or the execution ended), `400` for a bad
   id or body, `503` when the batch memory is full. A failed call fails the
   effect with the message, as a failed `http` effect does, so the step's
   retry, try blocks and "continue on fail" see it.
3. A call without an answer after `--service-timeout-ms` (default 300,000)
   fails with `service: the call timed out (--service-timeout-ms)`.
4. Each new client of `GET /_admin/events` gets the `service` events of the
   calls that wait. A client can therefore get a call twice: it answers by
   `callId` and `attempt`, and runs each pair once (n8n keeps its answers for
   10 minutes; the engine-test adapter for the life of the engine).

**Durability.** The result is logged like an `http` result, so a replay
gives the logged result and does not call the service again. After a crash,
a call that was in flight has no answer in the log:

* a call whose `op` only reads (`getColumns`, `getManyRowsAndCount`,
  `getManyAndCount`, `getProjectId`, `getProcessedDataCount`) is sent again
  with a new `attempt`;
* any other call is not sent again: the execution ends with
  `needs_attention` on the step, as a non-idempotent `http` effect does, so
  an operator decides. A write that the client ran before the crash is not
  run twice.

**Limits.**

* `--max-service-calls` (default 256) calls can wait at one time. The table
  and, for each entry, the room for its event line (`--service-call-kb`,
  default 1,024) are reserved at startup. A call when the table is full
  fails with `service: too many calls wait for an answer
  (--max-service-calls); the step can run again (retryable)`; a call whose
  event line is larger than the room fails with `service: the call is larger
  than --service-call-kb (limit)`.
* Service calls need the admin API, and the admin API needs one shard
  (`--admin-port` with `--shards 1`). The answer goes to the process whose
  event stream sent the call: n8n starts one `wfrt` process for each shard,
  each with its own admin port and stream. Without `--admin-port`, a
  service call fails with `service: calls need the admin API (--admin-port)
  (limit)`.

**Calls from the fallback host.** Remove Duplicates
runs in the host, which hashes the items. For it to reach n8n's
`processed_data`, a host step sends a frame
`{ "type": "service", "id": "<frame id>", "service", "op", "args" }` on its
connection while it runs. `wfrt` keeps it in the same table, sends the
`service` event with `callId` `<executionId>:<effectSeq>.<n>` (`n` counts
the calls of the step), and gives the answer back to the host as
`{ "type": "serviceResult", "id", "n", "ok", "result" | "error" }`. These
calls are not logged: a host step that runs again calls again, as v1 does.
The calls need a connection of protocol version 2. The host's
`DataDeduplicationService` makes `checkProcessedAndRecord`,
`removeProcessed`, `clearAllProcessedItems` and `getProcessedDataCount`
calls of the `deduplication` service, unless `WF_FALLBACK_DEDUPLICATION`
is `file` (the test bed's file store).

**Backends.**

* n8n: the compiled-engine dispatcher reads `service` events and answers
  `dataTable` calls with `EngineDataTablesService.call({ execution:
  { executionId, workflowId }, consumer: { nodeType: 'n8n-nodes-base.dataTable' },
  call: { kind: op, ...args } })` (`compiled-service-calls.ts`). The service
  resolves the project of the workflow and checks access, as for engine v2.
* Test bed: the engine-test adapter answers with `runDataTableCall`
  (`src/services/data-table.ts`) over the fallback host's file store
  (`WF_FALLBACK_DATA_TABLES_DIR`).

## 10. Fallback host steps (AI clusters, binary data, Python)

These are options of `ctx.node` and `ctx.code` that only the fallback host
reads (`packages/@n8n/workflow-fallback-host`). The runtime passes them on
without change.

* `ctx.node({ ..., inputs: [list0, list1] })`: one item list for each node
  input. It replaces `items`. The converter uses it for nodes with more than
  one input (Merge modes that do not compile, Compare Datasets).
* `ctx.node({ ..., outputs: 'all' })`: the result is one object `{ items }`
  for each node output, in output order. Without it, the result is output 0.
* `ctx.node({ ..., subNodes: [...] })`: the sub-nodes of an AI cluster. Each
  entry is `{ name, type, typeVersion, parameters, credential?, connection,
  target, targetIndex? }`. `connection` is the n8n connection type
  (`ai_languageModel`, `ai_tool`, ...), `target` is the root node or another
  sub-node, `targetIndex` is the input index on the target (1 for the fallback
  model of an agent). The host builds a v1 `Workflow` of the root and its
  sub-nodes and runs the root with n8n-core's `ExecuteContext`, so the root gets
  its sub-nodes through `supplyData`, as in n8n. When the root asks for tool
  calls (`EngineRequest`, Agent version 3), the host runs each tool node with
  the input that n8n's engine gives it and runs the root again with the
  results. Expressions that the host can evaluate stay n8n expressions
  (`$json`, `$fromAI(...)`, `$response` of pagination); the generated code
  evaluates the others before the call.
* Workflow tools (`toolWorkflow`, `retrieverWorkflow`) in a cluster: the
  converter embeds the callee workflow JSON in the tool parameters
  (`source: 'parameter'`, `workflowJson`). It finds the callee with
  `ConvertOptions.resolveWorkflow(id)`, or takes the workflow itself for
  `={{ $workflow.id }}`. The callee nodes name credential slots, and the
  sub-node lists them in `slots: [...]`, so the runtime sends them in the
  `credentials` map of the frame. The host runs the callee on n8n's v1 engine
  (`WorkflowExecute` of n8n-core) in its own process, not as compiled code.
* `ctx.respond({ ..., binary: { data, mimeType?, fileName? } })`: a file as
  the response body (base64 `data`). The runtime ignores `body` when `binary`
  is set. Respond to Webhook in "binary" mode sends the file of the first item
  (`$binary`).
* `ctx.node({ ..., onError: 'continueRegularOutput' })`: the n8n setting, for
  LangChain nodes that handle errors for each item.
* `ctx.code({ ..., language: 'python' })`: the code is Python. The host runs
  it in a `python3` process for each step, with the rules of n8n's Python task
  runner (`packages/@n8n/task-runner-python`): the code is the body of a
  function, the builtins that the runner denies by default are not there, and
  imports are blocked unless `WF_FALLBACK_PYTHON_STDLIB_ALLOW` or
  `WF_FALLBACK_PYTHON_EXTERNAL_ALLOW` allows them. The converter writes a
  prologue that gives `_items` ("all items") and `_item` ("each item"). The
  process is not a sandbox. This is the simplest faithful option for the proof
  of concept: n8n's runner needs a broker and a task runner process.
* JavaScript code steps get what n8n's Code node gives: Luxon (`DateTime`,
  `Duration`, `Interval`, `$now`, `$today`), `Buffer`, `this.helpers`
  (`prepareBinaryData`, `getBinaryDataBuffer`, `binaryToString`) and `require`
  of the modules in `WF_FALLBACK_CODE_ALLOW_MODULES` (n8n allows none by
  default; the error text is n8n's).

Native Code nodes. The converter writes a JavaScript Code, Function or
Function Item node as subset code when its code fits
(`src/convert/code-native/`), and as a `ctx.code` step otherwise, with the
info diagnostic `code-host` that names the blocking construct. The native
form gives the items that the host step gives: it copies the input lists as
JSON, wraps the items as `{ json }`, and turns the result into items with the
rules of the host (`items.ts`). `ConvertOptions.codeNodes: 'host'`,
`ConvertOptions.hostCodeNodes` and a `// @n8n-host` comment in the code keep
the host step. `docs/code-node-coverage.md` gives the coverage.

Native Code nodes format dates and numbers with locales through
`src/convert/code-native/locale-data.generated.ts`: specs for the method,
locale and options combinations that workflows use most, which
`scripts/locale-data.ts` derives from the ICU data of Node.js and keeps only
when they give Node.js's text for hundreds of sample dates and numbers. A
combination outside the table, a computed locale or options, or a computed
time zone keeps the host step. A literal time zone goes to the workflow
option `zones` (section 4.5). They also run a subset of Luxon
(`luxon-helpers.ts`): `$now`, `$today`, `DateTime.now`, `fromISO`,
`fromMillis`, `fromSeconds`, `fromJSDate`, `fromObject`, `utc`, `toFormat`
with common tokens, `toISO`, `setZone` with a literal zone, `startOf`,
`endOf`, `plus`, `minus`, `set`, `diff` with literal units (and the
Duration getters, `as`, `toMillis` and `toObject`) and the getters. The
default zone of Luxon is the workflow time zone, as in v1:
`settings.timezone`, else the converter option `timezone` (n8n passes
`GENERIC_TIMEZONE`), else America/New_York. The zone goes to META `zones`.

A native Code node may read the error of a `catch` block when every
operation of its `try` block throws only V8's errors
(`src/convert/code-native/catch-check.ts`). For a method call on a value of
unknown kind, the translation first checks that the value has the method
(`mcheck`) and throws V8's "x.m is not a function" with the callee text that
V8 prints. `String(e)`, `` `${e}` `` and `'…' + e` give V8's
`Error.prototype.toString`. Calls of unknown functions, destructuring,
`await`, `in`, `delete`, `new` of other classes, the error's `stack` and the
error as a value keep the host step. Also native: `Math.imul`,
`$item(k).$node[name].json` (with v1's errors), `Date()` without `new`,
object literals with a repeated key (the first position, the last value) and
a Date that a setter changes, passed to a local function that only reads it.

Parameter expressions use the same Luxon subset
(`src/convert/code-native/luxon-expression.ts`). The pass follows the kind of
each value and rewrites a method or a getter only on a value that it knows is
a DateTime or a Duration. An expression that gives a DateTime or a Duration,
or that passes one to another function, keeps the host. `$now`, `$today` and
`DateTime.now()` read the batch clock (`ctx.now()`): a replay gives the same
value, and all nodes of one batch see the same `$now`. In v1, each
evaluation reads the clock again, so values can differ by milliseconds
between nodes.

Binary data. An item with binary data carries it in the key `$binary` of its
JSON object, in n8n's in-memory form: `{ "<property>": { data: <base64>,
mimeType, fileName?, fileExtension?, fileSize?, bytes? } }`. Compiled code
passes the key on like any other key; the host moves it to the n8n item's
`binary` and back. Limits: one host frame is at most 64 MiB, and the base64
text of all binary data in one step result is at most
`WF_FALLBACK_MAX_BINARY_BYTES` (32 MiB by default, about 24 MiB of file
data). Differences from v1: `$json` and `Object.keys($json)` show `$binary`
in compiled code, and core nodes that become code keep `$binary` where v1
can drop the binary data (Set without "include binary").

Step frames can carry the credential data, so n8n does not write credentials
to disk: `credential: { type, data }` for the slot that `args.credential`
names, and `credentials: { "<slot>": { type, data } }` for steps that name
more slots (`subNodes[].credential` and `subNodes[].slots` of an AI cluster). The host reads the frame first
and the `WF_FALLBACK_CREDENTIALS` file after it. The host signs requests with
the `authenticate` rule of the credential type, as n8n does.

### 9.6 Expressions that run in the fallback host

When an expression of a node does not compile (Luxon, regular expressions,
locale options, `$(…)` with a computed name, `$evaluateExpression`, …), the
converter runs the node whole in the fallback host with its v1 parameters as
they are, and n8n's expression engine evaluates them there. The `ctx.node`
call has `host: 'fallback'` and the option `runData`:

```ts
runData: {
  nodes: [{ name, type, typeVersion, parameters }],      // nodes that the expressions may read
  connections: [[from, output, to, input]],              // between them and the step node
  runs: { '<node name>': [[[...items of output 0], [...output 1]]] },  // runs, then outputs
}
```

The converter sends the nodes that the parameters name and the nodes before
the step node; for a computed name or `$evaluateExpression`, every node that
has run. Each node gives its latest run. The host seeds these outputs into the
run data of the v1 execution context. Items carry no lineage: an item pairs
with the item at the same position of its parent, except Merge in "append"
mode, whose lineage the host derives from the lengths of its inputs.
Diagnostic `host-expression` (warning) marks such a node.

