import type { NodeTypeExamples } from '../types';

/** Generic examples for nodes that don't have specific examples */
export const SIMPLE_UPDATE_EXAMPLES: NodeTypeExamples = {
	patterns: ['*'],
	content: `
## Examples of Parameter Updates

### Example 1: Update HTTP Request URL
Change: "Set the URL to call the weather API for London"
Current parameters: { "url": "https://api.example.com", "method": "GET" }
Output:
{
  "parameters": [
    { "path": "url", "type": "string", "value": "https://api.openweathermap.org/data/2.5/weather?q=London" },
    { "path": "method", "type": "string", "value": "GET" }
  ]
}

### Example 2: Add a header
Change: "Add an ABC key header with value 123"
Current parameters: { "url": "...", "sendHeaders": false }
Output:
{
  "parameters": [
    { "path": "url", "type": "string", "value": "..." },
    { "path": "sendHeaders", "type": "boolean", "value": "true" },
    { "path": "headerParameters.parameters.0.name", "type": "string", "value": "ABC" },
    { "path": "headerParameters.parameters.0.value", "type": "string", "value": "123" }
  ]
}

### Example 3: Update condition (If node)
Change: "Check if temperature is above 25 degrees"
Current parameters: { "conditions": { "conditions": [] } }
Output:
{
  "parameters": [
    { "path": "conditions.options.caseSensitive", "type": "boolean", "value": "false" },
    { "path": "conditions.options.leftValue", "type": "string", "value": "" },
    { "path": "conditions.options.typeValidation", "type": "string", "value": "loose" },
    { "path": "conditions.conditions.0.leftValue", "type": "string", "value": "={{ $('Weather Node').item.json.main.temp }}" },
    { "path": "conditions.conditions.0.rightValue", "type": "number", "value": "25" },
    { "path": "conditions.conditions.0.operator.type", "type": "string", "value": "number" },
    { "path": "conditions.conditions.0.operator.operation", "type": "string", "value": "gt" },
    { "path": "conditions.combinator", "type": "string", "value": "and" }
  ]
}`,
};
