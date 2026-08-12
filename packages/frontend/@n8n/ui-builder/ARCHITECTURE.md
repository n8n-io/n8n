# Architecture

How the pieces fit, and where to change things. [README.md](./README.md) covers
what the thing is and how to run it; this covers how it is built.

## The pieces, and where they live

The feature is four edits to three packages, plus this one:

| where | what |
| --- | --- |
| `packages/frontend/@n8n/ui-builder` | this package: the format, the renderer, the kit, the runtime, the authoring panel |
| `packages/nodes-base/nodes/UiBuilder` | the node: holds a definition, serves the page |
| `packages/frontend/editor-ui/…/UiBuilderParameter.vue` | the host adapter, and one `v-else-if` in `ParameterInputList.vue` |
| `packages/workflow/src/interfaces.ts` | one string added to `NodePropertyTypes` |

The feature is the package. editor-ui holds one small component, which supplies
the things the panel cannot do for itself and maps the parameter's emit.

That last one is the whole reason a custom panel is possible: n8n's NDV picks an
input component by switching on `parameter.type`, so a new type is the seam. The
backend treats it as an ordinary string parameter and never looks inside.

Inside this package:

```
src/
  core/           no Vue components, no host: the format and its rules
    types.ts        the format, and what a component descriptor is
    document.ts     tree surgery: create, find, insert, remove, migrate
    actions.ts      what an action prop holds: a chain of steps
    pages.ts        finding the shell, listing pages, matching a route
    expressions.ts  one function: resolve a prop against a scope
    state.ts        deep merge, and writing a dotted path
    binding.ts      what a step sends, and where its reply goes
    envelope.ts     read an action's response
    loading.ts      which actions are in flight
  renderer/       renders one node and recurses; the canvas and the app share it
  kit/            the components, and the descriptors that declare them
  runtime/        the served page: mount, route, run actions, show toasts
  editor/         the authoring panel, and the host interface it needs
```

`document.ts` and `pages.ts` import `kit/` (to ask what regions a type declares,
and which of them holds pages) and `UiRenderer.vue` imports both. Nothing else imports the runtime, which is what
lets the editor pull in the renderer without pulling in the app.

## Two builds from one source

`vite.config.mts` switches on `INCLUDE_VUE`:

- **Library build**: Vue stays external. The design system does not: it is
  aliased to source and compiled into both builds. editor-ui imports this
  library aliased straight to source, so the canvas and the served page cannot
  drift.
- **Bundle build** (`src/runtime/entry.ts`, `INCLUDE_VUE=true`): everything
  inlined, because the served page is a bare HTML document with no bundler.
  `closeBundle` copies the result into editor-ui's `public/static/` (and its
  `dist/static/` when that exists, so a rebuilt runtime lands without an
  editor-ui rebuild).

The same pattern `@n8n/chat` uses. The bundle carries a `process` shim in a
banner and as its first import: tournament pulls in a browserified `util` that
touches bare `process`, which does not exist in a page loaded outside a bundler.

## The flow

Authoring, and then serving, are two separate passes over the same document.

```
  editor                          runtime
  ------                          -------
  UiBuilderPanel                  Webhook GET
    palette / canvas / inspector    -> UiBuilder node
    v                                    reads `definition`, signs a token
  JSON.stringify(doc)                    v
    v                               getAppPage(): inlines both, links the bundle
  node parameter `definition`            v
    (an ordinary string)            Respond to Webhook returns the HTML
                                         v
                                    entry.ts reads window.__N8N_UI__
                                         v
                                    UiApp: state, actions, toasts
                                         v
                                    UiRenderer, the same one the canvas uses
```

An action closes the loop: call a webhook with the state the step names, write
the reply where the step says it goes, re-render.

## The format

One record, repeated:

```ts
interface UiNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
  tree: Record<string, UiNode[]>;   // keyed by region
}
```

**Props and regions are the two halves of a component's interface.** A
descriptor declares both: `props` as n8n `INodeProperties`, `regions` as named
drop points. A prop's value is a literal or an expression and is resolved before
it reaches the component; a region's value is a list of child nodes and is
recursed into. Props arrive as Vue props, regions as Vue slots of the same name.

Three invariants hold everywhere:

1. **Ids are unique within a document.** `createNode` guarantees it by scanning.
   Nothing enforces it on a hand-edited definition.
2. **Regions are static**, fixed in the descriptor. A component cannot decide at
   runtime that it has four regions instead of three. This is the main thing the
   format cannot express: a tabs component with a user-chosen number of tabs.
3. **The conventional single region is `default`**, which is Vue's default slot.
   A component with one region writes a bare `<slot />` and knows nothing about
   regions. This is also why old definitions still load: `normaliseNode` reads a
   bare array as `{ default: [...] }`.

## Scope

`resolveValue(value, scope)` is the only place expressions are evaluated, and
the scope is an object rather than app state alone, because names can be bound
by an ancestor rather than by the runtime.

| name | bound by | is |
| --- | --- | --- |
| `$state` | the runtime | app state |
| `$loading` | the runtime | `{ [action]: boolean, $any: boolean }` |
| `$route` | the runtime | `{ path, params, pageId }` |
| `$pages` | the runtime | every page the shell holds |
| `$item`, `$index` | an enclosing `repeat` | the element being rendered |

`UiRenderer` decides what each child sees. A plain container passes its own
scope down; a `repeat` produces one scope per element. That is the extension
point for anything else that needs to bind a name for its subtree.

The canvas passes `{ $state: {}, $loading: {} }` rather than `{}`: an expression
naming a key of something undefined throws, and the prop would resolve to
`undefined` instead of falsy. It also passes a `$route` naming the page the
author is editing, which is the one thing the canvas has to decide that the
running app does not.

## Extension points

**Add a component.** Write the SFC in `kit/`, add a descriptor to `KIT` in
`kit/index.ts`. Give it a `group` so the palette files it, `regions` if it takes
children, and `props` as `INodeProperties`. Nothing else needs touching: the
renderer, inspector and palette are all driven off the descriptor.

**Add a drop point.** Add to the component's `regions`, and write a
`<slot name="…" />` where it should render. The editor picks it up: a component
with more than one region grows an "Add to" picker.

**Add a prop kind.** The four that exist are value (any `INodeProperties`
type), `action`, `statePath` and `route`. A new kind means a constant in
`types.ts`, a skip in the renderer's `resolvedProps` if it should not reach the
component, and a branch in the inspector.

**Add an action step kind.** A member of the union in `types.ts`, an entry in
`ACTION_KINDS`, a case in `readStep` and `createStep`, a case in the runtime's
`runSteps`, and a fields block in `UiActionEditor.vue`. Nothing else: every
action prop on every component picks it up.

**Bind a name for a subtree.** Follow `repeatOver`: a descriptor flag the
renderer reads when building child scopes.

## Deliberate omissions

Documented so nobody has to rediscover why:

- **No sandbox on expressions.** The AST hooks in `packages/workflow` are not
  exported, and these expressions are the app author's own, running in their own
  browser.
- **No `@n8n/expression-runtime`.** It depends on isolated-vm, and editor-ui
  aliases it to throwing stubs for browser builds. Tournament is what editor-ui
  itself uses in the browser.
- **No state deletion.** A `set` step can write a key, never remove one.
- **No last-write protection.** Concurrent replies land in arrival order.
- **No region typing.** Any component can go in any region. A component's props
  are typed by their descriptors; its regions accept anything. This is what
  leaves a shell inside a shell possible: both would read the same fragment,
  both would match a route, and the inner would shadow `$route` for its subtree.
  The general fix is an `accepts` list on `UiRegion`, which touches every
  descriptor and deserves its own change.
- **No `onLeave`.** The useful version is not an event: a guard has to be able
  to stop the navigation, which means an action whose response decides whether
  the route changes, and an await in the middle of a hash change.
- **The inspector is hand-rolled.** The descriptors are already
  `INodeProperties`, so swapping in n8n's `ParameterInputList` is a local change,
  but it needs a fake node registered in the workflow document store, the way
  `EventDestinationSettingsModal.vue` does it.
