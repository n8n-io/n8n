# Database Normalization Guide

## Overview

Database normalization is the process of organizing data to minimize redundancy and dependency issues. It involves decomposing tables to eliminate data anomalies and improve data integrity.

## Normal Forms

### First Normal Form (1NF)

**Requirements:**
- Each column contains atomic (indivisible) values
- Each column contains values of the same type
- Each column has a unique name
- The order of data storage doesn't matter

**Violations and Solutions:**

**Problem: Multiple values in single column**
```sql
-- BAD: Multiple phone numbers in one column
CREATE TABLE customers (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    phones VARCHAR(500)  -- "555-1234, 555-5678, 555-9012"
);

-- GOOD: Separate table for multiple phones
CREATE TABLE customers (
    id INT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE customer_phones (
    id INT PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    phone VARCHAR(20),
    phone_type VARCHAR(10) -- 'mobile', 'home', 'work'
);
```

**Problem: Repeating groups**
```sql
-- BAD: Repeating column patterns
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    item1_name VARCHAR(100),
    item1_qty INT,
    item1_price DECIMAL(8,2),
    item2_name VARCHAR(100),
    item2_qty INT,
    item2_price DECIMAL(8,2),
    item3_name VARCHAR(100),
    item3_qty INT,
    item3_price DECIMAL(8,2)
);

-- GOOD: Separate table for order items
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    order_date DATE
);

CREATE TABLE order_items (
    id INT PRIMARY KEY,
    order_id INT REFERENCES orders(order_id),
    item_name VARCHAR(100),
    quantity INT,
    unit_price DECIMAL(8,2)
);
```

### Second Normal Form (2NF)

**Requirements:**
- Must be in 1NF
- All non-key attributes must be fully functionally dependent on the primary key
- No partial dependencies (applies only to tables with composite primary keys)

**Violations and Solutions:**

**Problem: Partial dependency on composite key**
```sql
-- BAD: Student course enrollment with partial dependencies
CREATE TABLE student_courses (
    student_id INT,
    course_id INT,
    student_name VARCHAR(100),    -- Depends only on student_id
    student_major VARCHAR(50),    -- Depends only on student_id
    course_title VARCHAR(200),    -- Depends only on course_id
    course_credits INT,           -- Depends only on course_id
    grade CHAR(2),               -- Depends on both student_id AND course_id
    PRIMARY KEY (student_id, course_id)
);

-- GOOD: Separate tables eliminate partial dependencies
CREATE TABLE students (
    student_id INT PRIMARY KEY,
    student_name VARCHAR(100),
    student_major VARCHAR(50)
);

CREATE TABLE courses (
    course_id INT PRIMARY KEY,
    course_title VARCHAR(200),
    course_credits INT
);

CREATE TABLE enrollments (
    student_id INT,
    course_id INT,
    grade CHAR(2),
    enrollment_date DATE,
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id)
);
```

### Third Normal Form (3NF)

**Requirements:**
- Must be in 2NF
- No transitive dependencies (non-key attributes should not depend on other non-key attributes)
- All non-key attributes must depend directly on the primary key

**Violations and Solutions:**

**Problem: Transitive dependency**
```sql
-- BAD: Employee table with transitive dependency
CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    employee_name VARCHAR(100),
    department_id INT,
    department_name VARCHAR(100),     -- Depends on department_id, not employee_id
    department_location VARCHAR(100), -- Transitive dependency through department_id
    department_budget DECIMAL(10,2),  -- Transitive dependency through department_id
    salary DECIMAL(8,2)
);

-- GOOD: Separate department information
CREATE TABLE departments (
    department_id INT PRIMARY KEY,
    department_name VARCHAR(100),
    department_location VARCHAR(100),
    department_budget DECIMAL(10,2)
);

CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    employee_name VARCHAR(100),
    department_id INT,
    salary DECIMAL(8,2),
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);
```

### Boyce-Codd Normal Form (BCNF)

**Requirements:**
- Must be in 3NF
- Every determinant must be a candidate key
- Stricter than 3NF - handles cases where 3NF doesn't eliminate all anomalies

**Violations and Solutions:**

**Problem: Determinant that's not a candidate key**
```sql
-- BAD: Student advisor relationship with BCNF violation
-- Assumption: Each student has one advisor per subject, 
-- each advisor teaches only one subject, but can advise multiple students
CREATE TABLE student_advisor (
    student_id INT,
    subject VARCHAR(50),
    advisor_id INT,
    PRIMARY KEY (student_id, subject)
);
-- Problem: advisor_id determines subject, but advisor_id is not a candidate key

-- GOOD: Separate the functional dependencies
CREATE TABLE advisors (
    advisor_id INT PRIMARY KEY,
    subject VARCHAR(50)
);

CREATE TABLE student_advisor_assignments (
    student_id INT,
    advisor_id INT,
    PRIMARY KEY (student_id, advisor_id),
    FOREIGN KEY (advisor_id) REFERENCES advisors(advisor_id)
);
```

## Denormalization Strategies

### When to Denormalize

1. **Performance Requirements**: When query performance is more critical than storage efficiency
2. **Read-Heavy Workloads**: When data is read much more frequently than it's updated
3. **Reporting Systems**: When complex joins negatively impact reporting performance
4. **Caching Strategies**: When pre-computed values eliminate expensive calculations

### Common Denormalization Patterns

**1. Redundant Storage for Performance**
```sql
-- Store frequently accessed calculated values
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    order_total DECIMAL(10,2),     -- Denormalized: sum of order_items.total
    item_count INT,                -- Denormalized: count of order_items
    created_at TIMESTAMP
);

CREATE TABLE order_items (
    item_id INT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT,
    unit_price DECIMAL(8,2),
    total DECIMAL(10,2)            -- quantity * unit_price (denormalized)
);
```

**2. Materialized Aggregates**
```sql
-- Pre-computed summary tables for reporting
CREATE TABLE monthly_sales_summary (
    year_month VARCHAR(7),         -- '2024-03'
    product_category VARCHAR(50),
    total_sales DECIMAL(12,2),
    total_units INT,
    avg_order_value DECIMAL(8,2),
    unique_customers INT,
    updated_at TIMESTAMP
);
```

**3. Historical Data Snapshots**
```sql
-- Store historical state to avoid complex temporal queries
CREATE TABLE customer_status_history (
    id INT PRIMARY KEY,
    customer_id INT,
    status VARCHAR(20),
    tier VARCHAR(10),
    total_lifetime_value DECIMAL(12,2), -- Snapshot at this point in time
    snapshot_date DATE
);
```

## Trade-offs Analysis

### Normalization Benefits
- **Data Integrity**: Reduced risk of inconsistent data
- **Storage Efficiency**: Less data duplication
- **Update Efficiency**: Changes need to be made in only one place
- **Flexibility**: Easier to modify schema as requirements change

### Normalization Costs
- **Query Complexity**: More joins required for data retrieval
- **Performance Impact**: Joins can be expensive on large datasets
- **Development Complexity**: More complex data access patterns

### Denormalization Benefits
- **Query Performance**: Fewer joins, faster queries
- **Simplified Queries**: Direct access to related data
- **Read Optimization**: Optimized for data retrieval patterns
- **Reduced Load**: Less database processing for common operations

### Denormalization Costs
- **Data Redundancy**: Increased storage requirements
- **Update Complexity**: Multiple places may need updates
- **Consistency Risk**: Higher risk of data inconsistencies
- **Maintenance Overhead**: Additional code to maintain derived values

## Best Practices

### 1. Start with Full Normalization
- Begin with a fully normalized design
- Identify performance bottlenecks through testing
- Selectively denormalize based on actual performance needs

### 2. Use Triggers for Consistency
```sql
-- Trigger to maintain denormalized order_total
CREATE TRIGGER update_order_total
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
BEGIN
    UPDATE orders 
    SET order_total = (
        SELECT SUM(quantity * unit_price) 
        FROM order_items 
        WHERE order_id = NEW.order_id
    )
    WHERE order_id = NEW.order_id;
END;
```

### 3. Consider Materialized Views
```sql
-- Materialized view for complex aggregations
CREATE MATERIALIZED VIEW customer_summary AS
SELECT 
    c.customer_id,
    c.customer_name,
    COUNT(o.order_id) as order_count,
    SUM(o.order_total) as lifetime_value,
    AVG(o.order_total) as avg_order_value,
    MAX(o.created_at) as last_order_date
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.customer_name;
```

### 4. Document Denormalization Decisions
- Clearly document why denormalization was chosen
- Specify which data is derived and how it's maintained
- Include performance benchmarks that justify the decision

### 5. Monitor and Validate
- Implement validation checks for denormalized data
- Regular audits to ensure data consistency
- Performance monitoring to validate denormalization benefits

## Common Anti-Patterns

### 1. Premature Denormalization
Starting with denormalized design without understanding actual performance requirements.

### 2. Over-Normalization
Creating too many small tables that require excessive joins for simple queries.

### 3. Inconsistent Approach
Mixing normalized and denormalized patterns without clear strategy.

### 4. Ignoring Maintenance
Denormalizing without proper mechanisms to maintain data consistency.

## Conclusion

Normalization and denormalization are both valuable tools in database design. The key is understanding when to apply each approach:

- **Use normalization** for transactional systems where data integrity is paramount
- **Consider denormalization** for analytical systems or when performance testing reveals bottlenecks
- **Apply selectively** based on actual usage patterns and performance requirements
- **Maintain consistency** through proper design patterns and validation mechanisms

The goal is not to achieve perfect normalization or denormalization, but to create a design that best serves your application's specific needs while maintaining data quality and system performance.