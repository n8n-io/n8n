---
name: "database-designer"
description: "Use when the user asks to design database schemas, plan data migrations, optimize queries, choose between SQL and NoSQL, or model data relationships."
---

# Database Designer - POWERFUL Tier Skill

## Overview

A comprehensive database design skill that provides expert-level analysis, optimization, and migration capabilities for modern database systems. This skill combines theoretical principles with practical tools to help architects and developers create scalable, performant, and maintainable database schemas.

## Core Competencies

### Schema Design & Analysis
- **Normalization Analysis**: Automated detection of normalization levels (1NF through BCNF)
- **Denormalization Strategy**: Smart recommendations for performance optimization
- **Data Type Optimization**: Identification of inappropriate types and size issues
- **Constraint Analysis**: Missing foreign keys, unique constraints, and null checks
- **Naming Convention Validation**: Consistent table and column naming patterns
- **ERD Generation**: Automatic Mermaid diagram creation from DDL

### Index Optimization
- **Index Gap Analysis**: Identification of missing indexes on foreign keys and query patterns
- **Composite Index Strategy**: Optimal column ordering for multi-column indexes
- **Index Redundancy Detection**: Elimination of overlapping and unused indexes
- **Performance Impact Modeling**: Selectivity estimation and query cost analysis
- **Index Type Selection**: B-tree, hash, partial, covering, and specialized indexes

### Migration Management
- **Zero-Downtime Migrations**: Expand-contract pattern implementation
- **Schema Evolution**: Safe column additions, deletions, and type changes
- **Data Migration Scripts**: Automated data transformation and validation
- **Rollback Strategy**: Complete reversal capabilities with validation
- **Execution Planning**: Ordered migration steps with dependency resolution

## Tool Workflow (run these — do not analyze schemas by hand)

All paths relative to this skill folder; sample inputs in `assets/`.

### 1. Analyze the schema

```bash
python3 schema_analyzer.py --input schema.sql --generate-erd --output-format json -o analysis.json
```

Accepts SQL DDL or JSON schema (`assets/sample_schema.sql` / `sample_schema.json`). Output includes normalization findings, missing constraints, naming issues, and a Mermaid ERD — show the ERD to the user and fix flagged issues before optimizing.

### 2. Optimize indexes against real query patterns

```bash
python3 index_optimizer.py --schema assets/sample_schema.json --queries assets/sample_query_patterns.json --analyze-existing --format json -o indexes.json
```

Write the user's hot queries into a query-patterns JSON first (copy `assets/sample_query_patterns.json`). Output is a priority-ordered list of CREATE INDEX recommendations plus redundant-index removals.

### 3. Generate the migration

```bash
python3 migration_generator.py --current current_schema.json --target target_schema.json --zero-downtime --format sql -o migration.sql
```

`--zero-downtime` emits an expand-contract plan; `--validate-only` checks feasibility without generating SQL.

### 4. Verification loop

Re-run step 1 on the *target* schema and assert the issues found in the first pass are gone; run `migration_generator.py --validate-only` before handing over the migration.

## Database Design Principles
→ See references/database-design-reference.md for details

## Best Practices

### Schema Design
1. **Use meaningful names**: Clear, consistent naming conventions
2. **Choose appropriate data types**: Right-sized columns for storage efficiency
3. **Define proper constraints**: Foreign keys, check constraints, unique indexes
4. **Consider future growth**: Plan for scale from the beginning
5. **Document relationships**: Clear foreign key relationships and business rules

### Performance Optimization
1. **Index strategically**: Cover common query patterns without over-indexing
2. **Monitor query performance**: Regular analysis of slow queries
3. **Partition large tables**: Improve query performance and maintenance
4. **Use appropriate isolation levels**: Balance consistency with performance
5. **Implement connection pooling**: Efficient resource utilization

### Security Considerations
1. **Principle of least privilege**: Grant minimal necessary permissions
2. **Encrypt sensitive data**: At rest and in transit
3. **Audit access patterns**: Monitor and log database access
4. **Validate inputs**: Prevent SQL injection attacks
5. **Regular security updates**: Keep database software current

## Query Generation Patterns

### SELECT with JOINs

```sql
-- INNER JOIN: only matching rows
SELECT o.id, c.name, o.total
FROM orders o
INNER JOIN customers c ON c.id = o.customer_id;

-- LEFT JOIN: all left rows, NULLs for non-matches
SELECT c.name, COUNT(o.id) AS order_count
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.name;

-- Self-join: hierarchical data (employees/managers)
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id;
```

### Common Table Expressions (CTEs)

```sql
-- Recursive CTE for org chart
WITH RECURSIVE org AS (
  SELECT id, name, manager_id, 1 AS depth
  FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.manager_id, o.depth + 1
  FROM employees e INNER JOIN org o ON o.id = e.manager_id
)
SELECT * FROM org ORDER BY depth, name;
```

### Window Functions

```sql
-- ROW_NUMBER for pagination / dedup
SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) AS rn
FROM orders;

-- RANK with gaps, DENSE_RANK without gaps
SELECT name, score, RANK() OVER (ORDER BY score DESC) AS rank FROM leaderboard;

-- LAG/LEAD for comparing adjacent rows
SELECT date, revenue,
  revenue - LAG(revenue) OVER (ORDER BY date) AS daily_change
FROM daily_sales;
```

### Aggregation Patterns

```sql
-- FILTER clause (PostgreSQL) for conditional aggregation
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'active') AS active,
  AVG(amount) FILTER (WHERE amount > 0) AS avg_positive
FROM accounts;

-- GROUPING SETS for multi-level rollups
SELECT region, product, SUM(revenue)
FROM sales
GROUP BY GROUPING SETS ((region, product), (region), ());
```

---

## Migration Patterns

### Up/Down Migration Scripts

Every migration must have a reversible counterpart. Name files with a timestamp prefix for ordering:

```
migrations/
├── 20260101_000001_create_users.up.sql
├── 20260101_000001_create_users.down.sql
├── 20260115_000002_add_users_email_index.up.sql
└── 20260115_000002_add_users_email_index.down.sql
```

### Zero-Downtime Migrations (Expand/Contract)

Use the expand-contract pattern to avoid locking or breaking running code:

1. **Expand** — add the new column/table (nullable, with default)
2. **Migrate data** — backfill in batches; dual-write from application
3. **Transition** — application reads from new column; stop writing to old
4. **Contract** — drop old column in a follow-up migration

### Data Backfill Strategies

```sql
-- Batch update to avoid long-running locks
UPDATE users SET email_normalized = LOWER(email)
WHERE id IN (SELECT id FROM users WHERE email_normalized IS NULL LIMIT 5000);
-- Repeat in a loop until 0 rows affected
```

### Rollback Procedures

- Always test the `down.sql` in staging before deploying `up.sql` to production
- Keep rollback window short — if the contract step has run, rollback requires a new forward migration
- For irreversible changes (dropping columns with data), take a logical backup first

---

## Performance Optimization

### Indexing Strategies

| Index Type | Use Case | Example |
|------------|----------|---------|
| **B-tree** (default) | Equality, range, ORDER BY | `CREATE INDEX idx_users_email ON users(email);` |
| **GIN** | Full-text search, JSONB, arrays | `CREATE INDEX idx_docs_body ON docs USING gin(to_tsvector('english', body));` |
| **GiST** | Geometry, range types, nearest-neighbor | `CREATE INDEX idx_locations ON places USING gist(coords);` |
| **Partial** | Subset of rows (reduce size) | `CREATE INDEX idx_active ON users(email) WHERE active = true;` |
| **Covering** | Index-only scans | `CREATE INDEX idx_cov ON orders(customer_id) INCLUDE (total, created_at);` |

### EXPLAIN Plan Reading

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;
```

Key signals to watch:
- **Seq Scan** on large tables — missing index
- **Nested Loop** with high row estimates — consider hash/merge join or add index
- **Buffers shared read** much higher than **hit** — working set exceeds memory

### N+1 Query Detection

Symptoms: application issues one query per row (e.g., fetching related records in a loop).

Fixes:
- Use `JOIN` or subquery to fetch in one round-trip
- ORM eager loading (`select_related` / `includes` / `with`)
- DataLoader pattern for GraphQL resolvers

### Connection Pooling

| Tool | Protocol | Best For |
|------|----------|----------|
| **PgBouncer** | PostgreSQL | Transaction/statement pooling, low overhead |
| **ProxySQL** | MySQL | Query routing, read/write splitting |
| **Built-in pool** (HikariCP, SQLAlchemy pool) | Any | Application-level pooling |

**Rule of thumb:** Set pool size to `(2 * CPU cores) + disk spindles`. For cloud SSDs, start with `2 * vCPUs` and tune.

### Read Replicas and Query Routing

- Route all `SELECT` queries to replicas; writes to primary
- Account for replication lag (typically <1s for async, 0 for sync)
- Use `pg_last_wal_replay_lsn()` to detect lag before reading critical data

---

## Multi-Database Decision Matrix

| Criteria | PostgreSQL | MySQL | SQLite | SQL Server |
|----------|-----------|-------|--------|------------|
| **Best for** | Complex queries, JSONB, extensions | Web apps, read-heavy workloads | Embedded, dev/test, edge | Enterprise .NET stacks |
| **JSON support** | Excellent (JSONB + GIN) | Good (JSON type) | Minimal | Good (OPENJSON) |
| **Replication** | Streaming, logical | Group replication, InnoDB cluster | N/A | Always On AG |
| **Licensing** | Open source (PostgreSQL License) | Open source (GPL) / commercial | Public domain | Commercial |
| **Max practical size** | Multi-TB | Multi-TB | ~1 TB (single-writer) | Multi-TB |

**When to choose:**
- **PostgreSQL** — default choice for new projects; best extensibility and standards compliance
- **MySQL** — existing MySQL ecosystem; simple read-heavy web applications
- **SQLite** — mobile apps, CLI tools, unit test databases, IoT/edge
- **SQL Server** — mandated by enterprise policy; deep .NET/Azure integration

### NoSQL Considerations

| Database | Model | Use When |
|----------|-------|----------|
| **MongoDB** | Document | Schema flexibility, rapid prototyping, content management |
| **Redis** | Key-value / cache | Session store, rate limiting, leaderboards, pub/sub |
| **DynamoDB** | Wide-column | Serverless AWS apps, single-digit-ms latency at any scale |

> Use SQL as default. Reach for NoSQL only when the access pattern clearly benefits from it.

---

## Sharding & Replication

### Horizontal vs Vertical Partitioning

- **Vertical partitioning**: Split columns across tables (e.g., separate BLOB columns). Reduces I/O for narrow queries.
- **Horizontal partitioning (sharding)**: Split rows across databases/servers. Required when a single node cannot hold the dataset or handle the throughput.

### Sharding Strategies

| Strategy | How It Works | Pros | Cons |
|----------|-------------|------|------|
| **Hash** | `shard = hash(key) % N` | Even distribution | Resharding is expensive |
| **Range** | Shard by date or ID range | Simple, good for time-series | Hot spots on latest shard |
| **Geographic** | Shard by user region | Data locality, compliance | Cross-region queries are hard |

### Replication Patterns

| Pattern | Consistency | Latency | Use Case |
|---------|------------|---------|----------|
| **Synchronous** | Strong | Higher write latency | Financial transactions |
| **Asynchronous** | Eventual | Low write latency | Read-heavy web apps |
| **Semi-synchronous** | At-least-one replica confirmed | Moderate | Balance of safety and speed |

---

## Cross-References

- **sql-database-assistant** — query writing, optimization, and debugging for day-to-day SQL work
- **database-schema-designer** — ERD modeling, normalization analysis, and schema generation
- **migration-architect** — large-scale migration planning across database engines or major schema overhauls
- **senior-backend** — application-layer patterns (connection pooling, ORM best practices)
- **senior-devops** — infrastructure provisioning for database clusters and replicas

