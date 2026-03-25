"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeasedDbConnection = void 0;
const DatabaseConnectionLeaseAlreadyReleasedError_1 = require("../../error/DatabaseConnectionLeaseAlreadyReleasedError");
/**
 * Represents a leased database connection. The connection is
 * leased from the owner to the lease holder, and must be
 * released back to the owner when no longer needed.
 */
class LeasedDbConnection {
    get isInvalid() {
        return this._isInvalid;
    }
    get connection() {
        if (this.isReleased) {
            throw new DatabaseConnectionLeaseAlreadyReleasedError_1.DatabaseConnectionLeaseAlreadyReleasedError();
        }
        return this._connection;
    }
    constructor(_connection, leaseOwner, leaseHolder) {
        this._connection = _connection;
        this.leaseOwner = leaseOwner;
        this.leaseHolder = leaseHolder;
        this.isReleased = false;
        this._isInvalid = false;
    }
    markAsInvalid() {
        this._isInvalid = true;
    }
    async release() {
        if (this.isReleased) {
            return;
        }
        this.leaseOwner.releaseConnection(this);
        this.isReleased = true;
    }
    async requestRelease() {
        if (this.isReleased) {
            return;
        }
        this.leaseHolder.requestRelease();
    }
}
exports.LeasedDbConnection = LeasedDbConnection;

//# sourceMappingURL=LeasedDbConnection.js.map
