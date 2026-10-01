# Inventory API

Base URL: `http://127.0.0.1:18090/inventory/v1`

All requests and responses use JSON.

## Authentication

Send the API key in the `Authorization` header with the `ApiKey` scheme:
`Authorization: ApiKey <key>`. API keys start with `stk_`.
Use the sandbox key `stk_sandbox` for tests.

A request without a valid key gets `401 {"error": "unauthorized"}`.

`GET /me` checks a key. Response `200`: `{"account": "sandbox"}`.

## Create an item

`POST /items`

An item is `physical` or `digital`. The `kind` field selects the body.

Physical item:

```json
{
  "kind": "physical",
  "sku": "MUG-001",
  "name": "Coffee mug",
  "weight": { "value": 350, "unit": "g" },
  "dimensions": { "length": 12, "width": 9, "height": 10.5, "unit": "cm" }
}
```

Digital item:

```json
{
  "kind": "digital",
  "sku": "EBOOK-7",
  "name": "Field guide",
  "downloadUrl": "https://files.example.com/guide.pdf"
}
```

| Field               | Kind     | Notes                                               |
|---------------------|----------|-----------------------------------------------------|
| `kind`              | both     | `physical` or `digital`                             |
| `sku`               | both     | 3 to 32 characters from `A-Z`, `0-9` and `-`        |
| `name`              | both     | Non-empty string                                    |
| `weight.value`      | physical | Number of grams, greater than 0                     |
| `weight.unit`       | physical | Always `g`                                          |
| `dimensions.length` | physical | Number of centimeters, greater than 0               |
| `dimensions.width`  | physical | Number of centimeters, greater than 0               |
| `dimensions.height` | physical | Number of centimeters, greater than 0               |
| `dimensions.unit`   | physical | Always `cm`                                         |
| `downloadUrl`       | digital  | An `https://` URL                                   |

A body with a field of the other kind, an unknown field, or a wrong `unit` gets
`400 {"error": "..."}`.

Response `201`: the created item. It is the body that you sent, plus `id`,
`status`, and `createdAt`:

```json
{
  "id": "itm_001",
  "kind": "digital",
  "sku": "EBOOK-7",
  "name": "Field guide",
  "downloadUrl": "https://files.example.com/guide.pdf",
  "status": "active",
  "createdAt": "2026-04-01T12:00:00.000Z"
}
```

## Validation errors

A body with invalid values gets `422`. `errors` has one entry for each invalid
field:

```json
{
  "error": "validation_failed",
  "message": "The item is invalid",
  "errors": [
    { "field": "sku", "message": "must be 3 to 32 characters from A-Z, 0-9 and -" },
    { "field": "weight.value", "message": "must be greater than 0" }
  ]
}
```
