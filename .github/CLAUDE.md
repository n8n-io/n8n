@../AGENTS.md

## .github Quick Reference

This folder contains n8n's GitHub Actions infrastructure.

### Key Files

| File/Folder | Purpose |
|-------------|---------|
| `WORKFLOWS.md` | Complete CI/CD documentation |
| `workflows/` | GitHub Actions workflows |
| `actions/` | Reusable composite actions |
| `scripts/` | Release & Docker automation |
| `CODEOWNERS` | Team review ownership |

### Workflow Naming

| Prefix | Purpose |
|--------|---------|
| `test-` | Testing (unit, E2E, visual) |
| `ci-` | Continuous integration |
| `util-` | Utilities (notifications) |
| `build-` | Build processes |
| `release-` | Release automation |
| `sec-` | Security scanning |

Reusable workflows: add `-reusable` or `-callable` suffix.

### Common Tasks

**Add workflow:** Create in `workflows/`, document in `WORKFLOWS.md`

**Add script:** Create `.mjs` in `scripts/`, document in `WORKFLOWS.md`

### Reference

See `WORKFLOWS.md` for:
- Architecture diagrams
- Workflow call graph
- Scheduled jobs & triggers
- Runners & secrets
