# API Error Handling

## Error Response Design

Consistent, informative error responses are critical for API usability.

## Standard Error Format

### Basic Error Response

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "User with ID 123 not found",
    "details": null
  }
}
```

### RFC 7807 Problem Details

Standardized error format (application/problem+json):

```http
HTTP/1.1 404 Not Found
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/resource-not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "User with ID 123 does not exist",
  "instance": "/users/123"
}
```

**Fields:**
- `type` - URI reference identifying error type
- `title` - Short, human-readable summary
- `status` - HTTP status code
- `detail` - Human-readable explanation specific to this occurrence
- `instance` - URI reference for this specific occurrence

### Extended Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Email must be a valid email address"
      },
      {
        "field": "age",
        "code": "OUT_OF_RANGE",
        "message": "Age must be between 18 and 120"
      }
    ],
    "request_id": "req_123456",
    "timestamp": "2024-01-15T10:30:00Z",
    "documentation_url": "https://api.example.com/docs/errors#validation-error"
  }
}
```

## Error Categories

### 1. Validation Errors (400 Bad Request)

Client sent invalid data.

```http
POST /users
Content-Type: application/json

{
  "name": "",
  "email": "invalid-email",
  "age": 15
}

Response: 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "name",
        "code": "REQUIRED",
        "message": "Name is required"
      },
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Email must be a valid email address"
      },
      {
        "field": "age",
        "code": "OUT_OF_RANGE",
        "message": "Age must be at least 18",
        "constraints": {
          "min": 18,
          "max": 120
        }
      }
    ]
  }
}
```

### 2. Authentication Errors (401 Unauthorized)

Missing or invalid authentication credentials.

```http
GET /users/123
Authorization: Bearer <invalid-access-token>

Response: 401 Unauthorized
WWW-Authenticate: Bearer realm="api", error="invalid_token"

{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "The access token is invalid or has expired",
    "details": {
      "reason": "token_expired",
      "expired_at": "2024-01-15T10:00:00Z"
    }
  }
}
```

**Common auth error codes:**
- `MISSING_TOKEN` - No auth token provided
- `INVALID_TOKEN` - Token is malformed or invalid
- `EXPIRED_TOKEN` - Token has expired
- `REVOKED_TOKEN` - Token has been revoked

### 3. Authorization Errors (403 Forbidden)

Authenticated but not authorized to perform action.

```http
DELETE /users/123
Authorization: Bearer <access-token>

Response: 403 Forbidden
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You do not have permission to delete this user",
    "details": {
      "required_permission": "users:delete",
      "your_permissions": ["users:read", "users:update"]
    }
  }
}
```

### 4. Not Found Errors (404 Not Found)

Resource doesn't exist.

```http
GET /users/99999

Response: 404 Not Found
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "User with ID 99999 not found",
    "details": {
      "resource_type": "User",
      "resource_id": "99999"
    }
  }
}
```

### 5. Conflict Errors (409 Conflict)

Request conflicts with current state.

```http
POST /users
Content-Type: application/json

{
  "email": "existing@example.com",
  "name": "John Doe"
}

Response: 409 Conflict
{
  "error": {
    "code": "RESOURCE_ALREADY_EXISTS",
    "message": "User with email 'existing@example.com' already exists",
    "details": {
      "field": "email",
      "value": "existing@example.com",
      "existing_resource": "/users/123"
    }
  }
}
```

### 6. Rate Limiting (429 Too Many Requests)

Client exceeded rate limit.

```http
GET /users

Response: 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705320000

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded the rate limit",
    "details": {
      "limit": 100,
      "window": "1 hour",
      "retry_after": 60,
      "reset_at": "2024-01-15T11:00:00Z"
    }
  }
}
```

### 7. Server Errors (500 Internal Server Error)

Unexpected server error.

```http
GET /users/123

Response: 500 Internal Server Error
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred. Please try again later.",
    "request_id": "req_123456",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Never expose:**
- Stack traces
- Database errors
- Internal paths
- Sensitive configuration

### 8. Service Unavailable (503 Service Unavailable)

Service temporarily unavailable.

```http
GET /users

Response: 503 Service Unavailable
Retry-After: 300

{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service is temporarily unavailable due to maintenance",
    "details": {
      "retry_after": 300,
      "maintenance_end": "2024-01-15T12:00:00Z"
    }
  }
}
```

## Error Code Catalog

Define standard error codes for your API:

```json
{
  "VALIDATION_ERROR": {
    "status": 400,
    "description": "Request validation failed",
    "subcodes": {
      "REQUIRED": "Required field is missing",
      "INVALID_FORMAT": "Field has invalid format",
      "OUT_OF_RANGE": "Value is out of allowed range",
      "INVALID_ENUM": "Value is not in allowed set"
    }
  },
  "AUTHENTICATION_ERROR": {
    "status": 401,
    "description": "Authentication failed",
    "subcodes": {
      "MISSING_TOKEN": "No authentication token provided",
      "INVALID_TOKEN": "Token is invalid",
      "EXPIRED_TOKEN": "Token has expired"
    }
  },
  "AUTHORIZATION_ERROR": {
    "status": 403,
    "description": "Insufficient permissions",
    "subcodes": {
      "INSUFFICIENT_PERMISSIONS": "Missing required permission",
      "RESOURCE_FORBIDDEN": "Access to resource is forbidden"
    }
  },
  "RESOURCE_NOT_FOUND": {
    "status": 404,
    "description": "Resource not found"
  },
  "CONFLICT_ERROR": {
    "status": 409,
    "description": "Request conflicts with current state",
    "subcodes": {
      "RESOURCE_ALREADY_EXISTS": "Resource already exists",
      "CONCURRENT_MODIFICATION": "Resource was modified by another request"
    }
  },
  "RATE_LIMIT_EXCEEDED": {
    "status": 429,
    "description": "Rate limit exceeded"
  },
  "INTERNAL_SERVER_ERROR": {
    "status": 500,
    "description": "Internal server error"
  }
}
```

## Validation Error Details

### Field-Level Validation

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "credit_card.number",
        "code": "INVALID_FORMAT",
        "message": "Credit card number must be 16 digits",
        "value_provided": "1234",
        "constraints": {
          "pattern": "^[0-9]{16}$"
        }
      },
      {
        "field": "items[0].quantity",
        "code": "OUT_OF_RANGE",
        "message": "Quantity must be at least 1",
        "value_provided": 0,
        "constraints": {
          "min": 1,
          "max": 1000
        }
      }
    ]
  }
}
```

### Cross-Field Validation

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "fields": ["start_date", "end_date"],
        "code": "INVALID_RANGE",
        "message": "End date must be after start date",
        "values_provided": {
          "start_date": "2024-01-20",
          "end_date": "2024-01-15"
        }
      }
    ]
  }
}
```

## Request ID Tracking

Always include request ID for debugging:

```http
Response Headers:
X-Request-ID: req_abc123

Response Body:
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred",
    "request_id": "req_abc123"
  }
}
```

Clients can reference request ID in support tickets.

## Error Documentation

Document all possible errors for each endpoint:

```yaml
/users/{id}:
  get:
    responses:
      '200':
        description: Success
      '401':
        description: Authentication failed
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Error'
            examples:
              missing_token:
                value:
                  error:
                    code: MISSING_TOKEN
                    message: No authentication token provided
              invalid_token:
                value:
                  error:
                    code: INVALID_TOKEN
                    message: Token is invalid or expired
      '404':
        description: User not found
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Error'
            examples:
              not_found:
                value:
                  error:
                    code: RESOURCE_NOT_FOUND
                    message: User with ID 123 not found
```

## Retry Guidance

Help clients understand if they should retry:

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service temporarily unavailable",
    "retry": {
      "retryable": true,
      "retry_after": 60,
      "max_retries": 3,
      "backoff": "exponential"
    }
  }
}
```

### Retryable Errors

- 408 Request Timeout
- 429 Too Many Requests (with Retry-After)
- 500 Internal Server Error (sometimes)
- 502 Bad Gateway
- 503 Service Unavailable
- 504 Gateway Timeout

### Non-Retryable Errors

- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Unprocessable Entity

## Multi-Language Support

Support error messages in multiple languages:

```http
GET /users/invalid
Accept-Language: es

Response: 404 Not Found
Content-Language: es
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Usuario con ID 'invalid' no encontrado"
  }
}
```

Always include `code` so clients can implement their own translations.

## Best Practices

1. **Use standard HTTP status codes** - Don't return 200 for errors
2. **Include machine-readable codes** - Error codes for client logic
3. **Provide human-readable messages** - Clear explanations
4. **Be specific but safe** - Don't expose sensitive information
5. **Include request ID** - For tracking and debugging
6. **Document all errors** - Every possible error for each endpoint
7. **Be consistent** - Same format across all endpoints
8. **Help clients retry** - Indicate if error is retryable
9. **Validate early** - Return validation errors immediately
10. **Log errors server-side** - Track errors for monitoring

## Anti-Patterns

Avoid these mistakes:

- **Generic error messages** - "Error occurred" without details
- **Exposing stack traces** - Security risk
- **Inconsistent error format** - Different structure per endpoint
- **Missing error codes** - Only human-readable messages
- **Wrong status codes** - Returning 200 with error in body
- **No request ID** - Makes debugging impossible
- **Undocumented errors** - Clients don't know what to expect
- **Too much information** - Exposing internal implementation
