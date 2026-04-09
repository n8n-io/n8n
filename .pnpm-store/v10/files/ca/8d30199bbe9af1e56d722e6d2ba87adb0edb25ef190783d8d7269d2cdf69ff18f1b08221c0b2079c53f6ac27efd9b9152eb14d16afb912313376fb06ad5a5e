"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _scheduling = require("./scheduling.js");
var _intersection = require("./intersection.js");
// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-database
class Database {
  transactions = [];
  rawObjectStores = new Map();
  connections = [];
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this.processTransactions = this.processTransactions.bind(this);
  }
  processTransactions() {
    (0, _scheduling.queueTask)(() => {
      const running = this.transactions.filter(transaction => transaction._started && transaction._state !== "finished");
      const waiting = this.transactions.filter(transaction => !transaction._started && transaction._state !== "finished");

      // The next transaction to run is the first waiting one that doesn't overlap with either a running one or a
      // preceding waiting one. This allows non-overlapping transactions to run in parallel.
      // The exception is readonly transactions, which are allowed to run in parallel with other readonly
      // transactions, even with overlapping scopes, since no data is being modified.
      const next = waiting.find((transaction, i) => {
        const anyRunning = running.some(other => !(transaction.mode === "readonly" && other.mode === "readonly") && (0, _intersection.intersection)(other._scope, transaction._scope).size > 0);
        if (anyRunning) {
          return false;
        }

        // If any _preceding_ waiting transactions are blocked, then that's also blocking.
        // E.g. if you have 3 transactions: [a], [a,b], and [b,c], then [a] blocks [a,b] which blocks [b,c]
        // until [a] is complete, even though [a] and [b,c] share no overlap.
        // Note that readonly transactions do not have to be handled as a special case here,
        // because if any transactions with overlapping scopes are blocked, then we can assume they are
        const anyWaiting = waiting.slice(0, i).some(other => (0, _intersection.intersection)(other._scope, transaction._scope).size > 0);
        return !anyWaiting;
      });
      if (next) {
        next.addEventListener("complete", this.processTransactions);
        next.addEventListener("abort", this.processTransactions);
        next._start();
      }
    });
  }
}
var _default = exports.default = Database;
module.exports = exports.default;