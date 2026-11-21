# Performance Optimization

## EXPLAIN ANALYZE Fundamentals

```sql
-- Basic EXPLAIN ANALYZE
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT u.id, u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name;

-- Key metrics to watch:
-- Planning Time: Time spent creating query plan
-- Execution Time: Actual query execution time
-- Shared Hit Blocks: Data found in cache (good)
-- Shared Read Blocks: Data read from disk (slow)
-- Rows: Estimated vs actual row counts
```

## Reading EXPLAIN Output

```
Seq Scan on users  (cost=0.00..1234.56 rows=10000 width=32)
                    ^^^^^^^^^^^^^^^^^^^^  ^^^^^^     ^^^^^^^^
                    startup..total cost   estimate   row width

Actual time: 0.123..45.678 rows=9876 loops=1
             ^^^^^^^^^^^^^^^  ^^^^^^^^  ^^^^^^^
             first..last row  actual    iterations
```

**Node types (fastest to slowest):**
- Index Only Scan - Best, data from index only
- Index Scan - Good, uses index + heap lookup
- Bitmap Index Scan - Good for multiple conditions
- Seq Scan - Table scan, OK for small tables
- Seq Scan on large table - Problem, needs index

## Index Strategies

### B-tree Indexes (Default)

```sql
-- Single column index
CREATE INDEX idx_users_email ON users(email);

-- Multi-column index (order matters!)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC);
-- Good for: WHERE user_id = X ORDER BY created_at DESC
-- Good for: WHERE user_id = X AND created_at > Y
-- Bad for: WHERE created_at > Y (doesn't use index)

-- Partial index (smaller, faster)
CREATE INDEX idx_active_users ON users(email) WHERE active = true;

-- Expression index
CREATE INDEX idx_users_lower_email ON users(LOWER(email));
-- Enables: WHERE LOWER(email) = 'user@example.com'

-- Covering index (includes extra columns)
CREATE INDEX idx_orders_covering ON orders(user_id) INCLUDE (total, created_at);
-- Enables Index Only Scan
```

### GIN Indexes (JSONB, arrays, full-text)

```sql
-- JSONB containment
CREATE INDEX idx_data_gin ON documents USING GIN(data);
-- Enables: WHERE data @> '{"status": "active"}'

-- JSONB specific paths
CREATE INDEX idx_data_status ON documents USING GIN((data -> 'status'));

-- Array operations
CREATE INDEX idx_tags_gin ON posts USING GIN(tags);
-- Enables: WHERE tags @> ARRAY['postgresql', 'performance']

-- Full-text search
CREATE INDEX idx_content_fts ON articles USING GIN(to_tsvector('english', content));
-- Enables: WHERE to_tsvector('english', content) @@ to_tsquery('postgresql & performance')
```

### GiST Indexes (Spatial, ranges, nearest neighbor)

```sql
-- PostGIS spatial index
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);
-- Enables: WHERE ST_DWithin(geom, point, 1000)

-- Range types
CREATE INDEX idx_bookings_range ON bookings USING GIST(during);
-- Enables: WHERE during && '[2024-01-01, 2024-01-31]'::daterange

-- Nearest neighbor (KNN)
CREATE INDEX idx_locations_gist ON locations USING GIST(coordinates);
-- Enables: ORDER BY coordinates <-> point('0,0') LIMIT 10
```

### BRIN Indexes (Large, naturally ordered tables)

```sql
-- Time-series data (insert-only, sorted by time)
CREATE INDEX idx_metrics_time_brin ON metrics USING BRIN(timestamp);
-- Very small index, good for WHERE timestamp > NOW() - INTERVAL '1 day'

-- Works well with:
-- - Log tables
-- - Time-series metrics
-- - Append-only tables with natural order
```

## Statistics and Planner

```sql
-- Update statistics (do after bulk changes)
ANALYZE users;
ANALYZE;  -- All tables

-- Check statistics freshness
SELECT schemaname, relname, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public';

-- Increase statistics target for high-cardinality columns
ALTER TABLE users ALTER COLUMN email SET STATISTICS 1000;
-- Default is 100, increase for better selectivity estimates

-- View column statistics
SELECT * FROM pg_stats WHERE tablename = 'users' AND attname = 'email';
```

## Query Optimization Patterns

### Problem: Sequential scan on large table

```sql
-- Bad: Full table scan
SELECT * FROM orders WHERE user_id = 123;
-- Solution: Add index
CREATE INDEX idx_orders_user ON orders(user_id);
```

### Problem: Index not used

```sql
-- Bad: Function prevents index usage
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
-- Solution: Expression index
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- Bad: Implicit type conversion
SELECT * FROM users WHERE id = '123';  -- id is integer
-- Solution: Use correct type
SELECT * FROM users WHERE id = 123;
```

### Problem: Large JOIN inefficiency

```sql
-- Bad: Nested loop on large tables
EXPLAIN ANALYZE
SELECT * FROM orders o JOIN users u ON o.user_id = u.id;

-- Solutions:
-- 1. Ensure indexes exist on join columns
CREATE INDEX idx_orders_user ON orders(user_id);
-- 2. Update statistics
ANALYZE orders, users;
-- 3. Increase work_mem if hash join would be better
SET work_mem = '256MB';
```

### Problem: COUNT(*) slow

```sql
-- Bad: Full table scan
SELECT COUNT(*) FROM orders WHERE status = 'pending';

-- Solutions:
-- 1. Partial index
CREATE INDEX idx_orders_pending ON orders(id) WHERE status = 'pending';

-- 2. Approximate count for large tables
SELECT reltuples::bigint FROM pg_class WHERE relname = 'orders';

-- 3. Materialized count for reports
CREATE MATERIALIZED VIEW order_counts AS
SELECT status, COUNT(*) FROM orders GROUP BY status;
CREATE UNIQUE INDEX ON order_counts(status);
REFRESH MATERIALIZED VIEW CONCURRENTLY order_counts;
```

## Connection Pooling

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Connection limit reached? Use pgBouncer
-- pgbouncer.ini:
-- [databases]
-- mydb = host=localhost port=5432 dbname=mydb
-- [pgbouncer]
-- pool_mode = transaction
-- max_client_conn = 1000
-- default_pool_size = 25
```

## Configuration Tuning

```sql
-- Memory settings (for 16GB RAM server)
shared_buffers = 4GB           -- 25% of RAM
effective_cache_size = 12GB    -- 75% of RAM
work_mem = 64MB                -- Per operation
maintenance_work_mem = 1GB     -- For VACUUM, CREATE INDEX

-- Checkpoint tuning
checkpoint_completion_target = 0.9
wal_buffers = 16MB
checkpoint_timeout = 10min

-- Query planner
random_page_cost = 1.1         -- Lower for SSD (default 4.0)
effective_io_concurrency = 200 -- Higher for SSD

-- Parallelism (Postgres 10+)
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
```

## Performance Monitoring

```sql
-- Slow queries (requires pg_stat_statements)
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Cache hit ratio (should be > 99%)
SELECT
  sum(blks_hit) * 100.0 / sum(blks_hit + blks_read) as cache_hit_ratio
FROM pg_stat_database;

-- Index usage
SELECT
  schemaname,
  relname,
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%pkey';  -- Unused indexes
```
