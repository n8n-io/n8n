import { TestContext } from "./TestContext.js";
import AsyncifyFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import JSPIFactory from 'wa-sqlite/dist/wa-sqlite-jspi.mjs';
import * as SQLite from '../src/sqlite-api.js';

const FACTORIES = new Map([
  ['asyncify', AsyncifyFactory],
  ['jspi', JSPIFactory]
]);

const supportsJSPI = await TestContext.supportsJSPI();

for (const [key, factory] of FACTORIES) {
  if (key === 'jspi' && !supportsJSPI) continue;

  const sqlite3 = await factory().then(module => SQLite.Factory(module));
  describe(`${key} create_function`, function() {
    let db;
    beforeEach(async function() {
      db = await sqlite3.open_v2(':memory:');
    });
  
    afterEach(async function() {
      await sqlite3.close(db);
    });
  
    it('should return an int', async function() {
      let rc;
      
      rc = await sqlite3.create_function(
        db,
        'fn',
        0,
        SQLite.SQLITE_DETERMINISTIC, 0,
        (function(context, values) {
          sqlite3.result_int(context, 42);
        }));
      expect(rc).toEqual(SQLite.SQLITE_OK);
  
      let result;
      rc = await sqlite3.exec(db, 'SELECT fn()', row => result = row[0]);
      expect(rc).toEqual(SQLite.SQLITE_OK);
      expect(result).toEqual(42);
    });
  
    it('should return an int64', async function() {
      let rc;
      
      rc = await sqlite3.create_function(
        db,
        'fn',
        0,
        SQLite.SQLITE_DETERMINISTIC, 0,
        (function(context, values) {
          sqlite3.result_int64(context, 0x7FFF_FFFF_FFFF_FFFFn);
        }));
      expect(rc).toEqual(SQLite.SQLITE_OK);
  
      for await (const stmt of sqlite3.statements(db, 'SELECT fn()')) {
        while (await sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
          const value = sqlite3.column_int64(stmt, 0);        
          expect(value).toEqual(0x7FFF_FFFF_FFFF_FFFFn);
        }
      }
    });
  
    it('should return a double', async function() {
      let rc;
      
      rc = await sqlite3.create_function(
        db,
        'fn',
        0,
        SQLite.SQLITE_DETERMINISTIC, 0,
        (function(context, values) {
          sqlite3.result_double(context, 3.14);
        }));
      expect(rc).toEqual(SQLite.SQLITE_OK);
  
      let result;
      rc = await sqlite3.exec(db, 'SELECT fn()', row => result = row[0]);
      expect(rc).toEqual(SQLite.SQLITE_OK);
      expect(result).toEqual(3.14);
    });
  
    it('should return a string', async function() {
      let rc;
      
      rc = await sqlite3.create_function(
        db,
        'fn',
        0,
        SQLite.SQLITE_DETERMINISTIC, 0,
        (function(context, values) {
          sqlite3.result_text(context, 'foobar');
        }));
      expect(rc).toEqual(SQLite.SQLITE_OK);
  
      let result;
      rc = await sqlite3.exec(db, 'SELECT fn()', row => result = row[0]);
      expect(rc).toEqual(SQLite.SQLITE_OK);
      expect(result).toEqual('foobar');
    });
  
    it('should return a blob', async function() {
      let rc;
      
      rc = await sqlite3.create_function(
        db,
        'fn',
        0,
        SQLite.SQLITE_DETERMINISTIC, 0,
        (function(context, values) {
          sqlite3.result_blob(context, new Uint8Array([0x12, 0x34, 0x56]));
        }));
      expect(rc).toEqual(SQLite.SQLITE_OK);
  
      let result;
      rc = await sqlite3.exec(db, 'SELECT fn()', row => result = row[0]);
      expect(rc).toEqual(SQLite.SQLITE_OK);
      expect(result).toEqual(new Uint8Array([0x12, 0x34, 0x56]));
    });
  
    it('should return null', async function() {
      let rc;
      
      rc = await sqlite3.create_function(
        db,
        'fn',
        0,
        SQLite.SQLITE_DETERMINISTIC, 0,
        (function(context, values) {
          sqlite3.result_null(context);
        }));
      expect(rc).toEqual(SQLite.SQLITE_OK);
  
      let result;
      rc = await sqlite3.exec(db, 'SELECT fn()', row => result = row[0]);
      expect(rc).toEqual(SQLite.SQLITE_OK);
      expect(result).toEqual(null);
    });
  
    it('should pass a fixed number of arguments', async function() {
      let rc;
      
      rc = await sqlite3.create_function(
        db,
        'fn',
        5,
        SQLite.SQLITE_DETERMINISTIC, 0,
        (function(context, values) {
          expect(sqlite3.value_type(values[0])).toEqual(SQLite.SQLITE_INTEGER);
          expect(sqlite3.value_int(values[0])).toEqual(42);
          expect(sqlite3.value_int64(values[0])).toEqual(42n);
          expect(sqlite3.value(values[0])).toEqual(42);
  
          expect(sqlite3.value_type(values[1])).toEqual(SQLite.SQLITE_FLOAT);
          expect(sqlite3.value_double(values[1])).toEqual(3.14);
          expect(sqlite3.value(values[1])).toEqual(3.14);
  
          expect(sqlite3.value_type(values[2])).toEqual(SQLite.SQLITE_TEXT);
          expect(sqlite3.value_text(values[2])).toEqual('hello');
          expect(sqlite3.value(values[2])).toEqual('hello');
  
          expect(sqlite3.value_type(values[3])).toEqual(SQLite.SQLITE_BLOB);
          expect(sqlite3.value_blob(values[3])).toEqual(new Uint8Array([0x12, 0x34, 0x56]));
          expect(sqlite3.value_bytes(values[3])).toEqual(3);
          expect(sqlite3.value(values[3])).toEqual(new Uint8Array([0x12, 0x34, 0x56]));
  
          expect(sqlite3.value_type(values[4])).toEqual(SQLite.SQLITE_NULL);
        }));
      expect(rc).toEqual(SQLite.SQLITE_OK);
  
      rc = await sqlite3.exec(db, `
        SELECT fn(42, 3.14, 'hello', x'123456', NULL)
      `);
      expect(rc).toEqual(SQLite.SQLITE_OK);
    });
  
    it('should pass a variable number of arguments', async function() {
      let rc;
      
      rc = await sqlite3.create_function(
        db,
        'fn',
        -1,
        SQLite.SQLITE_DETERMINISTIC, 0,
        (function(context, values) {
          expect(values.length).toBe(5);
          
          expect(sqlite3.value_type(values[0])).toEqual(SQLite.SQLITE_INTEGER);
          expect(sqlite3.value_int(values[0])).toEqual(42);
          expect(sqlite3.value_int64(values[0])).toEqual(42n);
          expect(sqlite3.value_double(values[0])).toEqual(42.0);
          expect(sqlite3.value(values[0])).toEqual(42);
  
          expect(sqlite3.value_type(values[1])).toEqual(SQLite.SQLITE_FLOAT);
          expect(sqlite3.value_double(values[1])).toEqual(3.14);
          expect(sqlite3.value(values[1])).toEqual(3.14);
  
          expect(sqlite3.value_type(values[2])).toEqual(SQLite.SQLITE_TEXT);
          expect(sqlite3.value_text(values[2])).toEqual('hello');
          expect(sqlite3.value(values[2])).toEqual('hello');
  
          expect(sqlite3.value_type(values[3])).toEqual(SQLite.SQLITE_BLOB);
          expect(sqlite3.value_blob(values[3])).toEqual(new Uint8Array([0x12, 0x34, 0x56]));
          expect(sqlite3.value_bytes(values[3])).toEqual(3);
          expect(sqlite3.value(values[3])).toEqual(new Uint8Array([0x12, 0x34, 0x56]));
  
          expect(sqlite3.value_type(values[4])).toEqual(SQLite.SQLITE_NULL);
        }));
      expect(rc).toEqual(SQLite.SQLITE_OK);
  
      rc = await sqlite3.exec(db, `
        SELECT fn(42, 3.14, 'hello', x'123456', NULL)
      `);
      expect(rc).toEqual(SQLite.SQLITE_OK);
    });
  
    it('should create an aggregate function', async function() {
      let rc;
      
      let product = 1;
      rc = await sqlite3.create_function(
        db,
        'fn',
        1,
        SQLite.SQLITE_DETERMINISTIC, 0,
        null,
        (function(context, values) {
          const value = sqlite3.value_double(values[0]);
          product *= value;
        }),
        (function(context) {
          sqlite3.result_double(context, product);
        }));
      expect(rc).toEqual(SQLite.SQLITE_OK);
  
      rc = await sqlite3.exec(db, `
        SELECT fn(column1) FROM (VALUES (1), (2), (3), (4), (5));
      `);
      expect(rc).toEqual(SQLite.SQLITE_OK);
      expect(product).toEqual(1 * 2 * 3 * 4 * 5);
    });
  
    it('should return asynchronously', async function() {
      let rc;
      
      rc = await sqlite3.create_function(
        db,
        'fn',
        0,
        SQLite.SQLITE_DETERMINISTIC, 0,
        async (context, values) => {
          await new Promise(resolve => setTimeout(resolve));
          sqlite3.result_int(context, 42);
        });
      expect(rc).toEqual(SQLite.SQLITE_OK);
  
      let result;
      rc = await sqlite3.exec(db, 'SELECT fn()', row => result = row[0]);
      expect(rc).toEqual(SQLite.SQLITE_OK);
      expect(result).toEqual(42);
    });
  });

  describe(`${key} progress_handler`, function() {
    let db;
    beforeEach(async function() {
      db = await sqlite3.open_v2(':memory:');
    });
  
    afterEach(async function() {
      await sqlite3.close(db);
    });

    it('should call progress handler', async function() {
      let rc;
      
      let count = 0;
      await sqlite3.progress_handler(db, 1, () => ++count && 0, null);
  
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
      expect(count).toBeGreaterThan(0);
    });

    it('should call asynchronous progress handler', async function() {
      let rc;
      
      let count = 0;
      await sqlite3.progress_handler(db, 1, async () => ++count && 0, null);
  
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
      expect(count).toBeGreaterThan(0);
    });
  });

  describe(`${key} set_authorizer`, function() {
    let db;
    beforeEach(async function() {
      db = await sqlite3.open_v2(':memory:');
    });
  
    afterEach(async function() {
      await sqlite3.close(db);
    });

    it('should call authorizer', async function() {
      let rc;

      const authorizations = [];
      rc = sqlite3.set_authorizer(db, (_, iActionCode, p3, p4, p5, p6) => {
        authorizations.push([iActionCode, p3, p4, p5, p6]);
        return SQLite.SQLITE_OK;
      });
      expect(rc).toEqual(SQLite.SQLITE_OK);

      rc = await sqlite3.exec(db, 'CREATE TABLE t(x)');
      expect(rc).toEqual(SQLite.SQLITE_OK);

      let authCreateTable = false;
      for (const authorization of authorizations) {
        switch (authorization[0]) {
          case SQLite.SQLITE_CREATE_TABLE:
            authCreateTable = true;
            expect(authorization[1]).toEqual('t');
            expect(authorization[2]).toEqual('');
            expect(authorization[3]).toEqual('main');
            expect(authorization[4]).toEqual('');
            break;
        }
      }
      expect(authCreateTable).toBeTrue();
    });

    it('should deny authorization', async function() {
      let rc;

      rc = sqlite3.set_authorizer(db, (_, iActionCode, p3, p4, p5, p6) => {
        return SQLite.SQLITE_DENY;
      });
      expect(rc).toEqual(SQLite.SQLITE_OK);

      const result = sqlite3.exec(db, 'CREATE TABLE t(x)');
      await expectAsync(result).toBeRejectedWith(new Error('not authorized'));
    });

    it('should call async authorizer', async function() {
      let rc;

      const authorizations = [];
      rc = sqlite3.set_authorizer(db, async (_, iActionCode, p3, p4, p5, p6) => {
        authorizations.push([iActionCode, p3, p4, p5, p6]);
        return SQLite.SQLITE_OK;
      });
      expect(rc).toEqual(SQLite.SQLITE_OK);

      rc = await sqlite3.exec(db, 'CREATE TABLE t(x)');
      expect(rc).toEqual(SQLite.SQLITE_OK);

      expect(authorizations.length).toBeGreaterThan(0);
    });
  });

  describe(`${key} update_hook`, function() {
    let db;
    beforeEach(async function() {
      db = await sqlite3.open_v2(':memory:');
    });
  
    afterEach(async function() {
      await sqlite3.close(db);
    });

    it('should call update hook', async function() {
      let rc;

      let calls = [];
      sqlite3.update_hook(db, (updateType, dbName, tblName, rowid) => {
        calls.push([updateType, dbName, tblName, rowid]);
      });

      rc = await sqlite3.exec(db, `
        CREATE TABLE t(i integer primary key, x);
        INSERT INTO t VALUES (1, 'foo'), (2, 'bar'), (12345678987654321, 'baz');
      `);
      expect(rc).toEqual(SQLite.SQLITE_OK);
      expect(calls).toEqual([
        [18, "main", "t", 1n],
        [18, "main", "t", 2n],
        [18, "main", "t", 12345678987654321n],
      ]);
      
      calls.splice(0, calls.length);
      
      await sqlite3.exec(db, `DELETE FROM t WHERE i = 2`);
      expect(calls).toEqual([[9, "main", "t", 2n]]);

      calls.splice(0, calls.length);
      
      await sqlite3.exec(db, `UPDATE t SET x = 'bar' WHERE i = 1`);
      expect(calls).toEqual([[23, "main", "t", 1n]]);
    });
  });

  describe(`${key} commit_hook`, function() {
    let db;
    beforeEach(async function() {
      db = await sqlite3.open_v2(':memory:');
    });
  
    afterEach(async function() {
      await sqlite3.close(db);
    });

    it('should call commit hook', async function() {
      let rc;

      let callsCount = 0;
      const resetCallsCount = () => callsCount = 0;

      sqlite3.commit_hook(db, () => {
        callsCount++;
        return 0;
      });
      expect(callsCount).toEqual(0);
      resetCallsCount();

      rc = await sqlite3.exec(db, `
        CREATE TABLE t(i integer primary key, x);
      `);
      expect(rc).toEqual(SQLite.SQLITE_OK);
      expect(callsCount).toEqual(1);
      resetCallsCount();

      rc = await sqlite3.exec(db, `
        SELECT * FROM t;
      `);
      expect(callsCount).toEqual(0);
      resetCallsCount();

      rc = await sqlite3.exec(db, `
        BEGIN TRANSACTION;
        INSERT INTO t VALUES (1, 'foo');
        ROLLBACK;
      `);
      expect(callsCount).toEqual(0);
      resetCallsCount();

      rc = await sqlite3.exec(db, `
        BEGIN TRANSACTION;
        INSERT INTO t VALUES (1, 'foo');
        INSERT INTO t VALUES (2, 'bar');
        COMMIT;
      `);
      expect(callsCount).toEqual(1);
      resetCallsCount();
    });

    it('can change commit hook', async function() {
      let rc;
      rc = await sqlite3.exec(db, `
        CREATE TABLE t(i integer primary key, x);
      `);
      expect(rc).toEqual(SQLite.SQLITE_OK);

      let a = 0;
      let b = 0;

      // set hook to increment `a` on commit
      sqlite3.commit_hook(db, () => {
        a++;
        return 0;
      });
      rc = await sqlite3.exec(db, `
        INSERT INTO t VALUES (1, 'foo');
      `);
      expect(a).toEqual(1);
      expect(b).toEqual(0);

      // switch to increment `b`
      sqlite3.commit_hook(db, () => {
        b++;
        return 0;
      });

      rc = await sqlite3.exec(db, `
        INSERT INTO t VALUES (2, 'bar');
      `);
      expect(rc).toEqual(SQLite.SQLITE_OK);
      expect(a).toEqual(1);
      expect(b).toEqual(1);

      // disable hook by passing null
      sqlite3.commit_hook(db, null);

      rc = await sqlite3.exec(db, `
        INSERT INTO t VALUES (3, 'qux');
      `);
      expect(rc).toEqual(SQLite.SQLITE_OK);
      expect(a).toEqual(1);
      expect(b).toEqual(1);
    });

    it('can rollback based on return value', async function() {
      let rc;
      rc = await sqlite3.exec(db, `
        CREATE TABLE t(i integer primary key, x);
      `);
      expect(rc).toEqual(SQLite.SQLITE_OK);

      // accept commit by returning 0
      sqlite3.commit_hook(db, () => 0);
      rc = await sqlite3.exec(db, `
        INSERT INTO t VALUES (1, 'foo');
      `);
      expect(rc).toEqual(SQLite.SQLITE_OK);

      // reject commit by returning 1, causing rollback
      sqlite3.commit_hook(db, () => 1);
      await expectAsync(
        sqlite3.exec(db, `INSERT INTO t VALUES (2, 'bar');`)
      ).toBeRejected();

      // double-check that the insert was rolled back
      let hasRow = false;
      rc = await sqlite3.exec(db, `
        SELECT * FROM t WHERE i = 2;
      `, () => hasRow = true);
      expect(rc).toEqual(SQLite.SQLITE_OK);
      expect(hasRow).toBeFalse();
    });

    it('does not overwrite update_hook', async function() {
      let rc;
      rc = await sqlite3.exec(db, `
        CREATE TABLE t(i integer primary key, x);
      `);
      expect(rc).toEqual(SQLite.SQLITE_OK);

      let updateHookInvocationsCount = 0;
      sqlite3.update_hook(db, (...args) => {
        updateHookInvocationsCount++;
      });

      let commitHookInvocationsCount = 0;
      sqlite3.commit_hook(db, () => {
        commitHookInvocationsCount++;
        return 0;
      });

      rc = await sqlite3.exec(db, `
        INSERT INTO t VALUES (1, 'foo');
      `);
      expect(rc).toEqual(SQLite.SQLITE_OK);

      expect(updateHookInvocationsCount).toEqual(1);
      expect(commitHookInvocationsCount).toEqual(1);
    });
  });
}
