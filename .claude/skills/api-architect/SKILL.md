---
name: api-architect
description: 'Expert API designer for REST, GraphQL, gRPC architectures. Activate on: API design, REST API, GraphQL schema, gRPC service, OpenAPI, Swagger, API versioning, endpoint design, rate limiting,
  OAuth flow. NOT for: database schema (use data-pipeline-engineer), frontend consumption (use web-design-expert), deployment (use devops-automator).'
allowed-tools: Read,Write,Edit,Bash(npm:*,npx:*,openapi-generator:*)
metadata:
  category: Code Quality & Testing
  pairs-with:
  - skill: data-pipeline-engineer
    reason: Data layer design under APIs
  - skill: devops-automator
    reason: Deployment and infrastructure for APIs
  tags:
  - api
  - rest
  - graphql
  - grpc
  - architecture
---

# API Architect

Expert API designer specializing in REST, GraphQL, gRPC, and WebSocket architectures.

## Activation Triggers

**Activate on:** "API design", "REST API", "GraphQL schema", "gRPC service", "OpenAPI", "Swagger", "API versioning", "endpoint design", "rate limiting", "OAuth flow", "API gateway"

**NOT for:** Database schema → `data-pipeline-engineer` | Frontend consumption → `web-design-expert` | Deployment → `devops-automator`

## Quick Start

1. **Define API contract first** (API-first design)
2. **Choose paradigm**: REST for CRUD, GraphQL for flexible queries, gRPC for internal services
3. **Write the spec**: OpenAPI for REST, SDL for GraphQL, .proto for gRPC
4. **Design error responses** with consistent structure
5. **Plan versioning** before your first release

## Core Capabilities

| Domain | Technologies |
|--------|-------------|
| **REST** | OpenAPI 3.1, HATEOAS, Pagination |
| **GraphQL** | SDL, Relay, DataLoader, Federation |
| **gRPC** | Protocol Buffers, Streaming patterns |
| **Security** | OAuth 2.0, JWT, API Keys, RBAC |
| **DX** | Swagger UI, SDK generation, Sandboxes |

## Architecture Patterns

### API-First Development
```
Design Contract → Generate Stubs → Implement → Test Against Spec
```

### Response Envelope
```yaml
success: { data: <resource>, meta: { page, total } }
error: { error: { code, message, details: [{ field, issue }] } }
```

### Versioning Options
- URL: `/v1/users` (most explicit)
- Header: `Accept: application/vnd.api+json;version=1`
- Query: `/users?version=1`

## Reference Files

Full working examples in `./references/`:

| File | Description | Lines |
|------|-------------|-------|
| `openapi-spec.yaml` | Complete OpenAPI 3.1 spec | 162 |
| `graphql-schema.graphql` | GraphQL with Relay connections | 111 |
| `grpc-service.proto` | Protocol Buffer, all streaming | 95 |
| `rate-limiting.yaml` | Tier-based rate limit config | 85 |
| `api-security.yaml` | Auth, CORS, security headers | 130 |

## Anti-Patterns (AVOID These)

### 1. Verb-Based URLs
**Symptom**: `/getUsers`, `/createOrder`, `/deleteProduct`
**Fix**: Use nouns (`/users`, `/orders`), let HTTP methods convey action

### 2. Inconsistent Response Envelopes
**Symptom**: `{data: [...]}` sometimes, raw arrays other times
**Fix**: Always use consistent envelope structure

### 3. Breaking Changes Without Versioning
**Symptom**: Removing fields, changing types without warning
**Fix**: Semantic versioning, deprecation headers, sunset periods

### 4. N+1 in GraphQL
**Symptom**: Resolver queries database per item in list
**Fix**: DataLoader pattern for batching, `@defer` for large payloads

### 5. Over-fetching REST Endpoints
**Symptom**: `/users` returns 50 fields when clients need 3
**Fix**: Sparse fieldsets (`?fields=id,name,email`) or GraphQL

### 6. Missing Pagination
**Symptom**: List endpoints return all records
**Fix**: Default limits, cursor-based pagination, `hasMore` indicator

### 7. No Idempotency Keys
**Symptom**: Duplicate POST requests create duplicate resources
**Fix**: Accept `Idempotency-Key` header, return cached response

### 8. Leaky Internal Errors
**Symptom**: Stack traces, SQL errors exposed in 500 responses
**Fix**: Generic error messages in production, request IDs for debugging

### 9. Missing CORS Configuration
**Symptom**: Browser clients blocked with CORS errors
**Fix**: Configure allowed origins, methods, headers explicitly

### 10. No Rate Limiting
**Symptom**: API vulnerable to abuse, no usage visibility
**Fix**: Implement limits per tier, return `X-RateLimit-*` headers

## Validation Script

Run `./scripts/validate-api-spec.sh` to check:
- OpenAPI specs for versions, security schemes, operationIds
- GraphQL schemas for Query types, pagination, error handling
- Protocol Buffers for syntax, packages, field numbers
- Common issues like hardcoded URLs, missing versioning

## Quality Checklist

```
[ ] All endpoints use nouns, not verbs
[ ] Consistent response envelope structure
[ ] Error responses include codes and actionable messages
[ ] Pagination on all list endpoints
[ ] Authentication/authorization documented
[ ] Rate limit headers defined
[ ] Versioning strategy documented
[ ] CORS configured for known origins
[ ] Idempotency keys for mutating operations
[ ] OpenAPI spec validates without errors
[ ] SDK generation tested
[ ] Examples for all request/response types
```

## Output Artifacts

1. **OpenAPI Specifications** - Complete API contracts
2. **GraphQL Schemas** - Type definitions with connections
3. **Protocol Buffers** - gRPC service definitions
4. **API Documentation** - Developer guides
5. **SDK Examples** - Client code samples
6. **Postman Collections** - API test suites

## Tools Available

- `Read`, `Write`, `Edit` - File operations for specs
- `Bash(npm:*, npx:*)` - OpenAPI linting, code generation
- `Bash(openapi-generator:*)` - SDK generation
