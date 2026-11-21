# Changelog

All notable changes to the MCP Creator skill will be documented in this file.

## [1.0.0] - 2024-12-15

### Added
- Initial release of MCP Creator skill
- Core SKILL.md with MCP architecture overview, tool design patterns, and security hardening
- Reference documentation:
  - `architecture-patterns.md` - Transport layers, lifecycle, resource management
  - `security-hardening.md` - OWASP-aligned security checklist, input validation, rate limiting
  - `tool-design.md` - Naming conventions, schema patterns, output formats
  - `testing-debugging.md` - Testing strategies, debugging techniques, common issues
- Production-ready templates:
  - `basic-server.ts` - Minimal server with proper structure
  - `authenticated-api.ts` - Full API integration with auth, caching, rate limiting

### Security
- Comprehensive input validation patterns using Zod
- Secret management best practices
- Rate limiting implementation examples
- OWASP Top 10 mitigations

### Documentation
- Decision tree for when to use MCP vs Script vs Agent
- Anti-patterns section with examples
- Success metrics table
