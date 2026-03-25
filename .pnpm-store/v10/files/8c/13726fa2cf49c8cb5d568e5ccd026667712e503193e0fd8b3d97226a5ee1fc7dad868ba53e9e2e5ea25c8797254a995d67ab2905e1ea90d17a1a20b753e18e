"use strict";
/**
 * Create the default settings used by the pool
 *
 * @class
 */
class PoolDefaults {
  constructor() {
    this.fifo = true;
    this.priorityRange = 1;

    this.testOnBorrow = false;
    this.testOnReturn = false;

    this.autostart = true;

    this.evictionRunIntervalMillis = 0;
    this.numTestsPerEvictionRun = 3;
    this.softIdleTimeoutMillis = -1;
    this.idleTimeoutMillis = 30000;

    // FIXME: no defaults!
    this.acquireTimeoutMillis = null;
    this.destroyTimeoutMillis = null;
    this.maxWaitingClients = null;

    this.min = null;
    this.max = null;
    // FIXME: this seems odd?
    this.Promise = Promise;
  }
}

module.exports = PoolDefaults;
