/**
 * Workflow rules — strict constraints for code generation.
 *
 * Consumed by:
 * - Code Builder Agent (ai-workflow-builder.ee)
 * - MCP Server (external SDK reference)
 * - Instance AI builder sub-agent
 */
export const WORKFLOW_RULES = `Follow these rules strictly when generating workflows:

1. **Always use newCredential() for authentication**
   - When a node needs credentials, always use \`newCredential('Name')\` in the credentials config
   - NEVER use placeholder strings, fake API keys, or hardcoded auth values
   - Example: \`credentials: { slackApi: newCredential('Slack Bot') }\`
   - The credential type must match what the node expects

2. **Trust empty item lists — don't synthesize fake items**
   - When a query returns 0 items, downstream nodes simply don't run for that execution. For scheduled or polling triggers this is the correct "nothing to do this round" signal — the next run will execute normally when data appears.
   - DO NOT add \`alwaysOutputData: true\` just to "keep the chain alive." Forcing an empty \`{}\` item downstream is what causes \`undefined\` reads, failed HTTP calls to \`GET undefined\`, and Code-node crashes on missing fields.
   - DO NOT add an IF gate before a loop to check "has items?" — loops (\`splitInBatches\`, per-item nodes, \`filter\`) already no-op on empty input. The gate is redundant and adds a failure surface.
   - \`alwaysOutputData: true\` is only correct when you specifically need a downstream branch to run on the "empty" case — e.g. a dedicated "no matches found" notification path. In that case, pair it with an \`IF\` that explicitly checks for the empty case and routes accordingly. Never use it as a default.
   - To drop invalid items mid-pipeline, use a \`filter\` node. A \`filter\` that rejects everything emits 0 items and the chain correctly stops — no \`IF\` + \`splitInBatches\` composition needed.

3. **Use \`executeOnce: true\` for single-execution nodes**
   - When a node receives N items but should only execute once (not N times), set \`executeOnce: true\`
   - Common cases: sending a summary notification, generating a report, calling an API that doesn't need per-item execution
   - Example: \`config: { ..., executeOnce: true }\`

4. **Pick the right control-flow primitive**
   - **Per-item loop with side effects (fetch, embed, write)** → \`splitInBatches\` with \`batchSize: 1\` feeding the per-item work, loop back via \`nextBatch\`. No \`IF\` gate before it.
   - **Drop items that don't match a predicate** → \`filter\`. It emits 0 items when nothing matches, and the chain stops cleanly.
   - **Two mutually exclusive paths that both do real work** → \`IF\` (\`onTrue\` / \`onFalse\`).
   - **Many mutually exclusive paths keyed off a value** → \`switch\` (\`onCase\`).
   - Nested control flow is supported: \`ifNode.onTrue(loopBuilder)\`, \`switchNode.onCase(0, loopBuilder)\`, and \`splitInBatches(sib).onEachBatch(ifElseBuilder)\` all compile and wire correctly. Use them when the semantics genuinely call for it, not as a workaround for empty-list handling.`;
