-- Sample E-commerce Database Schema
-- Demonstrates various normalization levels and common patterns

-- Users table - well normalized
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);

-- Categories table - hierarchical structure
CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES categories(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table - potential normalization issues
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    weight DECIMAL(8,2),
    dimensions VARCHAR(50), -- Potential 1NF violation: "10x5x3 inches"
    category_id INTEGER REFERENCES categories(id),
    category_name VARCHAR(100), -- Redundant with categories.name (3NF violation)
    brand VARCHAR(100), -- Should be normalized to separate brands table
    tags VARCHAR(500), -- Potential 1NF violation: comma-separated tags
    inventory_count INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 10,
    supplier_name VARCHAR(100), -- Should be normalized
    supplier_contact VARCHAR(255), -- Should be normalized
    is_active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Addresses table - good normalization
CREATE TABLE addresses (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    address_type VARCHAR(20) DEFAULT 'shipping', -- 'shipping', 'billing'
    street_address VARCHAR(255) NOT NULL,
    street_address_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'US',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table - mixed normalization issues
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    user_id INTEGER REFERENCES users(id),
    user_email VARCHAR(255), -- Denormalized for performance/historical reasons
    user_name VARCHAR(200), -- Denormalized for performance/historical reasons
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    shipping_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(50), -- Should be normalized to payment_methods
    payment_status VARCHAR(50) DEFAULT 'pending',
    shipping_address_id INTEGER REFERENCES addresses(id),
    billing_address_id INTEGER REFERENCES addresses(id),
    -- Denormalized shipping address for historical preservation
    shipping_street VARCHAR(255),
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(50),
    shipping_postal_code VARCHAR(20),
    shipping_country VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP
);

-- Order items table - properly normalized
CREATE TABLE order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    product_name VARCHAR(255), -- Denormalized for historical reasons
    product_sku VARCHAR(50), -- Denormalized for historical reasons
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL, -- Calculated field (could be computed)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shopping cart table - session-based data
CREATE TABLE shopping_cart (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255), -- For anonymous users
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id),
    UNIQUE(session_id, product_id)
);

-- Product reviews - user-generated content
CREATE TABLE product_reviews (
    id INTEGER PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    user_id INTEGER REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(200),
    review_text TEXT,
    verified_purchase BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, user_id) -- One review per user per product
);

-- Coupons table - promotional data
CREATE TABLE coupons (
    id INTEGER PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed_amount'
    discount_value DECIMAL(8,2) NOT NULL,
    minimum_amount DECIMAL(10,2),
    maximum_discount DECIMAL(10,2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log table - for tracking changes
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_values TEXT, -- JSON format
    new_values TEXT, -- JSON format
    user_id INTEGER REFERENCES users(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Problematic table - multiple normalization violations
CREATE TABLE user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    preferred_categories VARCHAR(500), -- CSV list - 1NF violation
    email_notifications VARCHAR(255), -- "daily,weekly,promotions" - 1NF violation
    user_name VARCHAR(200), -- Redundant with users table - 3NF violation
    user_email VARCHAR(255), -- Redundant with users table - 3NF violation
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'USD',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    newsletter_subscribed BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create some basic indexes (some missing, some redundant for demonstration)
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username); -- Redundant due to UNIQUE constraint
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_brand ON products (brand);
CREATE INDEX idx_products_sku ON products (sku); -- Redundant due to UNIQUE constraint
CREATE INDEX idx_orders_user ON orders (user_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created ON orders (created_at);
CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);
-- Missing index on addresses.user_id
-- Missing composite index on orders (user_id, status)
-- Missing index on product_reviews.product_id

-- Constraints that should exist but are missing
-- ALTER TABLE products ADD CONSTRAINT chk_price_positive CHECK (price > 0);
-- ALTER TABLE products ADD CONSTRAINT chk_inventory_non_negative CHECK (inventory_count >= 0);
-- ALTER TABLE order_items ADD CONSTRAINT chk_quantity_positive CHECK (quantity > 0);
-- ALTER TABLE orders ADD CONSTRAINT chk_total_positive CHECK (total_amount > 0);