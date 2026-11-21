# Database Design

## Normalization Levels

```sql
-- 1NF: Atomic values, no repeating groups
-- Bad: Non-atomic phone column
CREATE TABLE customers_bad (
    customer_id INT PRIMARY KEY,
    name VARCHAR(100),
    phones VARCHAR(500)  -- "555-1234,555-5678,555-9012"
);

-- Good: Atomic values
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE customer_phones (
    phone_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    phone_number VARCHAR(20) NOT NULL,
    phone_type VARCHAR(20) CHECK (phone_type IN ('mobile', 'home', 'work'))
);

-- 2NF: No partial dependencies (all non-key attributes depend on entire key)
-- Bad: Partial dependency on composite key
CREATE TABLE order_items_bad (
    order_id INT,
    product_id INT,
    product_name VARCHAR(100),  -- Depends only on product_id
    product_price DECIMAL(10,2),  -- Depends only on product_id
    quantity INT,
    PRIMARY KEY (order_id, product_id)
);

-- Good: Separate product attributes
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    product_price DECIMAL(10,2) NOT NULL CHECK (product_price >= 0)
);

CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,  -- Snapshot at order time
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- 3NF: No transitive dependencies
-- Bad: City/State depends on ZIP
CREATE TABLE addresses_bad (
    address_id INT PRIMARY KEY,
    street VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10)
);

-- Good: Separate ZIP code reference
CREATE TABLE zip_codes (
    zip_code VARCHAR(10) PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    county VARCHAR(100)
);

CREATE TABLE addresses (
    address_id SERIAL PRIMARY KEY,
    street VARCHAR(200) NOT NULL,
    zip_code VARCHAR(10) NOT NULL REFERENCES zip_codes(zip_code)
);
```

## Primary and Foreign Keys

```sql
-- Natural vs Surrogate keys
-- Natural key (business meaning)
CREATE TABLE countries (
    country_code CHAR(2) PRIMARY KEY,  -- ISO 3166-1 alpha-2
    country_name VARCHAR(100) NOT NULL
);

-- Surrogate key (technical, no business meaning)
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,  -- Auto-incrementing surrogate
    email VARCHAR(255) NOT NULL UNIQUE,  -- Natural candidate key
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Composite primary key
CREATE TABLE student_courses (
    student_id INT,
    course_id INT,
    enrollment_date DATE NOT NULL,
    grade CHAR(2),
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id)
);

-- UUID primary keys (distributed systems, no sequence conflicts)
CREATE TABLE events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Foreign key with cascading actions
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE CASCADE  -- Delete orders when customer deleted
        ON UPDATE CASCADE  -- Update order.customer_id when customers.customer_id changes
);

CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE,  -- Delete items when order deleted
    FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT  -- Prevent deleting product if used in orders
);
```

## Constraints and Validation

```sql
-- CHECK constraints
CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    salary DECIMAL(12,2) NOT NULL,
    hire_date DATE NOT NULL,
    birth_date DATE NOT NULL,

    CONSTRAINT chk_salary_positive CHECK (salary > 0),
    CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$'),
    CONSTRAINT chk_hire_after_birth CHECK (hire_date > birth_date + INTERVAL '16 years'),
    CONSTRAINT chk_hire_not_future CHECK (hire_date <= CURRENT_DATE)
);

-- Unique constraints (including composite)
CREATE TABLE user_preferences (
    user_id INT NOT NULL,
    preference_key VARCHAR(50) NOT NULL,
    preference_value TEXT,

    CONSTRAINT uq_user_preference UNIQUE (user_id, preference_key)
);

-- NOT NULL constraints with defaults
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Exclusion constraints (PostgreSQL - prevent overlapping ranges)
CREATE TABLE room_bookings (
    booking_id SERIAL PRIMARY KEY,
    room_id INT NOT NULL,
    booked_during TSTZRANGE NOT NULL,

    EXCLUDE USING GIST (
        room_id WITH =,
        booked_during WITH &&
    )  -- Prevent overlapping bookings for same room
);
```

## Indexing Strategy

```sql
-- Index foreign keys (critical for JOIN performance)
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Composite index for common queries
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date DESC);
-- Supports:
-- WHERE customer_id = ? AND order_date > ?
-- WHERE customer_id = ? ORDER BY order_date DESC

-- Partial index for common filters
CREATE INDEX idx_active_products ON products(category, price)
WHERE is_active = true AND deleted_at IS NULL;

-- Unique index for business rules
CREATE UNIQUE INDEX idx_users_active_email ON users(LOWER(email))
WHERE deleted_at IS NULL;
-- Ensures no duplicate emails among active users
```

## Common Design Patterns

```sql
-- Polymorphic associations (flexible but harder to enforce integrity)
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    commentable_type VARCHAR(50) NOT NULL,  -- 'Post', 'Photo', 'Video'
    commentable_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Cannot enforce FK without triggers/application logic
    CHECK (commentable_type IN ('Post', 'Photo', 'Video'))
);

-- Better: Separate tables with proper FKs
CREATE TABLE post_comments (
    comment_id SERIAL PRIMARY KEY,
    post_id INT NOT NULL REFERENCES posts(post_id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE photo_comments (
    comment_id SERIAL PRIMARY KEY,
    photo_id INT NOT NULL REFERENCES photos(photo_id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Many-to-many with attributes (junction/bridge table)
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE courses (
    course_id SERIAL PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL
);

CREATE TABLE enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES students(student_id),
    course_id INT NOT NULL REFERENCES courses(course_id),
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    grade CHAR(2),
    status VARCHAR(20) DEFAULT 'active',

    UNIQUE (student_id, course_id),
    CHECK (status IN ('active', 'completed', 'dropped'))
);

-- Self-referencing hierarchy
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    parent_category_id INT REFERENCES categories(category_id),
    level INT NOT NULL DEFAULT 0,

    CHECK (category_id != parent_category_id)  -- Prevent self-reference
);

-- Adjacency list example
INSERT INTO categories VALUES
    (1, 'Electronics', NULL, 0),
    (2, 'Computers', 1, 1),
    (3, 'Laptops', 2, 2),
    (4, 'Desktops', 2, 2);
```

## Temporal/Historical Data

```sql
-- Slowly Changing Dimension Type 2 (SCD2) - Full history
CREATE TABLE customer_history (
    customer_history_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address TEXT,
    valid_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP,
    is_current BOOLEAN NOT NULL DEFAULT true,

    CHECK (valid_to IS NULL OR valid_to > valid_from)
);

-- Ensure only one current record per customer
CREATE UNIQUE INDEX idx_customer_current ON customer_history(customer_id)
WHERE is_current = true;

-- Temporal tables (PostgreSQL system-versioning)
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    sys_period TSTZRANGE NOT NULL DEFAULT tstzrange(CURRENT_TIMESTAMP, NULL)
);

CREATE TABLE products_history (LIKE products);

CREATE TRIGGER versioning_trigger
BEFORE INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION versioning('sys_period', 'products_history', true);
```

## Soft Deletes

```sql
-- Soft delete pattern
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id INT NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,  -- NULL = active, non-NULL = deleted
    deleted_by INT REFERENCES users(user_id)
);

-- Index for filtering active records
CREATE INDEX idx_posts_active ON posts(created_at DESC)
WHERE deleted_at IS NULL;

-- View for active posts only
CREATE VIEW active_posts AS
SELECT post_id, title, content, author_id, created_at, updated_at
FROM posts
WHERE deleted_at IS NULL;
```

## Audit Trails

```sql
-- Audit table pattern
CREATE TABLE audit_log (
    audit_id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id BIGINT NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by INT REFERENCES users(user_id),
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_timestamp ON audit_log(changed_at DESC);

-- Trigger function for automatic auditing
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.product_id, 'DELETE', row_to_json(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.product_id, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_log (table_name, record_id, action, new_values)
        VALUES (TG_TABLE_NAME, NEW.product_id, 'INSERT', row_to_json(NEW));
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_audit
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

## Schema Design Best Practices

1. **Choose appropriate data types**: Use smallest type that fits (INT vs BIGINT, VARCHAR(50) vs TEXT)
2. **Index foreign keys**: Always index FK columns for JOIN performance
3. **Avoid NULLs when possible**: Use NOT NULL with defaults
4. **Use constraints**: Enforce data integrity at database level
5. **Normalize to 3NF**: Then denormalize strategically for performance
6. **Consider soft deletes**: For auditing and data recovery
7. **Plan for growth**: Use BIGINT for high-volume PKs
8. **Document schema**: Comment tables and complex constraints
9. **Version control**: Track schema changes with migrations
10. **Test with realistic data**: Validate design with production-scale data
