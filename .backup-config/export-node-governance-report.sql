-- ============================================================================
-- Node Governance CSV Report (PostgreSQL)
-- ============================================================================
-- 
-- Usage:
--   psql -h localhost -U n8n -d n8n -f scripts/export-node-governance-report.sql
--
-- To export directly to CSV:
--   psql -h localhost -U n8n -d n8n -c "\copy (SELECT * FROM ...) TO 'report.csv' CSV HEADER"
--
-- Or run each query below and export from pgAdmin/DBeaver
--
-- ============================================================================

-- ============================================================================
-- REPORT 1: Complete Policy Report with Nodes and Status
-- ============================================================================

\echo '=== POLICIES REPORT ==='

SELECT 
    p.id AS "Policy ID",
    p."policyType" AS "Policy Type",
    p.scope AS "Scope",
    p."targetType" AS "Target Type",
    p."targetValue" AS "Target Value",
    CASE 
        WHEN p."targetType" = 'category' THEN nc."displayName"
        ELSE ''
    END AS "Category Name",
    CASE 
        WHEN p."targetType" = 'node' THEN p."targetValue"
        ELSE nca."nodeType"
    END AS "Node Type",
    CASE WHEN p."policyType" = 'allow' THEN 'Allowed' ELSE 'Blocked' END AS "Status",
    CASE 
        WHEN p.scope = 'global' THEN 'All (Global)'
        ELSE COALESCE(
            (SELECT STRING_AGG(proj.name, '; ' ORDER BY proj.name) 
             FROM policy_project_assignment ppa 
             JOIN project proj ON ppa."projectId" = proj.id 
             WHERE ppa."policyId" = p.id),
            'No projects assigned'
        )
    END AS "Projects",
    u.email AS "Created By",
    p."createdAt" AS "Created At"
FROM node_governance_policy p
LEFT JOIN "user" u ON p."createdById" = u.id
LEFT JOIN node_category nc ON p."targetType" = 'category' AND nc.slug = p."targetValue"
LEFT JOIN node_category_assignment nca ON p."targetType" = 'category' AND nca."categoryId" = nc.id
WHERE p."targetType" = 'node' 
   OR (p."targetType" = 'category' AND nca."nodeType" IS NOT NULL)
ORDER BY p.id, "Node Type";


-- ============================================================================
-- REPORT 2: Categories Report
-- ============================================================================

\echo ''
\echo '=== CATEGORIES REPORT ==='

SELECT 
    nc.id AS "Category ID",
    nc.slug AS "Slug",
    nc."displayName" AS "Display Name",
    COALESCE(nc.description, '') AS "Description",
    COALESCE(nc.color, '') AS "Color",
    (SELECT COUNT(*) FROM node_category_assignment WHERE "categoryId" = nc.id) AS "Node Count",
    COALESCE(
        (SELECT STRING_AGG("nodeType", '; ' ORDER BY "nodeType") 
         FROM node_category_assignment 
         WHERE "categoryId" = nc.id),
        ''
    ) AS "Nodes",
    u.email AS "Created By",
    nc."createdAt" AS "Created At"
FROM node_category nc
LEFT JOIN "user" u ON nc."createdById" = u.id
ORDER BY nc."displayName";


-- ============================================================================
-- REPORT 3: Nodes Governance Status Report
-- ============================================================================

\echo ''
\echo '=== NODES GOVERNANCE STATUS ==='

SELECT DISTINCT ON (nca."nodeType", p.id)
    nca."nodeType" AS "Node Type",
    nc.slug AS "Category Slug",
    nc."displayName" AS "Category Name",
    COALESCE(p.id, '') AS "Policy ID",
    COALESCE(p."policyType", 'default') AS "Policy Type",
    COALESCE(p.scope, '') AS "Policy Scope",
    CASE 
        WHEN p."policyType" = 'allow' THEN 'Allowed'
        WHEN p."policyType" = 'block' THEN 'Blocked'
        ELSE 'Allowed (Default)'
    END AS "Status",
    CASE 
        WHEN p.id IS NULL THEN 'All'
        WHEN p.scope = 'global' THEN 'All (Global)'
        ELSE COALESCE(
            (SELECT STRING_AGG(proj.name, '; ' ORDER BY proj.name) 
             FROM policy_project_assignment ppa 
             JOIN project proj ON ppa."projectId" = proj.id 
             WHERE ppa."policyId" = p.id),
            'No projects assigned'
        )
    END AS "Projects"
FROM node_category_assignment nca
JOIN node_category nc ON nca."categoryId" = nc.id
LEFT JOIN node_governance_policy p ON (
    (p."targetType" = 'node' AND p."targetValue" = nca."nodeType")
    OR (p."targetType" = 'category' AND p."targetValue" = nc.slug)
)
ORDER BY nca."nodeType", p.id;


-- ============================================================================
-- REPORT 4: Summary Statistics
-- ============================================================================

\echo ''
\echo '=== SUMMARY ==='

SELECT 
    (SELECT COUNT(*) FROM node_governance_policy) AS "Total Policies",
    (SELECT COUNT(*) FROM node_governance_policy WHERE "policyType" = 'allow') AS "Allow Policies",
    (SELECT COUNT(*) FROM node_governance_policy WHERE "policyType" = 'block') AS "Block Policies",
    (SELECT COUNT(*) FROM node_governance_policy WHERE scope = 'global') AS "Global Policies",
    (SELECT COUNT(*) FROM node_governance_policy WHERE scope = 'projects') AS "Project Policies",
    (SELECT COUNT(*) FROM node_category) AS "Total Categories",
    (SELECT COUNT(*) FROM node_category_assignment) AS "Total Node Assignments",
    (SELECT COUNT(*) FROM node_access_request WHERE status = 'pending') AS "Pending Requests";
