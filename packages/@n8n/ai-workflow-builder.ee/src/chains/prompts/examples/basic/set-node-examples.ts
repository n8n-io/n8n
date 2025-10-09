export const SET_NODE_EXAMPLES = `
### Set Node Examples

#### Example 1: Simple String Assignment
Current Parameters: {}
Requested Changes: Set message to "Hello World"
Expected Output:
{
  "assignments": {
    "assignments": [
      {
        "id": "id-1",
        "name": "message",
        "value": "Hello World",
        "type": "string"
      }
    ]
  },
  "options": {}
}

#### Example 2: Multiple Type Assignments
Current Parameters: {}
Requested Changes:
- Set productName to "Widget"
- Set price to 19.99
- Set inStock to true
- Set categories to electronics and gadgets

Expected Output:
{
  "assignments": {
    "assignments": [
      {
        "id": "id-1",
        "name": "productName",
        "value": "Widget",
        "type": "string"
      },
      {
        "id": "id-2",
        "name": "price",
        "value": 19.99,
        "type": "number"
      },
      {
        "id": "id-3",
        "name": "inStock",
        "value": true,
        "type": "boolean"
      },
      {
        "id": "id-4",
        "name": "categories",
        "value": "[\\"electronics\\", \\"gadgets\\"]",
        "type": "array"
      }
    ]
  },
  "options": {}
}

#### Example 3: Expression-Based Assignments
Current Parameters: {}
Requested Changes:
- Set userId from HTTP Request node
- Calculate totalPrice from quantity and unit price

Expected Output:
{
  "assignments": {
    "assignments": [
      {
        "id": "id-1",
        "name": "userId",
        "value": "={{ $('HTTP Request').item.json.id }}",
        "type": "string"
      },
      {
        "id": "id-2",
        "name": "totalPrice",
        "value": "={{ $('Set').item.json.quantity * $('Set').item.json.unitPrice }}",
        "type": "number"
      }
    ]
  },
  "options": {}
}

#### Example 4: Set Node - Complex Object and Array Creation
Current Parameters:
{
  "assignments": {
    "assignments": [
      {
        "id": "existing-1",
        "name": "orderId",
        "value": "12345",
        "type": "string"
      }
    ]
  },
  "options": {}
}

Requested Changes:
- Keep orderId
- Add customer object with name and email from previous nodes
- Add items array from JSON string
- Set processed timestamp

Expected Output:
{
  "assignments": {
    "assignments": [
      {
        "id": "existing-1",
        "name": "orderId",
        "value": "12345",
        "type": "string"
      },
      {
        "id": "id-2",
        "name": "customer",
        "value": "={{ JSON.stringify({ \\"name\\": $('Form').item.json.customerName, \\"email\\": $('Form').item.json.customerEmail }) }}",
        "type": "object"
      },
      {
        "id": "id-3",
        "name": "items",
        "value": "={{ $('HTTP Request').item.json.itemsJson }}",
        "type": "array"
      },
      {
        "id": "id-4",
        "name": "processedAt",
        "value": "={{ $now.toISO() }}",
        "type": "string"
      }
    ]
  },
  "options": {}
}
`;
