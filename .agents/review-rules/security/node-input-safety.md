# Node input safety

Applies to: `packages/nodes-base`, `packages/@n8n/nodes-langchain`. Skip this
file for other packages.

## Prototype pollution via node parameters

ESLint does not cover this — `no-prototype-builtins` is only a warning in these
packages, and `pnpm lint` runs with `--quiet`.

Flag NEW code where a value tracing back to `this.getNodeParameter(...)` —
directly or through a variable, a callback param, or a helper — is used as a
computed key to BUILD A NESTED OR CONTAINER STRUCTURE on a plain object
(`IDataObject` or object literal, not a `Map` or `Object.create(null)`):

1. Container creation: `obj[key] = {}` or `obj[key] = []`
2. Nested write where the untrusted value is a key: `obj[k1][k2] = value`
3. The same via `obj[key] ??= {}` / `obj[key] ||= []`

That shape is what pollutes `Object.prototype`, usually through a shared
accumulator. A deep merge of user options into a config object is the same
defect.

Do NOT flag:

- Reads: `const x = obj[key]`, `if (obj[key] === undefined)` — reads don't pollute
- Single-level writes of a concrete (non-object) value, e.g.
  `item.json[field] = value` — a primitive assigned to `__proto__` is a no-op,
  and one property on a fresh per-item object is not pollution. This is the
  common, benign case in nodes; flagging it is noise
- Keys that are string/number literals, or validated by `isSafeObjectProperty(key)`
- Writes routed through `setSafeObjectProperty(...)`

Use `setSafeObjectProperty` / `isSafeObjectProperty` from `n8n-workflow`, or a
`Map`. Guard with `String(key)`, never `typeof key === 'string'` — an array
passes that check and coerces to its element as a key.

## Injection through node parameters

Flag NEW code where a parameter reaches a sink without escaping:

- SQL values concatenated or expression-interpolated instead of bound. An
  expression is interpolation, not parameterisation
- SQL identifiers — table, column, `ORDER BY`, a cast suffix after `name:`.
  They cannot be bound, so they need an allowlist; numeric fields a numeric cast
- A SQL dialect that reaches JavaScript (AlaSQL in the Merge node) gaining a new
  construct that can call a function
- Command execution with unsanitized shell arguments
