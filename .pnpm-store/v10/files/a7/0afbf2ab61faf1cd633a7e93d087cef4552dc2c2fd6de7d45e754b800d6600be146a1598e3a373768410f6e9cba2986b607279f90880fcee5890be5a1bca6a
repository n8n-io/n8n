// Copyright (c) 2022, 2025, Oracle and/or its affiliates.

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

const { NavAddress, NavAddressList, NavDescription, NavDescriptionList } = require("./navNodes.js");
const { createNVPair } = require("./nvStrToNvPair.js");
const errors = require("../../errors.js");
const constants = require("./constants.js");

/**
 * Class that holds all possible attributes under Description
 */
class ConnectDescription {
  constructor() {
    this.cOpts = new Array();
  }

  addConnectOption(opt) {
    this.cOpts.push(opt);
  }

  getConnectOptions() {
    return this.cOpts;
  }

}

/**
 * Class that holds a list of possible connection options.
 */
class ConnStrategy {
  constructor() {
    this.reset();
    this.retryCount = 0;
    this.currentDescription = null;
    this.descriptionList = new Array();
    this.sBuf = new Array();
  }

  reset() {
    this.nextOptToTry = 0;
    this.lastRetryCounter = 0;
    this.lastRetryConnectDescription = 0;
    this.reorderDescriptionList = 0;
  }

  hasMoreOptions() {
    let cOptsSize = 0;

    for (let i = 0; i < this.descriptionList.length; ++i) {
      cOptsSize += this.descriptionList[i].getConnectOptions().length;
    }
    return (this.nextOptToTry < cOptsSize);
  }

  newConnectionDescription() {
    this.currentDescription = new ConnectDescription();
    return this.currentDescription;
  }

  getcurrentDescription() {
    return this.currentDescription;
  }

  closeDescription() {
    this.descriptionList.push(this.currentDescription);
    this.currentDescription = null;
  }

  /**
  * Execute the Connection Options from the array.  When a refuse packet is received from
  * server this method is called again and the next connect option is tried.
  */
  async execute(config) {
    /* Check for retryCount in the config if no retryCount exists in the description string */
    if (config != null) {
      if (this.retryCount == 0 && config.retryCount > 0) {
        this.retryCount = config.retryCount;
      }
    }
    if (!this.reorderDescriptionList) {
      this.descriptionList = SOLE_INST_DHCACHE.reorderDescriptionList(this.descriptionList);
      this.reorderDescriptionList = true;
    }
    /* We try the address list at least once and upto (1 + retryCount) times */
    for (let d = this.lastRetryConnectDescription; d < this.descriptionList.length; d++) {
      const desc = this.descriptionList[d];
      let cOpts = new Array();
      cOpts = desc.getConnectOptions();
      let delay = desc.delayInMillis;
      /* check for retryDelay in config if it doesn't exist in description string */
      if (config != null) {
        if ((delay == 0 || delay == undefined) && config.retryDelay > 0) {
          delay = config.retryDelay * 1000;
        } else if (!delay) {
          delay = constants.DEFAULT_RETRY_DELAY; // 1 sec default
        }
      }
      for (let i = this.lastRetryCounter; i <= this.retryCount; ++i) {
        //Conn options must be reordered only when all options are tried
        // i.e for retry and before the first try.
        if (this.nextOptToTry == 0) {
          cOpts = SOLE_INST_DHCACHE.reorderAddresses(cOpts);
        }
        while (this.nextOptToTry < cOpts.length) {
          const copt = cOpts[this.nextOptToTry];
          this.lastRetryCounter = i;
          this.lastRetryConnectDescription = d;
          this.nextOptToTry++;
          return copt;
        }
        this.nextOptToTry = 0;
        // if we reached here then we are retrying other descriptor
        if (delay > 0 && i < this.retryCount) {
          await sleep(delay);
        }// end of (delay > 0)

      }// end of for(lastRetryCounter..retryCount)
      this.lastRetryCounter = 0; // reset after one description is completed
    }
    // if we get here, all options were tried and none are valid
    this.nextOptToTry = 1000;
    this.lastRetryCounter = 1000;
    throw new Error("All options tried");
  }
  // sleep time expects milliseconds

}

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}


/**
 * create different nodes (schemaobject) as per the given input.
 * @param {string} str - input description string
 * @returns {object} - returns a connection strategy object.
 */
async function createNode(str, userConfig) {
  let nvpair;
  if (typeof str === 'string')
    nvpair = createNVPair(str);
  else
    nvpair = str; //Already a NVPair

  const arg = nvpair.name.toUpperCase();
  let navobj = null;
  switch (arg) {
    case "ADDRESS":
      navobj = new NavAddress();
      break;
    case "ADDRESS_LIST":
      navobj = new NavAddressList();
      break;
    case "DESCRIPTION":
      navobj = new NavDescription();
      break;
    case "DESCRIPTION_LIST":
      navobj = new NavDescriptionList();
      break;
    default:
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_PARAMETERS,
        `unknown top element ${arg}`);
  }
  navobj.initFromNVPair(nvpair);
  const cs = new ConnStrategy();
  cs.driverName = userConfig.driverName;
  cs.machine = userConfig.machine;
  cs.terminal = userConfig.terminal;
  cs.osUser = userConfig.osUser;
  cs.program = userConfig.program;
  cs.httpsProxy = userConfig.httpsProxy;
  await navobj.navigate(cs);
  return cs;
}


class DownHostsCache {

  constructor() {
    // Timeout for each item in the cache
    this.DOWN_HOSTS_TIMEOUT = 600;
    // Minimum amount of time between each refresh
    this.MIN_TIME_BETWEEN_REFRESH = 60;
    // DownHostsCache Map
    this.downHostsCacheMap = new Map();
    // Last Refresh Time
    this.lastRefreshTime = 0;
  }

  /**
   * Add an address to the cache
   *
   * @param connOption
   *            address to be cached
   * @return Map with address as key and time of insertion as value
   */
  markDownHost(addr) {
    return this.downHostsCacheMap.set(addr, Date.now());
  }

  // Remove elements older than DownHostsTimeout
  refreshCache() {
    if (Date.now() - this.MIN_TIME_BETWEEN_REFRESH * 1000 > this.lastRefreshTime) {
      this.downHostsCacheMap.forEach((value, key) => {
        const entryTime = value;
        if (entryTime != null && ((Date.now() - this.DOWN_HOSTS_TIMEOUT * 1000) > entryTime)) {
          this.downHostsCacheMap.delete(key);
        }
      });
      this.lastRefreshTime = Date.now();
    }
  }

  /**
   * Reorder addresses such that cached elements
   * occur at the end of the array.
   */
  reorderAddresses(cOpts) {
    this.refreshCache();

    let topIdx = 0, btmIdx = cOpts.length - 1;

    while (topIdx < btmIdx) {

      // increment topIdx if the address is not cached
      while (topIdx <= btmIdx
          && !this.isDownHostsCached(cOpts[topIdx]))
        topIdx++;

      // decrement btmIdx if address is cached
      while (btmIdx >= topIdx
          && this.isDownHostsCached(cOpts[btmIdx]))
        btmIdx--;

      // swap cached with uncached
      if (topIdx < btmIdx)
        [cOpts[topIdx], cOpts[btmIdx]] = [cOpts[btmIdx], cOpts[topIdx]];

    }
    return cOpts;
  }
  /**
   * Return if a desc is cached.
   * A desc is cached if all the connection options(addresses)
   * in that description are cached.
   */
  isDownDescCached(desc) {
    const cOpts = desc.getConnectOptions();
    for (let i = 0; i < cOpts.length; i++) {
      if (!this.isDownHostsCached(cOpts[i]))
        return false;
    }
    return true;
  }
  /**
   * Reorder description list such that description with all connection options in downcache
   * is pushed to the end of the description list
   */
  reorderDescriptionList(descs) {
    this.refreshCache();

    let topIdx = 0, btmIdx = descs.length - 1;

    while (topIdx < btmIdx) {

      // increment topIdx if the desc is not cached
      while (topIdx <= btmIdx
          && !this.isDownDescCached(descs[topIdx]))
        topIdx++;

      // decrement btmIdx if desc is cached
      while (btmIdx >= topIdx
          && this.isDownDescCached(descs[btmIdx]))
        btmIdx--;

      // swap cached with uncached
      if (topIdx < btmIdx) {
        [descs[topIdx], descs[btmIdx]] = [descs[btmIdx], descs[topIdx]];
      }
    }
    return descs;
  }
  // Return if a host is cached
  isDownHostsCached(copt) {
    return this.downHostsCacheMap.has(copt.host);
  }
}
// Single instance
const SOLE_INST_DHCACHE = new DownHostsCache();
module.exports = { createNode, SOLE_INST_DHCACHE };
