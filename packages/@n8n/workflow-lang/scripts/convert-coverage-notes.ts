/** The design notes at the end of `docs/convert-coverage.md`. They do not depend on the sample. */
export const NOTES = `## How the converter works

\`wfc convert <workflow.json> -o <file.ts>\` and \`convertWorkflow(json, options)\` (\`src/convert/\`) write one
workflow file. \`generator.ts\` writes the source; \`registry.ts\` picks the lowering of each node type.

- **Flat shape.** \`run\` holds one \`const\` list of items for each node output, in the v1 run order. A
  node reads the lists of its parents. Lists keep the v1 item model: a node runs once with all its
  input items, IF and Switch fill one list for each output, Merge reads one list for each input. The
  code stays flat, so a reader can follow it from top to bottom like the canvas.
- **Engine shape.** When the flat shape could differ from v1, each node becomes a local async
  function and a loop runs the v1 run stack of \`WorkflowExecute\` (\`executionOrder: 'v1'\`) with the
  helpers \`v1Start\`, \`v1Next\`, \`v1Done\`, \`v1Add\` and \`v1Waiting\`: depth first, children sorted by
  canvas position, nodes with several inputs wait for each input, a waiting node runs when the stack
  is empty, and a node runs once for each parent that sends items. \`let\` lists hold the items of the
  latest run of each node, as \`$('Node')\` reads them in v1. The converter picks this shape when the
  graph has a cycle (loops), when a node gets items from several parents on one input and the node or
  a node after it is not item-wise code, or when a node with several inputs can wait while an effect
  of another node runs. Diagnostic \`engine\` (info) marks it.
- **Run order.** The flat shape copies v1: depth first, the child that is highest on the canvas
  first, then the leftmost. A node with more than one incoming connection runs after all its parents.
- **Core nodes become code.** If, Switch, Filter, Edit Fields (Set), Merge, No Operation, Limit,
  Sort, Split Out, Aggregate, Remove Duplicates, Loop Over Items and Stop and Error become loops,
  \`filter\`, \`map\` and small helper functions at the end of the file. They are not steps.
- **Loops.** Loop Over Items (Split in Batches 1, 2, 3) keeps the node context of v1 in a variable
  (items left, processed items, \`done\`, \`noItemsLeft\`, \`currentRunIndex\`, \`maxRunIndex\`), so
  \`$node["Loop"].context["noItemsLeft"]\` and the "reset" option work. The loop comes from the graph:
  the engine shape runs the node again when the loop body sends items back. Other cycles (an IF that
  goes back to an earlier node) run the same way.
- **Sub-workflows.** Execute Workflow becomes a call of an async function in the same module, one
  function for each callee, so recursion and cycles between workflows are calls. The callee comes from
  \`options.resolveWorkflow(id)\` (source "database") or from the node (source "parameter"). Mode
  "once" calls the function once, mode "each" once for each item. The function starts at the Execute
  Workflow Trigger (its input modes keep the defined fields) and returns the outputs of the last node
  that ran (all runs joined for trigger 1.2 and later). Steps of a callee have the name
  \`<workflow> / <node>\`. A callee that the converter cannot find (unknown id, an id from an expression,
  a local file, a URL) stays a \`ctx.node\` step: the fallback host must ask n8n to run it (warning
  \`sub-workflow-host\`).
- **Waits.** Wait for a time → \`ctx.wait\`. Wait for a webhook call or a form, Form pages and the "send
  and wait" operations (Slack, Gmail, Telegram, Chat, …) → \`ctx.approval\`. The runtime parks the
  execution; a request to its resume URL resumes it with the raw request body (spec section 9.4). The
  helper \`resumeItem\` gives the v1 item, or the node gives its input items when the time limit ended
  the wait.
- **Steps.** Respond to Webhook → \`ctx.respond\`, Code and Function → \`ctx.code\`, HTTP Request and
  other library nodes → \`ctx.node\` linked to \`src/nodes/\`, every other node → \`ctx.node\` in the
  fallback host. A step runs only when its input list has items.
- **Expressions.** The converter translates \`={{ }}\` values to code that the generated source
  evaluates for each item (\`$json\`, \`$('Node').item/first()/last()/all()/itemMatching()\`,
  \`$input.*\`, \`$node[...]\` with \`.context\`, \`$itemIndex\`, \`$runIndex\`, \`$workflow\`, \`$prevNode\`;
  then \`src/legacy/\`). \`$execution\` (id, mode, resume URLs) and \`$vars\` are the glue calls
  \`ctx.execution()\` and \`ctx.vars()\`; \`$execution.customData\` and \`$env\` come from one
  fallback-host step (\`n8n-compiled.context\`). A reference to a node that does not exist or has not
  run throws at run time, as v1 does. An expression that does not translate goes
  to the host as raw text only when the host gives the same value. Otherwise the node runs whole in
  the fallback host with its v1 parameters and the run data that its expressions read (spec 9.6,
  warning \`host-expression\`), so n8n's expression engine gives the v1 value.
- **Node settings.** \`retryOnFail\` → \`retry\`, \`onError: continueRegularOutput\` and
  \`continueErrorOutput\` → \`try\`/\`catch\`, \`executeOnce\` → first item only, \`alwaysOutputData\` →
  one empty item on output 0, disabled nodes pass their input through, pinned data is ignored
  (warning).
- **Trace.** With \`options.trace\` (\`core\` by default) the code calls \`ctx.trace(name, outputs)\`
  after each node that is not a \`ctx.node\` or \`ctx.code\` step (\`all\`: after each node).
  \`outputs\` has one item list for each output of the node.
- **No trigger.** A workflow without a trigger gets a stand-in start node that gives the trigger
  item to each node without a parent (warning \`no-trigger\`).
- **Check.** The converter compiles its result. When the compiler rejects a translated expression
  or the code of a node, the converter marks it and converts again, so the node falls back to the
  host or fails with the reason.

## Known differences from v1

1. The flat shape runs a node with several parents on one input once with the items of all parents,
   only when the node and the nodes after it are item-wise code (Set, IF, Filter, Switch, No
   Operation, Split Out). The values are the same as the v1 runs one after the other.
2. \`$('Node').item\` is exact for the trigger, for nodes that give one item, and through nodes that
   keep the item order (Set, No Operation, Wait). Elsewhere it pairs by position (warning
   \`paired-item\`).
3. Filter conditions with strict type validation give \`false\` where v1 stops with a type error.
4. The webhook item has no \`webhookUrl\` and \`executionMode\`. The schedule item is \`{ scheduledAt }\`.
   Triggers without an equivalent become a webhook whose request body is the trigger item.
5. On \`continueRegularOutput\` a failed call gives \`{ error: message }\` items; on
   \`continueErrorOutput\` the error output gets \`{ ...item, error: message }\`. v1 can give an error
   object instead of the message.
6. Library nodes (\`src/nodes/\`) run once for each item.
7. In code steps, \`$('Node').item\` gives the first item of that node.
8. \`waitForSubWorkflow: false\`: v1 starts the sub-workflow and goes on at once. The converted code
   runs the sub-workflow to its end first and ignores its errors; the items are the same.
9. Send and wait: the approval carries the node (\`node: { type, typeVersion, parameters, credential }\`);
   the runtime sends the message through the fallback host and then waits. Parameters that read the
   item use the first item, as v1 does.

## Behaviour tests

\`src/convert/__tests__/behaviour.test.ts\` converts each workflow in
\`src/convert/__tests__/behaviour/cases/\`, runs it on the reference runner, and compares the items
of each last node, the HTTP requests, the webhook responses and the order of the steps with
\`expected.json\`. \`behaviour/oracle.ts\` wrote \`expected.json\` by running the original JSON in
n8n's engine (\`behaviour/oracle-engine.ts\`: \`WorkflowExecute\` from n8n-core, nodes from
n8n-nodes-base, HTTP against a local server). In the test, code steps run in the fallback host's
code runner and node steps in its v1 node runner, so the results do not come from fixtures. Two
stand-ins are needed in the oracle: the Code node needs n8n's task runner process, so the oracle
runs the code in \`node:vm\` with the engine's own workflow data proxy; and Execute Workflow runs the
sub-workflow in a nested \`WorkflowExecute\`.
`;
