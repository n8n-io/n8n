# Changelog

All notable changes to the api-architect skill will be documented in this file.

## [2.0.0] - 2024-12-12

### Changed
- **BREAKING**: Restructured SKILL.md from 561 lines to ~170 lines for progressive disclosure
- Moved all large code examples to `./references/` directory
- Expanded anti-patterns section from 5 to 10 patterns

### Added
- `references/openapi-spec.yaml` - Complete OpenAPI 3.1 specification example
- `references/graphql-schema.graphql` - Full GraphQL schema with Relay connections
- `references/grpc-service.proto` - Protocol Buffer with all streaming patterns
- `references/rate-limiting.yaml` - Tier-based rate limiting configuration
- `references/api-security.yaml` - Authentication, authorization, and security headers
- `scripts/validate-api-spec.sh` - Validation script for OpenAPI, GraphQL, and Protobuf
- New anti-patterns: Inconsistent Naming, Missing Pagination, No Idempotency, Leaky Abstractions, Missing CORS
- Expanded quality checklist with 12 items
- Version number in frontmatter

### Removed
- Inline code examples (now in references/)
- Redundant capability descriptions

## [1.0.0] - 2024-12-10

### Added
- Initial release
- REST API design patterns
- GraphQL schema design
- gRPC service definitions
- API security patterns
- Rate limiting design
- Developer experience guidelines
