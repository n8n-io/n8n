# Index Strategy Patterns

## Overview

Database indexes are critical for query performance, but they come with trade-offs. This guide covers proven patterns for index design, optimization strategies, and common pitfalls to avoid.

## Index Types and Use Cases

### B-Tree Indexes (Default)

**Best For:**
- Equality queries (`WHERE column = value`)
- Range queries (`WHERE column BETWEEN x AND y`)
- Sorting (`ORDER BY column`)
- Pattern matching with leading wildcards (`WHERE column LIKE 'prefix%'`)

**Characteristics:**
- Logarithmic lookup time O(log n)
- Supports partial matches on composite indexes
- Most versatile index type

**Example:**
```sql
-- Single column B-tree index
CREATE INDEX idx_customers_email ON customers (email);

-- Composite B-tree index
CREATE INDEX idx_orders_customer_date ON orders (customer_id, order_date);
```

### Hash Indexes

**Best For:**
- Exact equality matches only
- High-cardinality columns
- Primary key lookups

**Characteristics:**
- Constant lookup time O(1) for exact matches
- Cannot support range queries or sorting
- Memory-efficient for equality operations

**Example:**
```sql
-- Hash index for exact lookups (PostgreSQL)
CREATE INDEX idx_users_id_hash ON users USING HASH (user_id);
```

### Partial Indexes

**Best For:**
- Filtering on subset of data
- Reducing index size and maintenance overhead
- Query patterns that consistently use specific filters

**Example:**
```sql
-- Index only active users
CREATE INDEX idx_active_users_email 
ON users (email) 
WHERE status = 'active';

-- Index recent orders only
CREATE INDEX idx_recent_orders 
ON orders (customer_id, created_at) 
WHERE created_at > CURRENT_DATE - INTERVAL '90 days';

-- Index non-null values only
CREATE INDEX idx_customers_phone 
ON customers (phone_number) 
WHERE phone_number IS NOT NULL;
```

### Covering Indexes

**Best For:**
- Eliminating table lookups for SELECT queries
- Frequently accessed column combinations
- Read-heavy workloads

**Example:**
```sql
-- Covering index with INCLUDE clause (SQL Server/PostgreSQL)
CREATE INDEX idx_orders_customer_covering 
ON orders (customer_id, order_date) 
INCLUDE (order_total, status);

-- Query can be satisfied entirely from index:
-- SELECT order_total, status FROM orders 
-- WHERE customer_id = 123 AND order_date > '2024-01-01';
```

### Functional/Expression Indexes

**Best For:**
- Queries on transformed column values
- Case-insensitive searches
- Complex calculations

**Example:**
```sql
-- Case-insensitive email searches
CREATE INDEX idx_users_email_lower 
ON users (LOWER(email));

-- Date part extraction
CREATE INDEX idx_orders_month 
ON orders (EXTRACT(MONTH FROM order_date));

-- JSON field indexing
CREATE INDEX idx_users_preferences_theme 
ON users ((preferences->>'theme'));
```

## Composite Index Design Patterns

### Column Ordering Strategy

**Rule: Most Selective First**
```sql
-- Query: WHERE status = 'active' AND city = 'New York' AND age > 25
-- Assume: status has 3 values, city has 100 values, age has 80 values

-- GOOD: Most selective column first
CREATE INDEX idx_users_city_age_status ON users (city, age, status);

-- BAD: Least selective first
CREATE INDEX idx_users_status_city_age ON users (status, city, age);
```

**Selectivity Calculation:**
```sql
-- Estimate selectivity for each column
SELECT 
    'status' as column_name,
    COUNT(DISTINCT status)::float / COUNT(*) as selectivity
FROM users
UNION ALL
SELECT 
    'city' as column_name,
    COUNT(DISTINCT city)::float / COUNT(*) as selectivity
FROM users
UNION ALL
SELECT 
    'age' as column_name,
    COUNT(DISTINCT age)::float / COUNT(*) as selectivity
FROM users;
```

### Query Pattern Matching

**Pattern 1: Equality + Range**
```sql
-- Query: WHERE customer_id = 123 AND order_date BETWEEN '2024-01-01' AND '2024-03-31'
CREATE INDEX idx_orders_customer_date ON orders (customer_id, order_date);
```

**Pattern 2: Multiple Equality Conditions**
```sql
-- Query: WHERE status = 'active' AND category = 'premium' AND region = 'US'
CREATE INDEX idx_users_status_category_region ON users (status, category, region);
```

**Pattern 3: Equality + Sorting**
```sql
-- Query: WHERE category = 'electronics' ORDER BY price DESC, created_at DESC
CREATE INDEX idx_products_category_price_date ON products (category, price DESC, created_at DESC);
```

### Prefix Optimization

**Efficient Prefix Usage:**
```sql
-- Index supports all these queries efficiently:
CREATE INDEX idx_users_lastname_firstname_email ON users (last_name, first_name, email);

-- ✓ Uses index: WHERE last_name = 'Smith'
-- ✓ Uses index: WHERE last_name = 'Smith' AND first_name = 'John'  
-- ✓ Uses index: WHERE last_name = 'Smith' AND first_name = 'John' AND email = 'john@...'
-- ✗ Cannot use index: WHERE first_name = 'John'
-- ✗ Cannot use index: WHERE email = 'john@...'
```

## Performance Optimization Patterns

### Index Intersection vs Composite Indexes

**Scenario: Multiple single-column indexes**
```sql
CREATE INDEX idx_users_age ON users (age);
CREATE INDEX idx_users_city ON users (city);
CREATE INDEX idx_users_status ON users (status);

-- Query: WHERE age > 25 AND city = 'NYC' AND status = 'active'
-- Database may use index intersection (combining multiple indexes)
-- Performance varies by database engine and data distribution
```

**Better: Purpose-built composite index**
```sql
-- More efficient for the specific query pattern
CREATE INDEX idx_users_city_status_age ON users (city, status, age);
```

### Index Size vs Performance Trade-off

**Wide Indexes (Many Columns):**
```sql
-- Pros: Covers many query patterns, excellent for covering queries
-- Cons: Large index size, slower writes, more memory usage
CREATE INDEX idx_orders_comprehensive 
ON orders (customer_id, order_date, status, total_amount, shipping_method, created_at)
INCLUDE (order_notes, billing_address);
```

**Narrow Indexes (Few Columns):**
```sql
-- Pros: Smaller size, faster writes, less memory
-- Cons: May not cover all query patterns
CREATE INDEX idx_orders_customer_date ON orders (customer_id, order_date);
CREATE INDEX idx_orders_status ON orders (status);
```

### Maintenance Optimization

**Regular Index Analysis:**
```sql
-- PostgreSQL: Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE idx_scan = 0  -- Potentially unused indexes
ORDER BY schemaname, tablename;

-- Check index size
SELECT 
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

## Common Anti-Patterns

### 1. Over-Indexing

**Problem:**
```sql
-- Too many similar indexes
CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_orders_customer_date ON orders (customer_id, order_date);  
CREATE INDEX idx_orders_customer_status ON orders (customer_id, status);
CREATE INDEX idx_orders_customer_date_status ON orders (customer_id, order_date, status);
```

**Solution:**
```sql
-- One well-designed composite index can often replace several
CREATE INDEX idx_orders_customer_date_status ON orders (customer_id, order_date, status);
-- Drop redundant indexes: idx_orders_customer, idx_orders_customer_date, idx_orders_customer_status
```

### 2. Wrong Column Order

**Problem:**
```sql
-- Query: WHERE active = true AND user_type = 'premium' AND city = 'Chicago'
-- Bad order: boolean first (lowest selectivity)
CREATE INDEX idx_users_active_type_city ON users (active, user_type, city);
```

**Solution:**
```sql
-- Good order: most selective first
CREATE INDEX idx_users_city_type_active ON users (city, user_type, active);
```

### 3. Ignoring Query Patterns

**Problem:**
```sql
-- Index doesn't match common query patterns
CREATE INDEX idx_products_name ON products (product_name);

-- But queries are: WHERE category = 'electronics' AND price BETWEEN 100 AND 500
-- Index is not helpful for these queries
```

**Solution:**
```sql
-- Match actual query patterns
CREATE INDEX idx_products_category_price ON products (category, price);
```

### 4. Function in WHERE Without Functional Index

**Problem:**
```sql
-- Query uses function but no functional index
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';
-- Regular index on email won't help
```

**Solution:**
```sql
-- Create functional index
CREATE INDEX idx_users_email_lower ON users (LOWER(email));
```

## Advanced Patterns

### Multi-Column Statistics

**When Columns Are Correlated:**
```sql
-- If city and state are highly correlated, create extended statistics
CREATE STATISTICS stats_address_correlation ON city, state FROM addresses;
ANALYZE addresses;

-- Helps query planner make better decisions for:
-- WHERE city = 'New York' AND state = 'NY'
```

### Conditional Indexes for Data Lifecycle

**Pattern: Different indexes for different data ages**
```sql
-- Hot data (recent orders) - optimized for OLTP
CREATE INDEX idx_orders_hot_customer_date 
ON orders (customer_id, order_date DESC) 
WHERE order_date > CURRENT_DATE - INTERVAL '30 days';

-- Warm data (older orders) - optimized for analytics  
CREATE INDEX idx_orders_warm_date_total 
ON orders (order_date, total_amount) 
WHERE order_date <= CURRENT_DATE - INTERVAL '30 days' 
  AND order_date > CURRENT_DATE - INTERVAL '1 year';

-- Cold data (archived orders) - minimal indexing
CREATE INDEX idx_orders_cold_date 
ON orders (order_date) 
WHERE order_date <= CURRENT_DATE - INTERVAL '1 year';
```

### Index-Only Scan Optimization

**Design indexes to avoid table access:**
```sql
-- Query: SELECT order_id, total_amount, status FROM orders WHERE customer_id = ?
CREATE INDEX idx_orders_customer_covering 
ON orders (customer_id) 
INCLUDE (order_id, total_amount, status);

-- Or as composite index (if database doesn't support INCLUDE)
CREATE INDEX idx_orders_customer_covering 
ON orders (customer_id, order_id, total_amount, status);
```

## Index Monitoring and Maintenance

### Performance Monitoring Queries

**Find slow queries that might benefit from indexes:**
```sql
-- PostgreSQL: Find queries with high cost
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
WHERE mean_time > 1000  -- Queries taking > 1 second
ORDER BY mean_time DESC;
```

**Identify missing indexes:**
```sql
-- Look for sequential scans on large tables
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    n_tup_ins + n_tup_upd + n_tup_del as write_activity
FROM pg_stat_user_tables
WHERE seq_scan > 100 
  AND seq_tup_read > 100000  -- Large sequential scans
  AND (idx_scan = 0 OR seq_scan > idx_scan * 2)
ORDER BY seq_tup_read DESC;
```

### Index Maintenance Schedule

**Regular Maintenance Tasks:**
```sql
-- Rebuild fragmented indexes (SQL Server)
ALTER INDEX ALL ON orders REBUILD;

-- Update statistics (PostgreSQL)
ANALYZE orders;

-- Check for unused indexes monthly
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
```

## Conclusion

Effective index strategy requires:

1. **Understanding Query Patterns**: Analyze actual application queries, not theoretical scenarios
2. **Measuring Performance**: Use query execution plans and timing to validate index effectiveness  
3. **Balancing Trade-offs**: More indexes improve reads but slow writes and increase storage
4. **Regular Maintenance**: Monitor index usage and performance, remove unused indexes
5. **Iterative Improvement**: Start with essential indexes, add and optimize based on real usage

The goal is not to index every possible query pattern, but to create a focused set of indexes that provide maximum benefit for your application's specific workload while minimizing maintenance overhead.