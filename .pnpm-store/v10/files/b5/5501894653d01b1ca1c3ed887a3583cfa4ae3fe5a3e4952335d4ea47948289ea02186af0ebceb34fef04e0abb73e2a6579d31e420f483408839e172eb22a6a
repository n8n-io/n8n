'use strict';

const PromisePoolConnection = require('./pool_connection');
const makeDoneCb = require('./make_done_cb');

class PromisePoolNamespace {
  constructor(poolNamespace, thePromise) {
    this.poolNamespace = poolNamespace;
    this.Promise = thePromise || Promise;
  }

  getConnection() {
    const corePoolNamespace = this.poolNamespace;
    return new this.Promise((resolve, reject) => {
      corePoolNamespace.getConnection((err, coreConnection) => {
        if (err) {
          reject(err);
        } else {
          resolve(new PromisePoolConnection(coreConnection, this.Promise));
        }
      });
    });
  }

  query(sql, values) {
    const corePoolNamespace = this.poolNamespace;
    const localErr = new Error();
    if (typeof values === 'function') {
      throw new Error(
        'Callback function is not available with promise clients.'
      );
    }
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb(resolve, reject, localErr);
      corePoolNamespace.query(sql, values, done);
    });
  }

  execute(sql, values) {
    const corePoolNamespace = this.poolNamespace;
    const localErr = new Error();
    if (typeof values === 'function') {
      throw new Error(
        'Callback function is not available with promise clients.'
      );
    }
    return new this.Promise((resolve, reject) => {
      const done = makeDoneCb(resolve, reject, localErr);
      corePoolNamespace.execute(sql, values, done);
    });
  }
}

module.exports = PromisePoolNamespace;
