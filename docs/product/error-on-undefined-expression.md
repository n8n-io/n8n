# Error On Undefined Expression

`Error On Undefined Expression` is a per-node setting that fails the node when one of its
expressions has no value — instead of running the node with a missing value, or writing the text
`undefined` into your data. It is off by default, and turning it off again restores today's
behaviour exactly.

This file is the **documentation delta** for that setting: the user-facing text, ready to port to
[n8n-docs](https://github.com/n8n-io/n8n-docs), which is a separate repository. Each section names
the [Diátaxis](https://diataxis.fr) mode it serves and the page it lands on. Every example below
was executed against the code on this branch — see [Provenance](#provenance).

## Where this text lands

| Section | Mode | Target page in n8n-docs |
|---|---|---|
| [Node settings entry](#node-settings-entry) | Reference | `docs/build/understand-workflows/workflow-components/work-with-nodes.md`, the **Node settings** list |
| [Fail a node instead of sending "Hello, undefined"](#fail-a-node-instead-of-sending-hello-undefined) | How-to | New page, alongside the other node-settings how-tos |
| [What it catches](#what-it-catches) · [What it does not catch](#what-it-does-not-catch) · [Error messages](#error-messages) · [On Error and Retry On Fail](#on-error-and-retry-on-fail) | Reference | Same new page, below the how-to |
| [Release note](#release-note) | Changelog | Release notes for the release that ships this change |

---

## Node settings entry

**Mode: reference.** Add this bullet to the **Node settings** list, between **Retry On Fail** and
**On Error** — that is where the toggle sits in the node's **Settings** tab.

```markdown
* **Error On Undefined Expression**: The node fails when one of its expressions has no value, or
  when an expression turns a missing value into the text `undefined`. Off by default. It doesn't
  catch every missing value: refer to [Error On Undefined Expression](<PATH_TO_NEW_PAGE>) for what
  it catches and what it doesn't.
```

---

## Fail a node instead of sending "Hello, undefined"

**Mode: how-to.**

When an expression reads a field that isn't there, n8n doesn't treat that as an error. The node
runs anyway: an email goes out addressed to `Hello, undefined`, or an HTTP request goes out with a
dropped parameter. You find out from the person who received it.

Turn on **Error On Undefined Expression** for that node, and it fails instead.

### Before you start

- The workflow's node uses an expression to read a field that can be absent.
- You want the execution to stop or route to error handling, rather than continue with a hole in
  the data. If you'd rather substitute a default value, **Fix the expression** below covers that.

### Turn the setting on

1. Open the node.
2. Select the **Settings** tab.
3. Turn on **Error On Undefined Expression**.
4. Execute the workflow.

The node now fails when one of its expressions has no value. Nothing else about the node changes,
and no other node in the workflow is affected — the setting is per node.

### Try it

Import this workflow. **Load customer** produces a customer record with an `email` but no `name` —
the shape you get from an API whose field is optional. **Compose greeting** builds a greeting from
`$json.name` and has **Error On Undefined Expression** turned on.

```json
{
  "name": "Greeting with a missing name",
  "nodes": [
    {
      "parameters": {},
      "id": "6a9a6f5c-1a4f-4a0a-9f36-0d3f5b6a1b01",
      "name": "When clicking ‘Execute workflow’",
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [0, 0]
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            { "id": "1", "name": "email", "type": "string", "value": "ada@example.com" }
          ]
        },
        "options": {}
      },
      "id": "6a9a6f5c-1a4f-4a0a-9f36-0d3f5b6a1b02",
      "name": "Load customer",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [220, 0]
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "1",
              "name": "greeting",
              "type": "string",
              "value": "={{ 'Hello, ' + $json.name }}"
            }
          ]
        },
        "options": {}
      },
      "id": "6a9a6f5c-1a4f-4a0a-9f36-0d3f5b6a1b03",
      "name": "Compose greeting",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [440, 0],
      "throwOnUndefinedExpression": true
    }
  ],
  "connections": {
    "When clicking ‘Execute workflow’": {
      "main": [[{ "node": "Load customer", "type": "main", "index": 0 }]]
    },
    "Load customer": {
      "main": [[{ "node": "Compose greeting", "type": "main", "index": 0 }]]
    }
  }
}
```

Execute it. **Compose greeting** fails:

```
Expression inserted "undefined" into text

A value in this expression is undefined, and `+` turned it into the text "undefined".
Provide a fallback (for example `?? ''`), or turn off "Error On Undefined Expression"
in this node's settings.
```

Turn the setting off in **Compose greeting** and execute again. The node succeeds, and the output
is the defect the setting exists to catch:

```json
[{ "greeting": "Hello, undefined" }]
```

### Fix the expression

Failing is the signal, not the goal. Once you know which field is missing, either fix the data
upstream, or give the expression a fallback with `??`:

```
{{ 'Hello, ' + ($json.name ?? 'there') }}
```

With the setting still on, the node now succeeds:

```json
[{ "greeting": "Hello, there" }]
```

`??` substitutes the fallback only for `undefined` and `null`, so `0` and `""` survive.

---

## What it catches

**Mode: reference.** With the setting on, and `$json.name`, `$json.endpoint` and `$json.path`
absent from the input item:

| Where the expression is | Expression | Result |
|---|---|---|
| Edit Fields → assignment value | `{{ 'Hello, ' + $json.name }}` | **Node fails** — `Expression inserted "undefined" into text` |
| Edit Fields → assignment value | ``{{ `Hello, ${$json.name}` }}`` | **Node fails** — `Expression inserted "undefined" into text` |
| HTTP Request → URL | `{{ 'https://example.com/' + $json.path }}` | **Node fails** — `Expression inserted "undefined" into text` |
| HTTP Request → URL | `{{ $json.endpoint }}` | **Node fails** — `Parameter "url" resolved to undefined` |
| Edit Fields → assignment value | `{{ 'Hello, ' + ($json.name ?? 'there') }}` | Succeeds, writes `Hello, there` |
| Edit Fields → assignment value | `{{ 1 + $json.count }}` | Succeeds, writes `NaN` — no text was inserted, so nothing fails |

Expressions that deliberately handle a missing value never fail because of this setting: `??`,
`?.`, `=== undefined`, and `typeof x !== 'undefined'` all keep working as they do today. Values
that are legitimately `null`, `""`, `0`, `false` or `NaN` are not "undefined" and don't fail.

With the setting **off** — the default, and the state of every existing workflow — nothing changes
anywhere.

## What it does not catch

**Mode: reference.** Two gaps. Both are deliberate, and both leave the old behaviour in place, so
a workflow that relies on either keeps working.

### Fixed text around an expression

`Hello, {{ $json.name }}` — text and expression in the same field — resolves to `Hello, ` whether
the setting is on or off. It never produced the text `undefined` in the first place: n8n's
interpolation already turns a missing value into an empty string, and that is shared by every
expression in every workflow.

To catch this form, move the text inside the expression, where the setting applies:

| Field value | Setting on |
|---|---|
| `Hello, {{ $json.name }}` | Succeeds, writes `Hello, ` |
| `{{ 'Hello, ' + $json.name }}` | **Node fails** |

### A whole-value expression inside a collection

If the entire field value is one expression and that field sits inside a collection parameter — an
**Edit Fields** assignment, for instance — the node does not fail. The value is written as `null`:

| Node and parameter | Expression | Setting on |
|---|---|---|
| HTTP Request → URL (a plain parameter) | `{{ $json.endpoint }}` | **Node fails** — `Parameter "url" resolved to undefined` |
| Edit Fields → assignment value (inside a collection) | `{{ $json.name }}` | Succeeds, writes `null` |

Why the difference: this half of the setting checks the value the node asked for. **HTTP Request**
asks for `url` and gets `undefined`. **Edit Fields** asks for the whole list of assignments and
gets a list — which is not `undefined`, even though one value inside it is.

This matters most in **Edit Fields**, which is where the `Hello, undefined` string usually gets
assembled. Note the asymmetry, because it is not intuitive: inside **Edit Fields**, the coercion
forms *do* fail (`{{ 'Hello, ' + $json.name }}` and the template-literal form), and only the bare
whole-value form (`{{ $json.name }}`) doesn't.

<!-- Internal, drop when porting: this gap is tracked as N8N-246. -->

So in **Edit Fields**, the greeting case this setting exists for is covered; copying a field
straight across with `{{ $json.name }}` is not.

## Error messages

**Mode: reference.**

### `Parameter "<name>" resolved to undefined`

> The expression has no value. Provide a fallback (for example `?? ''`), or turn off "Error On
> Undefined Expression" in this node's settings.

The whole value of the parameter is an expression, and it resolved to nothing. The message names
the parameter.

### `Expression inserted "undefined" into text`

> A value in this expression is undefined, and `+` turned it into the text "undefined". Provide a
> fallback (for example `?? ''`), or turn off "Error On Undefined Expression" in this node's
> settings.

Something inside the expression combined a missing value into text, so the text `undefined`
appeared in the result. The description names the operation that did it: `` `+` `` or
`a template literal placeholder`.

## On Error and Retry On Fail

**Mode: reference.**

These failures are ordinary node failures — the setting adds no special handling.

- **On Error** applies as it does to any node error. With **Continue**, the workflow moves on and
  the item carries the error message instead of the field it would have written:
  `[{ "error": "Expression inserted \"undefined\" into text" }]`. With **Continue (using error
  output)** the item routes to the error output; with **Stop Workflow** the execution stops.
- **Retry On Fail** retries as configured and then fails, because the input item doesn't change
  between attempts. Retrying is not a fix here; fixing the expression or the upstream data is.
- Node failures caused by this setting are not swallowed by **Edit Fields**' legacy
  `continueOnFail` handling either — the node fails, and the item carries the error.

---

## Release note

**Mode: changelog.** For the release that ships this change. Nothing here is breaking: the setting
is off by default and absent from every existing workflow.

```markdown
### Added

- **Node settings: Error On Undefined Expression.** Turn it on for a node and the node fails when
  one of its expressions has no value, instead of quietly writing the text `undefined` into your
  data or running with a field missing. Off by default, per node; existing workflows are
  unchanged. It doesn't catch every missing value — refer to
  [Error On Undefined Expression](<URL_OF_NEW_PAGE>) for what it catches and what it doesn't.
```

---

## Provenance

Every result quoted above was produced by executing the workflow through the execution engine on
this branch (`34c5c9e` · `c95b573` · `711e9c8`), with real `n8n-nodes-base` nodes — the Edit
Fields example is the JSON published above, run unmodified, and again with the setting removed and
with the `??` fallback substituted. The two error messages and their descriptions are copied from
those runs, not from the source.

Not verified by execution, and labelled as such:

- **The toggle's position and label in the NDV Settings tab** are taken from the shipped
  `nodeSettings.throwOnUndefinedExpression.*` strings and from `createCommonNodeSettings`, plus the
  browser verification recorded in the pull request. This delta did not re-drive the editor.
- **`Retry On Fail` behaviour** is the standard node-retry path, unchanged by this feature; the
  claim that retries fail deterministically follows from the input item being identical between
  attempts.
- **Declarative (`routing:`) nodes** fail under the same conditions as programmatic ones, covered
  by `routing-node-undefined-expression.test.ts` in `packages/core`.
