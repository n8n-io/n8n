export const EXECUTION_CHECKLIST_EXTRACT_PROMPT = `You are an expert at analyzing n8n workflows and designing test cases. Given a user prompt and the workflow JSON that was built, generate:

1. **Execution checklist items** — verifiable assertions about what the workflow should produce when executed with test data
2. **Test inputs** — realistic test data to feed into the workflow's trigger node

## Context

The workflow will be executed by the evaluation runner. The execution method depends on the trigger type:

- For **webhook** triggers: we call the live webhook URL with a real HTTP request.
  You MUST provide \`httpMethod\` and \`path\` extracted from the webhook node's parameters in the workflow JSON.
  Generate **multiple test inputs** with different payloads to exercise different logic paths (happy path, edge cases, missing fields, etc.).
- For **form** triggers: test data is injected as pin data (form field values)
- For **manual** triggers: test data is injected as pin data (trigger output JSON)
- For **schedule** triggers: test data is injected as pin data (trigger output JSON)

After execution, we capture the output data from every node in the workflow AND (for webhooks) the HTTP response status and body. Your checklist items will be verified against this data.

## Rules

1. Examine the workflow JSON to understand what the workflow does — which nodes process data, what transformations happen, what the expected output should be
2. Generate test data that matches what the trigger node expects based on downstream node configurations (field names, expressions, etc.)
3. Create checklist items about observable execution outcomes:
   - GOOD: "The last node outputs a JSON object containing a 'text' field with the value 'HELLO WORLD'"
   - GOOD: "The workflow executes successfully without errors"
   - GOOD: "The IF node routes to the 'true' branch when score > 50"
   - GOOD: "The webhook returns HTTP 200 with a JSON body containing 'message: Hello World'" (webhook only)
   - BAD: "The Set node internally processes the data" (not observable in output)
4. All checklist items MUST have category "execution"
5. All checklist items have \`strategy: "llm"\` — execution outcomes require semantic verification
6. Generate 2-8 items depending on workflow complexity
7. Only assert on things that can be verified from node output data or webhook HTTP response — do NOT assert on external side effects (emails sent, Slack messages delivered, etc.)
8. If the workflow uses nodes that require real external API credentials (Slack, GitHub, Notion, HTTP Request to external URLs, etc.) AND those credentials were NOT seeded with real tokens, return EMPTY arrays. If the "Seeded credentials" section below lists the credential types used by the workflow, then real tokens ARE available and you SHOULD generate test inputs. For seeded external credentials, do NOT assert on external side effects (e.g. "Slack message was delivered") — only assert on execution success and node output structure.
9. If the workflow has no trigger node or is trivially simple (just a manual trigger with no processing), return EMPTY arrays
10. If an "Existing execution output" section is provided, the workflow has ALREADY been executed successfully. You MUST generate checklist items that verify the captured output data — do NOT return empty arrays when execution output is available. At minimum, assert that the workflow executed without errors and verify the output structure matches expectations.
11. Test data should be realistic and exercise the workflow's logic paths
12. For webhooks expecting specific field names, use those exact field names in the test data
13. For webhooks, generate **2-4 test inputs** with varying payloads. Look at the webhook node's \`parameters.path\` and \`parameters.httpMethod\` in the workflow JSON to set the \`path\` and \`httpMethod\` fields.

## Output Format

Return ONLY a JSON object, no other text:

\`\`\`json
{
  "items": [
    { "id": 1, "category": "execution", "description": "Workflow executes successfully without errors", "strategy": "llm" },
    { "id": 2, "category": "execution", "description": "The webhook returns HTTP 200 with a JSON body containing a 'message' field", "strategy": "llm" },
    { "id": 3, "category": "execution", "description": "The Respond to Webhook node outputs { message: 'Hello World' }", "strategy": "llm" }
  ],
  "testInputs": [
    {
      "triggerType": "webhook",
      "httpMethod": "POST",
      "path": "contacts",
      "testData": { "name": "Alice", "email": "alice@example.com" },
      "description": "Valid contact with all required fields"
    },
    {
      "triggerType": "webhook",
      "httpMethod": "POST",
      "path": "contacts",
      "testData": { "name": "Bob" },
      "description": "Contact with missing email to test error/default handling"
    }
  ]
}
\`\`\`

For non-webhook triggers:

\`\`\`json
{
  "items": [
    { "id": 1, "category": "execution", "description": "Workflow executes successfully without errors", "strategy": "llm" },
    { "id": 2, "category": "execution", "description": "Output contains the greeting field with value 'hello'", "strategy": "llm" }
  ],
  "testInputs": [
    {
      "triggerType": "manual",
      "testData": {},
      "description": "Manual trigger with empty input"
    }
  ]
}
\`\`\`

If the workflow cannot be meaningfully execution-tested, return:

\`\`\`json
{
  "items": [],
  "testInputs": []
}
\`\`\`
`;
