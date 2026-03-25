'use strict';

const makeDoneCb = require('./make_done_cb.js');

class PromisePreparedStatementInfo {
  constructor(statement, promiseImpl) {
    this.statement = statement;
    this.Promise = promiseImpl;
  }

  execute(parameters) {
    const s = this.statement;
    const localErr = new Error();
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb(resolve, reject, localErr);
      if (parameters) {
        s.execute(parameters, done);
      } else {
        s.execute(done);
      }
    });
  }

  close() {
    return new this.Promise((resolve) => {
      this.statement.close();
      resolve();
    });
  }
}

module.exports = PromisePreparedStatementInfo;
