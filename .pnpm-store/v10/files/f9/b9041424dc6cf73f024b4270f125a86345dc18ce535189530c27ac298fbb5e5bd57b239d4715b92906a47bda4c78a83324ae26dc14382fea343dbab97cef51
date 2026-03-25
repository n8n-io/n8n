const Logger = require('./logger');

/**
 *
 * @param {String} id 
 * @param {Number} timestamp 
 * @param {Number} priority 
 * @param {String} context 
 */
function QueryContextElement(id, timestamp, priority, context) {
  this.id = id;
  this.timestamp = timestamp;
  this.priority = priority;
  this.context = context;
}

/**
 * Most Recently Used and Priority based cache. A separate cache for each connection in the driver.
 */

/**
 * @param {Number} capacity Maximum capacity of the cache.
 * @param {Number} sessionId Session for which the cache is created.
 */
function QueryContextCache(capacity, sessionId) {
  Logger.getInstance().debug(`Creating new QueryContextCache with capacity ${capacity} for session ${sessionId}`);
  this.sessionId = sessionId;
  this.capacity = capacity;
  this.idMap = new Map(); // Map for id and QCC
  this.treeSet = new Set(); // Order data as per priority
  this.priorityMap = new Map(); // Map for priority and QCC
}

QueryContextCache.prototype.sortTreeSet = function () {
  this.treeSet = new Set(Array.from(this.treeSet).sort((a, b) => a.priority - b.priority));
};

QueryContextCache.prototype.addQCE = function (qce) {
  this.idMap.set(qce.id, qce);
  this.priorityMap.set(qce.priority, qce);
  this.treeSet.add(qce);
  this.sortTreeSet();
  Logger.getInstance().trace(`QCC session ${this.sessionId} - Added QCE: ${JSON.stringify(qce)}`);
};

/**
   * Remove an element from the cache.
   *
   * @param {Object} qce element to remove.
   */
QueryContextCache.prototype.removeQCE = function (qce) {
  this.idMap.delete(qce.id);
  this.priorityMap.delete(qce.priority);
  this.treeSet.delete(qce);
  Logger.getInstance().trace(`QCC session ${this.sessionId} - Removed QCE: ${JSON.stringify(qce)}`);
};

/**
   * Replace the cache element with a new response element. Remove old element exist in the cache
   * and add a new element received.
   *
   * @param {Object} oldQCE an element exist in the cache
   * @param {Object} newQCE a new element just received.
   */
QueryContextCache.prototype.replaceQCE = function (oldQCE, newQCE) {

  // Remove old element from the cache
  this.removeQCE(oldQCE);
  // Add new element in the cache
  this.addQCE(newQCE);

  Logger.getInstance().debug(`QCC session ${this.sessionId} - Replaced QCE: ${JSON.stringify(oldQCE)} with ${JSON.stringify(newQCE)}`);
};

/**
   * Merge a new element comes from the server with the existing cache. Merge is based on read time
   * stamp for the same id and based on priority for two different ids.
   *
   * @param {Number} id 
   * @param {Number} timestamp 
   * @param {Number} priority 
   * @param {String} context
   * 
   */
QueryContextCache.prototype.merge = function (newQCE) {
  Logger.getInstance().debug(`QCC session ${this.sessionId} - Merging QCE: ${JSON.stringify(newQCE)}`);
  if (this.idMap.has(newQCE.id)) {
    Logger.getInstance().debug(`QCC session ${this.sessionId} - Element id ${newQCE.id} found in cache`);

    // ID found in the cache
    const qce = this.idMap.get(newQCE.id);
    if (newQCE.timestamp > qce.timestamp) {
      Logger.getInstance().trace(`QCC session ${this.sessionId} - New element is more recent. Current timestamp: ${qce.timestamp}, new timestamp: ${newQCE.timestamp}`);
      if (qce.priority === newQCE.priority) {
        Logger.getInstance().trace(`QCC session ${this.sessionId} - Element priority (${qce.priority}) is the same`);
        // Same priority, overwrite new data at same place
        qce.timestamp = newQCE.timestamp;
        qce.context = newQCE.context;
      } else {
        Logger.getInstance().trace(`QCC session ${this.sessionId} - Element priority changed. Current priority: ${qce.priority}, new priority: ${newQCE.priority}`);
        // Change in priority
        this.replaceQCE(qce, newQCE);
      } 
    } else if (newQCE.timestamp === qce.timestamp && qce.priority !== newQCE.priority) {
      Logger.getInstance().trace(`QCC session ${this.sessionId} - Element timestamp is the same, but priority changes. Current priority: ${qce.priority}, new priority: ${newQCE.priority}`);
      // Same read timestamp but change in priority
      this.replaceQCE(qce, newQCE);
    } else {
      Logger.getInstance().trace(`QCC session ${this.sessionId} - Element is the same. Doing nothing.`);
    }
  } else {
    Logger.getInstance().trace(`QCC session ${this.sessionId} - New element`);
    // new id
    if (this.priorityMap.has(newQCE.priority)) {

      // Same priority with different id
      const qce = this.priorityMap.get(newQCE.priority);

      Logger.getInstance().trace(`QCC session ${this.sessionId} - Element with the same priority found: ${JSON.stringify(qce)}. Replacing with new element: ${JSON.stringify(newQCE)}`);
      // Replace with new data
      this.replaceQCE(qce, newQCE);
    } else {
      Logger.getInstance().debug(`QCC session ${this.sessionId} - Adding new element to the cache: ${JSON.stringify(newQCE)}`);
      // new priority
      // Add new element in the cache
      this.addQCE(newQCE, newQCE);
    }
  }
};

/**
   * After the merge, loop through priority list and make sure cache is at most capacity. Remove all
   * other elements from the list based on priority.
   */
QueryContextCache.prototype.checkCacheCapacity = function () {
  Logger.getInstance().trace(
    `QCC session ${this.sessionId} - checkCacheCapacity() called. treeSet size ${this.treeSet.size}, cache capacity ${this.capacity}`);

  // remove elements based on priority
  while (this.treeSet.size > this.capacity) {
    const qce = Array.from(this.treeSet).pop();
    this.removeQCE(qce);
  }
  Logger.getInstance().trace(
    `QCC session ${this.sessionId} - checkCacheCapacity() returns. treeSet size ${this.treeSet.size}, cache capacity ${this.capacity}`);
};

/** Clear the cache. */
QueryContextCache.prototype.clearCache = function () {
  Logger.getInstance().trace(`QCC session ${this.sessionId} - clearCache() called`);
  this.idMap.clear();
  this.priorityMap.clear();
  this.treeSet.clear();
  Logger.getInstance().trace(`QCC session ${this.sessionId} - clearCache() returns. Number of entries in cache now ${this.treeSet.size}`);
};

QueryContextCache.prototype.getElements = function () {
  return this.treeSet;
};

/**
 * @param data: the QueryContext Object serialized as a JSON format string
 */
QueryContextCache.prototype.deserializeQueryContext = function (data) {
  const stringifyData = JSON.stringify(data);
  Logger.getInstance().debug(`QCC session ${this.sessionId} - deserializeQueryContext() called: data from server: ${stringifyData}`);
  if (!data || stringifyData === '{}' || data.entries === null) {

    this.clearCache();
    Logger.getInstance().trace(`QCC session ${this.sessionId} - deserializeQueryContext() returns`);
    this.logCacheEntries();
    return;
  }
  try {
    // Deserialize the entries. The first entry with priority is the main entry. An example JSON is:
    // {
    //   "entries": [
    //    {
    //     "id": 0,
    //     "readtimestamp": 123456789,
    //     "priority": 0,
    //     "context": "base64 encoded context"
    //    },
    //     {
    //       "id": 1,
    //       "readtimestamp": 123456789,
    //       "priority": 1,
    //       "context": "base64 encoded context"
    //     },
    //     {
    //       "id": 2,
    //       "readtimestamp": 123456789,
    //       "priority": 2,
    //       "context": "base64 encoded context"
    //     }
    //   ]

    const entries = data.entries;
    if (entries !== null && Array.isArray(entries)) {
      for (const entryNode of entries) {
        const entry = this.deserializeQueryContextElement(entryNode);
        if (entry != null) {
          this.merge(entry);
        } else {
          Logger.getInstance().warn(
            `QCC session ${this.sessionId} - deserializeQueryContextJson: deserializeQueryContextElement meets mismatch field type. Clear the QueryContextCache.`);
          this.clearCache();
          return;
        }
      }
     
    }
  } catch (e) {
    Logger.getInstance().debug(`QCC session ${this.sessionId} - deserializeQueryContextJson: Exception = ${e.getMessage}`);

    // Not rethrowing. clear the cache as incomplete merge can lead to unexpected behavior.
    this.clearCache();
  }

  this.checkCacheCapacity();
  this.logCacheEntries();
}; 

QueryContextCache.prototype.deserializeQueryContextElement = function (node) {
  const { id, timestamp, priority, context } = node;
  const entry = new QueryContextElement (id, timestamp, priority, null);

  if (typeof context === 'string'){
    entry.context = context;
  } else if (context === null || context === undefined) {  
    entry.context = null;
    Logger.getInstance().debug(`QCC session ${this.sessionId} - deserializeQueryContextElement \`context\` field is empty`);
  } else {
    Logger.getInstance().warn(`QCC session ${this.sessionId} - deserializeQueryContextElement: \`context\` field is not String type`);
    return null;
  }

  return entry;
};

QueryContextCache.prototype.logCacheEntries = function () {

  this.treeSet.forEach(function (elem) {
    Logger.getInstance().debug(
      `QCC session ${this.sessionId} - Cache Entry: id: ${elem.id} timestamp: ${elem.timestamp} priority: ${elem.priority}`);
  }, this);
};

QueryContextCache.prototype.getSize = function () {
  return this.treeSet.size;
};

QueryContextCache.prototype.getQueryContextDTO = function () {
  const arr = [];
  const querycontexts = Array.from(this.getElements());
  for (let i = 0; i < this.treeSet.size; i++) {
    arr.push({ id: querycontexts[i].id, timestamp: querycontexts[i].timestamp,
      priority: querycontexts[i].priority, context: { base64Data: querycontexts[i].context } || null });
  }
  return {
    entries: arr
  };
};

QueryContextCache.prototype.getSerializeQueryContext = function () {
  const arr = [];
  const querycontexts = Array.from(this.getElements());
  for (let i = 0; i < this.treeSet.size; i++) {
    arr.push({ id: querycontexts[i].id, timestamp: querycontexts[i].timestamp, priority: querycontexts[i].priority, context: querycontexts[i].context || null });
  }

  return {
    entries: arr
  };
};

module.exports = QueryContextCache;
