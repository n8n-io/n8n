# Filesystem, database, network, and audit trails

Applies to: all backend packages.

## Filesystem

- Weakened file access restriction enforcement
- File operations bypassing allowlist/blocklist patterns
- Access to n8n internal directories
- Unsanitized user input flowing into a file path

## Database

- Missing indexes on frequently queried columns in migrations
- Resource-intensive queries without pagination or limits
- Missing encryption for sensitive fields beyond credentials
- Raw SQL that bypasses TypeORM protections

## HTTP, webhooks, and network

- SSRF risk in user-controlled URLs
- CORS allowing all origins
- CSP or iframe sandbox changes that weaken protections
- Rate limiting changes that reduce protection
- Disabled TLS certificate validation (`rejectUnauthorized: false`)
- Bearer tokens forwarded across a redirect to a different host

## Audit logging

- Missing logging for security-relevant events
- Sensitive data in logs or error messages
- Incomplete audit trails for authentication and authorization events
