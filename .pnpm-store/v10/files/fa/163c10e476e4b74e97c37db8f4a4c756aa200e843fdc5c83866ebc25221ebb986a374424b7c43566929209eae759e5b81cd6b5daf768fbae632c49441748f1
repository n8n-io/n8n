import * as Comlink from 'comlink';

export function sql_0001(context) {
  describe('sql_0001', function() {
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

    it('should rollback a transaction', async function() {
      let count;
      await sqlite3.exec(db, `
        CREATE TABLE foo (x PRIMARY KEY);
        INSERT INTO foo VALUES ('foo'), ('bar'), ('baz');
        SELECT COUNT(*) FROM foo;
      `, Comlink.proxy(row => count = row[0]));
      expect(count).toBe(3);
  
      count = undefined;
      await sqlite3.exec(db, `
        BEGIN TRANSACTION;
        WITH numbers(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM numbers LIMIT 100)
          INSERT INTO foo SELECT * FROM numbers;
        SELECT COUNT(*) FROM foo;
      `, Comlink.proxy(row => count = row[0]));
      expect(count).toBe(103);
  
      count = undefined;
      await sqlite3.exec(db, `
        ROLLBACK;
        SELECT COUNT(*) FROM foo;
      `, Comlink.proxy(row => count = row[0]));
      expect(count).toBe(3);

      let checkStatus;
      await sqlite3.exec(db, `
        PRAGMA integrity_check;
      `, Comlink.proxy(row => checkStatus = row[0]));
      expect(checkStatus).toBe('ok');
    });
  });
}
