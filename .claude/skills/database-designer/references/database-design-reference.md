# database-designer reference

## Database Design Principles

### Normalization Forms

#### First Normal Form (1NF)
- **Atomic Values**: Each column contains indivisible values
- **Unique Column Names**: No duplicate column names within a table
- **Uniform Data Types**: Each column contains the same type of data
- **Row Uniqueness**: No duplicate rows in the table

**Example Violation:**
```sql
-- BAD: Multiple phone numbers in one column
CREATE TABLE contacts (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    phones VARCHAR(200)  -- "123-456-7890, 098-765-4321"
);

-- GOOD: Separate table for phone numbers
CREATE TABLE contacts (
    id INT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE contact_phones (
    id INT PRIMARY KEY,
    contact_id INT REFERENCES contacts(id),
    phone_number VARCHAR(20),
    phone_type VARCHAR(10)
);
```

#### Second Normal Form (2NF)
- **1NF Compliance**: Must satisfy First Normal Form
- **Full Functional Dependency**: Non-key attributes depend on the entire primary key
- **Partial Dependency Elimination**: Remove attributes that depend on part of a composite key

**Example Violation:**
```sql
-- BAD: Student course table with partial dependencies
CREATE TABLE student_courses (
    student_id INT,
    course_id INT,
    student_name VARCHAR(100),  -- Depends only on student_id
    course_name VARCHAR(100),   -- Depends only on course_id
    grade CHAR(1),
    PRIMARY KEY (student_id, course_id)
);

-- GOOD: Separate tables eliminate partial dependencies
CREATE TABLE students (
    id INT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE courses (
    id INT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE enrollments (
    student_id INT REFERENCES students(id),
    course_id INT REFERENCES courses(id),
    grade CHAR(1),
    PRIMARY KEY (student_id, course_id)
);
```

#### Third Normal Form (3NF)
- **2NF Compliance**: Must satisfy Second Normal Form
- **Transitive Dependency Elimination**: Non-key attributes should not depend on other non-key attributes
- **Direct Dependency**: Non-key attributes depend directly on the primary key

**Example Violation:**
```sql
-- BAD: Employee table with transitive dependency
CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    department_id INT,
    department_name VARCHAR(100),  -- Depends on department_id, not employee id
    department_budget DECIMAL(10,2) -- Transitive dependency
);

-- GOOD: Separate department information
CREATE TABLE departments (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    budget DECIMAL(10,2)
);

CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    department_id INT REFERENCES departments(id)
);
```

#### Boyce-Codd Normal Form (BCNF)
- **3NF Compliance**: Must satisfy Third Normal Form
- **Determinant Key Rule**: Every determinant must be a candidate key
- **Stricter 3NF**: Handles anomalies not covered by 3NF

### Denormalization Strategies

#### When to Denormalize
1. **Read-Heavy Workloads**: High query frequency with acceptable write trade-offs
2. **Performance Bottlenecks**: Join operations causing significant latency
3. **Aggregation Needs**: Frequent calculation of derived values
4. **Caching Requirements**: Pre-computed results for common queries

#### Common Denormalization Patterns

**Redundant Storage**
```sql
-- Store calculated values to avoid expensive joins
CREATE TABLE orders (
    id INT PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    customer_name VARCHAR(100), -- Denormalized from customers table
    order_total DECIMAL(10,2),  -- Denormalized calculation
    created_at TIMESTAMP
);
```

**Materialized Aggregates**
```sql
-- Pre-computed summary tables
CREATE TABLE customer_statistics (
    customer_id INT PRIMARY KEY,
    total_orders INT,
    lifetime_value DECIMAL(12,2),
    last_order_date DATE,
    updated_at TIMESTAMP
);
```

## Index Optimization Strategies

### B-Tree Indexes
- **Default Choice**: Best for range queries, sorting, and equality matches
- **Column Order**: Most selective columns first for composite indexes
- **Prefix Matching**: Supports leading column subset queries
- **Maintenance Cost**: Balanced tree structure with logarithmic operations

### Hash Indexes
- **Equality Queries**: Optimal for exact match lookups
- **Memory Efficiency**: Constant-time access for single-value queries
- **Range Limitations**: Cannot support range or partial matches
- **Use Cases**: Primary keys, unique constraints, cache keys

### Composite Indexes
```sql
-- Query pattern determines optimal column order
-- Query: WHERE status = 'active' AND created_date > '2023-01-01' ORDER BY priority DESC
CREATE INDEX idx_task_status_date_priority 
ON tasks (status, created_date, priority DESC);

-- Query: WHERE user_id = 123 AND category IN ('A', 'B') AND date_field BETWEEN '...' AND '...'
CREATE INDEX idx_user_category_date 
ON user_activities (user_id, category, date_field);
```

### Covering Indexes
```sql
-- Include additional columns to avoid table lookups
CREATE INDEX idx_user_email_covering 
ON users (email) 
INCLUDE (first_name, last_name, status);

-- Query can be satisfied entirely from the index
-- SELECT first_name, last_name, status FROM users WHERE email = 'user@example.com';
```

### Partial Indexes
```sql
-- Index only relevant subset of data
CREATE INDEX idx_active_users_email 
ON users (email) 
WHERE status = 'active';

-- Index for recent orders only
CREATE INDEX idx_recent_orders_customer 
ON orders (customer_id, created_at) 
WHERE created_at > CURRENT_DATE - INTERVAL '30 days';
```

## Query Analysis & Optimization

### Query Patterns Recognition
1. **Equality Filters**: Single-column B-tree indexes
2. **Range Queries**: B-tree with proper column ordering
3. **Text Search**: Full-text indexes or trigram indexes
4. **Join Operations**: Foreign key indexes on both sides
5. **Sorting Requirements**: Indexes matching ORDER BY clauses

### Index Selection Algorithm
```
1. Identify WHERE clause columns
2. Determine most selective columns first
3. Consider JOIN conditions
4. Include ORDER BY columns if possible
5. Evaluate covering index opportunities
6. Check for existing overlapping indexes
```

## Data Modeling Patterns

### Star Schema (Data Warehousing)
```sql
-- Central fact table
CREATE TABLE sales_facts (
    sale_id BIGINT PRIMARY KEY,
    product_id INT REFERENCES products(id),
    customer_id INT REFERENCES customers(id),
    date_id INT REFERENCES date_dimension(id),
    store_id INT REFERENCES stores(id),
    quantity INT,
    unit_price DECIMAL(8,2),
    total_amount DECIMAL(10,2)
);

-- Dimension tables
CREATE TABLE date_dimension (
    id INT PRIMARY KEY,
    date_value DATE,
    year INT,
    quarter INT,
    month INT,
    day_of_week INT,
    is_weekend BOOLEAN
);
```

### Snowflake Schema
```sql
-- Normalized dimension tables
CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(200),
    category_id INT REFERENCES product_categories(id),
    brand_id INT REFERENCES brands(id)
);

CREATE TABLE product_categories (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    parent_category_id INT REFERENCES product_categories(id)
);
```

### Document Model (JSON Storage)
```sql
-- Flexible document storage with indexing
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    document_type VARCHAR(50),
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index on JSON properties
CREATE INDEX idx_documents_user_id 
ON documents USING GIN ((data->>'user_id'));

CREATE INDEX idx_documents_status 
ON documents ((data->>'status')) 
WHERE document_type = 'order';
```

### Graph Data Patterns
```sql
-- Adjacency list for hierarchical data
CREATE TABLE categories (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    parent_id INT REFERENCES categories(id),
    level INT,
    path VARCHAR(500)  -- Materialized path: "/1/5/12/"
);

-- Many-to-many relationships
CREATE TABLE relationships (
    id UUID PRIMARY KEY,
    from_entity_id UUID,
    to_entity_id UUID,
    relationship_type VARCHAR(50),
    created_at TIMESTAMP,
    INDEX (from_entity_id, relationship_type),
    INDEX (to_entity_id, relationship_type)
);
```

## Migration Strategies

### Zero-Downtime Migration (Expand-Contract Pattern)

**Phase 1: Expand**
```sql
-- Add new column without constraints
ALTER TABLE users ADD COLUMN new_email VARCHAR(255);

-- Backfill data in batches
UPDATE users SET new_email = email WHERE id BETWEEN 1 AND 1000;
-- Continue in batches...

-- Add constraints after backfill
ALTER TABLE users ADD CONSTRAINT users_new_email_unique UNIQUE (new_email);
ALTER TABLE users ALTER COLUMN new_email SET NOT NULL;
```

**Phase 2: Contract**
```sql
-- Update application to use new column
-- Deploy application changes
-- Verify new column is being used

-- Remove old column
ALTER TABLE users DROP COLUMN email;
-- Rename new column
ALTER TABLE users RENAME COLUMN new_email TO email;
```

### Data Type Changes
```sql
-- Safe string to integer conversion
ALTER TABLE products ADD COLUMN sku_number INTEGER;
UPDATE products SET sku_number = CAST(sku AS INTEGER) WHERE sku ~ '^[0-9]+$';
-- Validate conversion success before dropping old column
```

## Partitioning Strategies

### Horizontal Partitioning (Sharding)
```sql
-- Range partitioning by date
CREATE TABLE sales_2023 PARTITION OF sales
FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE sales_2024 PARTITION OF sales
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Hash partitioning by user_id
CREATE TABLE user_data_0 PARTITION OF user_data
FOR VALUES WITH (MODULUS 4, REMAINDER 0);

CREATE TABLE user_data_1 PARTITION OF user_data
FOR VALUES WITH (MODULUS 4, REMAINDER 1);
```

### Vertical Partitioning
```sql
-- Separate frequently accessed columns
CREATE TABLE users_core (
    id INT PRIMARY KEY,
    email VARCHAR(255),
    status VARCHAR(20),
    created_at TIMESTAMP
);

-- Less frequently accessed profile data
CREATE TABLE users_profile (
    user_id INT PRIMARY KEY REFERENCES users_core(id),
    bio TEXT,
    preferences JSONB,
    last_login TIMESTAMP
);
```

## Connection Management

### Connection Pooling
- **Pool Size**: CPU cores × 2 + effective spindle count
- **Connection Lifetime**: Rotate connections to prevent resource leaks
- **Timeout Settings**: Connection, idle, and query timeouts
- **Health Checks**: Regular connection validation

### Read Replicas Strategy
```sql
-- Write queries to primary
INSERT INTO users (email, name) VALUES ('user@example.com', 'John Doe');

-- Read queries to replicas (with appropriate read preference)
SELECT * FROM users WHERE status = 'active';  -- Route to read replica

-- Consistent reads when required
SELECT * FROM users WHERE id = LAST_INSERT_ID();  -- Route to primary
```

## Caching Layers

### Cache-Aside Pattern
```python
def get_user(user_id):
    # Try cache first
    user = cache.get(f"user:{user_id}")
    if user is None:
        # Cache miss - query database
        user = db.query("SELECT * FROM users WHERE id = %s", user_id)
        # Store in cache
        cache.set(f"user:{user_id}", user, ttl=3600)
    return user
```

### Write-Through Cache
- **Consistency**: Always keep cache and database in sync
- **Write Latency**: Higher due to dual writes
- **Data Safety**: No data loss on cache failures

### Cache Invalidation Strategies
1. **TTL-Based**: Time-based expiration
2. **Event-Driven**: Invalidate on data changes
3. **Version-Based**: Use version numbers for consistency
4. **Tag-Based**: Group related cache entries

## Database Selection Guide

### SQL Databases
**PostgreSQL**
- **Strengths**: ACID compliance, complex queries, JSON support, extensibility
- **Use Cases**: OLTP applications, data warehousing, geospatial data
- **Scale**: Vertical scaling with read replicas

**MySQL**
- **Strengths**: Performance, replication, wide ecosystem support
- **Use Cases**: Web applications, content management, e-commerce
- **Scale**: Horizontal scaling through sharding

### NoSQL Databases

**Document Stores (MongoDB, CouchDB)**
- **Strengths**: Flexible schema, horizontal scaling, developer productivity
- **Use Cases**: Content management, catalogs, user profiles
- **Trade-offs**: Eventual consistency, complex queries limitations

**Key-Value Stores (Redis, DynamoDB)**
- **Strengths**: High performance, simple model, excellent caching
- **Use Cases**: Session storage, real-time analytics, gaming leaderboards
- **Trade-offs**: Limited query capabilities, data modeling constraints

**Column-Family (Cassandra, HBase)**
- **Strengths**: Write-heavy workloads, linear scalability, fault tolerance
- **Use Cases**: Time-series data, IoT applications, messaging systems
- **Trade-offs**: Query flexibility, consistency model complexity

**Graph Databases (Neo4j, Amazon Neptune)**
- **Strengths**: Relationship queries, pattern matching, recommendation engines
- **Use Cases**: Social networks, fraud detection, knowledge graphs
- **Trade-offs**: Specialized use cases, learning curve

### NewSQL Databases
**Distributed SQL (CockroachDB, TiDB, Spanner)**
- **Strengths**: SQL compatibility with horizontal scaling
- **Use Cases**: Global applications requiring ACID guarantees
- **Trade-offs**: Complexity, latency for distributed transactions

## Tools & Scripts

### Schema Analyzer
- **Input**: SQL DDL files, JSON schema definitions
- **Analysis**: Normalization compliance, constraint validation, naming conventions
- **Output**: Analysis report, Mermaid ERD, improvement recommendations

### Index Optimizer
- **Input**: Schema definition, query patterns
- **Analysis**: Missing indexes, redundancy detection, selectivity estimation
- **Output**: Index recommendations, CREATE INDEX statements, performance projections

### Migration Generator
- **Input**: Current and target schemas
- **Analysis**: Schema differences, dependency resolution, risk assessment
- **Output**: Migration scripts, rollback plans, validation queries
