# REST Design Patterns

## Resource-Oriented Architecture

REST APIs are built around resources, not actions. Resources are the nouns of your API.

### Resource Identification

**Good Resource URIs:**
```
GET    /users                  # Collection
GET    /users/{id}             # Individual resource
GET    /users/{id}/orders      # Nested collection
POST   /users                  # Create resource
PUT    /users/{id}             # Replace resource
PATCH  /users/{id}             # Update resource
DELETE /users/{id}             # Delete resource
```

**Bad Resource URIs:**
```
POST   /getUser                # Verb in URI
POST   /createUser             # Verb in URI
GET    /user?action=delete     # Action as query param
```

### Resource Naming Conventions

- Use plural nouns for collections: `/users`, `/orders`, `/products`
- Use lowercase and hyphens for readability: `/shipping-addresses`
- Avoid deep nesting (max 2-3 levels): `/users/{id}/orders/{orderId}`
- Use query parameters for filtering: `/users?status=active&role=admin`

## HTTP Method Semantics

### Safe and Idempotent Methods

| Method | Safe | Idempotent | Use Case |
|--------|------|------------|----------|
| GET | Yes | Yes | Retrieve resource(s) |
| POST | No | No | Create resource, non-idempotent operations |
| PUT | No | Yes | Replace entire resource |
| PATCH | No | No | Partial update |
| DELETE | No | Yes | Remove resource |
| HEAD | Yes | Yes | Get metadata only |
| OPTIONS | Yes | Yes | Get allowed methods |

### Method Usage

**GET - Retrieve Resources**
```http
GET /users/123
Accept: application/json

Response: 200 OK
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**POST - Create Resources**
```http
POST /users
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com"
}

Response: 201 Created
Location: /users/124
{
  "id": 124,
  "name": "Jane Smith",
  "email": "jane@example.com",
  "created_at": "2024-01-16T14:20:00Z"
}
```

**PUT - Replace Resource**
```http
PUT /users/123
Content-Type: application/json

{
  "name": "John Doe Updated",
  "email": "john.new@example.com"
}

Response: 200 OK
{
  "id": 123,
  "name": "John Doe Updated",
  "email": "john.new@example.com",
  "updated_at": "2024-01-17T09:15:00Z"
}
```

**PATCH - Partial Update**
```http
PATCH /users/123
Content-Type: application/json

{
  "email": "john.updated@example.com"
}

Response: 200 OK
{
  "id": 123,
  "name": "John Doe",
  "email": "john.updated@example.com",
  "updated_at": "2024-01-17T10:00:00Z"
}
```

**DELETE - Remove Resource**
```http
DELETE /users/123

Response: 204 No Content
```

## HTTP Status Codes

### Success Codes (2xx)

- **200 OK** - Request succeeded (GET, PUT, PATCH)
- **201 Created** - Resource created (POST), include Location header
- **202 Accepted** - Request accepted for async processing
- **204 No Content** - Success with no response body (DELETE)

### Redirection (3xx)

- **301 Moved Permanently** - Resource permanently moved
- **302 Found** - Temporary redirect
- **304 Not Modified** - Cached version is still valid

### Client Errors (4xx)

- **400 Bad Request** - Invalid request syntax or validation error
- **401 Unauthorized** - Authentication required or failed
- **403 Forbidden** - Authenticated but not authorized
- **404 Not Found** - Resource doesn't exist
- **405 Method Not Allowed** - HTTP method not supported for resource
- **409 Conflict** - Request conflicts with current state (e.g., duplicate)
- **422 Unprocessable Entity** - Valid syntax but semantic errors
- **429 Too Many Requests** - Rate limit exceeded

### Server Errors (5xx)

- **500 Internal Server Error** - Unexpected server error
- **502 Bad Gateway** - Invalid response from upstream server
- **503 Service Unavailable** - Server temporarily unavailable
- **504 Gateway Timeout** - Upstream server timeout

## HATEOAS (Hypermedia)

### Hypermedia-Driven APIs

Include links to related resources and available actions:

```json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "_links": {
    "self": { "href": "/users/123" },
    "orders": { "href": "/users/123/orders" },
    "update": { "href": "/users/123", "method": "PATCH" },
    "delete": { "href": "/users/123", "method": "DELETE" }
  }
}
```

### HAL (Hypertext Application Language)

```json
{
  "id": 123,
  "name": "John Doe",
  "_links": {
    "self": { "href": "/users/123" }
  },
  "_embedded": {
    "orders": [
      {
        "id": 456,
        "total": 99.99,
        "_links": {
          "self": { "href": "/orders/456" }
        }
      }
    ]
  }
}
```

## Content Negotiation

### Accept Headers

```http
GET /users/123
Accept: application/json

GET /users/123
Accept: application/xml

GET /users/123
Accept: application/hal+json
```

### Response Content-Type

```http
Content-Type: application/json; charset=utf-8
Content-Type: application/problem+json
Content-Type: application/hal+json
```

## Idempotency

### Idempotent Operations

**PUT - Always idempotent:**
Multiple identical PUT requests produce the same result as a single request.

**DELETE - Idempotent:**
First DELETE returns 204, subsequent DELETEs return 404 (same end state).

**POST - Not idempotent by default:**
Use `Idempotency-Key` header for idempotent POST:

```http
POST /payments
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "amount": 100.00,
  "currency": "USD"
}
```

Server stores idempotency key and returns same response for duplicate requests.

## Cache Control

### Cache Headers

```http
Cache-Control: public, max-age=3600
Cache-Control: private, no-cache
Cache-Control: no-store
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Last-Modified: Wed, 15 Jan 2024 10:30:00 GMT
```

### Conditional Requests

```http
GET /users/123
If-None-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"

Response: 304 Not Modified
```

```http
PUT /users/123
If-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Content-Type: application/json

{
  "name": "Updated Name"
}

Response: 412 Precondition Failed (if ETag doesn't match)
```

## URI Patterns

### Consistent URI Structure

```
/{version}/{resource}
/{version}/{resource}/{id}
/{version}/{resource}/{id}/{sub-resource}
/{version}/{resource}/{id}/{sub-resource}/{sub-id}
```

### Query Parameters

**Filtering:**
```
GET /users?status=active&role=admin
GET /products?category=electronics&price_min=100&price_max=500
```

**Sorting:**
```
GET /users?sort=created_at
GET /users?sort=-created_at          # Descending
GET /users?sort=name,created_at      # Multiple fields
```

**Field Selection:**
```
GET /users?fields=id,name,email
GET /users?exclude=password,social_security_number
```

**Search:**
```
GET /users?q=john
GET /products?search=laptop
```

## Best Practices

1. **Use nouns, not verbs** - Resources are nouns, methods are verbs
2. **Plural collections** - Use `/users` not `/user`
3. **Consistent naming** - Choose snake_case or camelCase and stick to it
4. **Proper status codes** - Use appropriate HTTP status codes
5. **Include metadata** - Pagination, filtering, sorting info in responses
6. **Version your API** - Plan for evolution from day one
7. **Document everything** - OpenAPI specs, examples, error codes
8. **Security by default** - HTTPS, authentication, rate limiting
9. **Support filtering** - Enable clients to get exactly what they need
10. **Implement HATEOAS** - Make APIs self-documenting and discoverable
