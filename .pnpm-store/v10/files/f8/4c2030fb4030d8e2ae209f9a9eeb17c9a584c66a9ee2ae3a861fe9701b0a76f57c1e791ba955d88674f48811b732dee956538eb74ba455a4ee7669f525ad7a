"use strict";

const PooledResourceStateEnum = require("./PooledResourceStateEnum");

/**
 * @class
 * @private
 */
class PooledResource {
  constructor(resource) {
    this.creationTime = Date.now();
    this.lastReturnTime = null;
    this.lastBorrowTime = null;
    this.lastIdleTime = null;
    this.obj = resource;
    this.state = PooledResourceStateEnum.IDLE;
  }

  // mark the resource as "allocated"
  allocate() {
    this.lastBorrowTime = Date.now();
    this.state = PooledResourceStateEnum.ALLOCATED;
  }

  // mark the resource as "deallocated"
  deallocate() {
    this.lastReturnTime = Date.now();
    this.state = PooledResourceStateEnum.IDLE;
  }

  invalidate() {
    this.state = PooledResourceStateEnum.INVALID;
  }

  test() {
    this.state = PooledResourceStateEnum.VALIDATION;
  }

  idle() {
    this.lastIdleTime = Date.now();
    this.state = PooledResourceStateEnum.IDLE;
  }

  returning() {
    this.state = PooledResourceStateEnum.RETURNING;
  }
}

module.exports = PooledResource;
