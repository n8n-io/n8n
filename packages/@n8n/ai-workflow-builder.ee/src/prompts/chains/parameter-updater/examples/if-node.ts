import type { NodeTypeExamples } from '../types';

export const IF_NODE_EXAMPLES: NodeTypeExamples = {
	patterns: ['n8n-nodes-base.if'],
	content: `
### IF Node Examples

#### Example 1: Simple String Condition
Current Parameters: {}
Requested Changes: Check if order status equals "pending"
Output:
{
  "parameters": [
    { "path": "conditions.options.caseSensitive", "type": "boolean", "value": "false" },
    { "path": "conditions.options.leftValue", "type": "string", "value": "" },
    { "path": "conditions.options.typeValidation", "type": "string", "value": "loose" },
    { "path": "conditions.conditions.0.id", "type": "string", "value": "id-1" },
    { "path": "conditions.conditions.0.leftValue", "type": "string", "value": "={{ $('Previous Node').item.json.orderStatus }}" },
    { "path": "conditions.conditions.0.rightValue", "type": "string", "value": "pending" },
    { "path": "conditions.conditions.0.operator.type", "type": "string", "value": "string" },
    { "path": "conditions.conditions.0.operator.operation", "type": "string", "value": "equals" },
    { "path": "conditions.combinator", "type": "string", "value": "and" }
  ]
}

#### Example 2: Check if Field Exists
Current Parameters: {}
Requested Changes: Check if email field exists in the data
Output:
{
  "parameters": [
    { "path": "conditions.options.caseSensitive", "type": "boolean", "value": "false" },
    { "path": "conditions.options.leftValue", "type": "string", "value": "" },
    { "path": "conditions.options.typeValidation", "type": "string", "value": "loose" },
    { "path": "conditions.conditions.0.id", "type": "string", "value": "id-1" },
    { "path": "conditions.conditions.0.leftValue", "type": "string", "value": "={{ $('Previous Node').item.json.email }}" },
    { "path": "conditions.conditions.0.operator.type", "type": "string", "value": "string" },
    { "path": "conditions.conditions.0.operator.operation", "type": "string", "value": "exists" },
    { "path": "conditions.combinator", "type": "string", "value": "and" }
  ]
}

#### Example 3: Multiple Conditions with AND
Current Parameters: {}
Requested Changes: Check if status is active AND score is 50 or higher
Output:
{
  "parameters": [
    { "path": "conditions.options.caseSensitive", "type": "boolean", "value": "false" },
    { "path": "conditions.options.leftValue", "type": "string", "value": "" },
    { "path": "conditions.options.typeValidation", "type": "string", "value": "loose" },
    { "path": "conditions.conditions.0.id", "type": "string", "value": "id-1" },
    { "path": "conditions.conditions.0.leftValue", "type": "string", "value": "={{ $('Set').item.json.status }}" },
    { "path": "conditions.conditions.0.rightValue", "type": "string", "value": "active" },
    { "path": "conditions.conditions.0.operator.type", "type": "string", "value": "string" },
    { "path": "conditions.conditions.0.operator.operation", "type": "string", "value": "equals" },
    { "path": "conditions.conditions.1.id", "type": "string", "value": "id-2" },
    { "path": "conditions.conditions.1.leftValue", "type": "string", "value": "={{ $('Set').item.json.score }}" },
    { "path": "conditions.conditions.1.rightValue", "type": "string", "value": "50" },
    { "path": "conditions.conditions.1.operator.type", "type": "string", "value": "number" },
    { "path": "conditions.conditions.1.operator.operation", "type": "string", "value": "gte" },
    { "path": "conditions.combinator", "type": "string", "value": "and" }
  ]
}

#### Example 4: Boolean Condition Check
Current Parameters: {}
Requested Changes: Check if verified is true
Output:
{
  "parameters": [
    { "path": "conditions.options.caseSensitive", "type": "boolean", "value": "false" },
    { "path": "conditions.options.leftValue", "type": "string", "value": "" },
    { "path": "conditions.options.typeValidation", "type": "string", "value": "loose" },
    { "path": "conditions.conditions.0.id", "type": "string", "value": "id-1" },
    { "path": "conditions.conditions.0.leftValue", "type": "string", "value": "={{ $('Set').item.json.verified }}" },
    { "path": "conditions.conditions.0.operator.type", "type": "string", "value": "boolean" },
    { "path": "conditions.conditions.0.operator.operation", "type": "string", "value": "true" },
    { "path": "conditions.combinator", "type": "string", "value": "and" }
  ]
}
`,
};
