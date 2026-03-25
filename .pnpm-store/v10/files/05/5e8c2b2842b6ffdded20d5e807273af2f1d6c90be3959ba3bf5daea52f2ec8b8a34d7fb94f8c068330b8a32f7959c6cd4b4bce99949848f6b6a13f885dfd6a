import * as Comlink from 'comlink';

export function sql_0002(context) {
  describe('sql_0002', function() {
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

    it('should vacuum to minimize page count', async function() {
      await sqlite3.exec(db, `
        CREATE TABLE t AS
        WITH numbers(n) AS
          (SELECT 1 UNION ALL SELECT n + 1 FROM numbers LIMIT 10000)
          SELECT n FROM numbers;
      `);

      let nPagesBeforeVacuum;
      await sqlite3.exec(db, `
        PRAGMA page_count;
      `, Comlink.proxy(row => nPagesBeforeVacuum = row[0]));

      await sqlite3.exec(db, `
        DELETE FROM t WHERE sqrt(n) != floor(sqrt(n));
      `);

      await sqlite3.exec(db, `
        VACUUM;
      `);

      let nPagesAfterVacuum;
      await sqlite3.exec(db, `
        PRAGMA page_count;
      `, Comlink.proxy(row => nPagesAfterVacuum = row[0]));

      expect(nPagesAfterVacuum).toBeLessThan(nPagesBeforeVacuum);

      let checkStatus;
      await sqlite3.exec(db, `
        PRAGMA integrity_check;
      `, Comlink.proxy(row => checkStatus = row[0]));
      expect(checkStatus).toBe('ok');
    });
  });
}
