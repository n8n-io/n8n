# API Reference Documentation Template
# Complete endpoint documentation format

```markdown
# [Resource] API

[Brief description of what this API resource manages]

## Base URL

```
https://api.example.com/v1
```

## Authentication

[Explain authentication requirements]

All endpoints require authentication via Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://api.example.com/v1/[resource]
```

---

## Endpoints

### List [Resources]

[Brief description of what this endpoint does]

```http
GET /[resources]
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Maximum items to return (1-100) |
| `cursor` | string | - | Pagination cursor from previous response |
| `status` | string | - | Filter by status: `active`, `inactive` |
| `sort` | string | `created_at` | Sort field |
| `order` | string | `desc` | Sort order: `asc`, `desc` |

#### Response

```json
{
  "data": [
    {
      "id": "[prefix]_123abc",
      "field1": "value1",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "has_more": true,
    "next_cursor": "eyJpZCI6MTIzfQ"
  }
}
```

#### Example Request

```bash
curl -X GET "https://api.example.com/v1/[resources]?limit=10" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

---

### Get [Resource]

Retrieve a single [resource] by ID.

```http
GET /[resources]/:id
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The [resource] ID |

#### Response

```json
{
  "data": {
    "id": "[prefix]_123abc",
    "field1": "value1",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### Create [Resource]

Create a new [resource].

```http
POST /[resources]
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `field1` | string | Yes | Description of field1 |
| `field2` | string | No | Description of field2 |
| `metadata` | object | No | Custom key-value pairs |

#### Example Request

```bash
curl -X POST "https://api.example.com/v1/[resources]" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "field1": "value1",
    "field2": "value2"
  }'
```

#### Response

```json
{
  "data": {
    "id": "[prefix]_456def",
    "field1": "value1",
    "field2": "value2",
    "created_at": "2024-01-15T14:22:00Z",
    "updated_at": "2024-01-15T14:22:00Z"
  }
}
```

---

### Update [Resource]

Update an existing [resource].

```http
PATCH /[resources]/:id
```

#### Request Body

All fields are optional. Only provided fields will be updated.

| Field | Type | Description |
|-------|------|-------------|
| `field1` | string | New value for field1 |
| `field2` | string | New value for field2 |

---

### Delete [Resource]

Delete a [resource].

```http
DELETE /[resources]/:id
```

#### Response

```json
{
  "data": {
    "id": "[prefix]_123abc",
    "deleted": true
  }
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "field_name",
        "issue": "Specific validation error"
      }
    ]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

API requests are rate limited based on your plan:

| Plan | Requests/minute | Requests/day |
|------|-----------------|--------------|
| Free | 60 | 1,000 |
| Pro | 600 | 50,000 |
| Enterprise | Custom | Custom |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640000000
```

---

## Pagination

List endpoints use cursor-based pagination.

### Request

```bash
# First page
curl "https://api.example.com/v1/[resources]?limit=10"

# Next page
curl "https://api.example.com/v1/[resources]?limit=10&cursor=eyJpZCI6MTIzfQ"
```

### Response Meta

```json
{
  "meta": {
    "has_more": true,
    "next_cursor": "eyJpZCI6MTIzfQ"
  }
}
```
```

---

## Best Practices

### Endpoint Documentation Checklist
- [ ] HTTP method and path
- [ ] All path parameters
- [ ] All query parameters with types and defaults
- [ ] Request body schema with required fields marked
- [ ] Example request (curl or language-specific)
- [ ] Success response with realistic data
- [ ] Error responses for common cases

### Writing Guidelines
- Use consistent ID prefixes (e.g., `usr_`, `ord_`, `inv_`)
- Show realistic example data, not "foo" and "bar"
- Include timestamps in ISO 8601 format
- Document rate limits and pagination
- List all possible error codes
