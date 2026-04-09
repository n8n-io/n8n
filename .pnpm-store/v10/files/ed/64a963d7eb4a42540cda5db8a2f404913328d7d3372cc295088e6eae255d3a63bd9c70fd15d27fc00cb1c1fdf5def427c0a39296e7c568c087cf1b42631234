"use strict";

const { load, currentTarget } = require("@neon-rs/load");
const { familySync, GLIBC, MUSL } = require("detect-libc");

// Static requires for bundlers.
if (0) {
  require("./.targets");
}

const Authorization = require("./auth");
const SqliteError = require("./sqlite-error");

function convertError(err) {
  if (err.libsqlError) {
    return new SqliteError(err.message, err.code, err.rawCode);
  }
  return err;
}

function requireNative() {
  if (process.env.LIBSQL_JS_DEV) {
    return load(__dirname)
  }
  let target = currentTarget();
  // Workaround for Bun, which reports a musl target, but really wants glibc...
  if (familySync() == GLIBC) {
    switch (target) {
      case "linux-x64-musl":
        target = "linux-x64-gnu";
        break;
      case "linux-arm64-musl":
        target = "linux-arm64-gnu";
        break;
      }
  }
  // @neon-rs/load doesn't detect arm musl
  if (target === "linux-arm-gnueabihf" && familySync() == MUSL) {
      target = "linux-arm-musleabihf";
  }
  return require(`@libsql/${target}`);
}

const {
  databaseOpen,
  databaseOpenWithSync,
  databaseInTransaction,
  databaseInterrupt,
  databaseClose,
  databaseSyncAsync,
  databaseSyncUntilAsync,
  databaseExecAsync,
  databasePrepareAsync,
  databaseMaxWriteReplicationIndex,
  databaseDefaultSafeIntegers,
  databaseAuthorizer,
  databaseLoadExtension,
  statementRaw,
  statementIsReader,
  statementGet,
  statementRun,
  statementInterrupt,
  statementRowsAsync,
  statementColumns,
  statementSafeIntegers,
  rowsNext,
} = requireNative();

/**
 * Database represents a connection that can prepare and execute SQL statements.
 */
class Database {
  /**
   * Creates a new database connection. If the database file pointed to by `path` does not exists, it will be created.
   *
   * @constructor
   * @param {string} path - Path to the database file.
   */
  constructor(path, opts) {
    const encryptionCipher = opts?.encryptionCipher ?? "aes256cbc";
    if (opts && opts.syncUrl) {
      var authToken = "";
      if (opts.syncAuth) {
          console.warn("Warning: The `syncAuth` option is deprecated, please use `authToken` option instead.");
          authToken = opts.syncAuth;
      } else if (opts.authToken) {
          authToken = opts.authToken;
      }
      const encryptionKey = opts?.encryptionKey ?? "";
      const syncPeriod = opts?.syncPeriod ?? 0.0;
      const offline = opts?.offline ?? false;
      const remoteEncryptionKey = opts?.remoteEncryptionKey ?? "";
      this.db = databaseOpenWithSync(path, opts.syncUrl, authToken, encryptionCipher, encryptionKey, syncPeriod, offline, remoteEncryptionKey);
    } else {
      const authToken = opts?.authToken ?? "";
      const encryptionKey = opts?.encryptionKey ?? "";
      const timeout = opts?.timeout ?? 0.0;
      const remoteEncryptionKey = opts?.remoteEncryptionKey ?? "";
      this.db = databaseOpen(path, authToken, encryptionCipher, encryptionKey, timeout, remoteEncryptionKey);
    }
    // TODO: Use a libSQL API for this?
    this.memory = path === ":memory:";
    this.readonly = false;
    this.name = "";
    this.open = true;

    const db = this.db;
    Object.defineProperties(this, {
      inTransaction: {
        get() {
          return databaseInTransaction(db);
        }
      },
    });
  }

  sync() {
    return databaseSyncAsync.call(this.db);
  }

  syncUntil(replicationIndex) {
    return databaseSyncUntilAsync.call(this.db, replicationIndex);
  }

  /**
   * Prepares a SQL statement for execution.
   *
   * @param {string} sql - The SQL statement string to prepare.
   */
  prepare(sql) {
    return databasePrepareAsync.call(this.db, sql).then((stmt) => {
      return new Statement(stmt);
    }).catch((err) => {
      throw convertError(err);
    });
  }

  /**
   * Returns a function that executes the given function in a transaction.
   *
   * @param {function} fn - The function to wrap in a transaction.
   */
  transaction(fn) {
    if (typeof fn !== "function")
      throw new TypeError("Expected first argument to be a function");

    const db = this;
    const wrapTxn = (mode) => {
      return async (...bindParameters) => {
        await db.exec("BEGIN " + mode);
        try {
          const result = fn(...bindParameters);
          await db.exec("COMMIT");
          return result;
        } catch (err) {
          await db.exec("ROLLBACK");
          throw err;
        }
      };
    };
    const properties = {
      default: { value: wrapTxn("") },
      deferred: { value: wrapTxn("DEFERRED") },
      immediate: { value: wrapTxn("IMMEDIATE") },
      exclusive: { value: wrapTxn("EXCLUSIVE") },
      database: { value: this, enumerable: true },
    };
    Object.defineProperties(properties.default.value, properties);
    Object.defineProperties(properties.deferred.value, properties);
    Object.defineProperties(properties.immediate.value, properties);
    Object.defineProperties(properties.exclusive.value, properties);
    return properties.default.value;
  }

  pragma(source, options) {
    if (options == null) options = {};
    if (typeof source !== 'string') throw new TypeError('Expected first argument to be a string');
    if (typeof options !== 'object') throw new TypeError('Expected second argument to be an options object');
    const simple = options['simple'];
    return this.prepare(`PRAGMA ${source}`, this, true).then(async (stmt) => {
      return simple ? await stmt.pluck().get() : await stmt.all();
    });
  }

  backup(filename, options) {
    throw new Error("not implemented");
  }

  serialize(options) {
    throw new Error("not implemented");
  }

  function(name, options, fn) {
    // Apply defaults
    if (options == null) options = {};
    if (typeof options === "function") {
      fn = options;
      options = {};
    }

    // Validate arguments
    if (typeof name !== "string")
      throw new TypeError("Expected first argument to be a string");
    if (typeof fn !== "function")
      throw new TypeError("Expected last argument to be a function");
    if (typeof options !== "object")
      throw new TypeError("Expected second argument to be an options object");
    if (!name)
      throw new TypeError(
        "User-defined function name cannot be an empty string"
      );

    throw new Error("not implemented");
  }

  aggregate(name, options) {
    // Validate arguments
    if (typeof name !== "string")
      throw new TypeError("Expected first argument to be a string");
    if (typeof options !== "object" || options === null)
      throw new TypeError("Expected second argument to be an options object");
    if (!name)
      throw new TypeError(
        "User-defined function name cannot be an empty string"
      );

    throw new Error("not implemented");
  }

  table(name, factory) {
    // Validate arguments
    if (typeof name !== "string")
      throw new TypeError("Expected first argument to be a string");
    if (!name)
      throw new TypeError(
        "Virtual table module name cannot be an empty string"
      );

    throw new Error("not implemented");
  }

  authorizer(rules) {
    databaseAuthorizer.call(this.db, rules);
  }

  loadExtension(...args) {
    databaseLoadExtension.call(this.db, ...args);
  }

  maxWriteReplicationIndex() {
    return databaseMaxWriteReplicationIndex.call(this.db)
  }

  /**
   * Executes a SQL statement.
   *
   * @param {string} sql - The SQL statement string to execute.
   */
  exec(sql) {
    return databaseExecAsync.call(this.db, sql).catch((err) => {
      throw convertError(err);
    });
  }

  /**
   * Interrupts the database connection.
   */
  interrupt() {
    databaseInterrupt.call(this.db);
  }

  /**
   * Closes the database connection.
   */
  close() {
    databaseClose.call(this.db);
  }

  /**
   * Toggle 64-bit integer support.
   */
  defaultSafeIntegers(toggle) {
    databaseDefaultSafeIntegers.call(this.db, toggle ?? true);
    return this;
  }

  unsafeMode(...args) {
    throw new Error("not implemented");
  }
}

/**
 * Statement represents a prepared SQL statement that can be executed.
 */
class Statement {
  constructor(stmt) {
    this.stmt = stmt;
    this.pluckMode = false;
  }

  /**
   * Toggle raw mode.
   *
   * @param raw Enable or disable raw mode. If you don't pass the parameter, raw mode is enabled.
   */
  raw(raw) {
    statementRaw.call(this.stmt, raw ?? true);
    return this;
  }

  /**
   * Toggle pluck mode.
   *
   * @param pluckMode Enable or disable pluck mode. If you don't pass the parameter, pluck mode is enabled.
   */
  pluck(pluckMode) {
    this.pluckMode = pluckMode ?? true;
    return this;
  }

  get reader() {
    return statementIsReader.call(this.stmt);
  }

  /**
   * Executes the SQL statement and returns an info object.
   */
  run(...bindParameters) {
    try {
      if (bindParameters.length == 1 && typeof bindParameters[0] === "object") {
        return statementRun.call(this.stmt, bindParameters[0]);
      } else {
        return statementRun.call(this.stmt, bindParameters.flat());
      }
    } catch (err) {
      throw convertError(err);
    }
  }

  /**
   * Executes the SQL statement and returns the first row.
   *
   * @param bindParameters - The bind parameters for executing the statement.
   */
  get(...bindParameters) {
    try {
      if (bindParameters.length == 1 && typeof bindParameters[0] === "object") {
        return statementGet.call(this.stmt, bindParameters[0]);
      } else {
        return statementGet.call(this.stmt, bindParameters.flat());
      }
    } catch (e) {
      throw convertError(e);
    }
  }

  /**
   * Executes the SQL statement and returns an iterator to the resulting rows.
   *
   * @param bindParameters - The bind parameters for executing the statement.
   */
  async iterate(...bindParameters) {
    var rows = undefined;
    if (bindParameters.length == 1 && typeof bindParameters[0] === "object") {
      rows = await statementRowsAsync.call(this.stmt, bindParameters[0]);
    } else {
      rows = await statementRowsAsync.call(this.stmt, bindParameters.flat());
    }
    const iter = {
      nextRows: Array(100),
      nextRowIndex: 100,
      next() {
        try {
          if (this.nextRowIndex === 100) {
            this.nextRows.fill(null);
            rowsNext.call(rows, this.nextRows);
            this.nextRowIndex = 0;
          }
          const row = this.nextRows[this.nextRowIndex];
          this.nextRows[this.nextRowIndex] = null;
          if (!row) {
            return { done: true };
          }
          this.nextRowIndex++;
          return { value: row, done: false };
        } catch (e) {
          throw convertError(e);
        }
      },
      [Symbol.iterator]() {
        return this;
      },
    };
    return iter;
  }

  /**
   * Executes the SQL statement and returns an array of the resulting rows.
   *
   * @param bindParameters - The bind parameters for executing the statement.
   */
  async all(...bindParameters) {
    try {
      const result = [];
      const it = await this.iterate(...bindParameters);
      for (const row of it) {
        if (this.pluckMode) {
          result.push(row[Object.keys(row)[0]]);
        } else {
          result.push(row);
        }
      }
      return result;
    } catch (e) {
      throw convertError(e);
    }
  }

  /**
   * Interrupts the statement.
   */
  interrupt() {
    statementInterrupt.call(this.stmt);
  }

  /**
   * Returns the columns in the result set returned by this prepared statement.
   */
  columns() {
    return statementColumns.call(this.stmt);
  }

  /**
   * Toggle 64-bit integer support.
   */
  safeIntegers(toggle) {
    statementSafeIntegers.call(this.stmt, toggle ?? true);
    return this;
  }

}

module.exports = Database;
module.exports.Authorization = Authorization;
module.exports.SqliteError = SqliteError;
