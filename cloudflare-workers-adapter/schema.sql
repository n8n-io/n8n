-- TLS-n8n Database Schema for Cloudflare D1
-- This creates the necessary tables for the n8n adaptation

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    settings TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    nodes TEXT NOT NULL,
    connections TEXT NOT NULL,
    settings TEXT DEFAULT '{}',
    active INTEGER NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Executions table
CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    status TEXT NOT NULL,
    data TEXT DEFAULT '{}',
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

-- Credentials table
CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    webhook_path TEXT NOT NULL UNIQUE,
    method TEXT NOT NULL DEFAULT 'POST',
    node TEXT NOT NULL,
    is_test INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    load_on_startup INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Workflow tags junction table
CREATE TABLE IF NOT EXISTS workflow_tags (
    workflow_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (workflow_id, tag_id),
    FOREIGN KEY (workflow_id) REFERENCES workflows(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id)
);

-- Shared workflows table
CREATE TABLE IF NOT EXISTS shared_workflows (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    api_key TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Workflow history table
CREATE TABLE IF NOT EXISTS workflow_history (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    nodes TEXT NOT NULL,
    connections TEXT NOT NULL,
    version_id TEXT NOT NULL,
    authors TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(active);
CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started_at ON executions(started_at);
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_path ON webhooks(webhook_path);
CREATE INDEX IF NOT EXISTS idx_shared_workflows_user_id ON shared_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_workflows_workflow_id ON shared_workflows(workflow_id);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value, created_at, updated_at) VALUES 
('userManagement.isInstanceOwnerSetUp', 'false', strftime('%s', 'now'), strftime('%s', 'now')),
('userManagement.skipInstanceOwnerSetup', 'false', strftime('%s', 'now'), strftime('%s', 'now')),
('n8n.version', '1.0.0-workers', strftime('%s', 'now'), strftime('%s', 'now')),
('deployment.type', 'cloudflare-workers', strftime('%s', 'now'), strftime('%s', 'now'));