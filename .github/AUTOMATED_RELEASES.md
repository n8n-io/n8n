# Automated Package Releases

This repository uses automated version bumping and publishing for independent packages based on conventional commits.

## How It Works

### Automatic Versioning
- **feat**: Minor version bump (0.1.0 → 0.2.0)
- **fix** / **perf**: Patch version bump (0.1.0 → 0.1.1)
- **BREAKING CHANGE** or `!`: Major version bump (0.1.0 → 1.0.0)

### Main vs Independent Packages

**Main Packages** (weekly releases):
- `packages/cli` (n8n)
- `packages/core` (@n8n/core)
- `packages/workflow` (@n8n/workflow)
- `packages/nodes-base` (@n8n/nodes-base)
- `packages/frontend/editor-ui` (@n8n/editor-ui)

**Independent Packages** (automated releases):
- All other packages in the workspace
- Published automatically when changed
- Version bumped based on conventional commits
- Generate individual changelogs

### Workflow

1. **Push to master** → Triggers automation
2. **Version detection** → Analyzes commits for semantic changes
3. **Version bumping** → Updates package.json versions
4. **Changelog generation** → Creates/updates CHANGELOG.md per package
5. **Build & publish** → Builds and publishes to npm

### Manual Override

Manual version updates are detected and respected - the automation will not override manual version changes.

### Commit Format

Use conventional commit format for automatic processing:
```
feat(scope): Add new feature
fix(scope): Fix bug
perf(scope): Improve performance
feat(scope)!: Breaking change
```