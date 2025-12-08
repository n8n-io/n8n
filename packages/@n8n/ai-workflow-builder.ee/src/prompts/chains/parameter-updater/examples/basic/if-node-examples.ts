export const IF_NODE_EXAMPLES = `
### IF Node Examples

#### Example 1: Simple String Condition
Current Parameters: {}
Requested Changes: Check if order status equals "pending"
Expected Output:
{
  "conditions": {
    "options": {
      "caseSensitive": false,
      "leftValue": "",
      "typeValidation": "loose"
    },
    "conditions": [
      {
        "id": "id-1",
        "leftValue": "={{ $('Previous Node').item.json.orderStatus }}",
        "rightValue": "pending",
        "operator": {
          "type": "string",
          "operation": "equals"
        }
      }
    ],
    "combinator": "and"
  }
}

#### Example 2: Check if Field Exists
Current Parameters: {}
Requested Changes: Check if email field exists in the data
Expected Output:
{
  "conditions": {
    "options": {
      "caseSensitive": false,
      "leftValue": "",
      "typeValidation": "loose"
    },
    "conditions": [
      {
        "id": "id-1",
        "leftValue": "={{ $('Previous Node').item.json.email }}",
        "operator": {
          "type": "string",
          "operation": "exists"
        }
      }
    ],
    "combinator": "and"
  }
}

#### Example 3: Multiple Conditions with AND
Current Parameters: {}
Requested Changes: Check if status is active AND score is 50 or higher
Expected Output:
{
  "conditions": {
    "options": {
      "caseSensitive": false,
      "leftValue": "",
      "typeValidation": "loose"
    },
    "conditions": [
      {
        "id": "id-1",
        "leftValue": "={{ $('Set').item.json.status }}",
        "rightValue": "active",
        "operator": {
          "type": "string",
          "operation": "equals"
        }
      },
      {
        "id": "id-2",
        "leftValue": "={{ $('Set').item.json.score }}",
        "rightValue": "50",
        "operator": {
          "type": "number",
          "operation": "gte"
        }
      }
    ],
    "combinator": "and"
  }
}

#### Example 3: IF Node - Complex Multi-Type Conditions
Current Parameters: {}

Requested Changes:
- Check if email is not empty AND verified is true AND permissions array contains "write"

Expected Output:
{
  "conditions": {
    "options": {
      "caseSensitive": true,
      "leftValue": "",
      "typeValidation": "strict"
    },
    "conditions": [
      {
        "id": "id-1",
        "leftValue": "={{ $('Set').item.json.email }}",
        "operator": {
          "type": "string",
          "operation": "notEmpty"
        }
      },
      {
        "id": "id-2",
        "leftValue": "={{ $('Set').item.json.verified }}",
        "operator": {
          "type": "boolean",
          "operation": "true"
        }
      },
      {
        "id": "id-3",
        "leftValue": "={{ $('Set').item.json.permissions }}",
        "rightValue": "write",
        "operator": {
          "type": "array",
          "operation": "contains"
        }
      }
    ],
    "combinator": "and"
  }
}
`;
