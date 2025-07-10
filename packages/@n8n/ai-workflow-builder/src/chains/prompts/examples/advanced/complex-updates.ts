export const COMPLEX_UPDATE_EXAMPLES = `
### Complex Update Examples

#### Example 1: HTTP Request with Headers and Body
Current Parameters:
{
  "method": "GET",
  "url": "https://api.example.com/data"
}

Requested Changes:
- Change to POST method
- Add API key header
- Add JSON body with user ID and status

Expected Output:
{
  "method": "POST",
  "url": "https://api.example.com/data",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "X-API-Key",
        "value": "={{ $credentials.apiKey }}"
      },
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  },
  "sendBody": true,
  "contentType": "json",
  "bodyParameters": {
    "parameters": [
      {
        "name": "userId",
        "value": "={{ $('Previous Node').item.json.id }}"
      },
      {
        "name": "status",
        "value": "active"
      }
    ]
  },
  "options": {}
}

#### Example 2: IF Node - Complex Multi-Type Conditions
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

#### Example 3: Set Node - Complex Object and Array Creation
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
}`;
