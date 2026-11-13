# Native Code nodes: coverage

This file records which JavaScript Code, Function and Function Item nodes
run natively in the compiled engine (`src/convert/code-native/`), and why
the others stay in the fallback host. It holds aggregates only. It holds no
code from the data.

`scripts/code-node-coverage.ts` makes the tables from JSON Lines extracts of
code nodes. `scripts/code-node-equivalence.ts` runs each native node in the
bytecode VM, in `wfrt run` and in the fallback host, and compares the
results.

## Data

| Sample | What it is | Weight |
|---|---|---|
| Corpus | 147,671 real workflows (pseudonymised), 466,769 code nodes, 410,251 distinct codes | node count; a weighted random sample of 30,000 nodes |
| Set 1000 | 1,000 workflows with a reference n8n run, 2,269 code nodes | runs in the reference run (832 runs) |

Code nodes are 18.8% of all nodes in the corpus. 99.8% are JavaScript (0.2%
Python). 92% run once for all items, 8% once for each item. The median code
has about 1,040 characters (p75 2,360, p90 5,000).

## Features in use (corpus, by node count)

| n8n global | Share | | JavaScript feature | Share | | Control flow | Share |
|---|---|---|---|---|---|---|---|
| `$('Node')` | 40.6% | | arrow functions | 53.7% | | `for...of` | 31.0% |
| `$input.all()` | 30.3% | | regular expressions | 29.9% | | `try`/`catch` | 17.1% |
| `$input.first()` | 21.3% | | template literals | 27.3% | | `for` | 9.8% |
| `$json` | 13.7% | | `new Date()` | 27.2% | | `throw` | 9.0% |
| `items` | 7.7% | | spread | 24.8% | | catch reads the error | 3.7% |
| `$input.item` | 4.5% | | optional chaining | 20.9% | | `while`/`do` | 3.1% |
| `$getWorkflowStaticData` | 4.0% | | `JSON` | 17.4% | | `for...in` | 1.0% |
| `this.helpers` | 3.7% | | `Math` | 13.1% | | `switch` | 0.6% |
| binary data | 3.3% | | Set / Map | 11.5% | | labels | 0.0% |
| `$items()` | 2.0% | | destructuring | 8.5% | | | |
| `$now` / `$today` | 1.4% | | `toLocaleString` / `Intl` | 7.5% | | | |
| `$node` | 1.2% | | `.toString()` | 7.3% | | | |
| `$vars` | 1.1% | | `Date.now()` | 5.9% | | | |
| `$execution` | 1.0% | | `console` | 5.8% | | | |
| Luxon (`DateTime`) | 0.8% | | `async`/`await` | 3.9% | | | |
| `$workflow` | 0.3% | | `var` | 2.9% | | | |
| `$jmespath`, `$env` | 0.1% | | `Buffer` | 2.2% | | | |
| | | | `encodeURIComponent` | 2.2% | | | |
| | | | `Array.from` | 2.0% | | | |
| | | | `require` | 1.4% | | | |
| | | | `Math.random()` | 1.3% | | | |
| | | | `==` / `!=` (not null) | 0.4% | | | |
| | | | `instanceof`, `class` | 0.3% | | | |

## Native share

Before this work every Code node ran in the fallback host (0% native).

| Stage | Corpus (by count) | Set 1000 (by runs) |
|---|---|---|
| Before (all in the host) | 0% | 0% |
| Translator only: n8n globals, types, `var`, `==`, `for...in`, `console` | 45.0% | 39.1% |
| Phase 1: regular expressions, Set and Map, helpers (table below) | 72.0% | 63.3% |
| Locale formatting from a generated table | | 71.6% |
| Date values in untyped places | 76.3% | |
| `$()` forms, the rest of the regular expressions, `$vars` | | 75.6% |
| Luxon subset | 80.0% | 78.7% |
| Fixes from the equivalence runs (sloppy stores, `diff`, zones) | **80.0%** | **79.4%** |

Empty cells: the step was measured together with the next one.

The final tiers:

| Tier | Corpus (by count) | Set 1000 (by runs) |
|---|---|---|
| native | 80.0% | 79.4% |
| small (translator or helper work) | 11.8% | 13.2% |
| large (a new runtime feature) | 0.4% | 0.1% |
| host only (Node.js) | 7.8% | 7.2% |

Thus 20.6% of the Code node runs of set 1000 still run in the host. The
target of 90% needs about half of the "host only" tier, which is I/O and
binary data. The small tier is a long tail: no family in it keeps more than
1.9% of the runs alone.

"Small" means that each blocker needs a translator or helper change.
"Large" means a new runtime feature. "Host" means a construct that only
Node.js gives (`require`, `this.helpers`, binary data, `Buffer` beyond text
conversion).

## Extensions

| Extension | Where | Unlocked |
|---|---|---|
| Regular expressions: `RegExp.exec` in the runtime (spec 4.6), `test`, `exec`, `match`, `matchAll`, `search`, `replace` (also callbacks and `$n`), `replaceAll`, `split` as helpers | runtime `regex.zig`, helpers | the largest blocker: in 29.9% of nodes, the only blocker of 17.2% |
| The rest of the regular expressions: `index`, `input`, `groups` of a match, `u` with `i`, lookbehind, a computed `RegExp` checked at run time | runtime, helpers | 0.8% of runs |
| Set and Map as helpers (`collNew` and the methods), JSON writes them as `{}` | helpers | in 11.5% of nodes |
| Locale formatting: `toLocaleDateString`, `toLocaleTimeString`, `toLocaleString`, `Intl.DateTimeFormat`, `Intl.NumberFormat`, `localeCompare` for the 573 most used method, locale and option combinations | generated table `locale-data.generated.ts`, `Date.zoneOffset` in the runtime (TZif) | 8.3% of runs |
| Date values in untyped places: setters, readers and arithmetic on values that the types do not show | translator | 1.1% of nodes |
| `$()` with a computed name, `itemMatching`, `$items()` | translator | 1.5% of runs |
| `$vars` (`ctx.vars()`) | translator | 0.2% of runs |
| Luxon subset (`DateTime`, `$now`, `$today`, `diff` and Durations) | helpers `luxon-helpers.ts` | 3.4% of runs |
| `$getWorkflowStaticData` (as the host: empty for each run) | helpers | 2.5% |
| `encodeURIComponent`, `decodeURIComponent`, `encodeURI`, `decodeURI` | helpers | 0.5% |
| Function globals as values (`filter(Boolean)`, `map(Number)`) | translator | 1.4% |
| `Math.max(...a)`, `a.push(...b)`, `Object.assign(t, ...)` | helpers | 0.4% |
| `Object.fromEntries`, `Array.from`, `Number.isNaN`, `isFinite`, `String.fromCharCode`, `lastIndexOf`, `substr`, `splice`, `hasOwnProperty` | helpers | about 1% together |
| `$execution.id`/`mode`, `$workflow.id`/`name`, `$runIndex` | translator | 0.5% |
| `Buffer.from(x, enc).toString(enc)` for utf8, base64, base64url, hex | helpers | part of the 2.2% that use `Buffer` |
| Full Unicode `toUpperCase`/`toLowerCase` | runtime `unicase.zig` | correctness: the runtime mapped only Latin-1 |
| Stores on strings and numbers do nothing (sloppy mode, as n8n) | runtime, VM | correctness |

## Luxon in parameter expressions

The Luxon subset also serves parameter expressions
(`luxon-expression.ts`), with the workflow time zone as the default zone.
Of the 2,740 nodes of set 1000 that ran in the host before, 149 (5.4%) now
compile natively: HTTP Request 38, Notion 32, Google Sheets 26, Google
Calendar 15, Set 11, Gmail 10, others 17. No node moved to the host. The
test `luxon-expression.test.ts` compares 31 forms with n8n's expression
evaluator in five time zones and at three times (two near a DST change).

## Blockers that remain (final ranking)

A family unlocks a node when all its blockers are in the family. "Only
family" is the share that the family alone keeps in the host.

| Blocker family | Corpus: blocks | Corpus: only family | Set 1000: only family (runs) | Decision |
|---|---|---|---|---|
| `this.helpers`, binary data | 6.3% | 3.3% | 3.0% | leave on Node: I/O and binary data |
| catch reads the error | 3.7% | 1.8% | 1.3% | leave on Node: needs V8's error texts |
| `$('Node')` forms that are left (`$()` in loops of the engine shape, `.params`, `.context`) | 1.8% | 1.2% | 0.4% | worth doing next |
| Date values in untyped places that are left (a Date passed to a function, `Date` as a value) | 1.7% | 1.1% | 1.9% | worth doing next: Date kinds through function parameters |
| locale formatting outside the table (computed locale, options or zone) | 2.7% | 0.9% | 0.7% | worth doing next for literal combinations: grow the table; leave computed ones on Node |
| `crypto`, `Buffer` beyond text conversion, `require` | 2.1% | 0.9% | 0.2% | leave on Node |
| `String.prototype.normalize` | 1.2% | 0.7% | 0.4% | worth doing next: NFC/NFD tables generated from Node.js |
| regular expressions that are left (`\p{…}`, `s` with `u`, sticky) | 0.9% | 0.5% | 0.5% | worth doing next, small |
| `URL` | 0.4% | 0.2% | – | leave on Node |
| Luxon outside the subset (`fromFormat`, `toRelative`, `Interval`, locale formats) | 0.4% | 0.2% | 0.7% | worth doing next: `fromFormat` with common tokens |
| type error TS7053 (index of an untyped object) | 0.2% | 0.2% | 0.4% | worth doing next, small |
| `Promise`, timers | 0.6% | 0.1% | – | leave on Node |
| rest parameters, `instanceof`, prototypes, classes | about 1.5% | 0.0% | – | leave on Node (always with other blockers) |

## Equivalence

Each native Code node of set 1000 ran natively and in the fallback host
(`runCodeStep` of the built host), on synthetic items with the keys of the
reference run, in three variants (typed values, text values, missing keys).
The bundles have no item data. The clock of the host was fixed to the
fixture clock. Nodes with `Math.random()` compare by shape.

| Verdict | Nodes | Runs |
|---|---|---|
| same result | 1,522 | 616 |
| same error message | 174 | 21 |
| both fail, different message | 43 | 44 |
| results differ | 1 | 0 |
| host fails, native does not | 2 | 1 |

- "Both fail, different message": JSON.parse messages and "x.map is not a
  function" (V8 names the expression). The step fails in both.
- "Results differ" and "host fails": `$execution`, which the harness does not
  give to the host when it calls `runCodeStep` directly. The converted
  workflow gives it.
- `wfrt run` gives the same result as the bytecode VM for 1,736 of 1,742
  nodes. The 6 others are the error texts of JSON.parse.

The search found and fixed these bugs on the way: hoisted functions that
capture a block variable (compiler), array methods on values that are not
arrays (prelude), `for...of` and spread over strings and objects, null array
elements and the error texts of the VM, `Object.keys` and `Object.assign` of
a string, `Number#toString(radix)` of fractions (now V8's algorithm),
`toUpperCase`/`toLowerCase` outside Latin-1 (runtime), stores on strings
(VM), and Luxon value checks (`set`, `fromObject`, `plus`, an empty ISO
text).

## CPU per Code step

`wfrt run` of a loop of 20,000 runs of the native step in one execution,
against `runCodeStep` of the host in process (no socket). Two input items.
The machine ran other benchmarks at the same time, so these are upper
bounds.

| Node shape | Characters | Native | Host (in process) |
|---|---|---|---|
| date arithmetic | 105 | 6 µs | 694 µs |
| pass-through | 21 | 10 µs | 638 µs |
| mapping with string helpers | 1,663 | 10.5 µs | 678 µs |
| aggregation | 1,227 | 7.5 µs | 1,049 µs |
| text clean-up with regular expressions | 1,194 | 5.5 µs | 611 µs |

The native times include the JSON copy of the input and of the result.

## Known differences

- Errors: the runtime's messages for a call of a method that a value does
  not have (`value.trim is not a function`) and for JSON parse errors are not
  V8's. Code that reads a caught error stays in the host, so these texts only
  reach a failed execution.
- A failed native step ends the execution with status `error`. A failed host
  step without a try region gives `needs_attention` (spec 2).
- `$getWorkflowStaticData` starts empty for each run of the step, in the
  host and natively. n8n keeps it between production executions.
- A Date that code stores in an object or array is its ISO text from then on
  (spec 4.5). JSON output is the same.
- `Math.random()` uses the execution PRNG (`ctx.random()`), and `new Date()`
  the batch clock. Their values differ from the host by design.
- `$now` reads the batch clock: all nodes of one batch see the same value.
  In v1, each evaluation reads the clock again.
- The host step of a Code node runs Luxon in the zone of the process. v1 and
  native code use the workflow time zone.
