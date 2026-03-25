"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _scheduling = require("./scheduling.js");
// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-database
class Database {
  deletePending = false;
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
      const anyRunning = this.transactions.some(transaction => {
        return transaction._started && transaction._state !== "finished";
      });
      if (!anyRunning) {
        const next = this.transactions.find(transaction => {
          return !transaction._started && transaction._state !== "finished";
        });
        if (next) {
          next.addEventListener("complete", this.processTransactions);
          next.addEventListener("abort", this.processTransactions);
          next._start();
        }
      }
    });
  }
}
var _default = exports.default = Database;
module.exports = exports.default;