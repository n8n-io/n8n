/**
 * Database Schema for Cloudflare D1
 * 
 * This defines the database schema using Drizzle ORM for D1,
 * adapted from the original TypeORM entities.
 */

import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: text('role').notNull().default('user'),
  settings: text('settings').default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Workflows table
export const workflows = sqliteTable('workflows', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nodes: text('nodes').notNull(), // JSON string
  connections: text('connections').notNull(), // JSON string
  settings: text('settings').default('{}'), // JSON string
  active: integer('active', { mode: 'boolean' }).notNull().default(false),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Executions table
export const executions = sqliteTable('executions', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull().references(() => workflows.id),
  mode: text('mode').notNull(), // 'manual', 'trigger', 'webhook', etc.
  status: text('status').notNull(), // 'running', 'success', 'error', 'waiting'
  data: text('data').default('{}'), // JSON string - execution data
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  finishedAt: integer('finished_at', { mode: 'timestamp' }),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Credentials table
export const credentials = sqliteTable('credentials', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // credential type (e.g., 'httpBasicAuth', 'oauth2Api')
  data: text('data').notNull(), // JSON string - encrypted credential data
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Webhooks table
export const webhooks = sqliteTable('webhooks', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull().references(() => workflows.id),
  webhookPath: text('webhook_path').notNull().unique(),
  method: text('method').notNull().default('POST'),
  node: text('node').notNull(), // node name that handles the webhook
  isTest: integer('is_test', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Settings table (global application settings)
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  loadOnStartup: integer('load_on_startup', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Tags table
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Workflow tags junction table
export const workflowTags = sqliteTable('workflow_tags', {
  workflowId: text('workflow_id').notNull().references(() => workflows.id),
  tagId: text('tag_id').notNull().references(() => tags.id),
});

// Shared workflows table (for team collaboration)
export const sharedWorkflows = sqliteTable('shared_workflows', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull().references(() => workflows.id),
  userId: text('user_id').notNull().references(() => users.id),
  role: text('role').notNull().default('viewer'), // 'owner', 'editor', 'viewer'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// API Keys table
export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  apiKey: text('api_key').notNull().unique(),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Workflow history table (for version control)
export const workflowHistory = sqliteTable('workflow_history', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull().references(() => workflows.id),
  nodes: text('nodes').notNull(), // JSON string
  connections: text('connections').notNull(), // JSON string
  versionId: text('version_id').notNull(),
  authors: text('authors').notNull(), // JSON array of user IDs
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Export types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;

export type Execution = typeof executions.$inferSelect;
export type NewExecution = typeof executions.$inferInsert;

export type Credential = typeof credentials.$inferSelect;
export type NewCredential = typeof credentials.$inferInsert;

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;