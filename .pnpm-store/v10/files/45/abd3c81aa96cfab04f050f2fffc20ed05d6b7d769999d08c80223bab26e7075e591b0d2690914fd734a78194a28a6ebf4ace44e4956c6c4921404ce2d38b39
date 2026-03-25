import { __export } from "../_virtual/rolldown_runtime.js";
import Database from "better-sqlite3";

//#region src/indexes/sqlite.ts
var sqlite_exports = {};
__export(sqlite_exports, { SQLiteRecordManager: () => SQLiteRecordManager });
var SQLiteRecordManager = class {
	lc_namespace = [
		"langchain",
		"recordmanagers",
		"sqlite"
	];
	tableName;
	db;
	namespace;
	constructor(namespace, config) {
		const { localPath, connectionString, tableName } = config;
		if (!connectionString && !localPath) throw new Error("One of either `localPath` or `connectionString` is required.");
		if (connectionString && localPath) throw new Error("Only one of either `localPath` or `connectionString` is allowed.");
		this.namespace = namespace;
		this.tableName = tableName;
		this.db = new Database(connectionString ?? localPath);
	}
	async createSchema() {
		try {
			this.db.exec(`
CREATE TABLE IF NOT EXISTS "${this.tableName}" (
  uuid TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  key TEXT NOT NULL,
  namespace TEXT NOT NULL,
  updated_at REAL NOT NULL,
  group_id TEXT,
  UNIQUE (key, namespace)
);
CREATE INDEX IF NOT EXISTS updated_at_index ON "${this.tableName}" (updated_at);
CREATE INDEX IF NOT EXISTS key_index ON "${this.tableName}" (key);
CREATE INDEX IF NOT EXISTS namespace_index ON "${this.tableName}" (namespace);
CREATE INDEX IF NOT EXISTS group_id_index ON "${this.tableName}" (group_id);`);
		} catch (error) {
			console.error("Error creating schema");
			throw error;
		}
	}
	async getTime() {
		try {
			const statement = this.db.prepare("SELECT strftime('%s', 'now') AS epoch");
			const { epoch } = statement.get();
			return Number(epoch);
		} catch (error) {
			console.error("Error getting time in SQLiteRecordManager:");
			throw error;
		}
	}
	async update(keys, updateOptions) {
		if (keys.length === 0) return;
		const updatedAt = await this.getTime();
		const { timeAtLeast, groupIds: _groupIds } = updateOptions ?? {};
		if (timeAtLeast && updatedAt < timeAtLeast) throw new Error(`Time sync issue with database ${updatedAt} < ${timeAtLeast}`);
		const groupIds = _groupIds ?? keys.map(() => null);
		if (groupIds.length !== keys.length) throw new Error(`Number of keys (${keys.length}) does not match number of group_ids (${groupIds.length})`);
		const recordsToUpsert = keys.map((key, i) => [
			key,
			this.namespace,
			updatedAt,
			groupIds[i] ?? null
		]);
		const updateTransaction = this.db.transaction(() => {
			for (const row of recordsToUpsert) this.db.prepare(`
INSERT INTO "${this.tableName}" (key, namespace, updated_at, group_id)
VALUES (?, ?, ?, ?)
ON CONFLICT (key, namespace) DO UPDATE SET updated_at = excluded.updated_at`).run(...row);
		});
		updateTransaction();
	}
	async exists(keys) {
		if (keys.length === 0) return [];
		const placeholders = keys.map(() => `?`).join(", ");
		const sql = `
SELECT key
FROM "${this.tableName}"
WHERE namespace = ? AND key IN (${placeholders})`;
		const existsArray = new Array(keys.length).fill(false);
		try {
			const rows = this.db.prepare(sql).all(this.namespace, ...keys);
			const existingKeysSet = new Set(rows.map((row) => row.key));
			keys.forEach((key, index) => {
				existsArray[index] = existingKeysSet.has(key);
			});
			return existsArray;
		} catch (error) {
			console.error("Error checking existence of keys");
			throw error;
		}
	}
	async listKeys(options) {
		const { before, after, limit, groupIds } = options ?? {};
		let query = `SELECT key FROM "${this.tableName}" WHERE namespace = ?`;
		const values = [this.namespace];
		if (before) {
			query += ` AND updated_at < ?`;
			values.push(before);
		}
		if (after) {
			query += ` AND updated_at > ?`;
			values.push(after);
		}
		if (limit) {
			query += ` LIMIT ?`;
			values.push(limit);
		}
		if (groupIds && Array.isArray(groupIds)) {
			query += ` AND group_id IN (${groupIds.filter((gid) => gid !== null).map(() => "?").join(", ")})`;
			values.push(...groupIds.filter((gid) => gid !== null));
		}
		query += ";";
		try {
			const result = this.db.prepare(query).all(...values);
			return result.map((row) => row.key);
		} catch (error) {
			console.error("Error listing keys.");
			throw error;
		}
	}
	async deleteKeys(keys) {
		if (keys.length === 0) return;
		const placeholders = keys.map(() => "?").join(", ");
		const query = `DELETE FROM "${this.tableName}" WHERE namespace = ? AND key IN (${placeholders});`;
		const values = [this.namespace, ...keys].map((v) => typeof v !== "string" ? `${v}` : v);
		try {
			this.db.prepare(query).run(...values);
		} catch (error) {
			console.error("Error deleting keys");
			throw error;
		}
	}
};

//#endregion
export { SQLiteRecordManager, sqlite_exports };
//# sourceMappingURL=sqlite.js.map