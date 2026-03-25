import * as SQLite from '../sqlite-api.js';

/**
 * @typedef SQLiteResults
 * @property {string[]} columns
 * @property {SQLiteCompatibleType[][]} rows
 */

/**
 * Build a query function for a database.
 * 
 * The returned function can be invoke in two ways, (1) as a template
 * tag, or (2) as a regular function.
 * 
 * When used as a template tag, multiple SQL statements are accepted and
 * string interpolants can be used, e.g.
 * ```
 *   const results = await tag`
 *     PRAGMA integrity_check;
 *     SELECT * FROM ${tblName};
 *   `;
 * ```
 * 
 * When called as a regular function, only one statement can be used
 * and SQLite placeholder substitution is performed, e.g.
 * ```
 *   const results = await tag('INSERT INTO tblName VALUES (?, ?)', [
 *     ['foo', 1],
 *     ['bar', 17],
 *     ['baz', 42]
 *   ]);
 * ```
 * @param {SQLiteAPI} sqlite3 
 * @param {number} db 
 * @returns {(sql: string|TemplateStringsArray, ...values: string[]|SQLiteCompatibleType[][][]) => Promise<SQLiteResults[]>}
 */
export function createTag(sqlite3, db) {
  // Helper function to execute the query.
  async function execute(sql, bindings) {
    const results = [];
    for await (const stmt of sqlite3.statements(db, sql)) {
      let columns;
      for (const binding of bindings ?? [[]]) {
        sqlite3.reset(stmt);
        if (bindings) {
          sqlite3.bind_collection(stmt, binding);
        }

        const rows = [];
        while (await sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
          const row = sqlite3.row(stmt);
          rows.push(row);
        }
  
        columns = columns ?? sqlite3.column_names(stmt)
        if (columns.length) {
          results.push({ columns, rows });
        }
      }
  
      // When binding parameters, only a single statement is executed.
      if (bindings) {
        return results;
      }
    }
    return results;
  }
  
  return async function(sql, ...values) {
    if (Array.isArray(sql)) {
      // Tag usage.
      const interleaved = [];
      sql.forEach((s, i) => {
        interleaved.push(s, values[i]);
      });
      return execute(interleaved.join(''));
    } else {
      // Binding usage.
      return execute(sql, values[0]);
    }
  }
}