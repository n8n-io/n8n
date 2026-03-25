import * as SQLite from '../src/sqlite-api.js';

export function api_misc(context) {
  describe('libversion', function() {
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

    it('should return the library version', async function() {
      const versionString = await sqlite3.libversion();
      expect(versionString).toMatch(/^\d+\.\d+\.\d+$/);

      const components = versionString.split('.')
        .map((component, i) => {
          return i ? component.padStart(3, '0') : component;
        });

      const versionNumber = await sqlite3.libversion_number();
      expect(versionNumber.toString()).toEqual(components.join(''));
    });
  });

  describe('limit', function() {
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

    it('should constrain usage', async function() {
      const sql = `
        SELECT 1, 2, 3, 4, 5, 6;
      `.trim();

      let rc;
      await expectAsync(sqlite3.exec(db, sql)).toBeResolvedTo(SQLite.SQLITE_OK);

      rc = await sqlite3.limit(db, SQLite.SQLITE_LIMIT_COLUMN, 5);
      expect(rc).toBeGreaterThan(0);

      await expectAsync(sqlite3.exec(db, sql)).toBeRejectedWithError(/too many columns/);

      rc = await sqlite3.limit(db, SQLite.SQLITE_LIMIT_COLUMN, rc);
      expect(rc).toEqual(5);

      await expectAsync(sqlite3.exec(db, sql)).toBeResolvedTo(SQLite.SQLITE_OK);
    });
  });
}