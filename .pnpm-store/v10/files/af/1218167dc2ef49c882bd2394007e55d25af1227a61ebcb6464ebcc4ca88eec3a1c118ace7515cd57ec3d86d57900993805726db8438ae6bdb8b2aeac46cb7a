import * as Comlink from 'comlink';

export function sql_0005(context) {
  describe('sql_0005', function() {
    beforeAll(async function() {
      // Clear persistent storage.
      const proxy = await context.create();
      await context.destroy(proxy);
    });
  
    const cleanup = [];
    beforeEach(async function() {
      cleanup.splice(0);
    });
  
    afterEach(async function() {
      for (const fn of cleanup) {
        await fn();
      }
    });
  
    it('should transact atomically', async function() {
      const instances = [];
      for (let i = 0; i < 8; ++i) {
        const proxy = await context.create({ reset: false });
        const sqlite3 = proxy.sqlite3;
        const db = await sqlite3.open_v2('demo');
        instances.push({ sqlite3, db });
        cleanup.push(async () => {
          await sqlite3.close(db);
          await context.destroy(proxy);
        });

        if (i === 0) {
          await sqlite3.exec(db, `
            BEGIN IMMEDIATE;
            CREATE TABLE IF NOT EXISTS t(key PRIMARY KEY, value);
            INSERT OR IGNORE INTO t VALUES ('foo', 0);
            COMMIT;
          `);
        }
      }

      const iterations = 32;
      const values = new Set();
      await Promise.all(instances.map(async instance => {
        for (let i = 0; i < iterations; ++i) {
          const rows = await transact(instance, `
            BEGIN IMMEDIATE;
            UPDATE t SET value = value + 1 WHERE key = 'foo';
            SELECT value FROM t WHERE key = 'foo';
            COMMIT;
          `);
          values.add(rows[0][0]);
        }
      }));

      expect(values.size).toBe(instances.length * iterations);
      expect(Array.from(values).sort((a, b) => b - a).at(0)).toBe(values.size);
    });
  });
}

async function transact({ sqlite3, db }, sql) {
  while (true) {
    try {
      const rows = [];
      await sqlite3.exec(db, sql, Comlink.proxy(row => rows.push(row)));
      return rows;
    } catch (e) {
      if (e.message !== 'database is locked') {
        throw e;
      }
    }
  }
}
