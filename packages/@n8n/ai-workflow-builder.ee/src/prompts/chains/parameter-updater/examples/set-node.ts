import type { NodeTypeExamples } from '../types';

export const SET_NODE_EXAMPLES: NodeTypeExamples = {
	patterns: ['n8n-nodes-base.set'],
	content: `
### Set Node Examples

#### Example 1: Simple String Assignment
Current Parameters: {}
Requested Changes: Set message to "Hello World"
Output:
{
  "parameters": [
    { "path": "assignments.assignments.0.id", "type": "string", "value": "id-1" },
    { "path": "assignments.assignments.0.name", "type": "string", "value": "message" },
    { "path": "assignments.assignments.0.value", "type": "string", "value": "Hello World" },
    { "path": "assignments.assignments.0.type", "type": "string", "value": "string" }
  ]
}

#### Example 2: Multiple Type Assignments
Current Parameters: {}
Requested Changes:
- Set productName to "Widget"
- Set price to 19.99
- Set inStock to true

Output:
{
  "parameters": [
    { "path": "assignments.assignments.0.id", "type": "string", "value": "id-1" },
    { "path": "assignments.assignments.0.name", "type": "string", "value": "productName" },
    { "path": "assignments.assignments.0.value", "type": "string", "value": "Widget" },
    { "path": "assignments.assignments.0.type", "type": "string", "value": "string" },
    { "path": "assignments.assignments.1.id", "type": "string", "value": "id-2" },
    { "path": "assignments.assignments.1.name", "type": "string", "value": "price" },
    { "path": "assignments.assignments.1.value", "type": "number", "value": "19.99" },
    { "path": "assignments.assignments.1.type", "type": "string", "value": "number" },
    { "path": "assignments.assignments.2.id", "type": "string", "value": "id-3" },
    { "path": "assignments.assignments.2.name", "type": "string", "value": "inStock" },
    { "path": "assignments.assignments.2.value", "type": "boolean", "value": "true" },
    { "path": "assignments.assignments.2.type", "type": "string", "value": "boolean" }
  ]
}

#### Example 3: Expression-Based Assignments
Current Parameters: {}
Requested Changes:
- Set userId from HTTP Request node
- Calculate totalPrice from quantity and unit price

Output:
{
  "parameters": [
    { "path": "assignments.assignments.0.id", "type": "string", "value": "id-1" },
    { "path": "assignments.assignments.0.name", "type": "string", "value": "userId" },
    { "path": "assignments.assignments.0.value", "type": "string", "value": "={{ $('HTTP Request').item.json.id }}" },
    { "path": "assignments.assignments.0.type", "type": "string", "value": "string" },
    { "path": "assignments.assignments.1.id", "type": "string", "value": "id-2" },
    { "path": "assignments.assignments.1.name", "type": "string", "value": "totalPrice" },
    { "path": "assignments.assignments.1.value", "type": "string", "value": "={{ $('Set').item.json.quantity * $('Set').item.json.unitPrice }}" },
    { "path": "assignments.assignments.1.type", "type": "string", "value": "number" }
  ]
}

#### Example 4: Preserving Existing Assignments
Current Parameters:
{
  "assignments": {
    "assignments": [{ "id": "existing-1", "name": "orderId", "value": "12345", "type": "string" }]
  }
}

Requested Changes:
- Keep orderId
- Add customer name from Form node
- Set processed timestamp

Output:
{
  "parameters": [
    { "path": "assignments.assignments.0.id", "type": "string", "value": "existing-1" },
    { "path": "assignments.assignments.0.name", "type": "string", "value": "orderId" },
    { "path": "assignments.assignments.0.value", "type": "string", "value": "12345" },
    { "path": "assignments.assignments.0.type", "type": "string", "value": "string" },
    { "path": "assignments.assignments.1.id", "type": "string", "value": "id-2" },
    { "path": "assignments.assignments.1.name", "type": "string", "value": "customerName" },
    { "path": "assignments.assignments.1.value", "type": "string", "value": "={{ $('Form').item.json.customerName }}" },
    { "path": "assignments.assignments.1.type", "type": "string", "value": "string" },
    { "path": "assignments.assignments.2.id", "type": "string", "value": "id-3" },
    { "path": "assignments.assignments.2.name", "type": "string", "value": "processedAt" },
    { "path": "assignments.assignments.2.value", "type": "string", "value": "={{ $now.toISO() }}" },
    { "path": "assignments.assignments.2.type", "type": "string", "value": "string" }
  ]
}
`,
};
