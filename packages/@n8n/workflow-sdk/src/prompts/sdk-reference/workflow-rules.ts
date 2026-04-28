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

2. **Handle empty outputs with \`alwaysOutputData: true\`**
   - Nodes that query data (Data Table get, Google Sheets lookup, HTTP Request, etc.) may return 0 items
   - When a node returns 0 items, all downstream nodes are SKIPPED — the workflow chain breaks silently
   - Set \`alwaysOutputData: true\` on any node whose output feeds downstream nodes and might return empty results
   - Common cases: fresh/empty Data Tables, filtered queries, conditional lookups, API searches with no matches
   - Example: \`config: { ..., alwaysOutputData: true }\`

3. **Use \`executeOnce: true\` for single-execution nodes**
   - When a node receives N items but should only execute once (not N times), set \`executeOnce: true\`
   - Common cases: sending a summary notification, generating a report, calling an API that doesn't need per-item execution
   - Example: \`config: { ..., executeOnce: true }\``;
