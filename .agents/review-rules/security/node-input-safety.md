# Node input safety

Applies to: `packages/nodes-base`, `packages/@n8n/nodes-langchain`. Skip this
file for other packages.

## Prototype pollution via node parameters

ESLint does not cover this: `no-prototype-builtins` is only a warning here and `pnpm lint` runs with `--quiet`.

Flag NEW code where a value from `this.getNodeParameter(...)` — directly or via a variable, a callback param, or a helper — is a computed key BUILDING A NESTED OR CONTAINER STRUCTURE on a plain object (`IDataObject` or object literal, not a `Map` or `Object.create(null)`):

1. Container creation: `obj[key] = {}` or `obj[key] = []`
2. Nested write where the untrusted value is a key: `obj[k1][k2] = value`
3. The same via `obj[key] ??= {}` / `obj[key] ||= []`

The carrier is usually a shared accumulator; a deep merge of user options into a config object is the same defect.

Do NOT flag:

- Reads: `const x = obj[key]`, `if (obj[key] === undefined)` — reads don't pollute
- Single-level writes of a concrete (non-object) value, e.g. `item.json[field] = value` — a primitive assigned to `__proto__` is a no-op. This is the common, benign case in nodes; flagging it is noise
- Keys that are literals, or validated by `isSafeObjectProperty(key)`
- Writes routed through `setSafeObjectProperty(...)`

Use `setSafeObjectProperty` / `isSafeObjectProperty` from `n8n-workflow`, or a `Map`, and coerce with `String(key)` before any check.

## Injection through node parameters

Flag NEW code where a parameter reaches a sink without escaping:

- SQL values concatenated or expression-interpolated instead of bound. An expression is interpolation, not parameterisation
- SQL identifiers — table, column, `ORDER BY`, a cast suffix after `name:`. They cannot be bound, so they need an allowlist; numeric fields a numeric cast
- A SQL dialect reaching JavaScript (AlaSQL in the Merge node) gaining a new construct that can call a function
- Command execution with unsanitized shell arguments
