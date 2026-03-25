import * as Comlink from 'comlink';

export function sql_0004(context) {
  const cleanup = [];
  beforeEach(async function() {
    cleanup.splice(0);
  });

  afterEach(async function() {
    for (const fn of cleanup) {
      await fn();
    }
  });

  describe('sql_0004', function() {
    it('should recover after crash', async function() {
      const proxyA = await context.create();
      try {
        const sqlite3 = proxyA.sqlite3;
        const db = await sqlite3.open_v2('demo');
        await sqlite3.exec(db, `
          PRAGMA cache_size=0;
          CREATE TABLE t(x);
          INSERT INTO t VALUES (1), (2), (3);
        `);

        let sum;
        await sqlite3.exec(db, `
          SELECT sum(x) FROM t;
        `, Comlink.proxy(row => sum = row[0]));
        expect(sum).toBe(6);

        let check;
        await sqlite3.exec(db, `
          PRAGMA integrity_check;
        `, Comlink.proxy(row => check = row[0]));
        expect(check).toBe('ok');

        // Begin a transaction but don't commit it.
        await sqlite3.exec(db, `
          BEGIN TRANSACTION;
          WITH RECURSIVE cnt(x) AS
            (SELECT 1 UNION ALL SELECT x+1 FROM cnt LIMIT 10000)
          INSERT INTO t SELECT * FROM cnt;
        `);
      } finally {
        await context.destroy(proxyA);
      }

      await new Promise(resolve => setTimeout(resolve, 250));

      const proxyB = await context.create({ reset: false });
      try {
        const sqlite3 = proxyB.sqlite3;
        const db = await sqlite3.open_v2('demo');

        let sum;
        await sqlite3.exec(db, `
          SELECT sum(x) FROM t;
        `, Comlink.proxy(row => sum = row[0]));
        expect(sum).toBe(6);

        let check;
        await sqlite3.exec(db, `
          PRAGMA integrity_check;
        `, Comlink.proxy(row => check = row[0]));
        expect(check).toBe('ok');

        await sqlite3.exec(db, `
          INSERT INTO t VALUES (4), (5);
        `);
        await sqlite3.exec(db, `
          SELECT sum(x) FROM t;
        `, Comlink.proxy(row => sum = row[0]));
        expect(sum).toBe(15);
      } finally {
        await context.destroy(proxyB);
      }
    });
  });
}