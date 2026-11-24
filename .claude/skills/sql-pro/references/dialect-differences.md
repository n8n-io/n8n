# Database Dialect Differences

## Auto-Incrementing Primary Keys

```sql
-- PostgreSQL
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,  -- or BIGSERIAL for BIGINT
    name VARCHAR(100)
);
-- Alternative (PostgreSQL 10+)
CREATE TABLE users (
    user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100)
);

-- MySQL
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100)
);

-- SQL Server
CREATE TABLE users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100)
);

-- Oracle
CREATE TABLE users (
    user_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR2(100)
);
-- Or using sequence (older approach)
CREATE SEQUENCE user_id_seq;
CREATE TABLE users (
    user_id NUMBER DEFAULT user_id_seq.NEXTVAL PRIMARY KEY,
    name VARCHAR2(100)
);
```

## String Concatenation

```sql
-- PostgreSQL (strict - automatic casting)
SELECT first_name || ' ' || last_name AS full_name FROM users;
SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM users;  -- NULL-safe

-- MySQL (automatic type conversion)
SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM users;
SELECT first_name + ' ' + last_name FROM users;  -- ERROR in MySQL

-- SQL Server
SELECT first_name + ' ' + last_name AS full_name FROM users;
SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM users;  -- 2012+

-- Oracle
SELECT first_name || ' ' || last_name AS full_name FROM users;
SELECT CONCAT(first_name, last_name) FROM users;  -- Only 2 arguments!
```

## Date/Time Functions

```sql
-- Current timestamp
-- PostgreSQL
SELECT CURRENT_TIMESTAMP, NOW(), CURRENT_DATE, CURRENT_TIME;

-- MySQL
SELECT CURRENT_TIMESTAMP, NOW(), CURDATE(), CURTIME();

-- SQL Server
SELECT GETDATE(), SYSDATETIME(), CAST(GETDATE() AS DATE);

-- Oracle
SELECT SYSDATE, SYSTIMESTAMP, TRUNC(SYSDATE) FROM DUAL;

-- Date arithmetic
-- PostgreSQL
SELECT order_date + INTERVAL '7 days' FROM orders;
SELECT order_date - INTERVAL '1 month' FROM orders;
SELECT AGE(CURRENT_DATE, birth_date) FROM users;  -- Interval type

-- MySQL
SELECT DATE_ADD(order_date, INTERVAL 7 DAY) FROM orders;
SELECT DATE_SUB(order_date, INTERVAL 1 MONTH) FROM orders;
SELECT DATEDIFF(CURRENT_DATE, birth_date) FROM users;  -- Days only

-- SQL Server
SELECT DATEADD(day, 7, order_date) FROM orders;
SELECT DATEADD(month, -1, order_date) FROM orders;
SELECT DATEDIFF(year, birth_date, GETDATE()) FROM users;

-- Oracle
SELECT order_date + 7 FROM orders;  -- +7 days
SELECT ADD_MONTHS(order_date, -1) FROM orders;
SELECT MONTHS_BETWEEN(SYSDATE, birth_date) / 12 FROM users;

-- Date formatting
-- PostgreSQL
SELECT TO_CHAR(order_date, 'YYYY-MM-DD') FROM orders;

-- MySQL
SELECT DATE_FORMAT(order_date, '%Y-%m-%d') FROM orders;

-- SQL Server
SELECT FORMAT(order_date, 'yyyy-MM-dd') FROM orders;
SELECT CONVERT(VARCHAR(10), order_date, 120) FROM orders;  -- Style 120 = yyyy-MM-dd

-- Oracle
SELECT TO_CHAR(order_date, 'YYYY-MM-DD') FROM orders;
```

## LIMIT/OFFSET (Pagination)

```sql
-- PostgreSQL & MySQL
SELECT * FROM products
ORDER BY product_id
LIMIT 10 OFFSET 20;

-- SQL Server (2012+)
SELECT * FROM products
ORDER BY product_id
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;

-- SQL Server (older - ROW_NUMBER)
SELECT * FROM (
    SELECT *, ROW_NUMBER() OVER (ORDER BY product_id) as rn
    FROM products
) x
WHERE rn BETWEEN 21 AND 30;

-- Oracle (12c+)
SELECT * FROM products
ORDER BY product_id
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;

-- Oracle (older - ROWNUM)
SELECT * FROM (
    SELECT a.*, ROWNUM rnum FROM (
        SELECT * FROM products ORDER BY product_id
    ) a
    WHERE ROWNUM <= 30
)
WHERE rnum > 20;
```

## Boolean Data Type

```sql
-- PostgreSQL (native BOOLEAN)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT true
);
SELECT * FROM users WHERE is_active = true;

-- MySQL (TINYINT(1) or BOOLEAN alias)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    is_active BOOLEAN DEFAULT 1  -- Stored as TINYINT(1)
);
SELECT * FROM users WHERE is_active = 1;

-- SQL Server (BIT)
CREATE TABLE users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    is_active BIT DEFAULT 1
);
SELECT * FROM users WHERE is_active = 1;

-- Oracle (no native boolean in tables, use NUMBER or CHAR)
CREATE TABLE users (
    user_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    is_active NUMBER(1) DEFAULT 1 CHECK (is_active IN (0, 1))
);
SELECT * FROM users WHERE is_active = 1;
```

## JSON/JSONB Support

```sql
-- PostgreSQL (JSONB - binary, indexable)
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    event_data JSONB NOT NULL
);

INSERT INTO events (event_data) VALUES ('{"user_id": 123, "action": "login"}');

SELECT event_data->>'user_id' as user_id FROM events;
SELECT * FROM events WHERE event_data @> '{"action": "login"}';
SELECT * FROM events WHERE event_data->>'user_id' = '123';

CREATE INDEX idx_events_data ON events USING GIN (event_data);

-- MySQL (8.0+)
CREATE TABLE events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    event_data JSON NOT NULL
);

SELECT JSON_EXTRACT(event_data, '$.user_id') as user_id FROM events;
SELECT * FROM events WHERE JSON_EXTRACT(event_data, '$.action') = 'login';

CREATE INDEX idx_events_user ON events ((CAST(event_data->>'$.user_id' AS UNSIGNED)));

-- SQL Server (2016+)
CREATE TABLE events (
    event_id INT IDENTITY(1,1) PRIMARY KEY,
    event_data NVARCHAR(MAX) CHECK (ISJSON(event_data) = 1)
);

SELECT JSON_VALUE(event_data, '$.user_id') as user_id FROM events;
SELECT * FROM events WHERE JSON_VALUE(event_data, '$.action') = 'login';

-- Oracle (12c+)
CREATE TABLE events (
    event_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_data CLOB CHECK (event_data IS JSON)
);

SELECT JSON_VALUE(event_data, '$.user_id') as user_id FROM events;
SELECT * FROM events WHERE JSON_EXISTS(event_data, '$.action?(@ == "login")');
```

## String Comparison (Case Sensitivity)

```sql
-- PostgreSQL (case-sensitive by default)
SELECT * FROM users WHERE email = 'USER@EXAMPLE.COM';  -- Won't match 'user@example.com'
SELECT * FROM users WHERE LOWER(email) = LOWER('USER@EXAMPLE.COM');
SELECT * FROM users WHERE email ILIKE 'user@example.com';  -- Case-insensitive

-- MySQL (case-insensitive by default with utf8_general_ci collation)
SELECT * FROM users WHERE email = 'USER@EXAMPLE.COM';  -- Matches 'user@example.com'
SELECT * FROM users WHERE email COLLATE utf8_bin = 'user@example.com';  -- Case-sensitive

-- SQL Server (depends on collation, usually case-insensitive)
SELECT * FROM users WHERE email = 'USER@EXAMPLE.COM';  -- Usually matches
SELECT * FROM users WHERE email COLLATE Latin1_General_BIN = 'user@example.com';  -- Case-sensitive

-- Oracle (case-sensitive by default)
SELECT * FROM users WHERE email = 'USER@EXAMPLE.COM';  -- Won't match 'user@example.com'
SELECT * FROM users WHERE UPPER(email) = UPPER('user@example.com');
```

## Recursive CTEs

```sql
-- PostgreSQL
WITH RECURSIVE subordinates AS (
    SELECT employee_id, name, manager_id, 1 as level
    FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.employee_id, e.name, e.manager_id, s.level + 1
    FROM employees e
    INNER JOIN subordinates s ON e.manager_id = s.employee_id
)
SELECT * FROM subordinates;

-- MySQL (8.0+) - Same syntax as PostgreSQL
WITH RECURSIVE subordinates AS (
    SELECT employee_id, name, manager_id, 1 as level
    FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.employee_id, e.name, e.manager_id, s.level + 1
    FROM employees e
    INNER JOIN subordinates s ON e.manager_id = s.employee_id
)
SELECT * FROM subordinates;

-- SQL Server - No RECURSIVE keyword
WITH subordinates AS (
    SELECT employee_id, name, manager_id, 1 as level
    FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.employee_id, e.name, e.manager_id, s.level + 1
    FROM employees e
    INNER JOIN subordinates s ON e.manager_id = s.employee_id
)
SELECT * FROM subordinates;

-- Oracle - CONNECT BY (traditional hierarchical queries)
SELECT employee_id, name, manager_id, LEVEL
FROM employees
START WITH manager_id IS NULL
CONNECT BY PRIOR employee_id = manager_id;
```

## Window Functions - Frame Specifications

```sql
-- PostgreSQL - Full support
SELECT
    order_date,
    total,
    SUM(total) OVER (
        ORDER BY order_date
        RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW
    ) as rolling_7day
FROM orders;

-- MySQL (8.0+) - Limited RANGE support (no intervals)
SELECT
    order_date,
    total,
    SUM(total) OVER (
        ORDER BY order_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as rolling_7rows
FROM orders;

-- SQL Server - Full support
SELECT
    order_date,
    total,
    SUM(total) OVER (
        ORDER BY order_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as rolling_7rows
FROM orders;

-- Oracle - Full support
SELECT
    order_date,
    total,
    SUM(total) OVER (
        ORDER BY order_date
        RANGE BETWEEN INTERVAL '7' DAY PRECEDING AND CURRENT ROW
    ) as rolling_7day
FROM orders;
```

## UPSERT (Insert or Update)

```sql
-- PostgreSQL (ON CONFLICT)
INSERT INTO products (product_id, name, price)
VALUES (123, 'Widget', 29.99)
ON CONFLICT (product_id)
DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;

-- MySQL (ON DUPLICATE KEY)
INSERT INTO products (product_id, name, price)
VALUES (123, 'Widget', 29.99)
ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price);

-- MySQL 8.0.19+ (alternative)
INSERT INTO products (product_id, name, price)
VALUES (123, 'Widget', 29.99) AS new
ON DUPLICATE KEY UPDATE name = new.name, price = new.price;

-- SQL Server (MERGE)
MERGE INTO products AS target
USING (SELECT 123 AS product_id, 'Widget' AS name, 29.99 AS price) AS source
ON target.product_id = source.product_id
WHEN MATCHED THEN
    UPDATE SET name = source.name, price = source.price
WHEN NOT MATCHED THEN
    INSERT (product_id, name, price)
    VALUES (source.product_id, source.name, source.price);

-- Oracle (MERGE)
MERGE INTO products target
USING (SELECT 123 AS product_id, 'Widget' AS name, 29.99 AS price FROM DUAL) source
ON (target.product_id = source.product_id)
WHEN MATCHED THEN
    UPDATE SET name = source.name, price = source.price
WHEN NOT MATCHED THEN
    INSERT (product_id, name, price)
    VALUES (source.product_id, source.name, source.price);
```

## Data Type Mapping

| Concept | PostgreSQL | MySQL | SQL Server | Oracle |
|---------|-----------|-------|------------|--------|
| Integer | INT, BIGINT | INT, BIGINT | INT, BIGINT | NUMBER(10), NUMBER(19) |
| Decimal | NUMERIC, DECIMAL | DECIMAL | DECIMAL, NUMERIC | NUMBER(p,s) |
| String | VARCHAR, TEXT | VARCHAR, TEXT | VARCHAR, NVARCHAR | VARCHAR2, CLOB |
| Binary | BYTEA | BLOB, BINARY | VARBINARY, IMAGE | BLOB, RAW |
| Boolean | BOOLEAN | BOOLEAN/TINYINT(1) | BIT | NUMBER(1) |
| Date | DATE | DATE | DATE | DATE |
| Timestamp | TIMESTAMP | DATETIME, TIMESTAMP | DATETIME, DATETIME2 | TIMESTAMP |
| UUID | UUID | CHAR(36), BINARY(16) | UNIQUEIDENTIFIER | RAW(16) |
| JSON | JSON, JSONB | JSON | NVARCHAR(MAX) | CLOB |
| Array | ARRAY | JSON | Table variable | VARRAY, nested table |

## Performance Tips by Database

**PostgreSQL:**
- Use EXPLAIN ANALYZE with BUFFERS
- Leverage JSONB with GIN indexes
- Use parallel query settings for large scans
- Vacuum and analyze regularly
- Consider table partitioning for 10M+ rows

**MySQL:**
- Choose InnoDB over MyISAM
- Optimize buffer pool size
- Use covering indexes aggressively
- Be aware of case-insensitive defaults
- Consider read replicas for scaling

**SQL Server:**
- Update statistics regularly
- Use columnstore indexes for warehousing
- Leverage query hints sparingly
- Monitor execution plans
- Use In-Memory OLTP for hot tables

**Oracle:**
- Use EXPLAIN PLAN
- Leverage partitioning features
- Use bind variables to avoid parsing
- Configure SGA/PGA appropriately
- Consider Real Application Clusters (RAC)
