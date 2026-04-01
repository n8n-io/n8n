export const CHECKLIST_EXTRACT_PROMPT = `You are an expert at analyzing natural language requests directed at an AI assistant that can build and manage n8n workflows. Given a user prompt, extract a structured checklist of requirements that a correct agent response must satisfy.

## Categories

- **structure**: Architectural requirements about workflows, nodes, connections, triggers, branches, and flow control
  - Examples: "Creates a workflow with an HTTP POST trigger on /orders", "Workflow branches based on order type", "Workflow has 3 parallel paths", "Workflow loops over items", "Creates a workflow with a form trigger at /feedback", "POST endpoint is protected by basic auth", "Workflow invokes an enrichment subworkflow"
- **data**: Requirements about specific parameters, field names, expressions, data transformations, and stored data
  - Examples: "Slack message includes order_id", "Filters items where amount > 100", "Maps customer.name to recipient", "Stores submission in 'feedback' data table", "Data table has columns: name, email, score", "Returns an HTML dashboard page"
- **behavior**: Requirements about the agent's end-to-end actions — what it should do, execute, create, or respond with
  - Examples: "Executes the workflow after creating it", "Creates a data table named 'submissions'", "Queries existing workflows before creating a new one", "Activates the workflow", "Responds with a summary of what was created", "Asks for confirmation before executing", "Creates credentials for the Slack integration"

## Verification Strategy

For each checklist item, classify its verification strategy:

- **programmatic**: The item can be verified by inspecting the workflow JSON alone using deterministic structural checks. Use this for requirements about node existence, node connections, trigger types, node counts, connection topology, and node parameter values.
- **llm**: The item requires semantic understanding to verify — e.g., evaluating whether a text description matches, whether behavior was correctly exhibited across tool calls, or whether data transformations are semantically correct.

When strategy is "programmatic", you MUST include a \`check\` object with one of the following types:

\`\`\`
{ "type": "node-exists", "nodeType": "<n8n node type string>" }
{ "type": "node-connected", "nodeType": "<n8n node type string>" }
{ "type": "trigger-type", "expectedTriggerType": "<n8n trigger node type string>" }
{ "type": "node-count-gte", "minCount": <number> }
{ "type": "connection-exists", "sourceNodeType": "<source type>", "targetNodeType": "<target type>" }
{ "type": "node-parameter", "nodeType": "<node type>", "parameterPath": "<dot-separated path>", "expectedValue": <value> }
\`\`\`

Node type strings use the n8n internal format, e.g. "n8n-nodes-base.httpRequest", "n8n-nodes-base.webhook", "n8n-nodes-base.if", "n8n-nodes-base.slack", etc.

## Rules

1. Checklist items must describe FUNCTIONAL requirements from the user's perspective. Focus on what the agent should accomplish, not how it should accomplish it internally.
   - BAD: "Calls the create-workflow tool" (references internal tool names)
   - BAD: "Uses the n8n REST API to create a workflow" (references implementation detail)
   - GOOD: "Creates a workflow with an HTTP trigger"
   - GOOD: "Executes the workflow and reports the result"

2. When the prompt mentions third-party services by brand name (e.g., "Airtable", "Google Sheets", "Google Drive", "Notion database"), extract the FUNCTIONAL requirement rather than the brand name for storage-related tasks, since the agent may use n8n data tables or other abstractions.
   - BAD: "Stores data in Airtable"
   - GOOD: "Stores data in a persistent data table"
   - Exception: Keep brand names for external API integrations that truly are service-specific (e.g., "Sends a Slack message", "Creates a GitHub issue")

3. Do NOT create checklist items for features that the agent cannot control (e.g., n8n UI rendering, platform-specific display). Only include observable outcomes.

4. Extract 5-15 checklist items depending on prompt complexity

5. Each item must be specific enough to verify by examining the agent's actions and outputs, but must NOT prescribe implementation details like exact tool names, API calls, or internal method names.
   - BAD: "Uses insertRows to add data to the table" (prescribes method name)
   - BAD: "Calls workflow.activate() after creation" (prescribes API call)
   - GOOD: "Inserts submitted data into the feedback table"
   - GOOD: "Activates the workflow after creating it"

6. Cover both the happy path and any explicitly mentioned edge cases
7. For workflow triggers: specify the type (HTTP, Cron, Webhook, Form) and any paths/expressions
8. For branches: specify what condition drives the branching
9. For data: specify exact field names mentioned in the prompt
10. ONLY extract requirements that are explicitly stated or directly implied by the prompt — do NOT add requirements the prompt doesn't mention
11. For multi-step tasks: extract each distinct action as a separate checklist item (e.g., "Creates the workflow", "Executes the workflow", "Reports the execution result")
12. For data tables: require specific table names and column names mentioned in the prompt
13. For credentials: require that appropriate credentials are set up for the services being used
14. For workflow execution: specify whether the workflow should be executed and what the expected outcome is
15. For conversational requirements: specify what information the agent should communicate back to the user
16. Prefer "programmatic" strategy whenever the requirement can be deterministically checked against the workflow JSON. Reserve "llm" for items requiring judgment or cross-referencing tool call logs and agent text.

## Output Format

Return ONLY a JSON array, no other text:

\`\`\`json
[
  { "id": 1, "category": "structure", "description": "Creates a workflow with an HTTP POST trigger on /orders", "strategy": "programmatic", "check": { "type": "trigger-type", "expectedTriggerType": "n8n-nodes-base.webhook" } },
  { "id": 2, "category": "structure", "description": "Workflow branches based on order.status field", "strategy": "llm" },
  { "id": 3, "category": "data", "description": "Slack message includes order_id and customer_name", "strategy": "llm" },
  { "id": 4, "category": "behavior", "description": "Executes the workflow after creating it", "strategy": "llm" },
  { "id": 5, "category": "structure", "description": "Workflow contains a Slack node", "strategy": "programmatic", "check": { "type": "node-exists", "nodeType": "n8n-nodes-base.slack" } }
]
\`\`\`
`;
