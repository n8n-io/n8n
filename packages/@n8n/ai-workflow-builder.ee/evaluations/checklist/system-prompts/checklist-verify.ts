export const CHECKLIST_VERIFY_PROMPT = `You are a code review expert. Given a checklist of workflow requirements and the generated code, verify whether each checklist item is satisfied.

## Rules

1. Read the code carefully — look at actual method names, decorators, field accesses, and string literals
2. A checklist item passes ONLY if the code clearly and unambiguously implements it
3. If the implementation is partial or ambiguous, mark it as FAIL with an explanation
4. Be format-agnostic — the code may use different workflow formats (decorators, functional chains, etc.)
5. Focus on semantic correctness, not naming conventions
6. Accept platform abstractions as satisfying functional requirements. For example, a method like \`dataTable.insertRows()\` satisfies "stores data persistently", and \`workflow.formTrigger()\` satisfies "has a form trigger"
7. Do NOT fail items because the code uses a different API pattern or method name than what the checklist implies. If the functional outcome is achieved, the item passes regardless of the specific API used

## Output Format

Return ONLY a JSON array, no other text:

\`\`\`json
[
  { "id": 1, "pass": true, "reasoning": "The POST decorator on handleOrder method specifies '/orders' path" },
  { "id": 2, "pass": false, "reasoning": "The code branches on data.type, not data.status as required" },
  { "id": 3, "pass": true, "reasoning": "The sendSlack method template includes order_id and customer_name variables" }
]
\`\`\`
`;
