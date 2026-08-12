# @n8n/ui-builder (PoC)

Renders a declarative UI definition as a Vue app. One renderer serves both the
editor's canvas and the published page, so what you compose is what ships.

Not a product. See the risks at the bottom before reading anything into it.

## The idea

A UI Builder node holds a definition. A stock workflow serves it, and the same
workflow holds the actions it calls, one chain per action:

```
[API Router /orders-app]  GET  /       -> [UI Builder]
                          GET  /orders -> [Data table: get]
                          POST /orders -> [Data table: insert]
```

No Respond to Webhook nodes: the UI Builder node answers with the page itself
(`text/html`), and the router's default **Respond: Automatically** returns the
last node's JSON on the other branches.

The page loads this package's bundle, which walks the definition and renders it.
An interaction calls a workflow and puts the reply into state, and the view
re-renders. One primitive covers both fetching and mutating.

The workflow is left alone: it answers with whatever its nodes produce, and the
step that called it says where that goes. So no node in the diagram above knows
this app exists, and the same two endpoints are a REST API anything else can
call — with a request schema, and an OpenAPI document if the router is asked for
one.

## Request and response

A webhook step says what it sends and what its reply is called. Where the reply
goes is a step of its own:

| field | is | unset means |
| --- | --- | --- |
| `request` | the request body, as an expression: `={{ $state.form }}` | send all of state; a GET sends none of it |
| `key` | what the reply is called for the rest of the chain, as `$responses.<key>` | the reply is only `$response`, the latest one |

Nothing is merged implicitly, so a node's own output can never scribble
`createdAt` into app state, and a save that changes nothing on screen is simply
a call with no `set` step after it.

A `set` step is what keeps a reply: `$response` is the last call's, and
`$responses.<key>` any call in the chain, so an action that calls twice can put
each answer where it belongs — or neither.

```json
"onClick": [
  { "kind": "webhook", "url": "…/orders", "method": "GET", "key": "orders" },
  { "kind": "set", "path": "orders", "value": "={{ $response }}" }
]
```

The workflow gets a say in only one thing — whether the action succeeded:

```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Enter a name" } }
```

`ok: false` ends the chain, which is what stops a failed save from navigating
away from the form that failed, and raises an error toast from `error.message`.
A non-2xx status does the same without any of this, so an endpoint whose request
schema refuses a body needs no error branch at all. A body may also carry an
explicit `toast: { type, message }`. Everything else about a reply is data. Three
messages show at once, the oldest dropping off past that, since beyond that the
stack covers the app it is reporting on.

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
| binding | `statePath` | a dotted place in state the component reads and writes |
| route | `route` | a page path, picked from the pages the document holds |

## Actions

An action is a list of steps run in order, not a single call. The useful thing
an interaction does rarely stops at the call: it saves, then says so, then moves
the user on.

```json
"onClick": [
  {
    "kind": "webhook",
    "url": "…/webhook/orders-app/orders",
    "method": "POST",
    "request": "={{ $state.form }}",
    "key": "created"
  },
  { "kind": "set", "path": "form", "value": {} },
  { "kind": "notify", "message": "Order added", "type": "success" },
  { "kind": "navigate", "to": "/" }
]
```

| kind | does |
| --- | --- |
| `webhook` | call an endpoint; `request` is the body it sends, `key` names its reply |
| `set` | write `value` into state at `path`; `value` may be an expression |
| `notify` | show a message; `message` may be an expression |
| `navigate` | change the page; `to` may be an expression |

`set` is what keeps client-only concerns off the wire: clearing a form after a
save is not something a workflow should have to know about, or answer for.

A step's expressions resolve as that step runs, not when the chain starts, so a
notification after a webhook sees what the webhook wrote and a step after a
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
| run | calls the step from the canvas, exactly as the running app would |
| history | reads what that trigger returned when it last ran |

The last two run the reply through the `set` steps that follow the call, exactly
as the running app would, which is what turns the canvas from a wireframe of
blank bound props into a preview of the running app — and shows a step whose
expression is wrong or missing that it is. What they fetch is also what the
inspector's expressions complete against, so `$responses.orders.` offers the
keys the workflow really answers with. Running answers "what does this return now" and costs a real
execution against a live webhook; history answers "what did it return", costs
nothing, and works on an unpublished workflow.

A fourth play button sits beside the action's own name, in the subpanel header
rather than on a step, and runs the chain itself: every call in order, each
reply reaching the `set` steps after it, so the canvas ends up where the whole
interaction leaves the app rather than where one call does — a save followed by a
reload shows the saved row in the table. `notify` and `navigate` steps are passed
over, since neither touches state and neither should move the canvas off the page
being edited.

A reply's `toast` and a `notify` step are both messages, and both are worth
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
| `input` | Input | — | `model`, `placeholder` |
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

An input is one binding, not two. `model` names the place in state it reads and
writes, and the renderer hands the value back in; there is no second expression
to keep in step with it. A component whose displayed value could differ from
the one it writes would fight its own typing, reverting every keystroke on the
next render.

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
page. A step that names no `request` posts all of state, so route parameters
reach a workflow with nothing wired: a page at `/orders/:id` gives
`$json.body.$app.route.params.id`. It is client-owned, so a `set` step
naming it is refused and warns, and so is a `model` prop pointing into it.

In the builder, the **Pages** pane lists them: add, rename (double-click a row),
star to make default, delete, and click to choose which one the canvas is
showing. Adding pages to a single-page document wraps the existing root in a
shell rather than replacing it, so nothing composed is lost.

## Running the demo

`demo/orders.json` is a whole workflow: import it, publish it, and open
`/webhook/orders-app`. Three things have to be true first.

```sh
pnpm --filter @n8n/ui-builder build   # writes the runtime into editor-ui/public/static
```

Orders live in a data table, so create one called `orders` with a `name`
(String) column and a `qty` (Number) column, and leave it empty. The imported
workflow says the same thing on a sticky note.

The action URLs in the imported workflow are absolute and assume the default
port. If your instance is elsewhere, rewrite them before importing:

```sh
sed 's|http://localhost:5678|http://localhost:<your-port>|g' \
  packages/frontend/@n8n/ui-builder/demo/orders.json > /tmp/orders.json
```

Then open `/webhook/orders-app`. It is two pages with a nav bar built out of a
repeat over `$pages`. Entering **Orders** fires the page's `onEnter`, a
`GET /orders` whose rows the step writes to `$state.orders`. On **New order**,
typing a name and pressing Add sends the form to `POST /orders`, clears it,
says "Order added" and goes back to the list.

Add with an empty name never reaches the insert: it fails the endpoint's request
schema, and the 400 raises an error toast and stops the chain, so the page does
not change. The workflow holds four nodes, none of them written in JavaScript,
and mentions neither `orders` nor `form`.

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
| `$state` | the runtime | app state, the thing `set` steps write |
| `$loading` | the runtime | `{ [action]: boolean, $any: boolean }`, keyed by the trigger's last path segment |
| `$route` | the runtime | `{ path, params }`, the same route `$state.$app.route` holds |
| `$pages` | the runtime | `[{ id, path, title }]`, every page the shell holds, in document order |
| `$item`, `$index` | an enclosing `repeat` | the element being rendered |
| `$response` | the chain a step runs in | what its last call answered |
| `$responses` | the chain a step runs in | every reply so far, by its call's `key` |

`$loading` is deliberately not part of `$state`: a step with no `request` posts
all of state, so flags living in it would ride along as noise with one always
true for the request carrying it, and a workflow could write something only the
client can know. `@n8n/expression-runtime` is not usable here: it
depends on isolated-vm and editor-ui aliases it to throwing stubs for browser
builds.

The sandboxing AST hooks from `packages/workflow` are not applied. They are not
exported for outside use, and these expressions are the app author's own running
in their own browser.

## What this PoC does not do

No user authentication (see below), no CORS story, no drag and drop, no undo, no
test-URL preview mode. Error handling stops at `ok: false` and the status code: a
transport failure logs and shows a generic toast, and there is no retry. Only the
node that owns an action goes busy on its own, and only the button does anything
with it; anything else showing progress binds `$loading` by hand. A step can
write a state path, never delete one. Concurrent responses land in arrival order
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

