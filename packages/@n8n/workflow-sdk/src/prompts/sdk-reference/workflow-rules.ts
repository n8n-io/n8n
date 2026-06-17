/**
 * Workflow rules — strict constraints for code generation.
 *
 * Consumed by:
 * - Code Builder Agent (ai-workflow-builder.ee)
 * - MCP Server (external SDK reference)
 * - Instance AI workflow-builder skill
 */
export const WORKFLOW_RULES = `Follow these rules strictly when generating workflows:

1. **Always use newCredential() for authentication**
   - When a node needs credentials, always use \`newCredential('Name')\` in the credentials config
   - NEVER use placeholder strings, fake API keys, or hardcoded auth values
   - Never synthesize credential IDs. Do not invent raw IDs such as \`WHATSAPP_CREDENTIAL_ID\`, \`mock-gmail-oauth2\`, or any \`mock-*\` value
   - If \`availableCredentials\` is provided, treat it as an allow-list: copy an existing credential ID exactly or use \`newCredential('Name')\` without an ID
   - Example: \`credentials: { slackApi: newCredential('Slack Bot') }\`
   - The credential type must match what the node expects

2. **Trust empty item lists — keep optional lookups explicit**
   - When a query returns 0 items, downstream nodes simply don't run for that execution. For scheduled or polling triggers this is the correct "nothing to do this round" signal — the next run will execute normally when data appears.
   - Do not add \`alwaysOutputData: true\` just to keep loops or per-item processing alive. Forcing an empty \`{}\` item downstream can cause \`undefined\` reads, failed HTTP calls to \`GET undefined\`, and Code-node crashes on missing fields.
   - Use \`alwaysOutputData: true\` when "no match" is meaningful data the workflow must continue with — for example an optional lookup that computes a boolean/default value, or a dedicated "no results" notification path. Put the flag on the producer that can output zero items, and make the next node explicitly handle the empty marker instead of blindly reading fields.
   - DO NOT add an IF gate before a loop to check "has items?" — loops (\`splitInBatches\`, per-item nodes, \`filter\`) already no-op on empty input. The gate is redundant and adds a failure surface.
   - If an optional lookup is followed by more user-input or write steps, preserve the original upstream data with \`nodeJson(sourceNode, 'field')\`; after an empty lookup, \`$json\` is the empty marker, not the original item.
   - To drop invalid items mid-pipeline, use a \`filter\` node. A \`filter\` that rejects everything emits 0 items and the chain correctly stops — no \`IF\` + \`splitInBatches\` composition needed.

3. **Use \`executeOnce: true\` for single-execution nodes**
   - When a node receives N items but should only execute once (not N times), set \`executeOnce: true\`
   - Common cases: sending a summary notification, generating a report, calling an API that doesn't need per-item execution
   - If a node fetches shared context independently but is chained after a multi-item source, set \`executeOnce: true\` so it does not run once per incoming item
   - Duplicate notifications, duplicate API calls, or repeated shared-context fetches usually mean a downstream node is missing \`executeOnce: true\` or should be on a parallel branch
   - Example: \`config: { ..., executeOnce: true }\`

4. **Pick the right control-flow primitive**
   - **Per-item loop with side effects (fetch, embed, write)** → \`splitInBatches\` with \`batchSize: 1\` feeding the per-item work, loop back via \`nextBatch\`. No \`IF\` gate before it.
   - **Drop items that don't match a predicate** → \`filter\`. It emits 0 items when nothing matches, and the chain stops cleanly.
   - **Two mutually exclusive paths that both do real work** → \`IF\` (\`onTrue\` / \`onFalse\`).
   - **Many mutually exclusive paths keyed off a value** → \`switch\` (\`onCase\`).
   - A Filter or IF only selects items; it does not perform a requested side effect. If the user asks to archive, update, delete, send, or create only matching items, wire the corresponding action node on the matching path.
   - Nested control flow is supported: \`ifNode.onTrue(loopBuilder)\`, \`switchNode.onCase(0, loopBuilder)\`, and \`splitInBatches(sib).onEachBatch(ifElseBuilder)\` all compile and wire correctly. Use them when the semantics genuinely call for it, not as a workaround for empty-list handling.

5. **Input and output indices are 0-based — \`.input(0)\` is the FIRST input**
   - \`.input(0)\` and \`.output(0)\` refer to the **first** input/output. \`.input(1)\` and \`.output(1)\` refer to the **second**. \`.input(1)\` is NOT the first input — it is the second one.
   - This applies everywhere indices are passed: \`.input(n)\`, \`.output(n)\`, \`.onCase(n, ...)\` for switch outputs, and any \`outputIndex\` argument.
   - When wiring N branches to a Merge node, the indices are \`0, 1, ..., N-1\` — never \`1, 2, ..., N\`.
   - Counter-examples to AVOID:
     - WRONG: \`sourceA.to(merge.input(1))\` followed by \`sourceB.to(merge.input(2))\` — this skips input 0 entirely; the first branch is silently dropped.
     - CORRECT: \`sourceA.to(merge.input(0))\` followed by \`sourceB.to(merge.input(1))\`.`;
