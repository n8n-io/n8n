# Query Optimization

## EXPLAIN Plan Analysis

```sql
-- PostgreSQL EXPLAIN ANALYZE
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    c.customer_id,
    c.name,
    COUNT(o.order_id) as order_count,
    SUM(o.total) as lifetime_value
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
WHERE c.created_at >= '2024-01-01'
GROUP BY c.customer_id, c.name
HAVING COUNT(o.order_id) > 5;

/*
Key metrics to analyze:
- Planning Time: Time to generate plan
- Execution Time: Actual runtime
- Seq Scan: Table scans (bad for large tables)
- Index Scan: Using indexes (good)
- Rows: Estimated vs actual (large difference = stale stats)
- Buffers: shared hit = cache, read = disk I/O
- Loops: Nested loop iterations
*/

-- MySQL EXPLAIN
EXPLAIN FORMAT=JSON
SELECT * FROM orders o
INNER JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date >= '2024-01-01'
  AND c.country = 'US';

-- SQL Server execution plan
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

SELECT ...;

-- Check actual vs estimated rows
SELECT * FROM sys.dm_exec_query_stats;
```

## Index Design and Optimization

```sql
-- Covering index (all columns in index)
CREATE INDEX idx_orders_covering ON orders (
    customer_id,
    order_date
) INCLUDE (total, status);

-- Query uses index-only scan (no table access needed)
SELECT customer_id, order_date, total, status
FROM orders
WHERE customer_id = 123
  AND order_date >= '2024-01-01';

-- Composite index (order matters!)
CREATE INDEX idx_orders_customer_date ON orders (customer_id, order_date DESC);
-- Good: WHERE customer_id = X AND order_date > Y
-- Good: WHERE customer_id = X
-- Bad: WHERE order_date > Y (doesn't use index)

-- Partial/Filtered index (smaller, faster)
CREATE INDEX idx_active_orders ON orders (customer_id, order_date)
WHERE status = 'active';

-- Only used when query includes the filter
SELECT * FROM orders
WHERE customer_id = 123
  AND status = 'active'
  AND order_date >= '2024-01-01';

-- Expression/Function-based index
CREATE INDEX idx_users_lower_email ON users (LOWER(email));

-- Now this uses the index
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

-- GIN index for arrays/JSONB (PostgreSQL)
CREATE INDEX idx_products_tags ON products USING GIN (tags);
SELECT * FROM products WHERE tags @> ARRAY['electronics', 'sale'];

CREATE INDEX idx_orders_metadata ON orders USING GIN (metadata jsonb_path_ops);
SELECT * FROM orders WHERE metadata @> '{"priority": "high"}';
```

## Index Maintenance

```sql
-- PostgreSQL: Find missing indexes
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    seq_tup_read / seq_scan as avg_seq_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
  AND seq_tup_read / seq_scan > 10000
ORDER BY seq_tup_read DESC;

-- Find unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE 'pg_toast%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find duplicate indexes
SELECT
    pg_size_pretty(SUM(pg_relation_size(idx))::BIGINT) as size,
    (array_agg(idx))[1] as idx1,
    (array_agg(idx))[2] as idx2,
    (array_agg(idx))[3] as idx3
FROM (
    SELECT
        indexrelid::regclass as idx,
        (indrelid::text ||E'\n'|| indclass::text ||E'\n'||
         indkey::text ||E'\n'|| COALESCE(indexprs::text,'')||E'\n'||
         COALESCE(indpred::text,'')) as key
    FROM pg_index
) sub
GROUP BY key
HAVING COUNT(*) > 1
ORDER BY SUM(pg_relation_size(idx)) DESC;

-- Reindex to reduce bloat
REINDEX INDEX CONCURRENTLY idx_orders_customer_date;

-- Update statistics
ANALYZE orders;
ANALYZE VERBOSE;  -- Show progress
```

## Query Rewriting Patterns

```sql
-- Avoid SELECT DISTINCT when possible
-- Bad: Forces sort/dedup
SELECT DISTINCT customer_id FROM orders WHERE status = 'active';

-- Good: Use EXISTS
SELECT customer_id FROM customers c
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.customer_id = c.customer_id
      AND o.status = 'active'
);

-- Avoid NOT IN with NULLs
-- Bad: NULL handling issues and poor performance
SELECT * FROM customers
WHERE customer_id NOT IN (SELECT customer_id FROM orders);

-- Good: Use NOT EXISTS
SELECT * FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id
);

-- Push down filtering early
-- Bad: Filter after JOIN
SELECT c.*, o.*
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
WHERE c.country = 'US' AND o.order_date >= '2024-01-01';

-- Good: Use WHERE in subquery/CTE to reduce JOIN size
WITH us_customers AS (
    SELECT customer_id, name
    FROM customers
    WHERE country = 'US'
),
recent_orders AS (
    SELECT customer_id, order_id, total
    FROM orders
    WHERE order_date >= '2024-01-01'
)
SELECT c.*, o.*
FROM us_customers c
JOIN recent_orders o ON c.customer_id = o.customer_id;

-- Avoid scalar subqueries in SELECT
-- Bad: N+1 problem
SELECT
    p.product_id,
    p.name,
    (SELECT COUNT(*) FROM reviews WHERE product_id = p.product_id) as review_count
FROM products p;

-- Good: Single JOIN with GROUP BY
SELECT
    p.product_id,
    p.name,
    COUNT(r.review_id) as review_count
FROM products p
LEFT JOIN reviews r ON p.product_id = r.product_id
GROUP BY p.product_id, p.name;
```

## Partitioning Strategies

```sql
-- Range partitioning by date (PostgreSQL)
CREATE TABLE orders (
    order_id SERIAL,
    customer_id INT,
    order_date DATE NOT NULL,
    total DECIMAL(10,2)
) PARTITION BY RANGE (order_date);

CREATE TABLE orders_2024_q1 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE orders_2024_q2 PARTITION OF orders
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- Partition pruning in action
EXPLAIN SELECT * FROM orders WHERE order_date >= '2024-02-01' AND order_date < '2024-03-01';
-- Only scans orders_2024_q1 partition

-- List partitioning by category
CREATE TABLE products (
    product_id SERIAL,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(200)
) PARTITION BY LIST (category);

CREATE TABLE products_electronics PARTITION OF products
    FOR VALUES IN ('electronics', 'computers', 'phones');

CREATE TABLE products_clothing PARTITION OF products
    FOR VALUES IN ('clothing', 'shoes', 'accessories');

-- Hash partitioning for even distribution
CREATE TABLE users (
    user_id SERIAL,
    email VARCHAR(255)
) PARTITION BY HASH (user_id);

CREATE TABLE users_p0 PARTITION OF users
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE users_p1 PARTITION OF users
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);
```

## Materialized Views

```sql
-- Create materialized view for expensive aggregations
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT
    DATE_TRUNC('day', order_date) as day,
    COUNT(*) as order_count,
    SUM(total) as revenue,
    AVG(total) as avg_order_value,
    COUNT(DISTINCT customer_id) as unique_customers
FROM orders
GROUP BY DATE_TRUNC('day', order_date);

CREATE UNIQUE INDEX idx_daily_sales_day ON daily_sales_summary (day);

-- Refresh strategy
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;

-- Auto-refresh with trigger (PostgreSQL)
CREATE OR REPLACE FUNCTION refresh_daily_sales()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_daily_sales
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_daily_sales();
```

## Query Hints and Optimization

```sql
-- PostgreSQL: Force index usage (use sparingly)
SET enable_seqscan = OFF;
SELECT /*+ IndexScan(orders idx_orders_customer) */ * FROM orders WHERE customer_id = 123;
SET enable_seqscan = ON;

-- SQL Server: Query hints
SELECT * FROM orders WITH (INDEX(idx_orders_customer_date))
WHERE customer_id = 123;

-- Force specific join type
SELECT * FROM customers c
INNER MERGE JOIN orders o ON c.customer_id = o.customer_id;

-- MySQL: Index hints
SELECT * FROM orders USE INDEX (idx_orders_customer_date)
WHERE customer_id = 123;

SELECT * FROM orders FORCE INDEX (idx_orders_customer_date)
WHERE customer_id = 123;

-- PostgreSQL: Parallel query tuning
SET max_parallel_workers_per_gather = 4;
ALTER TABLE large_table SET (parallel_workers = 4);
```

## Performance Monitoring Queries

```sql
-- PostgreSQL: Find slow queries
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    rows / calls as avg_rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Find blocking queries
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

-- Table bloat detection
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    n_dead_tup,
    n_live_tup,
    ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

## Best Practices Checklist

1. Always run EXPLAIN ANALYZE before optimizing
2. Create indexes on foreign keys and WHERE/JOIN columns
3. Use covering indexes for frequent queries
4. Keep statistics up to date (ANALYZE regularly)
5. Avoid SELECT *, specify needed columns
6. Use EXISTS instead of IN for subqueries
7. Filter early, aggregate late
8. Consider partitioning for large tables (>10M rows)
9. Use materialized views for expensive aggregations
10. Monitor slow query log and pg_stat_statements
