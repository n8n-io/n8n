# Security Review

Proactively review PRs and flag security vulnerabilities specific to n8n's
architecture. Review only new or modified lines.

**Code Execution & Sandboxing:**
- Changes that weaken expression evaluation sandbox protections
- Modifications to Code node sandboxes (JavaScript/Python) that reduce isolation
- New access to Node.js builtins or external modules in sandboxed contexts
- Prototype pollution or constructor access bypasses
- Weakening of prototype sanitizers or function context validators
- Changes that expose `process.env` access in Code nodes

**Credential & Secret Handling:**
- Credentials being logged or exposed in error messages
- Hardcoded secrets, API keys, or tokens in code
- Changes to credential encryption/decryption that weaken security
- OAuth state/CSRF token handling that bypasses validation
- Webhook requests that don't sanitize auth cookies
- External secrets provider integrations with insecure configurations
- Credential access not respecting scope boundaries (instance/project/user)
- Data fetched via credentials being exposed to unauthorized user groups

**Authentication & Session Security:**
- JWT token handling that weakens validation or expiration
- Missing or disabled cookie security flags (HttpOnly, Secure, SameSite)
- Changes that bypass MFA enforcement
- SSO/SAML/OIDC authentication flows with validation gaps
- OAuth 2.0 implementations missing PKCE or with weak redirect URI validation

**Authorization & Access Control:**
- Missing or bypassed RBAC and scope-based permission checks
- Missing credential permission validation before workflow execution
- Subworkflow execution that bypasses caller policies or ownership validation
- Missing project-level or resource-level access controls

**License Enforcement:**
- Changes that weaken license enforcement
- Missing `FeatureNotLicensedError` for unlicensed feature access
- Bypassed license quota checks
- New licensed features without proper middleware or module-level enforcement
- New controller endpoints in `*.ee.ts` files that access licensed features without `@Licensed` decorator
- `@Licensed` decorator usage that doesn't match feature requirements (check `LICENSE_FEATURES` in `@n8n/constants`)
- Endpoints in `*.ee.ts` files with `@GlobalScope` or `@ProjectScope` but missing `@Licensed` (license check is separate from permission check)
- Preferred pattern: `@Licensed` decorator over custom licensing middleware
- Decorator order should be: route decorator → `@Licensed` → scope decorators
- Enterprise features not properly isolated in modules (newer features should use the module system)
- Enterprise code accessible outside of `*.ee.ts` files or licensed modules

**Input Validation & Injection Prevention:**
- Unsanitized user input flowing to file paths
- SQL nodes with expressions in query fields without parameterization
- Command execution nodes with unsanitized shell arguments
- Path traversal risks in file operation nodes
- Community package names with suspicious patterns

**File System Access:**
- Changes that weaken file access restriction enforcement
- File operations that bypass allowlist/blocklist patterns
- Access to n8n internal directories

**Database Security & Performance:**
- Missing indexes on frequently queried columns in migrations
- Resource-intensive queries without pagination or limits
- Missing encryption for sensitive fields beyond credentials
- Raw SQL queries that bypass TypeORM protections

**HTTP, Webhooks & Network Security:**
- SSRF risks in user-controlled URLs
- CORS configuration that allows all origins
- CSP or iframe sandbox modifications that weaken protections
- Rate limiting configuration changes that reduce protection
- Disabled TLS certificate validation (`rejectUnauthorized: false`)

**Audit Logging & Event Bus:**
- Missing logging for security-relevant events
- Sensitive data appearing in logs or error messages
- Incomplete audit trails for authentication and authorization events

**Context-aware review:**
- Higher scrutiny for: expression engine, credential handling, code execution
  nodes, license enforcement, SSO integrations
- Consider n8n's security audit categories: credentials, database, nodes,
  instance, filesystem risks
- Community/custom nodes have higher risk profile than official nodes
