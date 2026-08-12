# @n8n/ui-builder (PoC)

Renders a declarative UI definition as a Vue app. One renderer serves both the
editor's canvas and the published page, so what you compose is what ships.

Not a product. See the risks at the bottom before reading anything into it.

## The idea

A UI Builder node holds a definition. A stock workflow serves it, and the same
workflow holds the actions it calls, one chain per action:

```
[API Router /orders-app]  GET  /           -> [UI Builder]
                          POST /loadOrders -> [Code: Load]
                          POST /saveOrder  -> [Code: Save]
```

No Respond to Webhook nodes: the UI Builder node answers with the page itself
(`text/html`), and the router's default **Respond: Automatically** returns the
last node's JSON on the branches that end in a Code node.

The page loads this package's bundle, which walks the definition and renders it.
Interactions POST the app's whole state to a webhook; whatever partial comes back
is deep-merged into state and the view re-renders. One primitive covers both
fetching and mutating.

On the workflow side the state arrives as the request body, so the trigger hands
it to the next node at `$json.body`, not `$json`: an API Router's own output is
`{ route, params, query, body, headers }`.

## Response envelope

A workflow replies with an envelope:

```json
{
  "ok": true,
  "state": { "orders": [] },
  "toast": { "type": "success", "message": "Added Widget" },
  "error": { "code": "VALIDATION_ERROR", "message": "Enter an order name" }
}
```

Only `state` is merged; `toast` shows for five seconds, or until it is closed;
`error` accompanies `ok: false` and raises an error toast of its own if no
explicit toast is given, so an action never fails silently. A rejected action
still merges its `state`, so saying no and correcting the client's view are not
exclusive. Three messages show at once, the oldest dropping off past that, since
beyond that the stack covers the app it is reporting on.

`ok` is the only discriminator. A body without it is taken to be the state
partial itself, which is what the last node of the simplest possible action chain
returns, so the envelope is opt-in per action.

## Definition format

Every node is the same record, all the way down:

```json
{ "id": "btn-1", "type": "button", "props": { "label": "Add" }, "tree": {} }
```

`tree` is keyed by **region**: the drop points a component declares. Most declare
one, called `default`, so their children read as `{ "default": [ … ] }`. A card
declares three:

```json
{
  "id": "card-1",
  "type": "card",
  "props": { "padded": true },
  "tree": {
    "header": [ { "id": "heading-1", "type": "heading", "props": {}, "tree": {} } ],
    "default": [ … ],
    "footer": [ { "id": "button-1", "type": "button", "props": {}, "tree": {} } ]
  }
}
```

Children stay inside the node that owns them. There is no side table keyed by
region id, so a subtree is a document: renderable, movable and copyable on its
own, with nothing to look up elsewhere. The renderer feeds each region into the
Vue slot of the same name, which is why a component gets a drop point by writing
`<slot name="footer" />`, and why a component with one region writes a bare
`<slot />` and needs to know nothing about any of this.

Definitions written before regions store `tree` as a bare array; `normaliseNode`
reads them as a single `default` region, so nothing needs migrating.

Props come in four kinds, decided by the component's descriptor, not by name:

| kind | descriptor type | meaning |
| --- | --- | --- |
| value | `string`, `number`, `options`, `boolean` | literal, or an n8n expression (`={{ $state.x }}`) resolved per render |
| action | `action` | a chain of steps, fired on its trigger (`onMount`, `onClick`, `onEnter`) |
| model | `statePath` | a dotted path the component writes user input into |
| route | `route` | a page path, picked from the pages the document holds |

## Actions

An action is a list of steps run in order, not a single call. The useful thing
an interaction does rarely stops at the call: it saves, then says so, then moves
the user on.

```json
"onClick": [
  { "kind": "webhook", "url": "…/webhook/saveOrder", "method": "POST" },
  { "kind": "notify", "message": "Order added", "type": "success" },
  { "kind": "navigate", "to": "/" }
]
```

| kind | does |
| --- | --- |
| `webhook` | POST the whole state to a trigger, merge the envelope's `state` |
| `notify` | show a message; `message` may be an expression |
| `navigate` | change the page; `to` may be an expression |

A step's expressions resolve as that step runs, not when the chain starts, so a
notification after a webhook sees what the webhook merged and a step after a
navigate sees the new route. Only `$item` and `$index` are fixed at the moment
the chain fired, since only the node that fired can know them. A webhook reporting
`ok: false` ends the chain, which is what stops a failed save from navigating
away from the form that failed.

While a webhook step is in flight the node that fired it goes busy on its own:
the renderer reads `$loading` for every webhook the node's action props hold and
hands the answer down as a `busy` prop, so a button spins and refuses a second
click with nothing bound by hand. A component opts in with `wantsBusyFlag`, the
same way `wantsEditFlag` gets it the canvas's `edit` state. Anything else that
should show progress, a heading somewhere else on the page, still binds
`$loading` itself.

The older single-call shape, `{ url, method }`, still reads as a one-step chain,
so nothing written before this needs migrating.

One editor serves every action prop on every component, since what a button does
on click and what a page does on enter are the same kind of thing. A webhook
step picks its trigger from a dropdown of the ones on the open canvas, including
any added a moment ago and not yet saved. Its last entry, **From another
workflow…**, opens a picker over every other workflow that has a trigger in it,
which is also the only thing that pays for scanning the instance.

Three buttons sit beside a webhook step:

| button | does |
| --- | --- |
| plus | drops a Webhook and a Respond to Webhook into the workflow being edited, on a path named after the component and prop (`button` + `onClick` gives `buttonOnClick`), and points the step at it |
| run | posts the canvas's state to the step, exactly as the running app would |
| history | reads what that trigger returned when it last ran |

The last two merge the response into the canvas's preview state, which is what
turns the canvas from a wireframe of blank bound props into a preview of the
running app. Running answers "what does this return now" and costs a real
execution against a live webhook; history answers "what did it return", costs
nothing, and works on an unpublished workflow.

The envelope's `toast` and a `notify` step are both messages, and both are worth
having: the workflow says something only it knows (a validation failure), the
client says something only it knows (that the whole chain got through).

## Components

| component | group | regions | notable props |
| --- | --- | --- | --- |
| `shell` | Layout | `header`, `default` (pages), `footer` | `defaultPage` |
| `page` | Layout | `default` | `path`, `title`, `onEnter` |
| `stack` | Layout | `default` | `direction`, `gap` |
| `card` | Layout | `header`, `default`, `footer` | `padded` |
| `repeat` | Logic | `default` | `items` |
| `if` | Logic | `default` | `condition` |
| `debug` | Logic | — | `value` |
| `heading` | Display | — | `text`, `level` |
| `text` | Display | — | `text` |
| `table` | Display | — | `rows`, `columns`, `onMount` (every row, no pager; says so when empty) |
| `input` | Input | — | `value`, `model`, `placeholder` |
| `button` | Input | — | `label`, `variant`, `disabled`, `active`, `onClick` |

Worth knowing about three of them:

- **`card`** is the multi-region example, and the reason the inspector grows an
  **Add to** picker: with three drop points, "add to the selection" has no
  answer on its own.
- **`repeat`** renders its subtree once per element of `items`, binding `$item`
  and `$index`. It is the only way a name reaches an expression from something
  other than state. In the canvas an empty or unresolved array still draws one
  iteration, since a subtree that renders zero times cannot be selected.
- **`if`** renders its subtree when `condition` is truthy, and always renders it
  in the canvas, since a hidden branch would be unselectable. It has no `else`:
  pair it with a second `if` on the negated condition. That is now a gap rather
  than a constraint of the format, since regions arrived: an `if` declaring
  `then` and `else` regions would work, and nobody has written it.

Reads and writes are deliberately separate props: `value` is an expression to
display, `model` is a path to write. Nothing is inferred.

In the inspector a value field says which mode it is in, `fixed` or
`expression`, and the label carries the descriptor's own description as a
tooltip. There is no toggle between the two modes: the leading `=` is the
switch, and a marker that lights up as you type one teaches the syntax faster
than a control would.

## Pages

An app is one page until it holds a `shell`. The shell's content region holds
`page` nodes and shows the one the route names; its header and footer stay on
screen while the content swaps. A document with no shell keeps working exactly
as before, so this costs nothing to ignore.

Routing is hash-based: `#/orders`, not `/orders`. The app is served from one
webhook path, so a history-API route would put the browser somewhere no webhook
answers and a refresh would 404. Back and forward work because the browser is
doing the navigating.

| piece | is |
| --- | --- |
| `page.path` | the route it answers: `/`, `/orders`, `/orders/:id` |
| `page.title` | the tab, in front of the app's name, and what `$pages` labels it |
| `page.onEnter` | an action, run each time the page becomes current, not once per session |
| `shell.defaultPage` | where an empty fragment opens, and where an unknown route lands |

The shell renders no navigation of its own. A repeat over `$pages` with a button
inside is a nav bar, and the header is where it goes; the demo does exactly that
in six lines of document. Which entry is open is the button's `active` prop,
bound to `={{ $route.path === $item.path }}`. The moment a shell draws its own
tabs it owns their styling and placement, and every app wanting something else
has to fight it.

`$state.$app` is the app's own corner of state, holding the current route and
page. Since an action posts the whole state, route parameters reach a workflow
with nothing wired: a page at `/orders/:id` gives
`$json.body.$app.route.params.id`. It is client-owned, so a response trying to
write it is refused and warns, and so is a `model` prop pointing into it.

In the builder, the **Pages** pane lists them: add, rename (double-click a row),
star to make default, delete, and click to choose which one the canvas is
showing. Adding pages to a single-page document wraps the existing root in a
shell rather than replacing it, so nothing composed is lost.

## Running the demo

`demo/orders.json` is a whole workflow: import it, publish it, and open
`/webhook/orders-app`. Two things have to be true first.

```sh
pnpm --filter @n8n/ui-builder build   # writes the runtime into editor-ui/public/static
```

The action URLs in the imported workflow are absolute and assume the default
port. If your instance is elsewhere, rewrite them before importing:

```sh
sed 's|http://localhost:5678|http://localhost:<your-port>|g' \
  packages/frontend/@n8n/ui-builder/demo/orders.json > /tmp/orders.json
```

Then open `/webhook/orders-app`. It is two pages with a nav bar built out of a
repeat over `$pages`. Entering **Orders** fires the page's `onEnter`, which
fills the table from `loadOrders`. On **New order**, typing a name and pressing
Add runs a three-step chain: post to `saveOrder`, show "Order added", go back to
the list, which reloads and has the row. Pressing Add on an empty input takes
the failure path: the workflow answers `ok: false`, an error toast appears from
its message, and the chain stops there, so the page does not change.

To see the authoring side, open the *Orders* workflow in the editor and click
the UI Builder node.

Actions target production webhook URLs, so the workflow has to be published,
not merely saved. The runtime bundle is served from n8n's static route, which
the package build populates (`editor-ui/public/static/`).

## Layout

Layout is the component's business, never the document's. A node says which
region a child sits in; where that region renders is the component's own markup
and CSS. So `stack` reads its children in one direction, `card` puts three
regions in three places, and neither fact appears anywhere in the definition.

Within a region children are an ordered list, so an insertion point is a region
plus an index, which is what keeps click-to-insert simple and gives a future
drag gesture somewhere well defined to drop onto.

The one thing the format cannot express is a component whose regions are not
known in advance, because a descriptor's `regions` are static. Tabs with a
user-chosen number of tabs would need regions derived from a prop, or tabs
modelled as a repeat over child nodes.

## Expressions

Evaluated with `@n8n/tournament`, the same path editor-ui takes in the browser.
The scope is an object rather than state alone, because names can be bound by an
ancestor:

| name | bound by | is |
| --- | --- | --- |
| `$state` | the runtime | app state, the thing actions merge into |
| `$loading` | the runtime | `{ [action]: boolean, $any: boolean }`, keyed by the trigger's last path segment |
| `$route` | the runtime | `{ path, params }`, the same route `$state.$app.route` holds |
| `$pages` | the runtime | `[{ id, path, title }]`, every page the shell holds, in document order |
| `$item`, `$index` | an enclosing `repeat` | the element being rendered |

`$loading` is deliberately not part of `$state`: the whole state is POSTed on
every action, so flags living in it would ride along as noise with one always
true for the request carrying it, and a workflow could write something only the
client can know. `@n8n/expression-runtime` is not usable here: it
depends on isolated-vm and editor-ui aliases it to throwing stubs for browser
builds.

The sandboxing AST hooks from `packages/workflow` are not applied. They are not
exported for outside use, and these expressions are the app author's own running
in their own browser.

## What this PoC does not do

No user authentication (see below), no CORS story, no drag and drop, no undo, no
test-URL preview mode. Error handling stops at the envelope: a transport failure
logs and shows a generic toast, and there is no retry. Only the node that owns
an action goes busy on its own, and only the button does anything with it;
anything else showing progress binds `$loading` by hand. A workflow can
set a state key, never delete one. Concurrent responses merge in arrival order
with no last-write protection. Any component can go in any region: regions
accept anything, unlike props, which are typed by their descriptors, so nothing
stops a `page` being dropped into a card's footer or a shell inside a shell,
both of which are meaningless.

Pages have their own gaps. There is no `onLeave`, because the useful version is
not an event: a dirty-form guard has to be able to stop the navigation, which
means an action whose response decides whether the route changes. State is one
`$state` for the whole app rather than one per page; a page wanting isolation
writes to its own key.

Two more are designed but unbuilt: reusable component groups, so a composed
subtree can be dropped in more than once, and telling n8n's AI builder about
the node through `builderHint`.

## Authentication

Turning on **Authenticate Actions** makes the node sign a short-lived JWT with a
JWT Auth credential and inline it into the page beside the definition. The
runtime sends it as `Authorization: Bearer …` on every action, and each action's
Webhook is set to JWT Auth with the same credential, which n8n already validates
(`nodes/Webhook/utils.ts`). Nothing new on the receiving side.

Be clear about what this is. The serving webhook stays open, because it is the
entry point, so anyone who loads the page gets a token. It is not user
authentication; it stops the action webhooks being open mutation endpoints that
anyone can hit by guessing a path, and the token lifetime bounds how long a
served page stays able to call them. Real user auth needs a login step and a
session, which is a different piece of work.

