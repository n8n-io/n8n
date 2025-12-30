import type { NodeTypeExamples } from '../types';

export const SWITCH_NODE_EXAMPLES: NodeTypeExamples = {
	patterns: ['n8n-nodes-base.switch'],
	content: `
### Switch Node Examples

#### Example 1: Route by Amount Tiers (Purchase Approval)
Current Parameters: { "mode": "rules" }
Requested Changes: Route under $100 to auto-approve, $100-$1000 to manager, over $1000 to finance

Output:
{
  "parameters": [
    { "path": "mode", "type": "string", "value": "rules" },
    { "path": "rules.values.0.conditions.options.caseSensitive", "type": "boolean", "value": "true" },
    { "path": "rules.values.0.conditions.options.leftValue", "type": "string", "value": "" },
    { "path": "rules.values.0.conditions.options.typeValidation", "type": "string", "value": "strict" },
    { "path": "rules.values.0.conditions.conditions.0.leftValue", "type": "string", "value": "={{ $json.amount }}" },
    { "path": "rules.values.0.conditions.conditions.0.rightValue", "type": "number", "value": "100" },
    { "path": "rules.values.0.conditions.conditions.0.operator.type", "type": "string", "value": "number" },
    { "path": "rules.values.0.conditions.conditions.0.operator.operation", "type": "string", "value": "lt" },
    { "path": "rules.values.0.conditions.combinator", "type": "string", "value": "and" },
    { "path": "rules.values.0.renameOutput", "type": "boolean", "value": "true" },
    { "path": "rules.values.0.outputKey", "type": "string", "value": "Auto-Approve" },
    { "path": "rules.values.1.conditions.options.caseSensitive", "type": "boolean", "value": "true" },
    { "path": "rules.values.1.conditions.options.leftValue", "type": "string", "value": "" },
    { "path": "rules.values.1.conditions.options.typeValidation", "type": "string", "value": "strict" },
    { "path": "rules.values.1.conditions.conditions.0.leftValue", "type": "string", "value": "={{ $json.amount }}" },
    { "path": "rules.values.1.conditions.conditions.0.rightValue", "type": "number", "value": "100" },
    { "path": "rules.values.1.conditions.conditions.0.operator.type", "type": "string", "value": "number" },
    { "path": "rules.values.1.conditions.conditions.0.operator.operation", "type": "string", "value": "gte" },
    { "path": "rules.values.1.conditions.conditions.1.leftValue", "type": "string", "value": "={{ $json.amount }}" },
    { "path": "rules.values.1.conditions.conditions.1.rightValue", "type": "number", "value": "1000" },
    { "path": "rules.values.1.conditions.conditions.1.operator.type", "type": "string", "value": "number" },
    { "path": "rules.values.1.conditions.conditions.1.operator.operation", "type": "string", "value": "lte" },
    { "path": "rules.values.1.conditions.combinator", "type": "string", "value": "and" },
    { "path": "rules.values.1.renameOutput", "type": "boolean", "value": "true" },
    { "path": "rules.values.1.outputKey", "type": "string", "value": "Manager Review" },
    { "path": "rules.values.2.conditions.options.caseSensitive", "type": "boolean", "value": "true" },
    { "path": "rules.values.2.conditions.options.leftValue", "type": "string", "value": "" },
    { "path": "rules.values.2.conditions.options.typeValidation", "type": "string", "value": "strict" },
    { "path": "rules.values.2.conditions.conditions.0.leftValue", "type": "string", "value": "={{ $json.amount }}" },
    { "path": "rules.values.2.conditions.conditions.0.rightValue", "type": "number", "value": "1000" },
    { "path": "rules.values.2.conditions.conditions.0.operator.type", "type": "string", "value": "number" },
    { "path": "rules.values.2.conditions.conditions.0.operator.operation", "type": "string", "value": "gt" },
    { "path": "rules.values.2.conditions.combinator", "type": "string", "value": "and" },
    { "path": "rules.values.2.renameOutput", "type": "boolean", "value": "true" },
    { "path": "rules.values.2.outputKey", "type": "string", "value": "Finance Review" }
  ]
}

#### Example 2: Route by Status String
Current Parameters: { "mode": "rules" }
Requested Changes: Route by order status - pending, processing, completed

Output:
{
  "parameters": [
    { "path": "mode", "type": "string", "value": "rules" },
    { "path": "rules.values.0.conditions.options.caseSensitive", "type": "boolean", "value": "false" },
    { "path": "rules.values.0.conditions.options.leftValue", "type": "string", "value": "" },
    { "path": "rules.values.0.conditions.options.typeValidation", "type": "string", "value": "loose" },
    { "path": "rules.values.0.conditions.conditions.0.leftValue", "type": "string", "value": "={{ $json.status }}" },
    { "path": "rules.values.0.conditions.conditions.0.rightValue", "type": "string", "value": "pending" },
    { "path": "rules.values.0.conditions.conditions.0.operator.type", "type": "string", "value": "string" },
    { "path": "rules.values.0.conditions.conditions.0.operator.operation", "type": "string", "value": "equals" },
    { "path": "rules.values.0.conditions.combinator", "type": "string", "value": "and" },
    { "path": "rules.values.0.renameOutput", "type": "boolean", "value": "true" },
    { "path": "rules.values.0.outputKey", "type": "string", "value": "Pending" },
    { "path": "rules.values.1.conditions.options.caseSensitive", "type": "boolean", "value": "false" },
    { "path": "rules.values.1.conditions.options.leftValue", "type": "string", "value": "" },
    { "path": "rules.values.1.conditions.options.typeValidation", "type": "string", "value": "loose" },
    { "path": "rules.values.1.conditions.conditions.0.leftValue", "type": "string", "value": "={{ $json.status }}" },
    { "path": "rules.values.1.conditions.conditions.0.rightValue", "type": "string", "value": "processing" },
    { "path": "rules.values.1.conditions.conditions.0.operator.type", "type": "string", "value": "string" },
    { "path": "rules.values.1.conditions.conditions.0.operator.operation", "type": "string", "value": "equals" },
    { "path": "rules.values.1.conditions.combinator", "type": "string", "value": "and" },
    { "path": "rules.values.1.renameOutput", "type": "boolean", "value": "true" },
    { "path": "rules.values.1.outputKey", "type": "string", "value": "Processing" },
    { "path": "rules.values.2.conditions.options.caseSensitive", "type": "boolean", "value": "false" },
    { "path": "rules.values.2.conditions.options.leftValue", "type": "string", "value": "" },
    { "path": "rules.values.2.conditions.options.typeValidation", "type": "string", "value": "loose" },
    { "path": "rules.values.2.conditions.conditions.0.leftValue", "type": "string", "value": "={{ $json.status }}" },
    { "path": "rules.values.2.conditions.conditions.0.rightValue", "type": "string", "value": "completed" },
    { "path": "rules.values.2.conditions.conditions.0.operator.type", "type": "string", "value": "string" },
    { "path": "rules.values.2.conditions.conditions.0.operator.operation", "type": "string", "value": "equals" },
    { "path": "rules.values.2.conditions.combinator", "type": "string", "value": "and" },
    { "path": "rules.values.2.renameOutput", "type": "boolean", "value": "true" },
    { "path": "rules.values.2.outputKey", "type": "string", "value": "Completed" }
  ]
}
`,
};
