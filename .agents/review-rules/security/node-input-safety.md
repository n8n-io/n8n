# Node input safety

Applies to: `packages/nodes-base`, `packages/@n8n/nodes-langchain`. Skip this
file for other packages.

Node code receives workflow-author-controlled input, mainly via
`this.getNodeParameter(...)` and incoming `item.json` keys.

## Prototype pollution via node parameters

A value derived from user-controlled input must never be used as a computed
object key in an **assignment** to a plain object. A workflow author can set it
to `__proto__`, `constructor`, or `prototype`, polluting the prototype chain.

ESLint does not cover this — `no-prototype-builtins` is only a warning in these
packages, and `pnpm lint` runs with `--quiet`.

Flag NEW code where a value tracing back to `this.getNodeParameter(...)`
(directly, via a variable, via a `.map`/`.reduce`/`.forEach` callback param, or
via a `getNodeParam` function passed into a helper such as `createTableStruct`)
is used as a computed key to BUILD A NESTED OR CONTAINER STRUCTURE on a plain
object (an `IDataObject` or object literal — not a `Map`, not
`Object.create(null)`):

1. Container creation: `obj[key] = {}` or `obj[key] = []`
2. Nested write where the untrusted value is a key: `obj[k1][k2] = value`
3. The same via `obj[key] ??= {}` / `obj[key] ||= []`

This nested/container shape is what actually pollutes `Object.prototype` — the
dangerous pattern is typically a shared accumulator.

Do NOT flag:

- Reads: `const x = obj[key]`, `if (obj[key] === undefined)` — reads don't pollute
- Single-level writes of a concrete (non-object) value, e.g.
  `item.json[field] = value`, `item.binary[prop] = data`, `body[target] = value`.
  Assigning a primitive to `__proto__` is a no-op, and setting one property on a
  fresh per-item object is not prototype pollution. This is the overwhelmingly
  common, benign case in nodes — flagging it is noise.
- Keys that are string/number literals, or validated by `isSafeObjectProperty(key)`
- Writes routed through `setSafeObjectProperty(...)`
- Targets that are a `Map` or created with `Object.create(null)`

Violation:

```typescript
const table = this.getNodeParameter('table', i) as string;
const key = this.getNodeParameter('deleteKey', i) as string;
if (acc[table] === undefined) acc[table] = {}; // acc['__proto__'] = {}
if (acc[table][key] === undefined) acc[table][key] = [];
```

Allowed:

```typescript
import { setSafeObjectProperty, isSafeObjectProperty } from 'n8n-workflow';

if (isSafeObjectProperty(table) && acc[table] === undefined) {
  setSafeObjectProperty(acc, table, {});
}
// or: const acc = new Map<string, ...>();
```

Prefer `setSafeObjectProperty` / `isSafeObjectProperty` from `n8n-workflow`. See
`nodes/Google/GSuiteAdmin/GSuiteAdmin.node.ts` and
`nodes/HttpRequest/V3/HttpRequestV3.node.ts` for reference usage.

## Injection through node parameters

Flag NEW code where a node parameter reaches a sink without escaping or
parameterisation:

- SQL query fields built by string concatenation or expression interpolation
  instead of bound parameters
- Command execution with unsanitized shell arguments
- File operations where a parameter reaches a path without traversal checks
- Community package names accepted without validation
