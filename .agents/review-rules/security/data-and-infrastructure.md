# Filesystem, database, and browser-facing responses

Applies to: all backend packages.

- Unsanitized user input reaching a file path, weakened file access restriction
  enforcement, or access to n8n internal directories
- Raw SQL that bypasses TypeORM protections
- CORS allowing all origins, weakened CSP or iframe sandboxing, reduced rate
  limiting, or `rejectUnauthorized: false`
- User-controlled bytes served from the n8n origin without
  `Content-Disposition: attachment` or an equivalent inline-render guard, on the
  binary-data and webhook/form response paths
