import * as Comlink from 'comlink';
import * as SQLite from '../src/sqlite-api.js';

export function api_exec(context) {
  describe('exec', function() {
    let proxy, sqlite3, db;
    beforeEach(async function() {
      proxy = await context.create();
      sqlite3 = proxy.sqlite3;
      db = await sqlite3.open_v2('demo');
    });

    afterEach(async function() {
      await sqlite3.close(db);
      await context.destroy(proxy);
    });

    it('should execute a query', async function() {
      let rc;
      rc = await sqlite3.exec(db, 'CREATE TABLE t(x)');
      expect(rc).toEqual(SQLite.SQLITE_OK);

      rc = await sqlite3.exec(db, 'INSERT INTO t VALUES (1), (2), (3)');
      expect(rc).toEqual(SQLite.SQLITE_OK);

      const nChanges = await sqlite3.changes(db);
      expect(nChanges).toEqual(3);
    });

    it('should execute multiple queries', async function() {
      let rc;
      rc = await sqlite3.exec(db, `
        CREATE TABLE t(x);
        INSERT INTO t VALUES (1), (2), (3);
      `);
      expect(rc).toEqual(SQLite.SQLITE_OK);
      await expectAsync(sqlite3.changes(db)).toBeResolvedTo(3);
    });

    it('should return query results via callback', async function() {
      const results = { rows: [], columns: [] };
      const rc = await sqlite3.exec(db, `
        CREATE TABLE t(x);
        INSERT INTO t VALUES (1), (2), (3);
        SELECT * FROM t ORDER BY x;
      `, Comlink.proxy((row, columns) => {
        if (columns.length) {
          results.columns = columns;
          results.rows.push(row);
        }
      }));
      expect(rc).toEqual(SQLite.SQLITE_OK);
      expect(results).toEqual({ columns: ['x'], rows: [[1], [2], [3]] });
    });

    it('should allow a transaction to span multiple calls', async function() {
      let rc;
      rc = await sqlite3.get_autocommit(db);
      expect(rc).not.toEqual(0);

      rc = await sqlite3.exec(db, 'BEGIN TRANSACTION');
      expect(rc).toEqual(SQLite.SQLITE_OK);

      rc = await sqlite3.get_autocommit(db);
      expect(rc).toEqual(0);

      rc = await sqlite3.exec(db, `
        CREATE TABLE t AS
        WITH RECURSIVE cnt(x) AS (
          SELECT 1
          UNION ALL
          SELECT x+1 FROM cnt
            LIMIT 100
        )
        SELECT x FROM cnt;
    `);
      expect(rc).toEqual(SQLite.SQLITE_OK);

      rc = await sqlite3.get_autocommit(db);
      expect(rc).toEqual(0);

      rc = await sqlite3.exec(db, 'COMMIT');
      expect(rc).toEqual(SQLite.SQLITE_OK);

      rc = await sqlite3.get_autocommit(db);
      expect(rc).not.toEqual(0);
    });
  });
}