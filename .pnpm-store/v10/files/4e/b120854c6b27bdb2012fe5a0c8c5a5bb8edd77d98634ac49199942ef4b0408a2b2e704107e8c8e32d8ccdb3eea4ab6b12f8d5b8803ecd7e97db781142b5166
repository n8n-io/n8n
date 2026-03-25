import * as Comlink from 'comlink';

export function sql_0003(context) {
  describe('sql_0003', function() {
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

    it('should vacuum to decrease page size', async function() {
      await sqlite3.exec(db, `
        PRAGMA page_size=8192;
        CREATE TABLE t AS
        WITH numbers(n) AS
          (SELECT 1 UNION ALL SELECT n + 1 FROM numbers LIMIT 10000)
          SELECT n FROM numbers;
      `);

      let pageSizeBeforeVacuum;
      await sqlite3.exec(db, `
        PRAGMA page_size;
      `, Comlink.proxy(row => pageSizeBeforeVacuum = row[0]));
      expect(pageSizeBeforeVacuum).toBe(8192);

      await sqlite3.exec(db, `
        PRAGMA page_size=4096;
        VACUUM;
      `);

      let pageSizeAfterVacuum;
      await sqlite3.exec(db, `
        PRAGMA page_size;
      `, Comlink.proxy(row => pageSizeAfterVacuum = row[0]));
      expect(pageSizeAfterVacuum).toBe(4096);

      let checkStatus;
      await sqlite3.exec(db, `
        PRAGMA integrity_check;
      `, Comlink.proxy(row => checkStatus = row[0]));
      expect(checkStatus).toBe('ok');
    });

    it('should vacuum to increase page size', async function() {
      await sqlite3.exec(db, `
        PRAGMA page_size=8192;
        CREATE TABLE t AS
        WITH numbers(n) AS
          (SELECT 1 UNION ALL SELECT n + 1 FROM numbers LIMIT 10000)
          SELECT n FROM numbers;
      `);

      let pageSizeBeforeVacuum;
      await sqlite3.exec(db, `
        PRAGMA page_size;
      `, Comlink.proxy(row => pageSizeBeforeVacuum = row[0]));
      expect(pageSizeBeforeVacuum).toBe(8192);

      await sqlite3.exec(db, `
        PRAGMA page_size=16384;
        VACUUM;
      `);

      let pageSizeAfterVacuum;
      await sqlite3.exec(db, `
        PRAGMA page_size;
      `, Comlink.proxy(row => pageSizeAfterVacuum = row[0]));
      expect(pageSizeAfterVacuum).toBe(16384);

      let checkStatus;
      await sqlite3.exec(db, `
        PRAGMA integrity_check;
      `, Comlink.proxy(row => checkStatus = row[0]));
      expect(checkStatus).toBe('ok');
    });
  });
}
