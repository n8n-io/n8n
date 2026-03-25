"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteReadWriteQueryRunner = void 0;
const sentry_1 = require("../../util/sentry");
const error_1 = require("../../error");
const Broadcaster_1 = require("../../subscriber/Broadcaster");
const AbstractSqliteQueryRunner_1 = require("../sqlite-abstract/AbstractSqliteQueryRunner");
const BroadcasterResult_1 = require("../../subscriber/BroadcasterResult");
const TransactionCommitFailedError_1 = require("../../error/TransactionCommitFailedError");
const TransactionRollbackFailedError_1 = require("../../error/TransactionRollbackFailedError");
class SqliteReadWriteQueryRunner extends AbstractSqliteQueryRunner_1.AbstractSqliteQueryRunner {
    //#endregion Properties
    get logger() {
        return this.connection.logger;
    }
    constructor(driver, connection, sqliteLibrary, writePool, readPool, options) {
        super();
        this.sqliteLibrary = sqliteLibrary;
        this.writePool = writePool;
        this.readPool = readPool;
        this.options = options;
        this.driver = driver;
        this.connection = connection;
        this.broadcaster = new Broadcaster_1.Broadcaster(this);
    }
    /**
     * Called before migrations are run.
     */
    async beforeMigration() {
        await this.query(`PRAGMA foreign_keys = OFF`);
    }
    /**
     * Called after migrations are run.
     */
    async afterMigration() {
        await this.query(`PRAGMA foreign_keys = ON`);
    }
    connect() {
        // We do nothing here, as we acquire connections on demand
        return Promise.resolve();
    }
    requestRelease() {
        this.releaseTrxDbLease();
    }
    async release() {
        if (this.isReleased) {
            return;
        }
        // If transaction is active, abort it
        this.releaseTrxDbLease();
        this.isReleased = true;
    }
    /**
     * Starts transaction.
     */
    async startTransaction() {
        if (this.isTransactionActive) {
            throw new error_1.TransactionAlreadyStartedError();
        }
        try {
            await this.broadcaster.broadcast("BeforeTransactionStart");
            this.trxDbLease = await this.writePool.leaseConnection(this);
            await this.runQueryWithinConnection(this.trxDbLease.connection, "BEGIN IMMEDIATE TRANSACTION");
            await this.broadcaster.broadcast("AfterTransactionStart");
        }
        catch (error) {
            this.releaseTrxDbLease();
            throw error;
        }
        this.isTransactionActive = true;
    }
    /**
     * Commits transaction.
     * Error will be thrown if transaction was not started.
     */
    async commitTransaction() {
        if (!this.isTransactionActive)
            throw new error_1.TransactionNotStartedError();
        if (!this.trxDbLease)
            throw new error_1.TransactionNotStartedError();
        try {
            await this.broadcaster.broadcast("BeforeTransactionCommit");
            await this.runQueryWithinConnection(this.trxDbLease.connection, "COMMIT");
            await this.broadcaster.broadcast("AfterTransactionCommit");
        }
        catch (commitError) {
            (0, sentry_1.captureException)(new TransactionCommitFailedError_1.TransactionCommitFailedError(commitError));
            this.trxDbLease.markAsInvalid();
            throw commitError;
        }
        finally {
            this.releaseTrxDbLease();
        }
    }
    /**
     * Rollbacks transaction.
     * Error will be thrown if transaction was not started.
     */
    async rollbackTransaction() {
        if (!this.isTransactionActive)
            throw new error_1.TransactionNotStartedError();
        if (!this.trxDbLease)
            throw new error_1.TransactionNotStartedError();
        try {
            await this.broadcaster.broadcast("BeforeTransactionRollback");
            await this.runQueryWithinConnection(this.trxDbLease.connection, "ROLLBACK");
            await this.broadcaster.broadcast("AfterTransactionRollback");
        }
        catch (rollbackError) {
            (0, sentry_1.captureException)(new TransactionRollbackFailedError_1.TransactionRollbackFailedError(rollbackError));
            this.trxDbLease.markAsInvalid();
            throw rollbackError;
        }
        finally {
            this.releaseTrxDbLease();
        }
    }
    /**
     * Executes a given SQL query.
     */
    async query(query, parameters, useStructuredResult = false) {
        if (!this.connection.isInitialized) {
            throw new error_1.ConnectionIsNotSetError("sqlite");
        }
        if (this.trxDbLease) {
            return await this.runQueryWithinConnection(this.trxDbLease.connection, query, parameters, useStructuredResult);
        }
        const isSelectQuery = this.isReadQuery(query);
        const connectionPool = isSelectQuery ? this.readPool : this.writePool;
        return connectionPool.runExclusive(this, async (leasedDbConnection) => await this.runQueryWithinConnection(leasedDbConnection.connection, query, parameters, useStructuredResult));
    }
    async runQueryWithinConnection(connection, query, parameters, useStructuredResult = false) {
        const broadcasterResult = new BroadcasterResult_1.BroadcasterResult();
        const broadcaster = this.broadcaster;
        broadcaster.broadcastBeforeQueryEvent(broadcasterResult, query, parameters);
        const maxQueryExecutionTime = this.options.maxQueryExecutionTime;
        try {
            this.logger.logQuery(query, parameters);
            const queryStartTime = +new Date();
            const result = await this.sqliteLibrary.runQuery(connection, query, parameters, useStructuredResult);
            // log slow queries if maxQueryExecution time is set
            const queryEndTime = +new Date();
            const queryExecutionTime = queryEndTime - queryStartTime;
            if (maxQueryExecutionTime &&
                queryExecutionTime > maxQueryExecutionTime)
                this.logger.logQuerySlow(queryExecutionTime, query, parameters);
            broadcaster.broadcastAfterQueryEvent(broadcasterResult, query, parameters, true, queryExecutionTime, useStructuredResult ? result.raw : result, undefined);
            return result;
        }
        catch (err) {
            this.logger.logQueryError(err, query, parameters);
            broadcaster.broadcastAfterQueryEvent(broadcasterResult, query, parameters, false, undefined, undefined, err);
            throw err;
        }
        finally {
            await broadcasterResult.wait();
        }
    }
    isReadQuery(query) {
        return /^\s*SELECT/i.test(query);
    }
    releaseTrxDbLease() {
        if (this.trxDbLease) {
            this.trxDbLease.release();
            this.trxDbLease = undefined;
            this.isTransactionActive = false;
        }
    }
}
exports.SqliteReadWriteQueryRunner = SqliteReadWriteQueryRunner;

//# sourceMappingURL=SqliteReadWriteQueryRunner.js.map
