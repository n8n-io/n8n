import type { NodeTypeGuide } from './types';

export const SET_NODE_GUIDE: NodeTypeGuide = {
	patterns: ['n8n-nodes-base.set'],
	content: `
### Set Node Updates - Comprehensive Type Handling Guide

The Set node uses assignments to create or modify data fields. Each assignment has a specific type that determines how the value is formatted and processed.

#### Assignment Structure
\`\`\`json
{
  "id": "unique-id",
  "name": "field_name",
  "value": "field_value",  // Format depends on type
  "type": "string|number|boolean|array|object"
}
\`\`\`

**CRITICAL**: ALWAYS use "value" field for ALL types. NEVER use type-specific fields like "stringValue", "numberValue", "booleanValue", etc. The field is ALWAYS named "value" regardless of the type.

#### Type-Specific Value Formatting

##### String Type
- **Format**: Direct string value or expression
- **Examples**:
  - Literal: \`"Hello World"\`
  - Expression: \`"={{ $('Previous Node').item.json.message }}"\`
  - With embedded expressions: \`"=Order #{{ $('Set').item.json.orderId }} processed"\`
- **Use when**: Text data, IDs, names, messages, dates as strings

##### Number Type
- **Format**: Direct numeric value (NOT as a string)
- **Examples**:
  - Integer: \`123\`
  - Decimal: \`45.67\`
  - Negative: \`-100\`
  - Expression: \`"={{ $('HTTP Request').item.json.count }}"\`
- **CRITICAL**: Use actual numbers, not strings: \`123\` not \`"123"\`
- **Use when**: Quantities, prices, scores, numeric calculations

##### Boolean Type
- **Format**: Direct boolean value (NOT as a string)
- **Examples**:
  - True: \`true\`
  - False: \`false\`
  - Expression: \`"={{ $('IF').item.json.isActive }}"\`
- **CRITICAL**: Use actual booleans, not strings: \`true\` not \`"true"\`
- **CRITICAL**: The field name is "value", NOT "booleanValue"
- **Use when**: Flags, toggles, yes/no values, active/inactive states

##### Array Type
- **Format**: Expression or literal that evaluates to an array
- **Examples**:
  - Simple array: \`[1, 2, 3]\`
  - String array: \`["apple", "banana", "orange"]\`
  - Expression: \`"={{ $('Previous Node').item.json.items }}"\`
- **CRITICAL**: Do not use \`JSON.stringify()\` unless you intentionally want a string field
- **Use when**: Lists, collections, multiple values

##### Object Type
- **Format**: Expression or literal that evaluates to a plain object
- **Examples**:
  - Simple object: \`{ name: "John", age: 30 }\`
  - Nested object: \`{ user: { id: 123, role: "admin" } }\`
  - Expression: \`"={{ $('Set').item.json.userData }}"\`
- **CRITICAL**: Do not use \`JSON.stringify()\` unless you intentionally want a string field
- **Use when**: Complex data structures, grouped properties

#### Important Type Selection Rules

1. **Analyze the requested data type**:
   - "Set count to 5" → number type with value: \`5\`
   - "Set message to hello" → string type with value: \`"hello"\`
   - "Set active to true" → boolean type with value: \`true\`
   - "Set tags to apple, banana" → array type with value: \`["apple", "banana"]\`

2. **Expression handling**:
   - All types can use expressions with \`"={{ ... }}"\`
   - For arrays/objects from expressions, return the array/object directly

3. **Common mistakes to avoid**:
   - WRONG: Setting number as string: \`{ "value": "123", "type": "number" }\`
   - CORRECT: \`{ "value": 123, "type": "number" }\`
   - WRONG: Setting boolean as string: \`{ "value": "false", "type": "boolean" }\`
   - CORRECT: \`{ "value": false, "type": "boolean" }\`
   - WRONG: Using type-specific field names: \`{ "booleanValue": true, "type": "boolean" }\`
   - CORRECT: \`{ "value": true, "type": "boolean" }\`
   - WRONG: Stringifying an array: \`{ "value": "={{ JSON.stringify($json.items) }}", "type": "array" }\`
   - CORRECT: \`{ "value": "={{ $json.items }}", "type": "array" }\``,
};
