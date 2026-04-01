# INTEGRATIONS.md — External Services & APIs

## Databases

### Primary Database (TypeORM)
- **SQLite** — default for development/single-instance
- **PostgreSQL** — recommended for production
- **MySQL/MariaDB** — supported alternative
- Config: `packages/@n8n/config/src/configs/database.config.ts`
- Entities: `packages/@n8n/db/src/entities/`
- Migrations: `packages/@n8n/db/src/migrations/` (separate dirs per DB type)
- Connection: `packages/@n8n/db/src/connection/`

### Redis
- Used for: caching, pub/sub messaging, queue backend (Bull), scaling mode coordination
- Config: `packages/@n8n/config/src/configs/redis.config.ts`
- Libraries: `ioredis`, `bull` (job queue)
- Required in multi-instance/queue mode for execution distribution

## Authentication & SSO

### Built-in Auth
- Email/password with bcrypt hashing
- JWT-based session tokens
- MFA (TOTP-based)
- Config: `packages/@n8n/config/src/configs/auth.config.ts`, `mfa.config.ts`
- Implementation: `packages/cli/src/auth/`

### SAML (Enterprise)
- Module: `packages/cli/src/modules/sso-saml/`
- Config: `packages/@n8n/config/src/configs/sso.config.ts`

### OIDC (Enterprise)
- Module: `packages/cli/src/modules/sso-oidc/`
- OpenID Connect integration for enterprise SSO

### LDAP (Enterprise)
- Enterprise directory integration
- Located in `packages/cli/src/sso.ee/`

### OAuth2 (Node Credentials)
- Client implementation: `packages/@n8n/client-oauth2/`
- OAuth callback handling: `packages/cli/src/controllers/oauth/`
- Used by nodes to authenticate with third-party services

## External Secrets Management

Supports fetching secrets from external providers (enterprise feature):
- **AWS Secrets Manager**
- **Azure Key Vault**
- **GCP Secret Manager**
- **HashiCorp Vault**
- **1Password**
- **Infisical**
- Tests: `packages/cli/test/integration/external-secrets/`

## Monitoring & Observability

### Sentry
- Error tracking and performance monitoring
- Config: `packages/@n8n/config/src/configs/sentry.config.ts`

### OpenTelemetry
- Distributed tracing support
- Spans for workflow execution tracking

### Prometheus
- Metrics endpoint for monitoring
- Custom metrics for workflow executions, queue depth, etc.

### PostHog
- Feature flags and product analytics
- Config: `packages/@n8n/config/src/configs/diagnostics.config.ts`
- Used for A/B testing and feature rollouts

### RudderStack
- Event analytics pipeline
- Telemetry data collection

## AI & LLM Services

### AI Assistant
- Config: `packages/@n8n/config/src/configs/ai-assistant.config.ts`
- Controller: `packages/cli/src/controllers/ai.controller.ts`
- Proxy to n8n's AI backend for error help, code generation

### AI Workflow Builder (Enterprise)
- Package: `packages/@n8n/ai-workflow-builder.ee/`
- Config: `packages/@n8n/config/src/configs/ai-builder.config.ts`

### LangChain Integration Nodes
- Package: `packages/@n8n/nodes-langchain/`
- Supports: OpenAI, Anthropic, Google AI, Mistral, Ollama, and more
- Vector stores, embeddings, chains, agents, memory, tools

## License Management

- n8n license server integration
- Config: `packages/@n8n/config/src/configs/license.config.ts`
- Validates enterprise features, quotas, and entitlements

## Push Connections (Real-time)

- **WebSocket** — primary real-time connection
- **Server-Sent Events (SSE)** — fallback
- Implementation: `packages/cli/src/push/`
- Used for execution progress, collaboration, and live updates

## Webhooks & Triggers

- Webhook handling: `packages/cli/src/webhooks/`
- Supports: GET, POST, PUT, DELETE, PATCH, HEAD
- Webhook URLs: `/webhook/`, `/webhook-test/`, `/webhook-waiting/`
- Registered per workflow with unique paths

## Email (SMTP)

- Transactional emails: invitations, password resets, execution error notifications
- Config: `packages/@n8n/config/src/configs/user-management.config.ts`

## Source Control (Enterprise)

- Git-based workflow version control
- Implementation: `packages/cli/src/environments.ee/`
- Push/pull workflows to/from Git repositories

## Community Packages

- NPM-based package installation for community nodes
- Security scanning: `packages/@n8n/scan-community-package/`
- Runtime loading of third-party node packages

## Task Runners

- External process execution for sandboxed code
- Python runner: `packages/@n8n/task-runner-python/`
- JS runner: `packages/@n8n/task-runner/`
- Config: `packages/@n8n/config/src/configs/runners.config.ts`

## Binary Data Storage

- Supports: filesystem, S3-compatible storage
- Implementation: `packages/core/src/binary-data/`
- Configurable storage backend for workflow file data

## Public API

- RESTful API for external integrations
- Config: `packages/@n8n/config/src/configs/public-api.config.ts`
- OpenAPI spec-based, versioned endpoints
