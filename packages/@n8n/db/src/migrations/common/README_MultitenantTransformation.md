# MultitenantTransformation Migration - Quick Reference

> **Migration File:** `1762511301780-MultitenantTransformation.ts`
> **Type:** Reversible (可逆迁移)
> **Created:** 2025-01-07

## 🎯 What This Migration Does

Transforms the n8n database schema for true multi-tenancy:

**Before:**
```
Workflow/Credentials ←→ SharedWorkflow/SharedCredentials ←→ Project
                        (Many-to-many via junction tables)
```

**After:**
```
Workflow/Credentials → Project
(Direct foreign key, one-to-many)
```

## 🚀 Quick Start

### Run Migration
```bash
# Automatic (on n8n start)
pnpm start

# Manual
cd packages/cli
pnpm typeorm migration:run
```

### Rollback
```bash
cd packages/cli
pnpm typeorm migration:revert
```

## ⚠️ Prerequisites

**Data Integrity Check:**
```sql
-- All workflows must have an owner
SELECT COUNT(*) FROM workflow_entity W
WHERE NOT EXISTS (
  SELECT 1 FROM shared_workflow SW
  WHERE SW.workflowId = W.id AND SW.role = 'workflow:owner'
);
-- Expected: 0

-- All credentials must have an owner
SELECT COUNT(*) FROM credentials_entity C
WHERE NOT EXISTS (
  SELECT 1 FROM shared_credentials SC
  WHERE SC.credentialsId = C.id AND SC.role = 'credential:owner'
);
-- Expected: 0
```

## 📋 What Changes

### Tables Modified

1. **workflow_entity**
   - ✅ Added `projectId` column (VARCHAR(36), NOT NULL)
   - ✅ Added foreign key to `project.id` (CASCADE DELETE)
   - ✅ Added indexes: `idx_workflow_project_id`, `idx_workflow_project_active`

2. **credentials_entity**
   - ✅ Added `projectId` column (VARCHAR(36), NOT NULL)
   - ✅ Added foreign key to `project.id` (CASCADE DELETE)
   - ✅ Added index: `idx_credentials_project_id`

3. **shared_workflow** - ❌ DELETED
4. **shared_credentials** - ❌ DELETED

### Data Migration

- Workflow ownership: `shared_workflow (role='workflow:owner')` → `workflow_entity.projectId`
- Credential ownership: `shared_credentials (role='credential:owner')` → `credentials_entity.projectId`

## ✅ Post-Migration Verification

```sql
-- 1. Check projectId columns exist and are NOT NULL
DESCRIBE workflow_entity;
DESCRIBE credentials_entity;

-- 2. Verify all workflows have valid projectId
SELECT COUNT(*) FROM workflow_entity WHERE projectId IS NULL;
-- Expected: 0

-- 3. Verify all credentials have valid projectId
SELECT COUNT(*) FROM credentials_entity WHERE projectId IS NULL;
-- Expected: 0

-- 4. Confirm old tables are gone
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name IN ('shared_workflow', 'shared_credentials');
-- Expected: 0
```

## 🔄 Database Support

| Database | Status | Tested |
|----------|--------|--------|
| SQLite | ✅ Supported | ⬜ |
| PostgreSQL | ✅ Supported | ⬜ |
| MySQL | ✅ Supported | ⬜ |
| MariaDB | ✅ Supported | ⬜ |

## 📊 Performance

| Data Volume | Estimated Time |
|-------------|---------------|
| < 1,000 workflows | < 1 min |
| 1,000 - 10,000 | 1-5 min |
| > 10,000 | 5-30 min |

## 🐛 Common Issues

### Issue: "Found X workflows without an owner"
**Fix:** Ensure all workflows have an owner in `shared_workflow`
```sql
-- Find orphaned workflows
SELECT W.id, W.name FROM workflow_entity W
WHERE NOT EXISTS (
  SELECT 1 FROM shared_workflow SW
  WHERE SW.workflowId = W.id AND SW.role = 'workflow:owner'
);
```

### Issue: Foreign key constraint fails
**Fix:** Verify all referenced projects exist
```sql
-- Find invalid project references
SELECT SW.workflowId, SW.projectId FROM shared_workflow SW
WHERE NOT EXISTS (
  SELECT 1 FROM project P WHERE P.id = SW.projectId
);
```

## 🔗 Related Documentation

- [Complete Migration Guide](../../../../改造方案文档/数据库迁移说明.md)
- [Test Plan](../../../../改造方案文档/迁移测试计划.md)
- [Architecture Design](../../../../改造方案文档/01-架构底层改造方案.md)

## 💡 Code Changes Required

After migration, update these modules:

1. **WorkflowRepository** - Remove `shared_workflow` JOINs
2. **CredentialsRepository** - Remove `shared_credentials` JOINs
3. **Permission Logic** - Use `projectId` directly
4. **API Endpoints** - Filter by `projectId`
5. **Entity Definitions** - Remove `SharedWorkflow`/`SharedCredentials` relations

## 🛡️ Safety Features

- ✅ Validates data integrity before migration
- ✅ Throws errors on orphaned records
- ✅ Fully reversible (down migration implemented)
- ✅ Transaction-based (atomic operation)
- ✅ Detailed logging at each step

## 📞 Support

For issues or questions:
- Check [Migration Guide](../../../../改造方案文档/数据库迁移说明.md)
- Review migration logs
- Contact: [Team Contact]

---

**Author:** Claude Code Assistant
**Last Updated:** 2025-01-07
**Status:** ✅ Ready for testing
