# OpenAPI 3.1 Specification

## What is OpenAPI?

OpenAPI (formerly Swagger) is a standard for describing REST APIs. It enables:
- Interactive documentation
- Code generation (SDKs, clients, servers)
- API testing tools
- Contract validation
- Mock servers

## Basic Structure

### Minimal OpenAPI 3.1 Spec

```yaml
openapi: 3.1.0
info:
  title: My API
  version: 1.0.0
  description: A sample API
  contact:
    name: API Support
    email: support@example.com
    url: https://example.com/support
  license:
    name: Apache 2.0
    url: https://www.apache.org/licenses/LICENSE-2.0.html

servers:
  - url: https://api.example.com/v1
    description: Production server
  - url: https://staging-api.example.com/v1
    description: Staging server
  - url: http://localhost:3000/v1
    description: Local development

paths:
  /users:
    get:
      summary: List users
      description: Retrieve a paginated list of users
      operationId: listUsers
      tags:
        - Users
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'

components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
      properties:
        id:
          type: integer
          format: int64
          example: 123
        email:
          type: string
          format: email
          example: john@example.com
        name:
          type: string
          example: John Doe
```

## Info Object

Metadata about the API:

```yaml
info:
  title: Users API
  version: 1.0.0
  description: |
    # Users API

    This API manages user accounts and profiles.

    ## Features
    - User CRUD operations
    - Authentication with JWT
    - Role-based authorization

  termsOfService: https://example.com/terms

  contact:
    name: API Support Team
    email: api-support@example.com
    url: https://example.com/support

  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

  x-api-id: users-api-v1
  x-audience: external
```

## Servers

Define API base URLs:

```yaml
servers:
  - url: https://api.example.com/v1
    description: Production
    variables:
      version:
        default: v1
        enum:
          - v1
          - v2

  - url: https://{environment}.example.com/v1
    description: Dynamic environment
    variables:
      environment:
        default: api
        enum:
          - api
          - staging
          - dev
```

## Paths and Operations

### Complete Endpoint Example

```yaml
paths:
  /users:
    get:
      summary: List users
      description: Retrieve a paginated list of users with optional filtering
      operationId: listUsers
      tags:
        - Users

      parameters:
        - name: offset
          in: query
          description: Number of items to skip
          required: false
          schema:
            type: integer
            minimum: 0
            default: 0

        - name: limit
          in: query
          description: Maximum number of items to return
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20

        - name: status
          in: query
          description: Filter by user status
          required: false
          schema:
            type: string
            enum:
              - active
              - inactive
              - suspended

      security:
        - bearerAuth: []

      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserListResponse'
              examples:
                success:
                  $ref: '#/components/examples/UserListSuccess'

        '401':
          $ref: '#/components/responses/Unauthorized'

        '429':
          $ref: '#/components/responses/RateLimitExceeded'

    post:
      summary: Create user
      description: Create a new user account
      operationId: createUser
      tags:
        - Users

      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
            examples:
              basic:
                $ref: '#/components/examples/CreateUserBasic'

      responses:
        '201':
          description: User created successfully
          headers:
            Location:
              description: URL of the created user
              schema:
                type: string
                format: uri
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

        '400':
          $ref: '#/components/responses/ValidationError'

        '409':
          description: User already exists
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /users/{userId}:
    parameters:
      - name: userId
        in: path
        description: User ID
        required: true
        schema:
          type: integer
          format: int64

    get:
      summary: Get user
      description: Retrieve a specific user by ID
      operationId: getUser
      tags:
        - Users

      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

        '404':
          $ref: '#/components/responses/NotFound'

    put:
      summary: Update user
      description: Replace user data
      operationId: updateUser
      tags:
        - Users

      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateUserRequest'

      responses:
        '200':
          description: User updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

        '404':
          $ref: '#/components/responses/NotFound'

    delete:
      summary: Delete user
      description: Delete a user account
      operationId: deleteUser
      tags:
        - Users

      responses:
        '204':
          description: User deleted successfully

        '404':
          $ref: '#/components/responses/NotFound'
```

## Components

Reusable components for your API spec.

### Schemas

```yaml
components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
        - name
      properties:
        id:
          type: integer
          format: int64
          readOnly: true
          example: 123
        email:
          type: string
          format: email
          example: john@example.com
        name:
          type: string
          minLength: 1
          maxLength: 100
          example: John Doe
        status:
          type: string
          enum:
            - active
            - inactive
            - suspended
          default: active
        created_at:
          type: string
          format: date-time
          readOnly: true
          example: "2024-01-15T10:30:00Z"
        metadata:
          type: object
          additionalProperties:
            type: string

    CreateUserRequest:
      type: object
      required:
        - email
        - name
      properties:
        email:
          type: string
          format: email
        name:
          type: string
          minLength: 1
          maxLength: 100
        metadata:
          type: object
          additionalProperties:
            type: string

    UserListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
        pagination:
          $ref: '#/components/schemas/Pagination'

    Pagination:
      type: object
      properties:
        offset:
          type: integer
          minimum: 0
        limit:
          type: integer
          minimum: 1
        total:
          type: integer
          minimum: 0
        has_more:
          type: boolean

    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: object
          required:
            - code
            - message
          properties:
            code:
              type: string
              example: RESOURCE_NOT_FOUND
            message:
              type: string
              example: User with ID 123 not found
            details:
              type: object
            request_id:
              type: string
              example: req_abc123
```

### Security Schemes

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT access token

    apiKey:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key for authentication

    oauth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.example.com/oauth/authorize
          tokenUrl: https://auth.example.com/oauth/token
          scopes:
            users:read: Read user data
            users:write: Create and update users
            users:delete: Delete users
```

Apply security globally or per-operation:

```yaml
# Global security
security:
  - bearerAuth: []

# Or per-operation
paths:
  /users:
    get:
      security:
        - bearerAuth: []
        - apiKey: []  # Alternative auth method
```

### Responses

Reusable response definitions:

```yaml
components:
  responses:
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: RESOURCE_NOT_FOUND
              message: The requested resource was not found

    Unauthorized:
      description: Authentication required
      headers:
        WWW-Authenticate:
          schema:
            type: string
          description: Authentication method
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    ValidationError:
      description: Validation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: VALIDATION_ERROR
              message: Request validation failed
              details:
                - field: email
                  code: INVALID_FORMAT
                  message: Email must be a valid email address

    RateLimitExceeded:
      description: Rate limit exceeded
      headers:
        X-RateLimit-Limit:
          schema:
            type: integer
          description: Request limit per hour
        X-RateLimit-Remaining:
          schema:
            type: integer
          description: Remaining requests
        X-RateLimit-Reset:
          schema:
            type: integer
            format: int64
          description: Time when limit resets (Unix timestamp)
        Retry-After:
          schema:
            type: integer
          description: Seconds to wait before retry
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
```

### Examples

```yaml
components:
  examples:
    UserListSuccess:
      summary: Successful user list response
      value:
        data:
          - id: 1
            email: john@example.com
            name: John Doe
            status: active
            created_at: "2024-01-15T10:30:00Z"
          - id: 2
            email: jane@example.com
            name: Jane Smith
            status: active
            created_at: "2024-01-16T14:20:00Z"
        pagination:
          offset: 0
          limit: 20
          total: 150
          has_more: true

    CreateUserBasic:
      summary: Create user with minimal fields
      value:
        email: newuser@example.com
        name: New User
```

## Data Types

### Primitive Types

```yaml
# String
type: string
example: "Hello World"

# String with format
type: string
format: email
example: "user@example.com"

# Integer
type: integer
format: int64
example: 123

# Number (float)
type: number
format: double
example: 99.99

# Boolean
type: boolean
example: true

# Date-time
type: string
format: date-time
example: "2024-01-15T10:30:00Z"

# Date
type: string
format: date
example: "2024-01-15"

# UUID
type: string
format: uuid
example: "550e8400-e29b-41d4-a716-446655440000"

# URI
type: string
format: uri
example: "https://example.com/users/123"
```

### Arrays

```yaml
type: array
items:
  type: string
minItems: 1
maxItems: 10
uniqueItems: true
example: ["tag1", "tag2", "tag3"]

# Array of objects
type: array
items:
  $ref: '#/components/schemas/User'
```

### Objects

```yaml
type: object
required:
  - name
  - email
properties:
  name:
    type: string
  email:
    type: string
    format: email
  age:
    type: integer
    minimum: 0
    maximum: 120

# Additional properties
additionalProperties: false  # Strict - no extra properties
additionalProperties: true   # Allow any extra properties
additionalProperties:        # Extra properties must be strings
  type: string
```

### Enums

```yaml
type: string
enum:
  - active
  - inactive
  - suspended
default: active
```

### OneOf / AnyOf / AllOf

```yaml
# OneOf - exactly one schema matches
oneOf:
  - $ref: '#/components/schemas/CreditCard'
  - $ref: '#/components/schemas/BankAccount'

# AnyOf - one or more schemas match
anyOf:
  - $ref: '#/components/schemas/User'
  - $ref: '#/components/schemas/Organization'

# AllOf - all schemas must match (inheritance)
allOf:
  - $ref: '#/components/schemas/BaseUser'
  - type: object
    properties:
      admin_level:
        type: integer
```

## Validation

### String Validation

```yaml
type: string
minLength: 1
maxLength: 100
pattern: "^[a-zA-Z0-9_-]+$"
format: email
```

### Number Validation

```yaml
type: integer
minimum: 0
maximum: 100
exclusiveMinimum: true  # > 0 instead of >= 0
multipleOf: 5
```

### Array Validation

```yaml
type: array
minItems: 1
maxItems: 10
uniqueItems: true
```

## Tags

Organize endpoints into logical groups:

```yaml
tags:
  - name: Users
    description: User management operations
  - name: Orders
    description: Order management
  - name: Products
    description: Product catalog

paths:
  /users:
    get:
      tags:
        - Users
```

## Documentation

### Markdown Support

```yaml
description: |
  # User Management

  This endpoint allows you to manage users.

  ## Features
  - Create users
  - Update profiles
  - Delete accounts

  ## Authentication
  Requires JWT bearer token.

  ## Example
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com"
  }
  ```
```

## Code Generation

Generate SDKs from OpenAPI spec:

```bash
# Generate TypeScript client
openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-axios \
  -o ./client

# Generate Python client
openapi-generator-cli generate \
  -i openapi.yaml \
  -g python \
  -o ./python-client

# Generate server stub
openapi-generator-cli generate \
  -i openapi.yaml \
  -g nodejs-express-server \
  -o ./server
```

## Validation Tools

Validate OpenAPI spec:

```bash
# Using Swagger CLI
swagger-cli validate openapi.yaml

# Using Spectral (advanced linting)
spectral lint openapi.yaml
```

## Best Practices

1. **Use components** - Reuse schemas, responses, parameters
2. **Add examples** - Include realistic examples for all schemas
3. **Document thoroughly** - Every endpoint, parameter, response
4. **Version your spec** - Track changes to the specification
5. **Validate regularly** - Use tools to catch errors
6. **Use $ref** - Reference components instead of duplicating
7. **Include error responses** - Document all possible errors
8. **Add operationId** - Unique ID for each operation (for code gen)
9. **Tag endpoints** - Organize into logical groups
10. **Provide security schemes** - Document authentication clearly
