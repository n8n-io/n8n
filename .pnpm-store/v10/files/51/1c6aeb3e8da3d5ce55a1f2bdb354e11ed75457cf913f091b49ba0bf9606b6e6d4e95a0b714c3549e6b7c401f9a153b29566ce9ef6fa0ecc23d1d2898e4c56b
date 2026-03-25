// Copyright (c) 2021, 2025, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const process = require('process');
const settings = require('./settings.js');

//-----------------------------------------------------------------------------
// class PoolStatistics
//  collection of statistics metrics for Pool object
//-----------------------------------------------------------------------------

class PoolStatistics {

  constructor(pool) {
    let averageTimeInQueue = 0;

    if (pool._totalRequestsEnqueued !== 0) {
      averageTimeInQueue = Math.round(pool._totalTimeInQueue /
        pool._totalRequestsEnqueued);
    }

    this.gatheredDate = Date.now ();
    this.upTime = this.gatheredDate - pool._createdDate;
    this.upTimeSinceReset = this.gatheredDate - pool._timeOfReset;
    this.connectionRequests = pool._totalConnectionRequests;
    this.requestsEnqueued = pool._totalRequestsEnqueued;
    this.requestsDequeued = pool._totalRequestsDequeued;
    this.failedRequests = pool._totalFailedRequests;
    this.rejectedRequests = pool._totalRequestsRejected;
    this.requestTimeouts = pool._totalRequestTimeouts;
    this.maximumQueueLength = pool._maximumQueueLength;
    this.currentQueueLength = pool._connRequestQueue.length;
    this.timeInQueue = pool._totalTimeInQueue;
    this.minimumTimeInQueue = pool._minTimeInQueue;
    this.maximumTimeInQueue = pool._maxTimeInQueue;
    this.averageTimeInQueue = averageTimeInQueue;
    this.connectionsInUse = pool.connectionsInUse;
    this.connectionsOpen = pool.connectionsOpen;
    this.connectString = pool.connectString;
    this.edition = pool.edition;
    this.events = pool.events;
    this.externalAuth = pool.externalAuth;
    this.homogeneous = pool.homogeneous;
    this.poolAlias = pool.poolAlias;
    this.poolIncrement = pool.poolIncrement;
    this.poolMax = pool.poolMax;
    this.poolMaxPerShard = pool.poolMaxPerShard;
    this.poolMin = pool.poolMin;
    this.poolPingInterval = pool.poolPingInterval;
    this.poolPingTimeout = pool.poolPingTimeout;
    this.poolTimeout = pool.poolTimeout;
    this.maxLifetimeSession = pool.maxLifetimeSession;
    this.queueMax = pool.queueMax;
    this.queueTimeout = pool.queueTimeout;
    this.sodaMetaDataCache = pool.sodaMetaDataCache;
    this.stmtCacheSize = pool.stmtCacheSize;
    this.user = pool.user;
    this.threadPoolSize = process.env.UV_THREADPOOL_SIZE;
    this.thin = settings.thin;
  }

  //---------------------------------------------------------------------------
  // logStatistics()
  //
  // To print the statistics metrics of the pool
  //---------------------------------------------------------------------------
  logStatistics() {
    console.log('\nDriver:');
    console.log('...thin mode:', this.thin);
    console.log('Pool statistics:');
    console.log('...gathered at:', new Date(this.gatheredDate).toISOString());
    console.log('...up time (milliseconds):', this.upTime);
    console.log('...up time from last reset (milliseconds)',
      this.upTimeSinceReset);
    console.log('...connection requests:', this.connectionRequests);
    console.log('...requests enqueued:', this.requestsEnqueued);
    console.log('...requests dequeued:', this.requestsDequeued);
    console.log('...requests failed:', this.failedRequests);
    console.log('...requests exceeding queueMax:', this.rejectedRequests);
    console.log('...requests exceeding queueTimeout:', this.requestTimeouts);
    console.log('...current queue length:', this.currentQueueLength);
    console.log('...maximum queue length:', this.maximumQueueLength);
    console.log('...sum of time in queue (milliseconds):', this.timeInQueue);
    console.log('...minimum time in queue (milliseconds):',
      this.minimumTimeInQueue);
    console.log('...maximum time in queue (milliseconds):',
      this.maximumTimeInQueue);
    console.log('...average time in queue (milliseconds):',
      this.averageTimeInQueue);
    console.log('...pool connections in use:', this.connectionsInUse);
    console.log('...pool connections open:', this.connectionsOpen);
    console.log('Pool attributes:');
    console.log('...connectString:', this.connectString);
    console.log('...edition:', this.edition);
    console.log('...events:', this.events);
    console.log('...externalAuth:', this.externalAuth);
    console.log('...homogeneous:', this.homogeneous);
    console.log('...poolAlias:', this.poolAlias);
    console.log('...poolIncrement:', this.poolIncrement);
    console.log('...poolMax:', this.poolMax);
    console.log('...poolMaxPerShard:', this.poolMaxPerShard);
    console.log('...poolMin:', this.poolMin);
    console.log('...poolPingInterval (seconds):', this.poolPingInterval);
    console.log('...poolPingTimeout (milliseconds):', this.poolPingTimeout);
    console.log('...poolTimeout (seconds):', this.poolTimeout);
    console.log('...maxLifetimeSession (seconds):', this.maxLifetimeSession);
    console.log('...queueMax:', this.queueMax);
    console.log('...queueTimeout (milliseconds):', this.queueTimeout);
    console.log('...sessionCallback:', this.sessionCallback);
    console.log('...sodaMetaDataCache:', this.sodaMetaDataCache);
    console.log('...stmtCacheSize:', this.stmtCacheSize);
    console.log('...user:', this.user);
    console.log('Related environment variables:');
    console.log('...UV_THREADPOOL_SIZE:', this.threadPoolSize);
  }
}

module.exports = PoolStatistics;
