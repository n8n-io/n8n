/**
 * OmiGroup Database Layer
 *
 * Uses a SEPARATE SQLite database from n8n to avoid any interference.
 * This database stores OmiGroup-specific data: domain whitelist,
 * departments, templates, usage stats, etc.
 *
 * n8n's own database is accessed only through the hook context
 * (this.dbCollections) for reading/writing User records.
 */

import Database from 'better-sqlite3';
import { getConfig } from '../config';

let _db: Database.Database | null = null;

export function getOmiDb(): Database.Database {
	if (!_db) {
		throw new Error('[OmiGroup] Database not initialized. Call initOmiDb() first.');
	}
	return _db;
}

export function initOmiDb(): Database.Database {
	if (_db) return _db;

	const config = getConfig();
	_db = new Database(config.database.sqlitePath);

	// Enable WAL mode for better concurrent read performance
	_db.pragma('journal_mode = WAL');
	_db.pragma('foreign_keys = ON');

	runMigrations(_db);

	return _db;
}

function runMigrations(db: Database.Database): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS omi_migrations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			executed_at TEXT NOT NULL DEFAULT (datetime('now'))
		);
	`);

	const migrations: Array<{ name: string; sql: string }> = [
		{
			name: '001_domain_whitelist',
			sql: `
				CREATE TABLE IF NOT EXISTS omi_domain_whitelist (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					domain TEXT NOT NULL UNIQUE,
					added_by TEXT,
					created_at TEXT NOT NULL DEFAULT (datetime('now'))
				);
			`,
		},
		{
			name: '002_departments',
			sql: `
				CREATE TABLE IF NOT EXISTS omi_department (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL,
					description TEXT DEFAULT '',
					n8n_project_id TEXT,
					parent_department_id TEXT,
					created_at TEXT NOT NULL DEFAULT (datetime('now')),
					updated_at TEXT NOT NULL DEFAULT (datetime('now')),
					FOREIGN KEY (parent_department_id) REFERENCES omi_department(id) ON DELETE SET NULL
				);

				CREATE TABLE IF NOT EXISTS omi_department_member (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					department_id TEXT NOT NULL,
					user_id TEXT NOT NULL,
					role TEXT NOT NULL DEFAULT 'member',
					joined_at TEXT NOT NULL DEFAULT (datetime('now')),
					FOREIGN KEY (department_id) REFERENCES omi_department(id) ON DELETE CASCADE,
					UNIQUE(department_id, user_id)
				);
			`,
		},
		{
			name: '003_templates',
			sql: `
				CREATE TABLE IF NOT EXISTS omi_template_category (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL,
					description TEXT DEFAULT '',
					icon TEXT DEFAULT '',
					sort_order INTEGER DEFAULT 0,
					created_at TEXT NOT NULL DEFAULT (datetime('now'))
				);

				CREATE TABLE IF NOT EXISTS omi_template (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL,
					description TEXT DEFAULT '',
					category_id TEXT,
					workflow_json TEXT NOT NULL,
					author_id TEXT NOT NULL,
					department_id TEXT,
					visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'department', 'private')),
					status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
					rating_avg REAL DEFAULT 0,
					rating_count INTEGER DEFAULT 0,
					use_count INTEGER DEFAULT 0,
					tags TEXT DEFAULT '[]',
					created_at TEXT NOT NULL DEFAULT (datetime('now')),
					updated_at TEXT NOT NULL DEFAULT (datetime('now')),
					FOREIGN KEY (category_id) REFERENCES omi_template_category(id) ON DELETE SET NULL,
					FOREIGN KEY (department_id) REFERENCES omi_department(id) ON DELETE SET NULL
				);

				CREATE TABLE IF NOT EXISTS omi_template_rating (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					template_id TEXT NOT NULL,
					user_id TEXT NOT NULL,
					score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
					comment TEXT DEFAULT '',
					created_at TEXT NOT NULL DEFAULT (datetime('now')),
					FOREIGN KEY (template_id) REFERENCES omi_template(id) ON DELETE CASCADE,
					UNIQUE(template_id, user_id)
				);
			`,
		},
		{
			name: '004_usage_stats',
			sql: `
				CREATE TABLE IF NOT EXISTS omi_execution_log (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					user_id TEXT,
					department_id TEXT,
					workflow_id TEXT NOT NULL,
					workflow_name TEXT,
					execution_id TEXT NOT NULL,
					status TEXT NOT NULL,
					duration_ms INTEGER,
					node_count INTEGER,
					error_message TEXT,
					executed_at TEXT NOT NULL DEFAULT (datetime('now'))
				);

				CREATE INDEX IF NOT EXISTS idx_omi_exec_log_user ON omi_execution_log(user_id);
				CREATE INDEX IF NOT EXISTS idx_omi_exec_log_dept ON omi_execution_log(department_id);
				CREATE INDEX IF NOT EXISTS idx_omi_exec_log_date ON omi_execution_log(executed_at);
				CREATE INDEX IF NOT EXISTS idx_omi_exec_log_workflow ON omi_execution_log(workflow_id);

				CREATE TABLE IF NOT EXISTS omi_daily_stats (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					date TEXT NOT NULL,
					user_id TEXT,
					department_id TEXT,
					total_executions INTEGER DEFAULT 0,
					success_count INTEGER DEFAULT 0,
					error_count INTEGER DEFAULT 0,
					total_duration_ms INTEGER DEFAULT 0,
					UNIQUE(date, user_id, department_id)
				);

				CREATE INDEX IF NOT EXISTS idx_omi_daily_date ON omi_daily_stats(date);
			`,
		},
		{
			name: '005_settings',
			sql: `
				CREATE TABLE IF NOT EXISTS omi_settings (
					key TEXT PRIMARY KEY,
					value TEXT NOT NULL,
					updated_at TEXT NOT NULL DEFAULT (datetime('now'))
				);
			`,
		},
	];

	const executedStmt = db.prepare('SELECT name FROM omi_migrations');
	const executed = new Set(
		(executedStmt.all() as Array<{ name: string }>).map((r) => r.name),
	);

	const insertMigration = db.prepare('INSERT INTO omi_migrations (name) VALUES (?)');

	for (const migration of migrations) {
		if (executed.has(migration.name)) continue;

		const runMigration = db.transaction(() => {
			db.exec(migration.sql);
			insertMigration.run(migration.name);
		});

		runMigration();
		console.log(`[OmiGroup] Migration ${migration.name} applied`);
	}
}

export function closeOmiDb(): void {
	if (_db) {
		_db.close();
		_db = null;
	}
}
