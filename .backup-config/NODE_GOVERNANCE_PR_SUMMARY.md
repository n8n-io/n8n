# Node Governance Feature - PR Summary

> **Note:** This file is for local reference only. Do NOT commit or push this file.

---

## Status: Ready for PR

| Status | Details |
|--------|---------|
| **Branch** | `feat/node-governance` |
| **Upstream Sync** | Merged with `n8n-io/n8n` master (122 commits) |
| **Merge Commit** | `134819f75b` |
| **Build** | Passing |
| **Conflicts Resolved** | 8 files |

---

## Overview

This PR implements a **Node Governance** feature for n8n that allows administrators to control which nodes can be used in workflows based on policies and access requests.

### Key Capabilities

- **Policy Management**: Create allow/block policies at global or project scope
- **Category System**: Group nodes into categories for bulk policy application
- **Access Requests**: Users can request access to blocked nodes with justification
- **Review Workflow**: Admins can approve/reject requests with comments
- **Node Creator Integration**: Real-time governance status shown when adding nodes
- **Template Import Protection**: Blocked nodes are auto-disabled when importing templates

---

## Statistics

| Metric | Value |
|--------|-------|
| Total files | 47 |
| New files (staged) | 7 |
| Modified files | 40 |
| Lines added | ~5,267 |
| Lines removed | ~816 |
| Unit tests | 24 (16 controller + 8 service) |
| E2E tests | 718 lines |

---

## Upstream Merge (January 27, 2026)

Successfully merged 122 commits from `upstream/master` into `feat/node-governance`.

### Resolved Conflicts (8 files)

| File | Resolution |
|------|------------|
| `packages/@n8n/api-types/src/dto/index.ts` | Added secrets provider exports + node governance exports |
| `packages/@n8n/db/src/entities/index.ts` | Added secrets provider entities + node governance entities |
| `packages/@n8n/db/src/migrations/mysqldb/index.ts` | Added both migrations sequentially |
| `packages/@n8n/db/src/migrations/postgresdb/index.ts` | Added both migrations sequentially |
| `packages/@n8n/db/src/migrations/sqlite/index.ts` | Added both migrations sequentially |
| `packages/cli/src/workflows/workflow.service.ts` | Added all service dependencies |
| `packages/frontend/@n8n/design-system/src/components/N8nIcon/icons.ts` | Added both icons (shield-check + shield-half) |
| `packages/frontend/editor-ui/src/app/constants/navigation.ts` | Added all route constants |

### Rollback Information

```bash
# Backup branch (pre-merge state)
git checkout feat/node-governance-backup-pre-merge

# Or reset to pre-merge commit
git reset --hard c39e595aedd501bac4fd5879eed07a5f7d6a060c
```

---

## Architecture

### Policy Priority Resolution

```
Priority (lower number = higher priority):
1. Project ALLOW  - Explicitly allows a node for a specific project
2. Global BLOCK   - Blocks a node across all projects  
3. Global ALLOW   - Explicitly allows a node globally
4. Project BLOCK  - Blocks a node for a specific project
Default: allowed (when no policies match)
```

### Database Schema

New tables added via migration `1768981346000-AddNodeGovernanceTables`:

- `node_category` - Category definitions (slug, displayName, description, color)
- `node_governance_policy` - Policy definitions (policyType, scope, targetType, targetValue)
- `policy_project_assignment` - Junction table for project-scoped policies
- `node_category_assignment` - Maps nodes to categories
- `node_access_request` - Access request records with status tracking

---

## Files Changed

### Backend - API Types (`packages/@n8n/api-types`)

| File | Description |
|------|-------------|
| `src/dto/index.ts` | DTO exports |
| `src/dto/node-governance/get-node-governance.dto.ts` | Get governance DTO |
| `src/dto/node-governance/index.ts` | Governance DTOs index |
| `src/dto/node-governance/review-access-request.dto.ts` | Review request DTO |

### Backend - Database (`packages/@n8n/db`)

| File | Description |
|------|-------------|
| `src/migrations/common/1768981346000-AddNodeGovernanceTables.ts` | Database migration |

### Backend - CLI (`packages/cli`)

| File | Description |
|------|-------------|
| `src/controllers/node-governance.controller.ts` | REST API controller |
| `src/controllers/__tests__/node-governance.controller.test.ts` | Controller unit tests |
| `src/services/node-governance.service.ts` | Business logic service |
| `src/services/__tests__/node-governance.service.test.ts` | Service unit tests (priority resolution) |
| `src/commands/seed-node-governance.ts` | Seed data command |
| `src/server.ts` | Server registration |
| `src/workflows/workflow.service.ts` | Workflow integration |
| `src/workflow-runner.ts` | Runner integration |

### Frontend - Design System (`packages/frontend/@n8n/design-system`)

| File | Description |
|------|-------------|
| `src/components/N8nIcon/icons.ts` | New governance icons |
| `src/components/N8nMarkdown/Markdown.vue` | Markdown component updates |
| `src/components/N8nNodeCreatorNode/NodeCreatorNode.vue` | Node creator styling |

### Frontend - i18n (`packages/frontend/@n8n/i18n`)

| File | Description |
|------|-------------|
| `src/locales/en.json` | English translations for governance UI |

### Frontend - Editor UI (`packages/frontend/editor-ui`)

| File | Description |
|------|-------------|
| **Node Governance Feature** | |
| `src/features/settings/nodeGovernance/views/NodeGovernanceView.vue` | Main settings view |
| `src/features/settings/nodeGovernance/nodeGovernance.api.ts` | API client |
| `src/features/settings/nodeGovernance/nodeGovernance.store.ts` | Pinia store |
| `src/features/settings/nodeGovernance/nodeGovernance.constants.ts` | Constants |
| `src/features/settings/nodeGovernance/components/PoliciesTab.vue` | Policies tab |
| `src/features/settings/nodeGovernance/components/CategoriesTab.vue` | Categories tab |
| `src/features/settings/nodeGovernance/components/RequestsTab.vue` | Requests tab |
| `src/features/settings/nodeGovernance/components/PolicyFormModal.vue` | Policy form |
| `src/features/settings/nodeGovernance/components/CategoryFormModal.vue` | Category form |
| `src/features/settings/nodeGovernance/components/ReviewRequestModal.vue` | Review modal |
| `src/features/settings/nodeGovernance/components/ApproveRequestModal.vue` | Approve modal |
| `src/features/settings/nodeGovernance/components/RejectRequestModal.vue` | Reject modal |
| `src/features/settings/nodeGovernance/components/CategoryNodesModal.vue` | Category nodes |
| `src/features/settings/nodeGovernance/components/NodeAccessRequestModal.vue` | Access request modal |
| **Node Creator Integration** | |
| `src/features/shared/nodeCreator/components/NodeCreator.vue` | Node creator |
| `src/features/shared/nodeCreator/components/ItemTypes/NodeItem.vue` | Node item with status |
| `src/features/shared/nodeCreator/components/Renderers/ItemsRenderer.vue` | Items renderer |
| **Template Protection** | |
| `src/features/workflows/templates/utils/templateActions.ts` | Auto-disable blocked nodes |
| **App Components** | |
| `src/app/components/Modal.vue` | Modal system |
| `src/app/components/ModalRoot.vue` | Modal root |
| `src/app/components/Modals.vue` | Modals registry |
| `src/app/stores/ui.store.ts` | UI store updates |
| `src/app/composables/useSettingsItems.ts` | Settings navigation |
| `src/app/composables/useWorkflowSaving.ts` | Workflow save integration |

### Testing - Playwright (`packages/testing/playwright`)

| File | Description |
|------|-------------|
| `pages/NodeGovernancePage.ts` | Page object (410 lines) |
| `services/node-governance-api-helper.ts` | API helper (419 lines) |
| `tests/e2e/settings/node-governance/node-governance.spec.ts` | E2E tests (718 lines) |
| `helpers/NavigationHelper.ts` | Navigation helpers |
| `pages/n8nPage.ts` | Page object updates |
| `services/api-helper.ts` | API helper updates |

---

## Test Coverage

### Unit Tests (24 total)

**Controller Tests (16):**
- Get governance status for nodes
- Empty governance when no node types
- Get all policies
- Create global policy
- Validate project-scoped policy requires project IDs
- Update policy
- NotFoundError for missing policy
- Delete policy
- Get all categories
- Create category
- Get pending requests
- Create access request
- Handle duplicate access request
- Approve request
- Reject request
- NotFoundError for missing request

**Service Tests (8) - Priority Resolution:**
- Default to allowed when no policies exist
- Block node when only Global BLOCK exists
- Allow node when only Global ALLOW exists
- Project ALLOW beats Global BLOCK (priority 1 > 2)
- Global BLOCK beats Global ALLOW (priority 2 > 3)
- Global ALLOW beats Project BLOCK (priority 3 > 4)
- Block when only Project BLOCK exists
- Ignore policies for other projects

### E2E Tests

- Navigation and tab switching
- Policy CRUD operations
- Category CRUD operations
- Access request workflow
- Node creator integration

---

## Pre-PR Checklist

- [x] Build passes (`pnpm build`)
- [x] Type check passes (`pnpm typecheck`)
- [x] Unit tests pass (24/24)
- [x] No unused imports
- [x] No problematic type casts (`as` assertions)
- [x] Priority resolution tests added
- [x] Config/build files reverted to upstream
- [x] Unrelated changes reverted (IMAP, OIDC)
- [x] **Merged with upstream/master** (122 commits, 8 conflicts resolved)
- [x] **Build passes after merge**
- [ ] Lint check (`pnpm lint`)
- [ ] E2E tests pass
- [ ] Push to origin

---

## Build Warnings (Pre-existing)

The following warnings appear in build logs but are **NOT from this PR**:

| Warning | File | Origin |
|---------|------|--------|
| `EMPTY_IMPORT_META` | `@n8n/stores/src/useRootStore.ts:8` | Upstream (Iván Ovejero, Jan 17) |
| `EMPTY_IMPORT_META` | `@n8n/rest-api-client/src/utils.ts:120` | Upstream (Iván Ovejero, Jan 17) |

These are informational warnings about CJS/ESM module format compatibility.

---

## Files NOT to Include in PR

These files should NOT be staged:

```
.backup-config/                    # Backup directory
docker-build.log                   # Build artifact
build.log                          # Build artifact
packages/frontend/editor-ui/vite/assert-shim.js  # Unrelated workaround
scripts/azure-ad-provisioning-*.sql  # Unrelated scripts
```

---

## Reverted Files (Unrelated Changes)

The following files had unrelated changes that were reverted:

**From previous PRs:**
- `packages/@n8n/imap/src/part-data.ts` - uuencode buffer fix
- `packages/cli/src/modules/sso-oidc/oidc.service.ee.ts` - Azure AD OIDC changes

**WebSocket/Push changes (not part of governance):**
- `packages/cli/src/push/types.ts`
- `packages/cli/src/push/index.ts`
- `packages/cli/src/push/websocket.push.ts`
- `packages/cli/src/task-runners/task-broker/task-broker-types.ts`
- `packages/cli/src/task-runners/task-broker/task-broker-ws-server.ts`
- `packages/cli/src/chat/chat-service.ts`
- `packages/cli/src/types/websocket.types.ts` (deleted)

**Build/Config files:**
- Root `package.json`, `pnpm-lock.yaml`
- Various `tsconfig.json` files
- `vite.config.mts`, `assert-shim.js`
- Package-specific `package.json` files

---

## Backup Location

Config file backups are stored in `.backup-config/`:

```
.backup-config/
├── NODE_GOVERNANCE_PR_SUMMARY.md (this file)
├── package.json
├── pnpm-lock.yaml
├── chat-package.json
├── design-system-package.json
├── editor-ui-package.json
├── insights-package.json
├── vite.config.mts
├── assert-shim.js
└── tsconfig/
    ├── chat-tsconfig.json
    ├── composables-tsconfig.json
    ├── design-system-tsconfig.json
    ├── editor-ui-tsconfig.json
    ├── i18n-tsconfig.json
    ├── rest-api-client-tsconfig.json
    ├── stores-tsconfig.json
    └── storybook-tsconfig.app.json
```

---

## Quick Commands

**Push to origin:**
```bash
git push origin feat/node-governance
```

**Create PR (draft):**
```bash
gh pr create --draft --title "feat(node-governance): Add node governance feature for controlling node access" --body "See PR description"
```

**Rollback if needed:**
```bash
git reset --hard feat/node-governance-backup-pre-merge
```

---

*Generated: January 26, 2026*
*Last Updated: January 27, 2026 (after upstream merge)*
