import * as SQLite from '../src/sqlite-api.js';

export function api_statements(context) {
  describe('statements', function() {
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

    it('should iterate', async function() {
      const sql = [
        'PRAGMA journal_mode',
        'CREATE TABLE t(x)',
        'SELECT * FROM sqlite_master'
      ];

      let count = 0;
      for await (const stmt of i(sqlite3.statements(db, sql.join(';\n')))) {
        // We should be able to retrieve each parsed statement.
        const query = await sqlite3.sql(stmt);
        expect(query.includes(sql[count++])).toBeTrue();
      }
      expect(count).toEqual(sql.length);
    });

    it('should bind blob', async function() {
      let rc;
      const sql = 'SELECT ?';
      const value = new Uint8Array([1, 2, 3, 4, 5]);

      for await (const stmt of i(sqlite3.statements(db, sql))) {
        rc = await sqlite3.bind_blob(stmt, 1, value);
        expect(rc).toEqual(SQLite.SQLITE_OK);

        while ((rc = await sqlite3.step(stmt)) !== SQLite.SQLITE_DONE) {
          expect(rc).toEqual(SQLite.SQLITE_ROW);

          expect(await sqlite3.column_count(stmt)).toEqual(1);
          expect(await sqlite3.column_type(stmt, 0)).toEqual(SQLite.SQLITE_BLOB);

          const blobTyped = await sqlite3.column_blob(stmt, 0);
          expect([...blobTyped]).toEqual([...value]);

          const blobVariant = await sqlite3.column(stmt, 0);
          expect([...blobVariant]).toEqual([...value]);
        }
      }

      for await (const stmt of i(sqlite3.statements(db, sql))) {
        // Comlink intercepts the 'bind' property so use an alias.
        rc = await sqlite3.bind$(stmt, 1, value);
        expect(rc).toEqual(SQLite.SQLITE_OK);

        while ((rc = await sqlite3.step(stmt)) !== SQLite.SQLITE_DONE) {
          expect(rc).toEqual(SQLite.SQLITE_ROW);

          expect(await sqlite3.column_count(stmt)).toEqual(1);
          expect(await sqlite3.column_type(stmt, 0)).toEqual(SQLite.SQLITE_BLOB);

          const blob = await sqlite3.column_blob(stmt, 0);
          expect([...blob]).toEqual([...value]);
        }
      }
    });

    it('should bind double', async function() {
      let rc;
      const sql = 'SELECT ?';
      const value = Math.PI;

      for await (const stmt of i(sqlite3.statements(db, sql))) {
        rc = await sqlite3.bind_double(stmt, 1, value);
        expect(rc).toEqual(SQLite.SQLITE_OK);

        while ((rc = await sqlite3.step(stmt)) !== SQLite.SQLITE_DONE) {
          expect(rc).toEqual(SQLite.SQLITE_ROW);

          expect(await sqlite3.column_count(stmt)).toEqual(1);
          expect(await sqlite3.column_type(stmt, 0)).toEqual(SQLite.SQLITE_FLOAT);
          expect(await sqlite3.column_double(stmt, 0)).toEqual(value);
          expect(await sqlite3.column(stmt, 0)).toEqual(value);
        }
      }

      for await (const stmt of i(sqlite3.statements(db, sql))) {
        // Comlink intercepts the 'bind' property so use an alias.
        rc = await sqlite3.bind$(stmt, 1, value);
        expect(rc).toEqual(SQLite.SQLITE_OK);

        while ((rc = await sqlite3.step(stmt)) !== SQLite.SQLITE_DONE) {
          expect(rc).toEqual(SQLite.SQLITE_ROW);

          expect(await sqlite3.column_count(stmt)).toEqual(1);
          expect(await sqlite3.column_type(stmt, 0)).toEqual(SQLite.SQLITE_FLOAT);
          expect(await sqlite3.column_double(stmt, 0)).toEqual(value);
        }
      }
    });

    it('should bind int', async function() {
      let rc;
      const sql = 'SELECT ?';
      const value = 42;

      for await (const stmt of i(sqlite3.statements(db, sql))) {
        rc = await sqlite3.bind_int(stmt, 1, value);
        expect(rc).toEqual(SQLite.SQLITE_OK);

        while ((rc = await sqlite3.step(stmt)) !== SQLite.SQLITE_DONE) {
          expect(rc).toEqual(SQLite.SQLITE_ROW);

          expect(await sqlite3.column_count(stmt)).toEqual(1);
          expect(await sqlite3.column_type(stmt, 0)).toEqual(SQLite.SQLITE_INTEGER);
          expect(await sqlite3.column_int(stmt, 0)).toEqual(value);
          expect(await sqlite3.column(stmt, 0)).toEqual(value);
        }
      }

      for await (const stmt of i(sqlite3.statements(db, sql))) {
        // Comlink intercepts the 'bind' property so use an alias.
        rc = await sqlite3.bind$(stmt, 1, value);
        expect(rc).toEqual(SQLite.SQLITE_OK);

        while ((rc = await sqlite3.step(stmt)) !== SQLite.SQLITE_DONE) {
          expect(rc).toEqual(SQLite.SQLITE_ROW);

          expect(await sqlite3.column_count(stmt)).toEqual(1);
          expect(await sqlite3.column_type(stmt, 0)).toEqual(SQLite.SQLITE_INTEGER);
          expect(await sqlite3.column_int(stmt, 0)).toEqual(value);
        }
      }
    });

    it('should bind int64', async function() {
      let rc;
      const sql = 'SELECT ?';
      const value = BigInt(Number.MAX_SAFE_INTEGER) + 1n;

      for await (const stmt of i(sqlite3.statements(db, sql))) {
        rc = await sqlite3.bind_int64(stmt, 1, value);
        expect(rc).toEqual(SQLite.SQLITE_OK);

        while ((rc = await sqlite3.step(stmt)) !== SQLite.SQLITE_DONE) {
          expect(rc).toEqual(SQLite.SQLITE_ROW);

          expect(await sqlite3.column_count(stmt)).toEqual(1);
          expect(await sqlite3.column_type(stmt, 0)).toEqual(SQLite.SQLITE_INTEGER);
          expect(await sqlite3.column_int64(stmt, 0)).toEqual(value);
          expect(await sqlite3.column(stmt, 0)).toEqual(value);
        }
      }

      for await (const stmt of i(sqlite3.statements(db, sql))) {
        // Comlink intercepts the 'bind' property so use an alias.
        rc = await sqlite3.bind$(stmt, 1, value);
        expect(rc).toEqual(SQLite.SQLITE_OK);

        while ((rc = await sqlite3.step(stmt)) !== SQLite.SQLITE_DONE) {
          expect(rc).toEqual(SQLite.SQLITE_ROW);

          expect(await sqlite3.column_count(stmt)).toEqual(1);
          expect(await sqlite3.column_type(stmt, 0)).toEqual(SQLite.SQLITE_INTEGER);
          expect(await sqlite3.column_int64(stmt, 0)).toEqual(value);
        }
      }
    });

    it('should bind null', async function() {
      let rc;
      const sql = 'SELECT ?';

      for await (const stmt of i(sqlite3.statements(db, sql))) {
        rc = await sqlite3.bind_null(stmt, 1);
        expect(rc).toEqual(SQLite.SQLITE_OK);
        await expectAsync(sqlite3.bind_parameter_count(stmt)).toBeResolvedTo(1);

        while ((rc = await sqlite3.step(stmt)) !== SQLite.SQLITE_DONE) {
          expect(rc).toEqual(SQLite.SQLITE_ROW);

          await expectAsync(sqlite3.column_count(stmt)).toBeResolvedTo(1);
          await expectAsync(sqlite3.column_type(stmt, 0)).toBeResolvedTo(SQLite.SQLITE_NULL);
          await expectAsync(sqlite3.column(stmt, 0)).toBeResolvedTo(null);
        }
      }

      for await (const stmt of i(sqlite3.statements(db, sql))) {
        // Comlink intercepts the 'bind' property so use an alias.
        rc = await sqlite3.bind$(stmt, 1, null);
        expect(rc).toEqual(SQLite.SQLITE_OK);

        while ((rc = await sqlite3.step(stmt)) !== SQLite.SQLITE_DONE) {
          expect(rc).toEqual(SQLite.SQLITE_ROW);

          await expectAsync(sqlite3.column_count(stmt)).toBeResolvedTo(1);
          await expectAsync(sqlite3.column_type(stmt, 0)).toBeResolvedTo(SQLite.SQLITE_NULL);
        }
      }
    });

    it('should bind text', async function() {
      let rc;
      const sql = 'SELECT ?';
      const value = 'Hello, world!';

      for await (const stmt of i(sqlite3.statements(db, sql))) {
        rc = await sqlite3.bind_text(stmt, 1, value);
        expect(rc).toEqual(SQLite.SQLITE_OK);

        while ((rc = await sqlite3.step(stmt)) !== SQLite.SQLITE_DONE) {
          expect(rc).toEqual(SQLite.SQLITE_ROW);

          expect(await sqlite3.column_count(stmt)).toEqual(1);
          expect(await sqlite3.column_type(stmt, 0)).toEqual(SQLite.SQLITE_TEXT);
          expect(await sqlite3.column_text(stmt, 0)).toEqual(value);
          expect(await sqlite3.column(stmt, 0)).toEqual(value);
        }
      }

      for await (const stmt of i(sqlite3.statements(db, sql))) {
        // Comlink intercepts the 'bind' property so use an alias.
        rc = await sqlite3.bind$(stmt, 1, value);
        expect(rc).toEqual(SQLite.SQLITE_OK);

        while ((rc = await sqlite3.step(stmt)) !== SQLite.SQLITE_DONE) {
          expect(rc).toEqual(SQLite.SQLITE_ROW);

          expect(await sqlite3.column_count(stmt)).toEqual(1);
          expect(await sqlite3.column_type(stmt, 0)).toEqual(SQLite.SQLITE_TEXT);
          expect(await sqlite3.column_text(stmt, 0)).toEqual(value);
        }
      }
    });

    it('should bind boolean', async function() {
      let rc;
      const sql = 'SELECT ?';
      const storeValue = true;
      const expectedRetrievedValue = 1;

      for await (const stmt of i(sqlite3.statements(db, sql))) {
        // Comlink intercepts the 'bind' property so use an alias.
        rc = await sqlite3.bind$(stmt, 1, storeValue);
        expect(rc).toEqual(SQLite.SQLITE_OK);

        while ((rc = await sqlite3.step(stmt)) !== SQLite.SQLITE_DONE) {
          expect(rc).toEqual(SQLite.SQLITE_ROW);

          expect(await sqlite3.column_count(stmt)).toEqual(1);
          expect(await sqlite3.column_type(stmt, 0)).toEqual(SQLite.SQLITE_INTEGER);
          expect(await sqlite3.column_int(stmt, 0)).toEqual(expectedRetrievedValue);
        }
      }
    });

    it('should bind collection array', async function() {
      let rc;
      const sql = 'VALUES (?, ?, ?, ?, ?)';
      const cBlob = new Uint8Array([8, 6, 7, 5, 3, 0, 9]);
      const cDouble = Math.PI;
      const cInt = 42;
      const cNull = null;
      const cText = 'foobar';

      for await (const stmt of i(sqlite3.statements(db, sql))) {
        expect(await sqlite3.column_name(stmt, 0)).toEqual('column1');
        expect(await sqlite3.column_name(stmt, 1)).toEqual('column2');
        expect(await sqlite3.column_name(stmt, 2)).toEqual('column3');
        expect(await sqlite3.column_name(stmt, 3)).toEqual('column4');
        expect(await sqlite3.column_name(stmt, 4)).toEqual('column5');

        expect(await sqlite3.column_names(stmt))
          .toEqual(['column1', 'column2', 'column3', 'column4', 'column5']);

        rc = await sqlite3.bind_collection(stmt, [
          cBlob,
          cDouble,
          cInt,
          cNull,
          cText,
        ]);
        expect(rc).toEqual(SQLite.SQLITE_OK);

        while ((rc = await sqlite3.step(stmt)) !== SQLite.SQLITE_DONE) {
          expect(rc).toEqual(SQLite.SQLITE_ROW);
          expect(await sqlite3.data_count(stmt)).toEqual(5)
          expect(await sqlite3.column_count(stmt)).toEqual(5);

          const row = await sqlite3.row(stmt);
          expect(row.length).toEqual(5);

          expect(row[0] instanceof Uint8Array).toBeTrue();
          expect([...row[0]]).toEqual([...cBlob]);
          expect(row[1]).toEqual(cDouble);
          expect(row[2]).toEqual(cInt);
          expect(row[3]).toEqual(cNull);
          expect(row[4]).toEqual(cText);
        } 
      }
    });

    it('should bind collection object', async function() {
      let rc;
      const sql = 'VALUES (:cBlob, :cDouble, :cInt, :cNull, :cText)';
      const cBlob = new Uint8Array([8, 6, 7, 5, 3, 0, 9]);
      const cDouble = Math.PI;
      const cInt = 42;
      const cNull = null;
      const cText = 'foobar';

      for await (const stmt of i(sqlite3.statements(db, sql))) {
        expect(await sqlite3.bind_parameter_count(stmt)).toEqual(5);
        expect(await sqlite3.bind_parameter_name(stmt, 1)).toEqual(':cBlob');
        expect(await sqlite3.bind_parameter_name(stmt, 2)).toEqual(':cDouble');
        expect(await sqlite3.bind_parameter_name(stmt, 3)).toEqual(':cInt');
        expect(await sqlite3.bind_parameter_name(stmt, 4)).toEqual(':cNull');
        expect(await sqlite3.bind_parameter_name(stmt, 5)).toEqual(':cText');

        rc = await sqlite3.bind_collection(stmt, {
          ':cBlob': cBlob,
          ':cDouble': cDouble,
          ':cInt': cInt,
          ':cNull': cNull,
          ':cText': cText
        });
        expect(rc).toEqual(SQLite.SQLITE_OK);

        while ((rc = await sqlite3.step(stmt)) !== SQLite.SQLITE_DONE) {
          expect(rc).toEqual(SQLite.SQLITE_ROW);

          expect(await sqlite3.column_count(stmt)).toEqual(5);
          const row = await sqlite3.row(stmt);
          expect(row.length).toEqual(5);

          expect(row[0] instanceof Uint8Array).toBeTrue();
          expect([...row[0]]).toEqual([...cBlob]);
          expect(row[1]).toEqual(cDouble);
          expect(row[2]).toEqual(cInt);
          expect(row[3]).toEqual(cNull);
          expect(row[4]).toEqual(cText);
        } 
      }
    });

    it('should allow unscoped lifetime', async function() {
      let rc;

      rc = await sqlite3.exec(db, `
        CREATE TABLE t AS VALUES ('foo', 0), ('bar', 1), ('baz', 2);
      `);
      expect(rc).toEqual(SQLite.SQLITE_OK);

      let stmt;
      const sql = 'SELECT column2 FROM t WHERE column1 = ?';
      for await (const s of i(sqlite3.statements(db, sql, { unscoped: true }))) {
        if (s) {
          stmt = s;
        }
      }
      expect(stmt).toBeGreaterThan(0);

      // The statement should be active beyond the iterator lifecycle.
      rc = await sqlite3.bind_text(stmt, 1, 'foo');
      expect(rc).toEqual(SQLite.SQLITE_OK);
      rc = await sqlite3.step(stmt);
      expect(rc).toEqual(SQLite.SQLITE_ROW);
      await expectAsync(sqlite3.column_int(stmt, 0)).toBeResolvedTo(0);

      rc = await sqlite3.reset(stmt);
      expect(rc).toEqual(SQLite.SQLITE_OK);

      rc = await sqlite3.bind_text(stmt, 1, 'bar');
      expect(rc).toEqual(SQLite.SQLITE_OK);
      rc = await sqlite3.step(stmt);
      expect(rc).toEqual(SQLite.SQLITE_ROW);
      await expectAsync(sqlite3.column_int(stmt, 0)).toBeResolvedTo(1);

      rc = await sqlite3.step(stmt);
      expect(rc).toEqual(SQLite.SQLITE_DONE);

      rc = await sqlite3.finalize(stmt);
      expect(rc).toEqual(SQLite.SQLITE_OK);
    });

    it('should clear bindings', async function() {
      let rc;
  
      const sql = 'SELECT ?';
      for await (const stmt of i(sqlite3.statements(db, sql))) {
        {
          rc = await sqlite3.bind_int(stmt, 1, 42);
          expect(rc).toEqual(SQLite.SQLITE_OK);

          rc = await sqlite3.reset(stmt);
          expect(rc).toEqual(SQLite.SQLITE_OK);

          rc = await sqlite3.step(stmt);
          expect(rc).toEqual(SQLite.SQLITE_ROW);

          const value = await sqlite3.column(stmt, 0);
          expect(value).toEqual(42);
        }

        {
          rc = await sqlite3.clear_bindings(stmt);
          expect(rc).toEqual(SQLite.SQLITE_OK);

          rc = await sqlite3.reset(stmt);
          expect(rc).toEqual(SQLite.SQLITE_OK);
        
          rc = await sqlite3.step(stmt);
          expect(rc).toEqual(SQLite.SQLITE_ROW);        

          const value = await sqlite3.column(stmt, 0);
          expect(value).not.toEqual(42);
        }
      }
    });
  });
}

// sqlite3.statements() returns an async iterator, but its Comlink
// proxy needs this wrapper to be used.
async function* i(p) {
  const x = await p;
  try {
    let value, done;
    while (true) {
      ({ value, done } = await x.next());
      if (!done) {
        yield value;
      } else {
        break;
      }
    }
  } catch (e) {
    await x.throw(e);
  } finally {
    await x.return();
  }
}