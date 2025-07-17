export const IF_NODE_GUIDE = `
### IF Node Updates - Comprehensive Guide

The IF node uses a complex filter structure for conditional logic. Understanding the correct operator format is crucial.

#### IF Node Structure
\`\`\`json
{
  "conditions": {
    "options": {
      "caseSensitive": false,      // For string comparisons
      "leftValue": "",              // Optional default left value
      "typeValidation": "loose"     // "strict" or "loose"
    },
    "conditions": [
      {
        "id": "unique-id",          // Optional, auto-generated
        "leftValue": "={{ $('Node').item.json.field }}",
        "rightValue": "value",      // Can be expression or literal
        "operator": {
          "type": "string|number|boolean|dateTime|array|object",
          "operation": "specific-operation"
        }
      }
    ],
    "combinator": "and"  // "and" or "or"
  }
}
\`\`\`

#### Complete Operator Reference

##### String Operators
- **exists**: Check if value exists (singleValue: true, no rightValue needed)
  \`{ "type": "string", "operation": "exists" }\`
- **notExists**: Check if value doesn't exist (singleValue: true)
  \`{ "type": "string", "operation": "notExists" }\`
- **empty**: Check if string is empty (singleValue: true)
  \`{ "type": "string", "operation": "empty" }\`
- **notEmpty**: Check if string is not empty (singleValue: true)
  \`{ "type": "string", "operation": "notEmpty" }\`
- **equals**: Exact match
  \`{ "type": "string", "operation": "equals" }\`
- **notEquals**: Not equal
  \`{ "type": "string", "operation": "notEquals" }\`
- **contains**: Contains substring
  \`{ "type": "string", "operation": "contains" }\`
- **notContains**: Doesn't contain substring
  \`{ "type": "string", "operation": "notContains" }\`
- **startsWith**: Starts with string
  \`{ "type": "string", "operation": "startsWith" }\`
- **notStartsWith**: Doesn't start with
  \`{ "type": "string", "operation": "notStartsWith" }\`
- **endsWith**: Ends with string
  \`{ "type": "string", "operation": "endsWith" }\`
- **notEndsWith**: Doesn't end with
  \`{ "type": "string", "operation": "notEndsWith" }\`
- **regex**: Matches regex pattern
  \`{ "type": "string", "operation": "regex" }\`
- **notRegex**: Doesn't match regex
  \`{ "type": "string", "operation": "notRegex" }\`

##### Number Operators
- **exists**: Check if number exists (singleValue: true)
  \`{ "type": "number", "operation": "exists" }\`
- **notExists**: Check if number doesn't exist (singleValue: true)
  \`{ "type": "number", "operation": "notExists" }\`
- **equals**: Equal to
  \`{ "type": "number", "operation": "equals" }\`
- **notEquals**: Not equal to
  \`{ "type": "number", "operation": "notEquals" }\`
- **gt**: Greater than
  \`{ "type": "number", "operation": "gt" }\`
- **lt**: Less than
  \`{ "type": "number", "operation": "lt" }\`
- **gte**: Greater than or equal
  \`{ "type": "number", "operation": "gte" }\`
- **lte**: Less than or equal
  \`{ "type": "number", "operation": "lte" }\`

##### DateTime Operators
- **exists**: Check if date exists (singleValue: true)
  \`{ "type": "dateTime", "operation": "exists" }\`
- **notExists**: Check if date doesn't exist (singleValue: true)
  \`{ "type": "dateTime", "operation": "notExists" }\`
- **equals**: Same date/time
  \`{ "type": "dateTime", "operation": "equals" }\`
- **notEquals**: Different date/time
  \`{ "type": "dateTime", "operation": "notEquals" }\`
- **after**: After date
  \`{ "type": "dateTime", "operation": "after" }\`
- **before**: Before date
  \`{ "type": "dateTime", "operation": "before" }\`
- **afterOrEquals**: After or same date
  \`{ "type": "dateTime", "operation": "afterOrEquals" }\`
- **beforeOrEquals**: Before or same date
  \`{ "type": "dateTime", "operation": "beforeOrEquals" }\`

##### Boolean Operators
- **exists**: Check if boolean exists (singleValue: true)
  \`{ "type": "boolean", "operation": "exists" }\`
- **notExists**: Check if boolean doesn't exist (singleValue: true)
  \`{ "type": "boolean", "operation": "notExists" }\`
- **true**: Is true (singleValue: true)
  \`{ "type": "boolean", "operation": "true" }\`
- **false**: Is false (singleValue: true)
  \`{ "type": "boolean", "operation": "false" }\`
- **equals**: Equal to boolean value
  \`{ "type": "boolean", "operation": "equals" }\`
- **notEquals**: Not equal to boolean value
  \`{ "type": "boolean", "operation": "notEquals" }\`

##### Array Operators
- **exists**: Check if array exists (singleValue: true)
  \`{ "type": "array", "operation": "exists" }\`
- **notExists**: Check if array doesn't exist (singleValue: true)
  \`{ "type": "array", "operation": "notExists" }\`
- **empty**: Array is empty (singleValue: true)
  \`{ "type": "array", "operation": "empty" }\`
- **notEmpty**: Array is not empty (singleValue: true)
  \`{ "type": "array", "operation": "notEmpty" }\`
- **contains**: Array contains value
  \`{ "type": "array", "operation": "contains" }\`
- **notContains**: Array doesn't contain value
  \`{ "type": "array", "operation": "notContains" }\`
- **lengthEquals**: Array length equals
  \`{ "type": "array", "operation": "lengthEquals" }\`
- **lengthNotEquals**: Array length not equals
  \`{ "type": "array", "operation": "lengthNotEquals" }\`
- **lengthGt**: Array length greater than
  \`{ "type": "array", "operation": "lengthGt" }\`
- **lengthLt**: Array length less than
  \`{ "type": "array", "operation": "lengthLt" }\`
- **lengthGte**: Array length greater or equal
  \`{ "type": "array", "operation": "lengthGte" }\`
- **lengthLte**: Array length less or equal
  \`{ "type": "array", "operation": "lengthLte" }\`

##### Object Operators
- **exists**: Check if object exists (singleValue: true)
  \`{ "type": "object", "operation": "exists" }\`
- **notExists**: Check if object doesn't exist (singleValue: true)
  \`{ "type": "object", "operation": "notExists" }\`
- **empty**: Object is empty (singleValue: true)
  \`{ "type": "object", "operation": "empty" }\`
- **notEmpty**: Object is not empty (singleValue: true)
  \`{ "type": "object", "operation": "notEmpty" }\`

#### Important Notes:
1. **singleValue operators**: When using exists, notExists, empty, notEmpty, true, or false operators, DO NOT include a rightValue in the condition
2. **Expression values**: Both leftValue and rightValue can be expressions using \`={{ ... }}\` syntax
3. **Type matching**: The operator type must match the data type you're comparing
4. **Case sensitivity**: Only applies to string comparisons when caseSensitive is true in options
5. **Type validation**: "loose" allows type coercion, "strict" requires exact type matches`;
