# Prototype Pollution via Node Parameters

- Rule Statement:
In node code, a value derived from user-controlled input must never be
used as a computed object key in an **assignment** to a plain object.
User input reaches nodes mainly via `this.getNodeParameter(...)` (and
incoming `item.json` keys), and a workflow author can set such a value
to `__proto__`, `constructor`, or `prototype`, polluting the prototype
chain (denial of service, and worse depending on the sink).

Use `setSafeObjectProperty(target, key, value)` /
`isSafeObjectProperty(key)` from `n8n-workflow`, a `Map`, or a
null-prototype object (`Object.create(null)`) instead.

- Detection Criteria:
Flag NEW code in `packages/nodes-base/**` or
`packages/@n8n/nodes-langchain/**` when a value that traces back to
`this.getNodeParameter(...)` (directly, via a variable, via a
`.map`/`.reduce`/`.forEach` callback param, or via a `getNodeParam`
function passed into a helper such as `createTableStruct`) is used as a
computed key to BUILD A NESTED OR CONTAINER STRUCTURE on a plain object
(an `IDataObject` / object literal — not a `Map`, not `Object.create(null)`):
  1. Container creation: `obj[key] = {}` or `obj[key] = []`
  2. Nested write where the untrusted value is a key: `obj[k1][k2] = value`
  3. The same via `obj[key] ??= {}` / `obj[key] ||= []`
This nested/container shape is what actually pollutes `Object.prototype`
(typically the dangerous pattern is building a shared accumulator, e.g.
`if (acc[table] === undefined) acc[table] = {}` then `acc[table][key] = []`).

- Do NOT flag:
  - Reads: `const x = obj[key]`, `if (obj[key] === undefined)`
    (reads alone do not pollute)
  - Single-level writes of a concrete (non-object) value, e.g.
    `item.json[field] = value`, `item.binary[prop] = data`,
    `body[target] = value`. Assigning a primitive to `__proto__` is a
    no-op, and setting one property on a fresh per-item object is not
    prototype pollution. This is the overwhelmingly common, benign case
    in nodes — flagging it is noise.
  - Keys that are string/number literals, or are validated by
    `isSafeObjectProperty(key)` before the write
  - Writes routed through `setSafeObjectProperty(...)`
  - Targets that are a `Map` or created with `Object.create(null)`
  - Existing unchanged code (review only new or modified lines)

- Example Violation:
  ```typescript
  const table = this.getNodeParameter('table', i) as string;
  const key = this.getNodeParameter('deleteKey', i) as string;
  if (acc[table] === undefined) acc[table] = {}; // acc['__proto__'] = {}
  if (acc[table][key] === undefined) acc[table][key] = [];
  ```

- Example Allowed:
  ```typescript
  import { setSafeObjectProperty, isSafeObjectProperty } from 'n8n-workflow';

  if (isSafeObjectProperty(table) && acc[table] === undefined) {
    setSafeObjectProperty(acc, table, {});
  }
  // or: const acc = new Map<string, ...>();
  ```

- Recommendation:
Prefer `setSafeObjectProperty` / `isSafeObjectProperty` from
`n8n-workflow`. See `nodes/Google/GSuiteAdmin/GSuiteAdmin.node.ts` and
`nodes/HttpRequest/V3/HttpRequestV3.node.ts` for reference usage.
