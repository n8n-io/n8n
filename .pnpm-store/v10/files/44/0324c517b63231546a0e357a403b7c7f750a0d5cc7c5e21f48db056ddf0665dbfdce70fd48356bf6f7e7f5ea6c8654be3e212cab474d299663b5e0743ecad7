import { queueTask } from "./scheduling.js";

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
    queueTask(() => {
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
export default Database;