# Security Vulnerability Fix Guidelines

## Overview
This guide covers how to fix security vulnerabilities in the n8n codebase. Follow a systematic approach to identify, fix, and verify vulnerabilities in dependencies or base images.

## Decision Tree
```
Is it a direct dependency?
  → Yes: Update in catalog or package.json
  → No: Is it transitive?
    → Yes: Add pnpm override
    → No: Is it base image?
      → Yes: Update Dockerfile, trigger base image workflow
```

## Process Flow
```
Scan → Investigate → Fix → Verify
  ↓        ↓          ↓       ↓
pnpm    pnpm why   Update  pnpm
build:  (trace)    deps   build:
docker:            or      docker:
scan              override scan
```

## Step-by-Step Process

### 1. Initial Setup
Start with a clean install:
```bash
pnpm install --frozen-lockfile
```

### 2. Scan for Vulnerabilities
Run the Docker scan to verify if the vulnerability exists:
```bash
pnpm build:docker:scan
```

### 3. Investigate the Source
Use `pnpm why` to trace where the vulnerable package is coming from:
```bash
pnpm why <package-name> -r
```

### 4. Determine Fix Strategy

#### Case A: Direct Dependency
If the vulnerable package is a **direct dependency**:

**Update via Catalog** (preferred for shared dependencies):
```yaml
# pnpm-workspace.yaml
catalog:
  '@azure/identity': 4.13.0  # Updated version
```

```json
// packages/cli/package.json
{
  "dependencies": {
    "@azure/identity": "catalog:"
  }
}
```

**Or update directly in package.json:**
```json
{
  "dependencies": {
    "vulnerable-package": "^1.2.3"
  }
}
```

Then: `pnpm install`

#### Case B: Transitive Dependency
If the vulnerable package is a **transitive dependency**:

**Add an override** in the root `package.json`:
```json
{
  "pnpm": {
    "overrides": {
      "vulnerable-package": "^1.2.3"
    }
  }
}
```

**For multiple versions:**
```json
{
  "pnpm": {
    "overrides": {
      "vulnerable-package@3": "^3.2.1",
      "vulnerable-package@4": "^4.0.1"
    }
  }
}
```

Then: `pnpm install`

#### Case C: Base Image / NPM Issue
If the vulnerability comes from the **base Docker image**:

1. Check `docker/images/n8n-base/Dockerfile`
2. Update Node version or Alpine packages if needed
3. Note: Base image rebuild requires manual workflow trigger

### 5. Verify the Fix
```bash
pnpm install
pnpm why <package-name>  # Check version updated
pnpm build:docker:scan    # Confirm vulnerability resolved
```

## Commit & PR Standards

### Commit Format
```
{type}({scope}): {neutral description}

{Brief neutral context}

Addresses: CVE-XXXX-XXXXX
Refs: {LINEAR-ID}
```

### Type Selection
| Scenario | Type |
|----------|------|
| Dependency update | `fix(deps)` |
| Code vulnerability fix | `fix` |
| License/compliance | `chore` |
| Docker/build hardening | `build` |

### Title Language - USE NEUTRAL LANGUAGE
Commit/PR titles appear in changelogs. Use neutral language:

| ❌ Avoid | ✅ Use Instead |
|----------|----------------|
| CVE-XXXX-XXXXX | (footer only) |
| vulnerability, exploit | issue, concern |
| critical, security fix | improvement, update |
| patch vulnerability | validate, harden, ensure |

### Example Commit
**Good:**
```
fix(deps): update jws to 4.0.1

Updates jws package to latest stable version.

Addresses: CVE-2025-65945
Refs: SEC-412
```

**Bad:**
```
fix(security): patch critical CVE-2025-65945 in jws
```

## Done Checklist
- [ ] `pnpm build:docker:scan` shows no vulnerability for the CVE
- [ ] `pnpm why <package>` shows updated version
- [ ] Commit follows neutral language format (no CVE in title)
- [ ] PR references Linear ticket if provided

## Common Commands
```bash
pnpm install --frozen-lockfile  # Initial setup
pnpm build:docker:scan          # Scan for vulnerabilities
pnpm why <package-name> -r      # Investigate dependency
pnpm install                    # Update lockfile after changes
pnpm list <package-name>        # Check specific package versions
```
