# Technology Stack

**Analysis Date:** 2026-04-01

## Languages

**Primary:**
- TypeScript 5.9.2 - All backend and frontend code
- Vue 3.5.13 - Frontend UI framework

**Secondary:**
- JavaScript - Configuration and build scripts
- SCSS/CSS - Component styling

## Runtime

**Environment:**
- Node.js >=22.16
- npm (blocked via preinstall hook) - must use pnpm

**Package Manager:**
- pnpm >=10.22.0
- Lockfile: pnpm-lock.yaml (present)

## Frameworks

**Core Backend:**
- Express 5.1.0 - HTTP server, REST API, middleware
- TypeORM @n8n/typeorm 0.3.20-16 - ORM for database operations
- NestJS-like patterns via dependency injection (@n8n/di)

**Core Frontend:**
- Vue 3.5.13 - UI framework
- Pinia 2.2.4+ - State management
- Vue Router 4.5.0+ - Client-side routing
- Vue i18n 11.1.2+ - Internationalization

**Code Editors (Frontend):**
- CodeMirror 6 - Code editor integration
  - @codemirror/autocomplete 6.20.0
  - @codemirror/lang-json 6.0.2
  - @codemirror/lang-python 6.2.1
  - @codemirror/lang-javascript 6.2.4
  - @codemirror/lang-css 6.3.1

**UI Components:**
- Element Plus 2.4.3 - Enterprise UI component library
- @n8n/design-system - Custom n8n design system
- Vue Flow (workflow canvas) - @vue-flow/* 1.x versions

**Testing:**
- Jest 29.6.2 - Backend unit tests
- Vitest 3.1.3+ - Frontend unit tests
- Playwright 1.58.0 - E2E tests (managed in packages/testing/playwright)
- Nock 14.0.1 - HTTP mocking for tests
- jest-mock-extended 3.0.4 - Advanced test mocking

**Build/Dev Tools:**
- Turbo 2.8.9 - Monorepo build orchestration
- TypeScript Compiler (tsc) - Type checking and transpilation
- tsc-alias - Path alias resolution in compiled code
- tsc-watch 6.2.0 - Compilation watcher for development
- Vite (rolldown-vite) - Frontend build bundler
- Biome 1.9.0 - Code formatting and linting

**Code Quality:**
- ESLint 9.29.0 - JavaScript/TypeScript linting
- Biome 1.9.0 - Fast code formatter
- Prettier 3.3.3 - Code formatting (frontend)
- lefthook 1.7.15 - Git hooks for code quality

## Key Dependencies

**Critical Backend:**
- axios 1.13.5 - HTTP client for API calls and integrations
- ioredis 5.3.2 - Redis client (caching, job queue, pubsub)
- bull 4.16.4 - Job queue abstraction over Redis
- pg 8.17.0 - PostgreSQL database driver
- sqlite3 5.1.7 - SQLite database driver
- mysql2 3.17.0 - MySQL database driver
- jsonwebtoken 9.0.3 - JWT token generation and validation
- bcryptjs 2.4.3 - Password hashing

**OAuth & Authentication:**
- @n8n/client-oauth2 - Custom OAuth2 client
- openid-client 6.5.0 - OpenID Connect client
- samlify 2.10.0 - SAML 2.0 implementation
- ldapts 4.2.6 - LDAP client
- otpauth 9.1.1 - OTP (One-Time Password) authentication
- jwt-decode - JWT token parsing

**External Secrets Management:**
- @1password/connect 1.4.2 - 1Password integration
- @aws-sdk/client-secrets-manager 3.808.0 - AWS Secrets Manager
- @azure/keyvault-secrets 4.8.0 - Azure Key Vault
- @google-cloud/secret-manager 5.6.0 - Google Cloud Secret Manager
- infisical-node 1.3.0 - Infisical secrets management

**AI & Language Models:**
- langchain 1.2.30 - LLM framework
- @langchain/core 1.1.34 - Core LangChain types
- @langchain/openai 1.1.3 - OpenAI integration
- @langchain/anthropic 1.1.3 - Anthropic integration
- @langchain/community 1.1.14 - Community integrations
- @modelcontextprotocol/sdk 1.26.0 - Model Context Protocol

**Monitoring & Observability:**
- @sentry/node ^10.36.0 - Error tracking (backend)
- @sentry/vue ^10.36.0 - Error tracking (frontend)
- @sentry/node-native ^10.36.0 - Native integration
- @sentry/profiling-node ^10.36.0 - Performance profiling
- @opentelemetry/sdk-node ^2.6.0 - OpenTelemetry tracing
- @opentelemetry/exporter-trace-otlp-proto ^0.213.0 - OTLP trace export
- prom-client 15.1.3 - Prometheus metrics
- express-prom-bundle 8.0.0 - Prometheus middleware

**Telemetry & Analytics:**
- posthog-node 3.2.1 - Product analytics
- @n8n_io/ai-assistant-sdk 1.20.0 - Built-in AI assistant

**Infrastructure:**
- helmet 8.1.0 - HTTP security headers
- express-rate-limit 7.5.0 - Rate limiting middleware
- cors - CORS support
- cookie-parser 1.4.7 - Cookie parsing
- compression 1.8.1 - gzip compression
- body-parser 2.2.1 - Request body parsing
- multer 2.1.1 - File upload handling
- formidable 3.5.4 - Alternative file upload parser

**Data Processing:**
- luxon 3.7.2 - Date/time manipulation
- lodash 4.17.23 - Utility functions
- zod 3.25.67 - Schema validation (backend and frontend)
- class-validator 0.14.0 - Class-based validation
- class-transformer 0.5.1 - Class transformation
- xml2js 0.6.2 - XML parsing and generation
- fast-xml-parser 5.3.8 - High-performance XML parser
- change-case 4.1.2 - String case conversion
- nanoid 3.3.8 - Unique ID generation

**Network & Proxy:**
- http-proxy-agent 7.0.2 - HTTP proxy support
- https-proxy-agent 7.0.6 - HTTPS proxy support
- proxy-from-env 1.1.0 - Read proxies from environment

**File & Media:**
- file-type 16.5.4 - Detect file types
- sharp (disabled) - Image processing (overridden as empty)
- raw-body 3.0.0 - Raw request body parsing
- replacestream 4.0.3 - Stream replacement utility

**SSH & Crypto:**
- ssh2 1.15.0 - SSH client library
- sshpk 1.18.0 - SSH key parsing
- node-forge 1.3.2 - Cryptography library
- aws4 1.11.0 - AWS request signing

**Email:**
- nodemailer 7.0.11 - Email sending

**Templating:**
- handlebars 4.7.8 - Template engine
- express-handlebars 8.0.1 - Handlebars for Express

**Validation & Parsing:**
- swagger-ui-express 5.0.1 - Swagger API documentation UI
- express-openapi-validator 5.5.3 - OpenAPI schema validation
- jsonschema 1.4.1 - JSON Schema validation
- ajv (multiple versions managed) - JSON Schema compiler

**Frontend Additional:**
- ag-grid-vue3 34.1.1 - Data grid component
- chart.js 4.4.0 - Charting library
- vue-chartjs 5.2.0 - Vue integration for Chart.js
- qrcode.vue 3.3.4 - QR code generation
- comlink 4.4.1 - Web Worker IPC
- file-saver 2.0.2 - File download utilities
- humanize-duration 3.27.2 - Human-readable durations
- timeago.js 4.0.2 - Relative time formatting

**Frontend Markdown/Syntax:**
- highlight.js 11.8.0 - Syntax highlighting
- markdown-it-footnote 4.0.0 - Markdown extensions
- vue-markdown-render 2.2.1 - Vue markdown rendering
- v-code-diff 1.13.1 - Code diff viewer

## Configuration

**Environment:**
- Centralized via `@n8n/config` package with Zod validation
- Hierarchy: environment variables → defaults in config classes
- All configuration is read-only after initialization

**Key Configuration Files:**
- `packages/@n8n/config/src/configs/*.ts` - Configuration classes for all subsystems
- Database config: `database.config.ts` - SQLite, PostgreSQL, MySQL support
- Redis config: `redis.config.ts` - Redis connection settings
- Auth config: `auth.config.ts` - Cookie security, SAML, OIDC, LDAP
- Logging config: `logging.config.ts` - Winston logger configuration
- Sentry config: `sentry.config.ts` - Error tracking setup

## Platform Requirements

**Development:**
- Node >=22.16
- pnpm >=10.22.0
- PostgreSQL, SQLite, or MySQL for database
- Redis (optional, for clustering/caching)
- Git (for source control)

**Production:**
- Node >=22.16
- PostgreSQL or MySQL (SQLite not recommended for prod)
- Redis (required for multi-instance deployments)
- Docker (for containerized deployments)

**Build Output:**
- TypeScript compiled to JavaScript in `dist/` directories
- Vue frontend bundled with Vite
- Docker images via `scripts/dockerize-n8n.mjs`

---

*Stack analysis: 2026-04-01*
