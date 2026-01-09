# Security Policy

## Reporting a Vulnerability

If you discover a (suspected) security vulnerability, please report it through our [Vulnerability Disclosure Program](https://n8n.notion.site/n8n-vulnerability-disclosure-program).

## Automated Security Monitoring

This repository implements a comprehensive 3-tier automated security monitoring system to detect and alert on vulnerabilities:

### Level 1: Dependency & Container Scanning (Basic)

**GitHub Dependabot** (`.github/dependabot.yml`)
- Monitors npm dependencies for known CVEs
- Runs: Daily at 06:00 UTC
- Action: Creates automatic pull requests for security patches
- Labels: `dependencies`, `security`, `automated`

**Aqua Trivy Daily Scan** (`.github/workflows/security-trivy-daily.yml`)
- Scans Docker container for OS and library vulnerabilities
- Runs: Daily at 06:00 UTC
- Detects: CRITICAL, HIGH, MEDIUM severity issues
- Results: Published to GitHub Security tab (SARIF format)
- Build: Fails on CRITICAL vulnerabilities

### Level 2: Code Analysis & Pre-Deploy Gates (Optimal)

**CodeQL Security Analysis** (`.github/workflows/security-codeql.yml`)
- Static code analysis for security vulnerabilities
- Runs: Weekly (Mondays 06:00 UTC) + on code changes
- Detects: SQL injection, XSS, path traversal, command injection, hardcoded credentials, and 200+ security patterns
- Results: Published to GitHub Security tab with PR annotations

**Pre-Deploy Security Check** (`.github/workflows/security-check-pre-deploy.yml`)
- Security gate before deployment to production
- Runs: On push to master (before Render auto-deploy)
- Action: Blocks deployment if CRITICAL vulnerabilities detected
- Purpose: Prevents vulnerable code from reaching production

### Level 3: Real-time CVE Monitoring (Advanced)

**CVE Notification System** (`.github/workflows/security-cve-notifications.yml`)
- Monitors NVD database for new n8n vulnerabilities
- Runs: Every 6 hours
- Filters: CRITICAL CVEs (CVSS >= 9.0)
- Action: Creates GitHub Issues automatically with remediation steps
- Checks: Also queries GitHub Security Advisories
- Extensible: Can add Discord/Slack notifications (documented in workflow)

## Upstream Synchronization

**Automatic Fork Sync** (`.github/workflows/sync-fork.yml`)
- Synchronizes with upstream n8n-io/n8n repository
- Runs: 2x daily (00:00 UTC and 12:00 UTC)
- Mode: Silent, automatic (no PR required)
- Conflict Resolution: Auto-resolves by accepting upstream changes (`-X theirs`)
- Purpose: Ensures security patches from upstream are applied immediately

## Viewing Security Results

1. **GitHub Security Tab**: Repository → Security → Code scanning alerts
2. **Pull Request Annotations**: Security issues highlighted directly in PRs
3. **GitHub Issues**: Automatic issues created for CRITICAL CVEs
4. **Actions Tab**: Workflow run logs and summaries

## Security Hardening

**Production Docker Image** (`docker/images/n8n/Dockerfile.hardened`)
- Based on Alpine Linux (minimal attack surface)
- Non-root user execution
- Strict file permissions (700/600)
- Debug binaries removed (wget, curl)
- Core dumps disabled
- Health check monitoring

## Current CVE Status

**Version**: Synced with upstream n8n v2.2.0
**Known Critical CVEs Patched**:
- CVE-2025-68613 (CVSS 9.9) - RCE via Expression Injection - Patched in v1.122.0
- CVE-2025-65964 - RCE via Git Node Pre-Commit Hook - Patched in v1.121.2
- CVE-2025-57749 (CVSS 6.5) - Symlink Traversal - Patched in v1.118.0

Current version is **NOT vulnerable** to these CVEs.
