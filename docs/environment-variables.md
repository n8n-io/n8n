# n8n Environment Variables Reference

Complete list of all **411** environment variables supported by n8n v2.18.0.
Variables are read at startup via the `@Env()` decorator across all packages.

---

## Table of Contents

- [Network & Server](#network--server)
- [Database](#database)
- [Executions](#executions)
- [Credentials](#credentials)
- [Security](#security)
- [SSRF Protection](#ssrf-protection)
- [Authentication & Cookies](#authentication--cookies)
- [MFA](#mfa)
- [SSO (SAML / OIDC / LDAP)](#sso-saml--oidc--ldap)
- [User Management & Email](#user-management--email)
- [Logging](#logging)
- [Cache](#cache)
- [Redis](#redis)
- [Scaling Mode (Queue / Workers)](#scaling-mode-queue--workers)
- [Task Runners](#task-runners)
- [Expression Engine](#expression-engine)
- [Event Bus](#event-bus)
- [Endpoints & Metrics](#endpoints--metrics)
- [Nodes](#nodes)
- [Workflows](#workflows)
- [Workflow History](#workflow-history)
- [Binary Data & Storage](#binary-data--storage)
- [S3 / Object Store](#s3--object-store)
- [AI & LLM](#ai--llm)
- [Instance AI](#instance-ai)
- [Insights](#insights)
- [Community Packages](#community-packages)
- [External Secrets](#external-secrets)
- [OpenTelemetry (OTEL)](#opentelemetry-otel)
- [Source Control](#source-control)
- [Token Exchange & Embed](#token-exchange--embed)
- [Dynamic Credentials](#dynamic-credentials)
- [Modules](#modules)
- [Multi-Main Setup](#multi-main-setup)
- [License](#license)
- [Sentry (Error Tracking)](#sentry-error-tracking)
- [Diagnostics & Telemetry](#diagnostics--telemetry)
- [Templates](#templates)
- [Version Notifications](#version-notifications)
- [Dynamic Banners](#dynamic-banners)
- [Public API](#public-api)
- [External Hooks](#external-hooks)
- [Chat Hub](#chat-hub)
- [Chat Trigger](#chat-trigger)
- [Data Tables](#data-tables)
- [Push Notifications](#push-notifications)
- [Quick Connect](#quick-connect)
- [Miscellaneous](#miscellaneous)

---

## Network & Server

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_HOST` | `localhost` | Hostname n8n listens on. |
| `N8N_PORT` | `5678` | HTTP port n8n listens on. |
| `N8N_LISTEN_ADDRESS` | `::` | IP address n8n binds to (all interfaces by default). |
| `N8N_PROTOCOL` | `http` | HTTP protocol (`http` or `https`). |
| `N8N_PATH` | `/` | Path n8n is deployed to. |
| `N8N_PROXY_HOPS` | `0` | Number of reverse proxies in front of n8n. |
| `N8N_SSL_KEY` | `` | SSL key for HTTPS protocol. |
| `N8N_SSL_CERT` | `` | SSL cert for HTTPS protocol. |
| `N8N_EDITOR_BASE_URL` | `` | Public URL where the editor is accessible. Also used for emails sent from n8n. |
| `GENERIC_TIMEZONE` | `America/New_York` | Default timezone for the instance. Can be overridden per workflow. |
| `N8N_RELEASE_TYPE` | `dev` | Release channel (`stable`, `beta`, `nightly`, `dev`, `rc`). Affects update checks and some defaults. |
| `N8N_GRACEFUL_SHUTDOWN_TIMEOUT` | `30` | Seconds to wait for graceful shutdown before the process exits. |
| `N8N_DEFAULT_LOCALE` | `en` | Default locale for the UI. |
| `N8N_HIDE_USAGE_PAGE` | `false` | Whether to hide the page that shows active workflows and executions count. |
| `N8N_CANVAS_ONLY` | `false` | Whether to enable canvas-only mode, hiding the chrome UI. |
| `EXTERNAL_FRONTEND_HOOKS_URLS` | `` | URLs to external frontend hooks files, separated by semicolons. |

---

## Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_TYPE` | `sqlite` | Database type: `sqlite` or `postgresdb`. |
| `DB_TABLE_PREFIX` | `` | Prefix prepended to all n8n table names (useful for shared databases). |
| `DB_PING_INTERVAL_SECONDS` | `2` | Interval in seconds between health-check pings to the database. |
| `DB_LOGGING_ENABLED` | `false` | Whether database logging is enabled. |
| `DB_LOGGING_OPTIONS` | `error` | Database logging verbosity (`query`, `error`, `schema`, `warn`, `info`, `log`, `all`). |
| `DB_LOGGING_MAX_EXECUTION_TIME` | `0` | Only log queries that run longer than this many milliseconds. Set to 0 to disable slow-query logging. |
| `DB_POSTGRESDB_DATABASE` | `n8n` | Postgres database name. |
| `DB_POSTGRESDB_HOST` | `localhost` | Postgres database host. |
| `DB_POSTGRESDB_PASSWORD` | `` | Postgres database password. |
| `DB_POSTGRESDB_PORT` | `5432` | Postgres database port. |
| `DB_POSTGRESDB_USER` | `postgres` | Postgres user name. |
| `DB_POSTGRESDB_SCHEMA` | `public` | Postgres schema to use. |
| `DB_POSTGRESDB_POOL_SIZE` | `2` | Maximum number of connections in the Postgres connection pool. |
| `DB_POSTGRESDB_CONNECTION_TIMEOUT` | `20000` | Timeout in milliseconds when establishing a new Postgres connection. |
| `DB_POSTGRESDB_IDLE_CONNECTION_TIMEOUT` | `30000` | Time in milliseconds after which an idle connection in the pool is closed. |
| `DB_POSTGRESDB_STATEMENT_TIMEOUT` | `300000` | Maximum time in milliseconds for a single query. Set to 0 to disable. |
| `DB_POSTGRESDB_SSL_ENABLED` | `false` | Whether to use SSL/TLS for the Postgres connection. |
| `DB_POSTGRESDB_SSL_CA` | `` | Path or contents of the CA certificate for Postgres SSL. |
| `DB_POSTGRESDB_SSL_CERT` | `` | Path or contents of the client certificate for Postgres SSL. |
| `DB_POSTGRESDB_SSL_KEY` | `` | Path or contents of the client private key for Postgres SSL. |
| `DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED` | `true` | Whether to reject Postgres connections when the server certificate cannot be verified. |
| `DB_SQLITE_DATABASE` | `database.sqlite` | Path to the SQLite database file. |
| `DB_SQLITE_POOL_SIZE` | `3` | Number of connections in the SQLite connection pool. Must be at least 1. |
| `DB_SQLITE_VACUUM_ON_STARTUP` | `false` | Whether to run SQLite VACUUM on startup to reclaim space. **Warning:** blocking operation. |

---

## Executions

| Variable | Default | Description |
|----------|---------|-------------|
| `EXECUTIONS_MODE` | `regular` | Whether to run executions in regular mode (in-process) or scaling mode (queue). |
| `EXECUTIONS_TIMEOUT` | `-1` | How long (seconds) a workflow execution may run before timeout. `-1` for unlimited. |
| `EXECUTIONS_TIMEOUT_MAX` | `3600` | Upper bound in seconds for execution timeout. Default: 1 hour. |
| `EXECUTIONS_DATA_PRUNE` | `true` | Whether to delete past executions on a rolling basis. |
| `EXECUTIONS_DATA_MAX_AGE` | `336` | How old (hours) a finished execution must be to qualify for soft-deletion. |
| `EXECUTIONS_DATA_PRUNE_MAX_COUNT` | `10000` | Max number of finished executions to keep. `0` for unlimited. |
| `EXECUTIONS_DATA_HARD_DELETE_BUFFER` | `1` | How old (hours) a finished execution must be to qualify for hard-deletion. |
| `EXECUTIONS_DATA_PRUNE_SOFT_DELETE_INTERVAL` | `60` | How often (minutes) execution data should be soft-deleted. |
| `EXECUTIONS_DATA_PRUNE_HARD_DELETE_INTERVAL` | `15` | How often (minutes) execution data should be hard-deleted. |
| `EXECUTIONS_DATA_SAVE_ON_ERROR` | `all` | Whether to save execution data for failed production executions (`all` or `none`). |
| `EXECUTIONS_DATA_SAVE_ON_SUCCESS` | `all` | Whether to save execution data for successful production executions (`all` or `none`). |
| `EXECUTIONS_DATA_SAVE_ON_PROGRESS` | `false` | Whether to save execution data as each node executes. |
| `EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS` | `true` | Whether to save execution data for manual executions. |
| `N8N_CONCURRENCY_PRODUCTION_LIMIT` | `-1` | Max production executions allowed to run concurrently. `-1` means unlimited. |
| `N8N_CONCURRENCY_EVALUATION_LIMIT` | `-1` | Max evaluation executions allowed to run concurrently. `-1` means unlimited. |
| `N8N_EXECUTIONS_QUEUE_RECOVERY_INTERVAL` | `180` | How often (minutes) to check for queue recovery. |
| `N8N_EXECUTIONS_QUEUE_RECOVERY_BATCH` | `100` | Size of batch of executions to check for queue recovery. |
| `N8N_WORKFLOW_AUTODEACTIVATION_ENABLED` | `false` | Whether to automatically deactivate workflows that have all their last executions crashed. |
| `N8N_WORKFLOW_AUTODEACTIVATION_MAX_LAST_EXECUTIONS` | `3` | Number of last executions to check when determining if a workflow should be deactivated. |
| `N8N_SCHEDULED_EXECUTION_DEDUPLICATION_ENABLED` | `false` | Whether scheduled executions receive a deduplication key enforced by a unique DB index. |
| `N8N_EXECUTION_DATA_STORAGE_MODE` | `database` | Mode for storing execution data: `database` (default) or `filesystem`. |

---

## Credentials

| Variable | Default | Description |
|----------|---------|-------------|
| `CREDENTIALS_DEFAULT_NAME` | `My credentials` | Default name suggested when creating new credentials. |
| `CREDENTIALS_OVERWRITE_DATA` | `{}` | JSON object of prefilled credential data (overwrites). End users cannot view or edit these values. |
| `CREDENTIALS_OVERWRITE_ENDPOINT` | `` | Endpoint of an internal API that returns overwritten credential definitions. |
| `CREDENTIALS_OVERWRITE_ENDPOINT_AUTH_TOKEN` | `` | Token used to authenticate requests to the credentials overwrite endpoint. |
| `CREDENTIALS_OVERWRITE_PERSISTENCE` | `false` | Whether to persist credential overwrites so they survive restarts. |
| `N8N_SKIP_CREDENTIAL_OVERWRITE` | `` | Comma-separated list of credential types for which overwrites are skipped. |

---

## Security

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_RESTRICT_FILE_ACCESS_TO` | `~/.n8n-files` | Dirs that file nodes are allowed to access. Separate multiple dirs with semicolon `;`. |
| `N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES` | `true` | Whether to block nodes from accessing files at dirs internally used by n8n. |
| `N8N_BLOCK_FILE_PATTERNS` | `^(.*\/)*\.git(\/.*)*$` | Regex patterns for files and folders that file nodes cannot access. Separate with semicolons. |
| `N8N_SECURITY_AUDIT_DAYS_ABANDONED_WORKFLOW` | `90` | How many days for a workflow to be considered abandoned if not executed. |
| `N8N_CONTENT_SECURITY_POLICY` | `{}` | Set Content-Security-Policy headers as a helmet.js nested directives JSON object. |
| `N8N_CONTENT_SECURITY_POLICY_REPORT_ONLY` | `false` | Whether to set the `Content-Security-Policy-Report-Only` header instead of `Content-Security-Policy`. |
| `N8N_CROSS_ORIGIN_OPENER_POLICY` | `same-origin` | Configuration for the `Cross-Origin-Opener-Policy` header (`same-origin` or `same-origin-allow-popups`). |
| `N8N_INSECURE_DISABLE_WEBHOOK_IFRAME_SANDBOX` | `false` | Whether to disable HTML sandboxing for webhooks. |
| `N8N_INSECURE_DISABLE_FORM_HTML_SANDBOX` | `false` | Whether to disable CSP sandboxing for form pages. |
| `N8N_GIT_NODE_DISABLE_BARE_REPOS` | `true` | Whether to disable bare repositories support in the Git node. |
| `N8N_GIT_NODE_ENABLE_HOOKS` | `false` | Whether to enable hooks for the Git node. |
| `N8N_GIT_NODE_ENABLE_ALL_CONFIG_KEYS` | `false` | Whether to enable arbitrary git config keys. |
| `N8N_AWS_SYSTEM_CREDENTIALS_ACCESS_ENABLED` | `false` | Whether to allow access to AWS system credentials. |
| `N8N_ENCRYPT_KEY` | `` | Alias for `N8N_ENCRYPTION_KEY`. |
| `N8N_ENCRYPTION_KEY` | `` | Encryption key for credentials. If unset, a random key is generated and saved on first launch. |
| `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS` | `true` | Whether to enforce that n8n settings file doesn't have overly wide permissions (0600). |
| `N8N_PASSWORD_MIN_LENGTH` | `8` | Minimum required password length (8–64). |

---

## SSRF Protection

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_SSRF_PROTECTION_ENABLED` | `false` | Whether SSRF protection is enabled for nodes making HTTP requests to user-controllable targets. |
| `N8N_SSRF_BLOCKED_IP_RANGES` | *(RFC 1918 + loopback + link-local)* | Comma-separated CIDR ranges to block. Use `default` to include the standard set. |
| `N8N_SSRF_ALLOWED_IP_RANGES` | `` | Comma-separated CIDR ranges to allow (takes precedence over the block list). |
| `N8N_SSRF_ALLOWED_HOSTNAMES` | `` | Comma-separated hostname patterns to allow. Supports wildcards: `*.n8n.internal`. |
| `N8N_SSRF_DNS_CACHE_MAX_SIZE` | `1048576` | Maximum DNS cache size in bytes (LRU eviction). Default: 1 MB. |

---

## Authentication & Cookies

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_SECURE_COOKIE` | `true` | Whether to set the `Secure` flag on the n8n authentication cookie (recommended for HTTPS). |
| `N8N_SAMESITE_COOKIE` | `lax` | Value for the `SameSite` attribute on the n8n authentication cookie (`strict`, `lax`, or `none`). |

---

## MFA

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_MFA_ENABLED` | `true` | Whether multi-factor authentication (MFA) is enabled for the instance. |
| `N8N_MFA_ENFORCED_ENABLED` | `false` | Whether MFA is enforced for all users (managed via env). |

---

## SSO (SAML / OIDC / LDAP)

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_SSO_JUST_IN_TIME_PROVISIONING` | `true` | Whether to automatically create user accounts when someone signs in via SSO for the first time. |
| `N8N_SSO_REDIRECT_LOGIN_TO_SSO` | `true` | Whether the login screen redirects directly to SSO instead of showing email/password. |
| `N8N_SSO_MANAGED_BY_ENV` | `false` | When true, SSO connection config is read from env vars on every startup and the UI is locked. |
| `N8N_SSO_USER_ROLE_PROVISIONING` | `disabled` | User role provisioning mode: `disabled`, `instance_role`, or `instance_and_project_roles`. |
| `N8N_SSO_SAML_LOGIN_ENABLED` | `false` | Whether SAML-based single sign-on is enabled. |
| `N8N_SSO_SAML_LOGIN_LABEL` | `` | Label shown on the login button for SAML. |
| `N8N_SSO_SAML_METADATA` | `` | XML metadata string from the identity provider. |
| `N8N_SSO_SAML_METADATA_URL` | `` | URL to fetch SAML metadata from (mutually exclusive with metadata). |
| `N8N_SSO_OIDC_LOGIN_ENABLED` | `false` | Whether OIDC-based single sign-on is enabled. |
| `N8N_SSO_OIDC_CLIENT_ID` | `` | OIDC client ID. |
| `N8N_SSO_OIDC_CLIENT_SECRET` | `` | OIDC client secret. |
| `N8N_SSO_OIDC_DISCOVERY_ENDPOINT` | `` | OIDC discovery endpoint URL. |
| `N8N_SSO_OIDC_PROMPT` | `select_account` | OIDC prompt parameter. |
| `N8N_SSO_OIDC_ACR_VALUES` | `` | Comma-separated ACR values for OIDC. |
| `N8N_SSO_LDAP_LOGIN_ENABLED` | `false` | Whether LDAP-based single sign-on is enabled. |
| `N8N_SSO_LDAP_LOGIN_LABEL` | `` | Label shown on the login button for LDAP. |
| `N8N_SSO_SCOPES_PROVISION_INSTANCE_ROLE` | `false` | Whether to set the user's instance role from an SSO claim during login. |
| `N8N_SSO_SCOPES_PROVISION_PROJECT_ROLES` | `false` | Whether to set project–role mappings from an SSO claim during login. |
| `N8N_SSO_SCOPES_NAME` | `n8n` | Name of the OAuth scope to request for SSO provisioning. |
| `N8N_SSO_SCOPES_INSTANCE_ROLE_CLAIM_NAME` | `n8n_instance_role` | Name of the SSO claim that contains the user's instance role. |
| `N8N_SSO_SCOPES_PROJECTS_ROLES_CLAIM_NAME` | `n8n_projects` | Name of the SSO claim that contains project–role mappings. |
| `N8N_SSO_SCOPES_USE_EXPRESSION_MAPPING` | `false` | Whether to use expression-based role mapping instead of direct SSO claim provisioning. |
| `N8N_SECURITY_POLICY_MANAGED_BY_ENV` | `false` | When true, security policy settings are managed via environment variables. |
| `N8N_PERSONAL_SPACE_PUBLISHING_ENABLED` | `true` | Whether personal space publishing is enabled. |
| `N8N_PERSONAL_SPACE_SHARING_ENABLED` | `true` | Whether personal space sharing is enabled. |

---

## User Management & Email

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_USER_MANAGEMENT_JWT_SECRET` | `` | JWT secret. If unset, n8n will generate its own. |
| `N8N_USER_MANAGEMENT_JWT_DURATION_HOURS` | `168` | How long (in hours) before the JWT expires. |
| `N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS` | `0` | How long (in hours) before expiration to automatically refresh the JWT. `0` = 25% of duration. `-1` = never. |
| `N8N_INVITE_LINKS_EMAIL_ONLY` | `false` | When enabled, prevents exposure of invite URLs in API responses. |
| `N8N_EMAIL_MODE` | `smtp` | Email delivery method: `smtp` or empty (disabled). |
| `N8N_SMTP_HOST` | `` | SMTP server host. |
| `N8N_SMTP_PORT` | `465` | SMTP server port. |
| `N8N_SMTP_SSL` | `true` | Whether to use SSL for SMTP. |
| `N8N_SMTP_STARTTLS` | `true` | Whether to use STARTTLS for SMTP when SSL is disabled. |
| `N8N_SMTP_SENDER` | `` | How to display sender name. |
| `N8N_SMTP_USER` | `` | SMTP login username. |
| `N8N_SMTP_PASS` | `` | SMTP login password. |
| `N8N_SMTP_OAUTH_SERVICE_CLIENT` | `` | SMTP OAuth service client. |
| `N8N_SMTP_OAUTH_PRIVATE_KEY` | `` | SMTP OAuth private key. |
| `N8N_UM_EMAIL_TEMPLATES_INVITE` | `` | Overrides default HTML template for inviting new people (use full path). |
| `N8N_UM_EMAIL_TEMPLATES_PWRESET` | `` | Overrides default HTML template for resetting password (use full path). |
| `N8N_UM_EMAIL_TEMPLATES_WORKFLOW_SHARED` | `` | Overrides default HTML template for notifying that a workflow was shared. |
| `N8N_UM_EMAIL_TEMPLATES_WORKFLOW_AUTODEACTIVATED` | `` | Overrides default HTML template for notifying that a workflow was deactivated. |
| `N8N_UM_EMAIL_TEMPLATES_CREDENTIALS_SHARED` | `` | Overrides default HTML template for notifying that credentials were shared. |
| `N8N_UM_EMAIL_TEMPLATES_PROJECT_SHARED` | `` | Overrides default HTML template for notifying that a project was shared. |
| `N8N_UM_EMAIL_TEMPLATES_WORKFLOW_FAILURE` | `` | Overrides default HTML template for notifying that a workflow failed in production. |
| `N8N_INSTANCE_OWNER_MANAGED_BY_ENV` | `false` | When true, the instance owner is managed via environment variables. |
| `N8N_INSTANCE_OWNER_EMAIL` | `` | Instance owner email address. |
| `N8N_INSTANCE_OWNER_FIRST_NAME` | `Instance` | Instance owner first name. |
| `N8N_INSTANCE_OWNER_LAST_NAME` | `Owner` | Instance owner last name. |
| `N8N_INSTANCE_OWNER_PASSWORD_HASH` | `` | Pre-hashed bcrypt password for the instance owner. |

---

## Logging

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_LOG_LEVEL` | `info` | Minimum level of logs to output (`error`, `warn`, `info`, `debug`, `silent`). |
| `N8N_LOG_OUTPUT` | `console` | Where to output logs (`console`, `file`, or both comma-separated). |
| `N8N_LOG_FORMAT` | `text` | Log format: `text` (human-readable) or `json` (one JSON object per line). |
| `N8N_LOG_FILE_COUNT_MAX` | `100` | Max number of log files to keep. Append `d` for days (e.g. `7d`). |
| `N8N_LOG_FILE_SIZE_MAX` | `16` | Max size (in MiB) for each log file. |
| `N8N_LOG_FILE_LOCATION` | `logs/n8n.log` | Location of the log files inside `~/.n8n`. |
| `N8N_LOG_SCOPES` | `` | Comma-separated log scopes to filter by (e.g. `license,scaling`). |
| `N8N_LOG_CRON_ACTIVE_INTERVAL` | `0` | Interval in minutes to log currently active cron jobs. `0` to disable. |

---

## Cache

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_CACHE_BACKEND` | `auto` | Cache backend: `memory`, `redis`, or `auto` (choose based on deployment). |
| `N8N_CACHE_MEMORY_MAX_SIZE` | `3145728` | Maximum size of the in-memory cache in bytes. Default: 3 MiB. |
| `N8N_CACHE_MEMORY_TTL` | `3600000` | Time to live in milliseconds for entries in the memory cache. Default: 1 hour. |
| `N8N_CACHE_REDIS_KEY_PREFIX` | `cache` | Key prefix for cache entries stored in Redis. |
| `N8N_CACHE_REDIS_TTL` | `3600000` | Time to live in milliseconds for Redis cache entries. `0` to disable expiry. |

---

## Redis

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_REDIS_KEY_PREFIX` | `n8n` | Key prefix for all Redis keys used by n8n (avoids clashes when sharing a Redis instance). |

---

## Scaling Mode (Queue / Workers)

| Variable | Default | Description |
|----------|---------|-------------|
| `QUEUE_BULL_PREFIX` | `bull` | Prefix for Bull keys on Redis. |
| `QUEUE_BULL_REDIS_DB` | `0` | Redis database for Bull queue. |
| `QUEUE_BULL_REDIS_HOST` | `localhost` | Redis host for Bull queue. |
| `QUEUE_BULL_REDIS_PASSWORD` | `` | Password to authenticate with Redis. |
| `QUEUE_BULL_REDIS_PORT` | `6379` | Port for Redis to listen on. |
| `QUEUE_BULL_REDIS_USERNAME` | `` | Redis username. Redis 6.0 or higher required. |
| `QUEUE_BULL_REDIS_CLUSTER_NODES` | `` | Redis cluster startup nodes as comma-separated `host:port` pairs. |
| `QUEUE_BULL_REDIS_TLS` | `false` | Whether to enable TLS on Redis connections. |
| `QUEUE_BULL_REDIS_TIMEOUT_THRESHOLD` | `10000` | Max cumulative timeout (ms) of connection retries before process exit. |
| `QUEUE_BULL_REDIS_SLOT_REFRESH_TIMEOUT` | `1000` | Slot refresh timeout (ms) for cluster. |
| `QUEUE_BULL_REDIS_SLOT_REFRESH_INTERVAL` | `5000` | Interval (ms) between automatic slot refreshes. |
| `QUEUE_BULL_REDIS_DNS_LOOKUP_STRATEGY` | `LOOKUP` | DNS resolution strategy for Redis hostnames: `LOOKUP` or `NONE`. For AWS ElastiCache with TLS, use `NONE`. |
| `QUEUE_BULL_REDIS_DUALSTACK` | `false` | Whether to enable dual-stack hostname resolution for Redis connections. |
| `QUEUE_BULL_REDIS_KEEP_ALIVE` | `false` | Whether to enable TCP keep-alive on Redis connections. |
| `QUEUE_BULL_REDIS_KEEP_ALIVE_DELAY` | `5000` | TCP keep-alive initial delay in milliseconds. |
| `QUEUE_BULL_REDIS_KEEP_ALIVE_INTERVAL` | `5000` | TCP keep-alive interval in milliseconds. |
| `QUEUE_BULL_REDIS_RECONNECT_ON_FAILOVER` | `true` | Whether to reconnect to Redis on READONLY errors (failover events). |
| `QUEUE_WORKER_LOCK_DURATION` | `60000` | How long (ms) is the lease period for a worker processing a job. |
| `QUEUE_WORKER_LOCK_RENEW_TIME` | `10000` | How often (ms) a worker must renew the lease. |
| `QUEUE_WORKER_STALLED_INTERVAL` | `30000` | How often (ms) Bull must check for stalled jobs. `0` to disable. |
| `QUEUE_WORKER_TIMEOUT` | `30` | **(Deprecated)** Use `N8N_GRACEFUL_SHUTDOWN_TIMEOUT` instead. |
| `QUEUE_HEALTH_CHECK_ACTIVE` | `false` | Whether to enable worker health endpoints `/healthz` and `/healthz/readiness`. |
| `QUEUE_HEALTH_CHECK_PORT` | `5678` | Port the worker HTTP server listens on for health checks. |
| `N8N_WORKER_SERVER_ADDRESS` | `::` | IP address the worker server binds to. |

---

## Task Runners

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_RUNNERS_MODE` | `internal` | How the task runner runs: `internal` (child process) or `external` (separate process). |
| `N8N_RUNNERS_PATH` | `/runners` | URL path segment where the task runner service is exposed. |
| `N8N_RUNNERS_AUTH_TOKEN` | `` | Shared secret used to authenticate runner processes with the broker. |
| `N8N_RUNNERS_BROKER_PORT` | `5679` | Port the task runner broker listens on for runner connections. |
| `N8N_RUNNERS_BROKER_LISTEN_ADDRESS` | `127.0.0.1` | IP address the task runner broker binds to. |
| `N8N_RUNNERS_MAX_PAYLOAD` | `1073741824` | Maximum size in bytes of a payload sent to a runner. Default: 1 GiB. |
| `N8N_RUNNERS_MAX_OLD_SPACE_SIZE` | `` | Node.js `--max-old-space-size` value in MB for the runner process. |
| `N8N_RUNNERS_MAX_CONCURRENCY` | `10` | Maximum number of tasks a single runner can execute concurrently. |
| `N8N_RUNNERS_TASK_TIMEOUT` | `300` | How long (seconds) a task is allowed to take for completion before being aborted. |
| `N8N_RUNNERS_TASK_REQUEST_TIMEOUT` | `60` | How long (seconds) a task request can wait for a runner to become available. |
| `N8N_RUNNERS_HEARTBEAT_INTERVAL` | `30` | Interval in seconds between heartbeats from runner to broker. |
| `N8N_RUNNERS_INSECURE_MODE` | `false` | Whether to disable all security measures in the task runner. **Discouraged for production.** |
| `N8N_RUNNERS_TASK_BROKER_URI` | `http://127.0.0.1:5679` | URI of the task broker (used by external runners). |
| `N8N_RUNNERS_GRANT_TOKEN` | `` | Grant token for external runners to authenticate with the broker. |
| `N8N_RUNNERS_AUTO_SHUTDOWN_TIMEOUT` | `0` | How many seconds a runner may be idle before exit (external mode). `0` = disabled. |
| `N8N_RUNNERS_HEALTH_CHECK_SERVER_ENABLED` | `false` | Whether to enable a health check server for the runner. |
| `N8N_RUNNERS_HEALTH_CHECK_SERVER_HOST` | `127.0.0.1` | Host for the runner health check server. |
| `N8N_RUNNERS_HEALTH_CHECK_SERVER_PORT` | `5681` | Port for the runner health check server. |
| `NODE_FUNCTION_ALLOW_BUILTIN` | `` | Comma-separated list of allowed built-in Node.js modules in the Code node. |
| `NODE_FUNCTION_ALLOW_EXTERNAL` | `` | Comma-separated list of allowed external npm modules in the Code node. |

---

## Expression Engine

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_EXPRESSION_ENGINE` | `legacy` | Which expression engine to use: `legacy` (no isolation) or `vm` (V8 isolate, experimental). |
| `N8N_EXPRESSION_ENGINE_POOL_SIZE` | `1` | Number of V8 isolates ready in the pool. |
| `N8N_EXPRESSION_ENGINE_MAX_CODE_CACHE_SIZE` | `1024` | Max number of AST-transformed expressions to cache. |
| `N8N_EXPRESSION_ENGINE_TIMEOUT` | `5000` | Execution timeout in milliseconds for each expression evaluation in the VM bridge. |
| `N8N_EXPRESSION_ENGINE_MEMORY_LIMIT` | `128` | Memory limit in MB for the V8 isolate used by the VM bridge. |
| `N8N_EXPRESSION_ENGINE_OBSERVABILITY_ENABLED` | `true` | Whether to emit observability signals (metrics, traces, logs) for the VM evaluator. |
| `N8N_EXPRESSION_ENGINE_TRACES_ENABLED` | `true` | Whether to emit OpenTelemetry spans for expression evaluation. |
| `N8N_EXPRESSION_ENGINE_SLOW_EVAL_THRESHOLD_MS` | `50` | Threshold in ms above which an evaluation is considered "slow" and gets a span. |
| `N8N_EXPRESSION_ENGINE_TRACES_SAMPLE_RATE` | `0.0` | Head-based sampling rate (0.0–1.0) for healthy-path spans. |
| `N8N_EXPRESSION_ENGINE_IDLE_TIMEOUT` | *(unset)* | Scale the pool to 0 warm isolates after this many seconds with no acquire. |

---

## Event Bus

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_EVENTBUS_CHECKUNSENTINTERVAL` | `0` | Interval in milliseconds to check for and resend unsent event-bus messages. `0` to disable. |
| `N8N_EVENTBUS_RECOVERY_MODE` | `extensive` | After a crash: `extensive` recovers full execution details; `simple` only marks executions as crashed. |
| `N8N_EVENTBUS_LOGWRITER_KEEPLOGCOUNT` | `3` | Number of event log files to retain; older files are rotated out. |
| `N8N_EVENTBUS_LOGWRITER_MAXFILESIZEINKB` | `10240` | Maximum size in KB of a single event log file before rotation. Default: 10 MB. |
| `N8N_EVENTBUS_LOGWRITER_LOGBASENAME` | `n8nEventLog` | Base filename for event log files. |
| `N8N_EVENTBUS_LOGWRITER_MAXMESSAGESPERPARSE` | `10000` | Safety cap on concurrent unconfirmed messages during startup log parsing. |

---

## Endpoints & Metrics

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_PAYLOAD_SIZE_MAX` | `16` | Maximum request payload size in MiB for the API. |
| `N8N_FORMDATA_FILE_SIZE_MAX` | `200` | Maximum size in MiB for a single file in multipart/form-data webhook payloads. |
| `N8N_ENDPOINT_REST` | `rest` | Path segment for REST API endpoints. |
| `N8N_ENDPOINT_WEBHOOK` | `webhook` | Path segment for webhook endpoints. |
| `N8N_ENDPOINT_WEBHOOK_TEST` | `webhook-test` | Path segment for test webhook endpoints. |
| `N8N_ENDPOINT_WEBHOOK_WAIT` | `webhook-waiting` | Path segment for waiting webhook endpoints. |
| `N8N_ENDPOINT_FORM` | `form` | Path segment for form endpoints. |
| `N8N_ENDPOINT_FORM_TEST` | `form-test` | Path segment for test form endpoints. |
| `N8N_ENDPOINT_FORM_WAIT` | `form-waiting` | Path segment for waiting form endpoints. |
| `N8N_ENDPOINT_MCP` | `mcp` | Path segment for MCP endpoints. |
| `N8N_ENDPOINT_MCP_TEST` | `mcp-test` | Path segment for test MCP endpoints. |
| `N8N_ENDPOINT_HEALTH` | `/healthz` | Path for the health check endpoint. |
| `N8N_MCP_BUILDER_ENABLED` | `true` | Whether to enable workflow builder tools in the MCP server. |
| `N8N_MCP_MAX_REGISTERED_CLIENTS` | `200` | Maximum number of OAuth clients that can be registered for MCP. |
| `N8N_DISABLE_UI` | `false` | Whether to disable n8n's UI (frontend). |
| `N8N_DISABLE_PRODUCTION_MAIN_PROCESS` | `false` | Whether to disable production webhooks on the main process (for webhook-specific processes). |
| `N8N_ADDITIONAL_NON_UI_ROUTES` | `` | Colon-separated list of path segments that should not serve the UI. |
| `N8N_METRICS` | `false` | Whether to enable the `/metrics` endpoint to expose Prometheus metrics. |
| `N8N_METRICS_PREFIX` | `n8n_` | Prefix for Prometheus metric names. |
| `N8N_METRICS_INCLUDE_DEFAULT_METRICS` | `true` | Whether to expose system and Node.js metrics. |
| `N8N_METRICS_INCLUDE_WORKFLOW_ID_LABEL` | `false` | Whether to include a label for workflow ID on workflow metrics. |
| `N8N_METRICS_INCLUDE_NODE_TYPE_LABEL` | `false` | Whether to include a label for node type on node metrics. |
| `N8N_METRICS_INCLUDE_CREDENTIAL_TYPE_LABEL` | `false` | Whether to include a label for credential type on credential metrics. |
| `N8N_METRICS_INCLUDE_API_ENDPOINTS` | `false` | Whether to expose metrics for API endpoints. |
| `N8N_METRICS_INCLUDE_API_PATH_LABEL` | `false` | Whether to include a label for the path of API endpoint calls. |
| `N8N_METRICS_INCLUDE_API_METHOD_LABEL` | `false` | Whether to include a label for the HTTP method of API endpoint calls. |
| `N8N_METRICS_INCLUDE_API_STATUS_CODE_LABEL` | `false` | Whether to include a label for the status code of API endpoint calls. |
| `N8N_METRICS_INCLUDE_CACHE_METRICS` | `false` | Whether to include metrics for cache hits and misses. |
| `N8N_METRICS_INCLUDE_MESSAGE_EVENT_BUS_METRICS` | `false` | Whether to include metrics derived from n8n's internal events. |
| `N8N_METRICS_INCLUDE_QUEUE_METRICS` | `false` | Whether to include metrics for jobs in scaling mode. |
| `N8N_METRICS_QUEUE_METRICS_INTERVAL` | `20` | How often (seconds) to update queue metrics. |
| `N8N_METRICS_ACTIVE_WORKFLOW_METRIC_INTERVAL` | `60` | How often (seconds) to update active workflow metric. |
| `N8N_METRICS_INCLUDE_WORKFLOW_NAME_LABEL` | `false` | Whether to include a label for workflow name on workflow metrics. |
| `N8N_METRICS_INCLUDE_WORKFLOW_EXECUTION_DURATION` | `true` | Whether to include a histogram metric for workflow execution duration. |
| `N8N_METRICS_INCLUDE_WORKFLOW_STATISTICS` | `false` | Whether to include workflow execution statistics as metrics. |
| `N8N_METRICS_WORKFLOW_STATISTICS_INTERVAL` | `300` | How often (seconds) to update workflow statistics metrics. |

---

## Nodes

| Variable | Default | Description |
|----------|---------|-------------|
| `NODES_INCLUDE` | `[]` | Node types to load. If empty, all available nodes are loaded. JSON array format. |
| `NODES_EXCLUDE` | `["n8n-nodes-base.executeCommand","n8n-nodes-base.localFileTrigger"]` | Node types to exclude from loading. JSON array format. |
| `NODES_ERROR_TRIGGER_TYPE` | `n8n-nodes-base.errorTrigger` | Node type used as the default error trigger. |
| `N8N_PYTHON_ENABLED` | `true` | Whether to enable Python execution on the Code node. |

---

## Workflows

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKFLOWS_DEFAULT_NAME` | `My workflow` | Default name suggested when creating a new workflow. |
| `N8N_WORKFLOW_TAGS_DISABLED` | `false` | When true, workflow tags are disabled. |
| `N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION` | `workflowsFromSameOwner` | Default policy for which workflows are allowed to call this workflow (`any`, `none`, `workflowsFromAList`, `workflowsFromSameOwner`). |
| `N8N_WORKFLOW_ACTIVATION_BATCH_SIZE` | `1` | Number of workflows to activate in parallel during startup. |
| `N8N_WORKFLOWS_INDEXING_ENABLED` | `true` | Whether to build and maintain workflow dependency indexes. |
| `N8N_WORKFLOW_INDEX_BATCH_SIZE` | `10` | Number of workflows to process per batch during dependency indexing on startup. |
| `N8N_USE_WORKFLOW_PUBLICATION_SERVICE` | `false` | Whether to use the workflow publication service (under development). |

---

## Workflow History

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_WORKFLOW_HISTORY_PRUNE_TIME` | `-1` | How long in hours to keep workflow history versions before pruning. `-1` to keep forever. |
| `N8N_WORKFLOW_HISTORY_OPTIMIZING_MINIMUM_AGE_HOURS` | `0.25` | Minimum age in hours before a workflow version is eligible for optimization. |
| `N8N_WORKFLOW_HISTORY_OPTIMIZING_TIME_WINDOW_HOURS` | `2` | Time window in hours used when selecting versions to optimize. |
| `N8N_WORKFLOW_HISTORY_TRIMMING_MINIMUM_AGE_DAYS` | `6` | Minimum age in days before a workflow version is eligible for trimming. |
| `N8N_WORKFLOW_HISTORY_TRIMMING_TIME_WINDOW_DAYS` | `2` | Time window in days used when selecting versions to trim. |
| `N8N_WORKFLOW_HISTORY_COMPACTION_BATCH_SIZE` | `100` | Maximum number of workflow versions to process per workflow before delaying. |
| `N8N_WORKFLOW_HISTORY_COMPACTION_BATCH_DELAY_MS` | `1000` | Delay in milliseconds after processing a batch before moving to the next workflow. |
| `N8N_WORKFLOW_HISTORY_COMPACTION_TRIM_ON_START_UP` | `false` | Whether to run a trim pass on startup. **Warning:** blocking operation. |

---

## Binary Data & Storage

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_DEFAULT_BINARY_DATA_MODE` | `filesystem` / `database` | Storage mode for binary data. Defaults to `filesystem` in regular mode, `database` in scaling mode. |
| `N8N_BINARY_DATA_STORAGE_PATH` | `~/.n8n/storage` | Path for binary data storage in `filesystem` mode. |
| `N8N_BINARY_DATA_SIGNING_SECRET` | *(derived from encryption key)* | Secret for creating publicly-accessible signed URLs for binary data. |
| `N8N_BINARY_DATA_DATABASE_MAX_FILE_SIZE` | `512` | Maximum file size (in MiB) for binary data in `database` mode. Max 1024 MiB. |
| `N8N_STORAGE_PATH` | `~/.n8n/storage` | Base path for filesystem storage (execution data and binary data). |
| `N8N_EXECUTION_DATA_STORAGE_MODE` | `database` | Mode for storing execution data: `database` (default) or `filesystem`. |

---

## S3 / Object Store

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_EXTERNAL_STORAGE_S3_HOST` | `` | Host of the S3-compatible object store bucket (e.g. `s3.us-east-1.amazonaws.com`). |
| `N8N_EXTERNAL_STORAGE_S3_PROTOCOL` | `https` | Protocol for S3 requests (`http` or `https`). |
| `N8N_EXTERNAL_STORAGE_S3_FORCE_PATH_STYLE` | `true` | Whether to use path-style addressing for S3 requests (e.g. `https://host/bucket`). |
| `N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME` | `` | Name of the n8n bucket in S3-compatible external storage. |
| `N8N_EXTERNAL_STORAGE_S3_BUCKET_REGION` | `` | Region of the n8n bucket (e.g. `us-east-1`). |
| `N8N_EXTERNAL_STORAGE_S3_ACCESS_KEY` | `` | Access key for S3-compatible external storage. |
| `N8N_EXTERNAL_STORAGE_S3_ACCESS_SECRET` | `` | Access secret for S3-compatible external storage. |
| `N8N_EXTERNAL_STORAGE_S3_AUTH_AUTO_DETECT` | `false` | Use automatic credential detection (default credential provider chain). Ignores access key/secret. |

---

## AI & LLM

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_AI_ENABLED` | `false` | Whether AI features (AI nodes and AI assistant) are enabled globally. |
| `N8N_AI_TIMEOUT_MAX` | `3600000` | Maximum time in milliseconds to wait for an HTTP response from an AI service. Default: 1 hour. |
| `N8N_AI_ALLOW_SENDING_PARAMETER_VALUES` | `true` | Whether workflow and node parameter values may be sent to AI providers. |
| `N8N_AI_ASSISTANT_BASE_URL` | `` | Base URL of the AI assistant service. |
| `N8N_AI_ANTHROPIC_KEY` | `` | API key for the Anthropic (Claude) provider used by the AI workflow builder. |

---

## Instance AI

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_INSTANCE_AI_MODEL` | `anthropic/claude-sonnet-4-6` | LLM model in `provider/model` format. |
| `N8N_INSTANCE_AI_MODEL_URL` | `` | Base URL for an OpenAI-compatible endpoint (e.g. `http://localhost:1234/v1` for LM Studio). |
| `N8N_INSTANCE_AI_MODEL_API_KEY` | `` | API key for the custom model endpoint. |
| `N8N_INSTANCE_AI_MAX_CONTEXT_WINDOW_TOKENS` | `500000` | Hard cap on the context window size (in tokens). `0` = use model's full context. |
| `N8N_INSTANCE_AI_MCP_SERVERS` | `` | Comma-separated `name=url` pairs for MCP servers. |
| `N8N_INSTANCE_AI_LAST_MESSAGES` | `20` | Number of recent messages to include in context. |
| `N8N_INSTANCE_AI_EMBEDDER_MODEL` | `` | Embedder model for semantic recall. Empty = disabled. |
| `N8N_INSTANCE_AI_SEMANTIC_RECALL_TOP_K` | `5` | Number of semantically similar messages to retrieve. |
| `N8N_INSTANCE_AI_SUB_AGENT_MAX_STEPS` | `100` | Maximum LLM reasoning steps for sub-agents. |
| `N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED` | `false` | Disable the local gateway (filesystem, shell, browser, etc.) for all users. |
| `N8N_INSTANCE_AI_BROWSER_MCP` | `false` | Enable Chrome DevTools MCP for browser-assisted credential setup. |
| `N8N_INSTANCE_AI_SANDBOX_ENABLED` | `false` | Enable sandbox for code execution. When true, the agent can run shell commands and code. |
| `N8N_INSTANCE_AI_SANDBOX_PROVIDER` | `daytona` | Sandbox provider: `daytona` for isolated Docker containers, `local` for direct host execution (dev only). |
| `DAYTONA_API_URL` | `` | Daytona API URL (e.g. `http://localhost:3000/api`). |
| `DAYTONA_API_KEY` | `` | Daytona API key for authentication. |
| `N8N_SANDBOX_SERVICE_URL` | `` | n8n sandbox service base URL. |
| `N8N_SANDBOX_SERVICE_API_KEY` | `` | n8n sandbox service API key. |
| `N8N_INSTANCE_AI_SANDBOX_IMAGE` | `daytonaio/sandbox:0.5.0` | Docker image for the Daytona sandbox. |
| `N8N_INSTANCE_AI_SANDBOX_TIMEOUT` | `300000` | Default command timeout in the sandbox (milliseconds). |
| `INSTANCE_AI_BRAVE_SEARCH_API_KEY` | `` | Brave Search API key for web search. No key = search disabled. |
| `N8N_INSTANCE_AI_SEARXNG_URL` | `` | SearXNG instance URL for web search. Empty = disabled. |
| `N8N_INSTANCE_AI_GATEWAY_API_KEY` | `` | Optional static API key for the filesystem gateway. |
| `N8N_INSTANCE_AI_THREAD_TTL_DAYS` | `90` | Conversation thread TTL in days. `0` = no expiration. |
| `N8N_INSTANCE_AI_SNAPSHOT_PRUNE_INTERVAL` | `3600000` | Interval in milliseconds between snapshot pruning runs. `0` = disabled. |
| `N8N_INSTANCE_AI_SNAPSHOT_RETENTION` | `86400000` | Retention period in milliseconds for orphaned workflow snapshots before pruning. |
| `N8N_INSTANCE_AI_CONFIRMATION_TIMEOUT` | `600000` | Timeout in milliseconds for HITL confirmation requests. `0` = no timeout. |

---

## Insights

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_INSIGHTS_COMPACTION_INTERVAL_MINUTES` | `60` | Interval in minutes at which insights data should be compacted. |
| `N8N_INSIGHTS_COMPACTION_BATCH_SIZE` | `500` | Number of raw insights data to compact in a single batch. |
| `N8N_INSIGHTS_COMPACTION_HOURLY_TO_DAILY_THRESHOLD_DAYS` | `90` | Max age in days of hourly insights data to compact. |
| `N8N_INSIGHTS_COMPACTION_DAILY_TO_WEEKLY_THRESHOLD_DAYS` | `180` | Max age in days of daily insights data to compact. |
| `N8N_INSIGHTS_FLUSH_BATCH_SIZE` | `1000` | Maximum number of insights data to keep in the buffer before flushing. |
| `N8N_INSIGHTS_FLUSH_INTERVAL_SECONDS` | `30` | Interval in seconds at which the insights data should be flushed to the database. |
| `N8N_INSIGHTS_MAX_AGE_DAYS` | `-1` | How old (days) insights data must be to qualify for deletion. `-1` = no pruning. |
| `N8N_INSIGHTS_PRUNE_CHECK_INTERVAL_HOURS` | `24` | How often (hours) insights data will be checked for deletion. |

---

## Community Packages

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_COMMUNITY_PACKAGES_ENABLED` | `true` | Whether to enable community packages. |
| `N8N_COMMUNITY_PACKAGES_REGISTRY` | `https://registry.npmjs.org` | NPM registry URL to pull community packages from. |
| `N8N_REINSTALL_MISSING_PACKAGES` | `false` | Whether to reinstall any missing community packages. |
| `N8N_UNVERIFIED_PACKAGES_ENABLED` | `true` | Whether to block installation of not verified packages. |
| `N8N_VERIFIED_PACKAGES_ENABLED` | `true` | Whether to enable and show search suggestion of packages verified by n8n. |
| `N8N_COMMUNITY_PACKAGES_PREVENT_LOADING` | `false` | Whether to prevent loading community packages. |
| `N8N_COMMUNITY_PACKAGES_AUTH_TOKEN` | `` | Auth token for npm registry authentication. |

---

## External Secrets

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_EXTERNAL_SECRETS_UPDATE_INTERVAL` | `300` | How often (in seconds) to check for secret updates. |
| `N8N_EXTERNAL_SECRETS_PREFER_GET` | `false` | Whether to prefer GET over LIST when fetching secrets from Hashicorp Vault. |
| `N8N_ENV_FEAT_EXTERNAL_SECRETS_FOR_PROJECTS` | `true` | Whether to enable project-scoped external secrets. |
| `N8N_ENV_FEAT_EXTERNAL_SECRETS_MULTIPLE_CONNECTIONS` | `true` | Whether to enable multiple connections to global secret providers. |
| `N8N_ENV_FEAT_EXTERNAL_SECRETS_ROLE_BASED_ACCESS` | `true` | Whether to enable role-based access control to manage secret providers. |

---

## OpenTelemetry (OTEL)

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_OTEL_ENABLED` | `false` | Whether OpenTelemetry is enabled. |
| `N8N_OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTLP exporter endpoint. |
| `N8N_OTEL_EXPORTER_OTLP_TRACING_PATH` | `/v1/traces` | Path for OTLP tracing export. |
| `N8N_OTEL_EXPORTER_OTLP_HEADERS` | `` | Custom headers for OTLP exporter (as JSON or key=value pairs). |
| `N8N_OTEL_EXPORTER_SERVICE_NAME` | `n8n` | Service name reported to the OTLP exporter. |
| `N8N_OTEL_TRACES_SAMPLE_RATE` | `1.0` | Sampling rate for OpenTelemetry traces (0.0–1.0). |
| `N8N_OTEL_STARTUP_CONNECTIVITY_TIMEOUT_MS` | `2000` | Timeout (ms) for checking OTEL collector connectivity at startup. |
| `N8N_OTEL_TRACES_INCLUDE_NODE_SPANS` | `true` | Whether to include spans for individual node executions. |
| `N8N_OTEL_TRACES_INJECT_OUTBOUND` | `true` | Whether to inject trace context into outbound HTTP requests. |

---

## Source Control

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_SOURCECONTROL_DEFAULT_SSH_KEY_TYPE` | `ed25519` | Default SSH key type to use when generating SSH keys (`ed25519` or `rsa`). |

---

## Token Exchange & Embed

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_TOKEN_EXCHANGE_ENABLED` | `false` | Whether the token exchange endpoint (POST /auth/oauth/token) is enabled. |
| `N8N_EMBED_LOGIN_ENABLED` | `false` | Whether the embed login endpoint (GET/POST /auth/embed) is enabled. |
| `N8N_TOKEN_EXCHANGE_MAX_TOKEN_TTL` | `900` | Maximum lifetime in seconds for an issued token. |
| `N8N_TOKEN_EXCHANGE_TRUSTED_KEYS` | `` | JSON array of trusted key sources for JWT verification. |
| `N8N_TOKEN_EXCHANGE_KEY_REFRESH_INTERVAL_SECONDS` | `300` | Interval in seconds between trusted key refresh runs. |
| `N8N_TOKEN_EXCHANGE_JTI_CLEANUP_INTERVAL_SECONDS` | `60` | Interval in seconds between JTI cleanup runs. |
| `N8N_TOKEN_EXCHANGE_JTI_CLEANUP_BATCH_SIZE` | `1000` | Maximum number of expired JTI rows to delete per cleanup run. |
| `N8N_TOKEN_EXCHANGE_EMBED_LOGIN_PER_MINUTE` | `20` | Maximum number of embed logins per IP per minute. |
| `N8N_TOKEN_EXCHANGE_TOKEN_EXCHANGE_PER_MINUTE` | `20` | Maximum number of token exchanges per IP per minute. |

---

## Dynamic Credentials

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_DYNAMIC_CREDENTIALS_CORS_ORIGIN` | `` | Comma-separated list of allowed CORS origins for dynamic credentials endpoints. Empty = CORS disabled. |
| `N8N_DYNAMIC_CREDENTIALS_CORS_ALLOW_CREDENTIALS` | `false` | Whether to allow credentials (cookies, auth headers) in CORS requests. |
| `N8N_DYNAMIC_CREDENTIALS_ENDPOINT_AUTH_TOKEN` | `` | Authentication token for the dynamic credentials endpoints. |

---

## Modules

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_ENABLED_MODULES` | `` | Comma-separated list of enabled modules (e.g. `insights,community-packages`). |
| `N8N_DISABLED_MODULES` | `` | Comma-separated list of disabled modules. |

Available module names: `insights`, `external-secrets`, `community-packages`, `data-table`, `mcp`, `provisioning`, `breaking-changes`, `source-control`, `dynamic-credentials`, `chat-hub`, `sso-oidc`, `sso-saml`, `log-streaming`, `ldap`, `quick-connect`, `workflow-builder`, `favorites`, `redaction`, `instance-registry`, `instance-ai`, `otel`, `token-exchange`, `instance-version-history`, `encryption-key-manager`.

---

## Multi-Main Setup

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_MULTI_MAIN_SETUP_ENABLED` | `false` | Whether to enable multi-main setup when using scaling mode (requires license). |
| `N8N_MULTI_MAIN_SETUP_KEY_TTL` | `10` | Time to live in seconds for the leader lock key. |
| `N8N_MULTI_MAIN_SETUP_CHECK_INTERVAL` | `3` | Interval in seconds between leader eligibility checks. |

---

## License

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_LICENSE_SERVER_URL` | `https://license.n8n.io/v1` | URL of the license server used to validate and refresh licenses. |
| `N8N_LICENSE_AUTO_RENEW_ENABLED` | `true` | Whether to automatically renew licenses before they expire. |
| `N8N_LICENSE_ACTIVATION_KEY` | `` | Activation key used to activate or upgrade the instance license. |
| `N8N_LICENSE_DETACH_FLOATING_ON_SHUTDOWN` | `true` | Whether to release floating entitlements back to the pool when the instance shuts down. |
| `N8N_LICENSE_TENANT_ID` | `1` | Tenant identifier for the license SDK. |
| `N8N_LICENSE_CERT` | `` | Ephemeral license certificate. |

---

## Sentry (Error Tracking)

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_SENTRY_DSN` | `` | Sentry DSN (data source name) for the backend. |
| `N8N_FRONTEND_SENTRY_DSN` | `` | Sentry DSN for the frontend. |
| `N8N_SENTRY_TRACES_SAMPLE_RATE` | `0` | Sample rate for Sentry traces (0.0–1.0). `0` = disabled. |
| `N8N_SENTRY_PROFILES_SAMPLE_RATE` | `0` | Sample rate for Sentry profiling (0.0–1.0). `0` = disabled. |
| `N8N_SENTRY_EVENT_LOOP_BLOCK_THRESHOLD` | `500` | Threshold in milliseconds for event loop block detection. |
| `ENVIRONMENT` | `` | Environment name (e.g. `production`). Used by Sentry. |
| `DEPLOYMENT_NAME` | `` | Deployment name (e.g. cloud account name). Used by Sentry. |
| `N8N_VERSION` | `` | n8n version string. Used by Sentry for task runners. |

---

## Diagnostics & Telemetry

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_DIAGNOSTICS_ENABLED` | `true` | Whether anonymous diagnostics and telemetry are enabled for this instance. |
| `N8N_DIAGNOSTICS_CONFIG_FRONTEND` | `1zPn9bgWPzlQc0p8Gj1uiK6DOTn;https://telemetry.n8n.io` | Telemetry endpoint config for the frontend (format: `key;baseUrl`). |
| `N8N_DIAGNOSTICS_CONFIG_BACKEND` | `1zPn7YoGC3ZXE9zLeTKLuQCB4F6;https://telemetry.n8n.io` | Telemetry endpoint config for the backend (format: `key;baseUrl`). |
| `N8N_DIAGNOSTICS_POSTHOG_API_KEY` | `phc_kMstNfAgBcBkWSh6KdsgN09heqqNe5VNmalHP1Ni9Q4` | PostHog project API key for product analytics. |
| `N8N_DIAGNOSTICS_POSTHOG_API_HOST` | `https://ph.n8n.io` | PostHog API host URL. |
| `N8N_DEPLOYMENT_TYPE` | `default` | Deployment type identifier (e.g. `default`, `cloud`). Used for telemetry and feature behavior. |
| `N8N_PERSONALIZATION_ENABLED` | `true` | Whether to enable personalization features. |
| `N8N_HIRING_BANNER_ENABLED` | `true` | Whether to show the hiring/recruitment message in the browser devtools console. |

---

## Templates

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_TEMPLATES_ENABLED` | `true` | Whether to enable loading and showing workflow templates. |
| `N8N_TEMPLATES_HOST` | `https://api.n8n.io/api/` | Base URL for the workflow templates API. |
| `N8N_DYNAMIC_TEMPLATES_HOST` | `https://dynamic-templates.n8n.io/templates` | Base URL for fetching dynamic (contextual) templates. |

---

## Version Notifications

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_VERSION_NOTIFICATIONS_ENABLED` | `true` | Whether to check for and show in-app notifications about new n8n versions. |
| `N8N_VERSION_NOTIFICATIONS_ENDPOINT` | `https://api.n8n.io/api/versions/` | URL used to fetch current n8n version information. |
| `N8N_VERSION_NOTIFICATIONS_WHATS_NEW_ENABLED` | `true` | Whether to fetch and show "What's New" content. |
| `N8N_VERSION_NOTIFICATIONS_WHATS_NEW_ENDPOINT` | `https://api.n8n.io/api/whats-new` | URL used to fetch "What's New" articles. |
| `N8N_VERSION_NOTIFICATIONS_INFO_URL` | `https://docs.n8n.io/hosting/installation/updating/` | URL linked from the versions panel (e.g. upgrade instructions). |

---

## Dynamic Banners

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_DYNAMIC_BANNERS_ENDPOINT` | `https://api.n8n.io/api/banners` | URL to fetch dynamic banner content from. |
| `N8N_DYNAMIC_BANNERS_ENABLED` | `true` | Whether to fetch and show dynamic banners (e.g. announcements). |

---

## Public API

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_PUBLIC_API_DISABLED` | `false` | When true, the public API is disabled and its routes are not registered. |
| `N8N_PUBLIC_API_ENDPOINT` | `api` | URL path segment for the Public API (e.g. /api/v1/...). |
| `N8N_PUBLIC_API_SWAGGERUI_DISABLED` | `false` | When true, the Swagger UI for the Public API is not served. |

---

## External Hooks

| Variable | Default | Description |
|----------|---------|-------------|
| `EXTERNAL_HOOK_FILES` | `` | Paths to files that define external lifecycle hooks. Separated by `EXTERNAL_HOOK_FILES_SEPARATOR`. |
| `EXTERNAL_HOOK_FILES_SEPARATOR` | `:` | Separator character for `EXTERNAL_HOOK_FILES`. Use `;` on Windows. |

---

## Chat Hub

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_CHAT_HUB_EXECUTION_CONTEXT_TTL` | `3600` | TTL in seconds for execution context in Chat Hub. Max duration for a single non-streaming Workflow Agent execution. |
| `N8N_CHAT_HUB_STREAM_STATE_TTL` | `300` | TTL in seconds for stream state in Chat Hub. Inactive streams are cleaned up after this. |
| `N8N_CHAT_HUB_MAX_BUFFERED_CHUNKS` | `1000` | Maximum number of response chunks to buffer per stream for reconnection. |

---

## Chat Trigger

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_DISABLE_PUBLIC_CHAT_TRIGGER` | `false` | Whether public chat should be disabled for Chat Trigger on this instance. |

---

## Data Tables

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_DATA_TABLES_MAX_SIZE_BYTES` | `52428800` | Maximum total size in bytes allowed for data tables. Default: 50 MiB. |
| `N8N_DATA_TABLES_WARNING_THRESHOLD_BYTES` | *(80% of max)* | Size in bytes at which to warn that a data table is nearing capacity. |
| `N8N_DATA_TABLES_SIZE_CHECK_CACHE_DURATION_MS` | `5000` | Duration in milliseconds to cache data table size checks. |
| `N8N_DATA_TABLES_UPLOAD_MAX_FILE_SIZE_BYTES` | *(remaining storage)* | Maximum file size in bytes for CSV uploads to data tables. |
| `N8N_DATA_TABLES_CLEANUP_INTERVAL_MS` | `60000` | Interval in milliseconds between cleanup runs for orphaned upload files. |
| `N8N_DATA_TABLES_FILE_MAX_AGE_MS` | `120000` | Age in milliseconds after which an uploaded file is treated as orphaned. Default: 2 minutes. |

---

## Push Notifications

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_PUSH_BACKEND` | `websocket` | Backend to use for push notifications (`sse` or `websocket`). |

---

## Quick Connect

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_QUICK_CONNECT_OPTIONS` | `[]` | JSON array of promoted quick connect options (Pinecone, Firecrawl, etc.). |

---

## Miscellaneous

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_SSH_TUNNEL_IDLE_TIMEOUT` | `300` | How many seconds before an idle SSH tunnel is closed. |

---

*Generated from source code of n8n v2.18.0. Total: **411** production environment variables.*
