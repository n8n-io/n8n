# Database Maintenance

## VACUUM Fundamentals

### Why VACUUM is Critical

PostgreSQL uses MVCC (Multi-Version Concurrency Control):
- Updates/deletes don't remove old rows immediately
- Old rows marked as "dead tuples"
- VACUUM reclaims space from dead tuples
- Without VACUUM: table bloat, degraded performance, transaction ID wraparound

### VACUUM Variants

```sql
-- Standard VACUUM (non-blocking, reclaims space for reuse)
VACUUM users;
VACUUM;  -- All tables

-- VACUUM FULL (locks table, rewrites entire table, reclaims disk space)
VACUUM FULL users;
-- Use pg_repack instead for production (non-blocking alternative)

-- VACUUM VERBOSE (shows details)
VACUUM VERBOSE users;

-- VACUUM ANALYZE (vacuum + update statistics)
VACUUM ANALYZE users;
```

### VACUUM Monitoring

```sql
-- Check when tables were last vacuumed
SELECT
  schemaname,
  relname,
  last_vacuum,
  last_autovacuum,
  n_dead_tup,
  n_live_tup,
  round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_pct
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Check vacuum progress (PG 9.6+)
SELECT
  pid,
  datname,
  relid::regclass,
  phase,
  heap_blks_total,
  heap_blks_scanned,
  heap_blks_vacuumed,
  round(100.0 * heap_blks_scanned / NULLIF(heap_blks_total, 0), 2) as pct_complete
FROM pg_stat_progress_vacuum;
```

## Autovacuum Configuration

```sql
-- Global settings (postgresql.conf)
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 60s  -- Check interval

-- Vacuum thresholds
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.2
-- Triggers when: dead_tuples > threshold + (scale_factor * total_tuples)
-- Default: 50 + (0.2 * 1000000) = 200,050 dead tuples for 1M row table

-- Analyze thresholds
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.1

-- Performance settings
autovacuum_vacuum_cost_delay = 2ms  -- Lower = faster, more I/O impact
autovacuum_vacuum_cost_limit = 200
```

### Per-Table Autovacuum Tuning

```sql
-- High-churn table: vacuum more aggressively
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.05,  -- 5% instead of 20%
  autovacuum_vacuum_threshold = 1000,
  autovacuum_analyze_scale_factor = 0.02
);

-- Large, stable table: vacuum less often
ALTER TABLE archive_logs SET (
  autovacuum_vacuum_scale_factor = 0.5,
  autovacuum_vacuum_threshold = 5000
);

-- Very high-churn table: disable cost delays
ALTER TABLE sessions SET (
  autovacuum_vacuum_cost_delay = 0
);

-- View table settings
SELECT
  relname,
  reloptions
FROM pg_class
WHERE relname = 'orders';
```

## ANALYZE (Statistics)

```sql
-- Update statistics for query planner
ANALYZE users;
ANALYZE;  -- All tables

-- Check statistics freshness
SELECT
  schemaname,
  relname,
  last_analyze,
  last_autoanalyze,
  n_mod_since_analyze
FROM pg_stat_user_tables
ORDER BY n_mod_since_analyze DESC;

-- Increase statistics target for high-cardinality columns
ALTER TABLE users ALTER COLUMN email SET STATISTICS 1000;
-- Default is 100, range is 0-10000
-- Higher = better estimates, slower ANALYZE

-- View column statistics
SELECT
  tablename,
  attname,
  n_distinct,      -- Estimated unique values
  correlation,     -- Physical vs logical ordering (-1 to 1)
  null_frac        -- Percentage of nulls
FROM pg_stats
WHERE tablename = 'users';
```

## Bloat Detection and Removal

### Detect Table Bloat

```sql
-- Approximate bloat calculation
SELECT
  schemaname,
  relname,
  pg_size_pretty(pg_total_relation_size(format('%I.%I', schemaname, relname))) as total_size,
  pg_size_pretty(pg_relation_size(format('%I.%I', schemaname, relname))) as table_size,
  round(100 * pg_relation_size(format('%I.%I', schemaname, relname))::numeric /
        NULLIF(pg_total_relation_size(format('%I.%I', schemaname, relname)), 0), 2) as table_pct,
  n_dead_tup,
  round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_pct
FROM pg_stat_user_tables
WHERE pg_total_relation_size(format('%I.%I', schemaname, relname)) > 10485760  -- > 10MB
ORDER BY pg_total_relation_size(format('%I.%I', schemaname, relname)) DESC;
```

### Detect Index Bloat

```sql
-- Unused indexes
SELECT
  schemaname,
  relname,
  indexrelname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Index size vs table size
SELECT
  schemaname,
  relname,
  pg_size_pretty(pg_relation_size(format('%I.%I', schemaname, relname))) as table_size,
  pg_size_pretty(pg_total_relation_size(format('%I.%I', schemaname, relname)) -
                 pg_relation_size(format('%I.%I', schemaname, relname))) as indexes_size,
  round(100.0 * (pg_total_relation_size(format('%I.%I', schemaname, relname)) -
                 pg_relation_size(format('%I.%I', schemaname, relname)))::numeric /
        NULLIF(pg_relation_size(format('%I.%I', schemaname, relname)), 0), 2) as index_ratio_pct
FROM pg_stat_user_tables
WHERE pg_total_relation_size(format('%I.%I', schemaname, relname)) > 10485760
ORDER BY pg_total_relation_size(format('%I.%I', schemaname, relname)) DESC;
```

### Remove Bloat

```sql
-- Option 1: VACUUM FULL (locks table)
VACUUM FULL users;

-- Option 2: pg_repack (online, no locks)
-- Command line: pg_repack -d mydb -t users

-- Option 3: REINDEX (for index bloat)
REINDEX TABLE users;
REINDEX INDEX CONCURRENTLY idx_users_email;  -- Non-blocking (PG 12+)

-- Option 4: CLUSTER (rewrite table in index order, locks table)
CLUSTER users USING users_pkey;
```

## pg_stat Monitoring Views

### pg_stat_activity (Current Queries)

```sql
-- Active queries
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  state_change,
  query
FROM pg_stat_activity
WHERE state = 'active'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start;

-- Long-running queries
SELECT
  pid,
  now() - query_start as duration,
  state,
  query
FROM pg_stat_activity
WHERE state = 'active'
  AND (now() - query_start) > interval '5 minutes'
ORDER BY duration DESC;

-- Kill long-running query
SELECT pg_cancel_backend(pid);  -- Graceful
SELECT pg_terminate_backend(pid);  -- Forceful

-- Idle transactions (bad, hold locks)
SELECT
  pid,
  usename,
  state,
  now() - state_change as idle_duration,
  query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND (now() - state_change) > interval '1 minute';
```

### pg_stat_database (Database-wide Stats)

```sql
SELECT
  datname,
  numbackends,  -- Active connections
  xact_commit,
  xact_rollback,
  round(100.0 * xact_rollback / NULLIF(xact_commit + xact_rollback, 0), 2) as rollback_pct,
  blks_read,
  blks_hit,
  round(100.0 * blks_hit / NULLIF(blks_hit + blks_read, 0), 2) as cache_hit_ratio,
  tup_returned,
  tup_fetched,
  tup_inserted,
  tup_updated,
  tup_deleted
FROM pg_stat_database
WHERE datname = current_database();
```

### pg_stat_user_tables (Table Stats)

```sql
SELECT
  schemaname,
  relname,
  seq_scan,        -- Sequential scans (high = may need index)
  seq_tup_read,
  idx_scan,        -- Index scans
  idx_tup_fetch,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  n_tup_hot_upd,   -- HOT updates (good, in-page updates)
  n_live_tup,
  n_dead_tup,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;  -- Tables with most sequential scans
```

### pg_stat_user_indexes (Index Usage)

```sql
-- Index usage efficiency
SELECT
  schemaname,
  relname,
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan;  -- Low idx_scan = potentially unused index

-- Index hit ratio
SELECT
  schemaname,
  relname,
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  CASE WHEN idx_tup_read > 0
    THEN round(100.0 * idx_tup_fetch / idx_tup_read, 2)
    ELSE 0
  END as hit_ratio
FROM pg_stat_user_indexes
WHERE idx_scan > 0
ORDER BY hit_ratio;
```

### pg_statio_user_tables (I/O Stats)

```sql
SELECT
  schemaname,
  relname,
  heap_blks_read,   -- Disk reads
  heap_blks_hit,    -- Cache hits
  round(100.0 * heap_blks_hit / NULLIF(heap_blks_hit + heap_blks_read, 0), 2) as cache_hit_ratio,
  idx_blks_read,
  idx_blks_hit,
  toast_blks_read,
  toast_blks_hit
FROM pg_statio_user_tables
WHERE heap_blks_read + heap_blks_hit > 0
ORDER BY heap_blks_read DESC;
```

## Lock Monitoring

```sql
-- Current locks
SELECT
  l.pid,
  a.usename,
  a.query,
  l.mode,
  l.locktype,
  l.granted,
  l.relation::regclass
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted
ORDER BY l.pid;

-- Blocking queries
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

## Transaction ID Wraparound

```sql
-- Check distance to wraparound (should be < 1 billion)
SELECT
  datname,
  age(datfrozenxid) as xid_age,
  2147483647 - age(datfrozenxid) as xids_remaining
FROM pg_database
ORDER BY age(datfrozenxid) DESC;

-- Per-table wraparound status
SELECT
  schemaname,
  relname,
  age(relfrozenxid) as xid_age,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as size
FROM pg_stat_user_tables
ORDER BY age(relfrozenxid) DESC
LIMIT 20;

-- Prevent wraparound: VACUUM FREEZE
VACUUM FREEZE;  -- Current database
VACUUM FREEZE users;  -- Specific table
```

## Maintenance Checklist

**Daily:**
- Monitor autovacuum activity
- Check for long-running queries
- Verify replication lag (if applicable)
- Check cache hit ratio

**Weekly:**
- Review slow queries from pg_stat_statements
- Check for table/index bloat
- Review unused indexes
- Monitor disk space usage

**Monthly:**
- Review autovacuum settings
- Reindex heavily updated indexes
- Update statistics on large tables
- Review database growth trends

**Quarterly:**
- Test backup restoration
- Review and optimize slow queries
- Capacity planning
- PostgreSQL version updates

## Helpful Maintenance Queries

```sql
-- Database size
SELECT
  pg_database.datname,
  pg_size_pretty(pg_database_size(pg_database.datname)) as size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;

-- Largest tables
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                 pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Connection count by state
SELECT
  state,
  count(*) as count
FROM pg_stat_activity
GROUP BY state
ORDER BY count DESC;

-- Reset statistics (after performance testing)
SELECT pg_stat_reset();
SELECT pg_stat_statements_reset();
```
