// src/index.ts
import { Keyv as Keyv2 } from "keyv";
import { Hookified as Hookified2 } from "hookified";

// src/shorthand-time.ts
var shorthandToMilliseconds = (shorthand) => {
  let milliseconds;
  if (shorthand === void 0) {
    return void 0;
  }
  if (typeof shorthand === "number") {
    milliseconds = shorthand;
  } else if (typeof shorthand === "string") {
    shorthand = shorthand.trim();
    if (Number.isNaN(Number(shorthand))) {
      const match = /^([\d.]+)\s*(ms|s|m|h|hr|d)$/i.exec(shorthand);
      if (!match) {
        throw new Error(`Unsupported time format: "${shorthand}". Use 'ms', 's', 'm', 'h', 'hr', or 'd'.`);
      }
      const [, value, unit] = match;
      const numericValue = Number.parseFloat(value);
      const unitLower = unit.toLowerCase();
      switch (unitLower) {
        case "ms": {
          milliseconds = numericValue;
          break;
        }
        case "s": {
          milliseconds = numericValue * 1e3;
          break;
        }
        case "m": {
          milliseconds = numericValue * 1e3 * 60;
          break;
        }
        case "h": {
          milliseconds = numericValue * 1e3 * 60 * 60;
          break;
        }
        case "hr": {
          milliseconds = numericValue * 1e3 * 60 * 60;
          break;
        }
        case "d": {
          milliseconds = numericValue * 1e3 * 60 * 60 * 24;
          break;
        }
        /* c8 ignore next 3 */
        default: {
          milliseconds = Number(shorthand);
        }
      }
    } else {
      milliseconds = Number(shorthand);
    }
  } else {
    throw new TypeError("Time must be a string or a number.");
  }
  return milliseconds;
};
var shorthandToTime = (shorthand, fromDate) => {
  fromDate ??= /* @__PURE__ */ new Date();
  const milliseconds = shorthandToMilliseconds(shorthand);
  if (milliseconds === void 0) {
    return fromDate.getTime();
  }
  return fromDate.getTime() + milliseconds;
};

// src/keyv-memory.ts
import {
  Keyv
} from "keyv";

// src/memory.ts
import { Hookified } from "hookified";

// src/hash.ts
import * as crypto from "crypto";
function hash(object, algorithm = "sha256") {
  const objectString = JSON.stringify(object);
  if (!crypto.getHashes().includes(algorithm)) {
    throw new Error(`Unsupported hash algorithm: '${algorithm}'`);
  }
  const hasher = crypto.createHash(algorithm);
  hasher.update(objectString);
  return hasher.digest("hex");
}
function hashToNumber(object, min = 0, max = 10, algorithm = "sha256") {
  const objectString = JSON.stringify(object);
  if (!crypto.getHashes().includes(algorithm)) {
    throw new Error(`Unsupported hash algorithm: '${algorithm}'`);
  }
  const hasher = crypto.createHash(algorithm);
  hasher.update(objectString);
  const hashHex = hasher.digest("hex");
  const hashNumber = Number.parseInt(hashHex, 16);
  const range = max - min + 1;
  return min + hashNumber % range;
}
function djb2Hash(string_, min = 0, max = 10) {
  let hash2 = 5381;
  for (let i = 0; i < string_.length; i++) {
    hash2 = hash2 * 33 ^ string_.charCodeAt(i);
  }
  const range = max - min + 1;
  return min + Math.abs(hash2) % range;
}

// src/coalesce-async.ts
var callbacks = /* @__PURE__ */ new Map();
function hasKey(key) {
  return callbacks.has(key);
}
function addKey(key) {
  callbacks.set(key, []);
}
function removeKey(key) {
  callbacks.delete(key);
}
function addCallbackToKey(key, callback) {
  const stash = getCallbacksByKey(key);
  stash.push(callback);
  callbacks.set(key, stash);
}
function getCallbacksByKey(key) {
  return callbacks.get(key) ?? [];
}
async function enqueue(key) {
  return new Promise((resolve, reject) => {
    const callback = { resolve, reject };
    addCallbackToKey(key, callback);
  });
}
function dequeue(key) {
  const stash = getCallbacksByKey(key);
  removeKey(key);
  return stash;
}
function coalesce(options) {
  const { key, error, result } = options;
  for (const callback of dequeue(key)) {
    if (error) {
      callback.reject(error);
    } else {
      callback.resolve(result);
    }
  }
}
async function coalesceAsync(key, fnc) {
  if (!hasKey(key)) {
    addKey(key);
    try {
      const result = await Promise.resolve(fnc());
      coalesce({ key, result });
      return result;
    } catch (error) {
      coalesce({ key, error });
      throw error;
    }
  }
  return enqueue(key);
}

// src/wrap.ts
function wrapSync(function_, options) {
  const { ttl, keyPrefix, cache } = options;
  return function(...arguments_) {
    let cacheKey = createWrapKey(function_, arguments_, keyPrefix);
    if (options.createKey) {
      cacheKey = options.createKey(function_, arguments_, options);
    }
    let value = cache.get(cacheKey);
    if (value === void 0) {
      try {
        value = function_(...arguments_);
        cache.set(cacheKey, value, ttl);
      } catch (error) {
        cache.emit("error", error);
        if (options.cacheErrors) {
          cache.set(cacheKey, error, ttl);
        }
      }
    }
    return value;
  };
}
async function getOrSet(key, function_, options) {
  const keyString = typeof key === "function" ? key(options) : key;
  let value = await options.cache.get(keyString);
  if (value === void 0) {
    const cacheId = options.cacheId ?? "default";
    const coalesceKey = `${cacheId}::${keyString}`;
    value = await coalesceAsync(coalesceKey, async () => {
      try {
        const result = await function_();
        await options.cache.set(keyString, result, options.ttl);
        return result;
      } catch (error) {
        options.cache.emit("error", error);
        if (options.cacheErrors) {
          await options.cache.set(keyString, error, options.ttl);
        }
        if (options.throwErrors) {
          throw error;
        }
      }
    });
  }
  return value;
}
function wrap(function_, options) {
  const { keyPrefix, cache } = options;
  return async function(...arguments_) {
    let cacheKey = createWrapKey(function_, arguments_, keyPrefix);
    if (options.createKey) {
      cacheKey = options.createKey(function_, arguments_, options);
    }
    return cache.getOrSet(cacheKey, async () => function_(...arguments_), options);
  };
}
function createWrapKey(function_, arguments_, keyPrefix) {
  if (!keyPrefix) {
    return `${function_.name}::${hash(arguments_)}`;
  }
  return `${keyPrefix}::${function_.name}::${hash(arguments_)}`;
}

// src/memory-lru.ts
var ListNode = class {
  // eslint-disable-next-line @typescript-eslint/parameter-properties
  value;
  prev = void 0;
  next = void 0;
  constructor(value) {
    this.value = value;
  }
};
var DoublyLinkedList = class {
  head = void 0;
  tail = void 0;
  nodesMap = /* @__PURE__ */ new Map();
  // Add a new node to the front (most recently used)
  addToFront(value) {
    const newNode = new ListNode(value);
    if (this.head) {
      newNode.next = this.head;
      this.head.prev = newNode;
      this.head = newNode;
    } else {
      this.head = this.tail = newNode;
    }
    this.nodesMap.set(value, newNode);
  }
  // Move an existing node to the front (most recently used)
  moveToFront(value) {
    const node = this.nodesMap.get(value);
    if (!node || this.head === node) {
      return;
    }
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
    if (node === this.tail) {
      this.tail = node.prev;
    }
    node.prev = void 0;
    node.next = this.head;
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    this.tail ??= node;
  }
  // Get the oldest node (tail)
  getOldest() {
    return this.tail ? this.tail.value : void 0;
  }
  // Remove the oldest node (tail)
  removeOldest() {
    if (!this.tail) {
      return void 0;
    }
    const oldValue = this.tail.value;
    if (this.tail.prev) {
      this.tail = this.tail.prev;
      this.tail.next = void 0;
    } else {
      this.head = this.tail = void 0;
    }
    this.nodesMap.delete(oldValue);
    return oldValue;
  }
  get size() {
    return this.nodesMap.size;
  }
};

// src/memory.ts
var defaultStoreHashSize = 16;
var maximumMapSize = 16777216;
var CacheableMemory = class extends Hookified {
  _lru = new DoublyLinkedList();
  _storeHashSize = defaultStoreHashSize;
  _storeHashAlgorithm = "djb2Hash" /* djb2Hash */;
  // Default is djb2Hash
  _store = Array.from({ length: this._storeHashSize }, () => /* @__PURE__ */ new Map());
  _ttl;
  // Turned off by default
  _useClone = true;
  // Turned on by default
  _lruSize = 0;
  // Turned off by default
  _checkInterval = 0;
  // Turned off by default
  _interval = 0;
  // Turned off by default
  /**
   * @constructor
   * @param {CacheableMemoryOptions} [options] - The options for the CacheableMemory
   */
  constructor(options) {
    super();
    if (options?.ttl) {
      this.setTtl(options.ttl);
    }
    if (options?.useClone !== void 0) {
      this._useClone = options.useClone;
    }
    if (options?.storeHashSize && options.storeHashSize > 0) {
      this._storeHashSize = options.storeHashSize;
    }
    if (options?.lruSize) {
      if (options.lruSize > maximumMapSize) {
        this.emit("error", new Error(`LRU size cannot be larger than ${maximumMapSize} due to Map limitations.`));
      } else {
        this._lruSize = options.lruSize;
      }
    }
    if (options?.checkInterval) {
      this._checkInterval = options.checkInterval;
    }
    if (options?.storeHashAlgorithm) {
      this._storeHashAlgorithm = options.storeHashAlgorithm;
    }
    this._store = Array.from({ length: this._storeHashSize }, () => /* @__PURE__ */ new Map());
    this.startIntervalCheck();
  }
  /**
   * Gets the time-to-live
   * @returns {number|string|undefined} - The time-to-live in miliseconds or a human-readable format. If undefined, it will not have a time-to-live.
   */
  get ttl() {
    return this._ttl;
  }
  /**
   * Sets the time-to-live
   * @param {number|string|undefined} value - The time-to-live in miliseconds or a human-readable format (example '1s' = 1 second, '1h' = 1 hour). If undefined, it will not have a time-to-live.
   */
  set ttl(value) {
    this.setTtl(value);
  }
  /**
   * Gets whether to use clone
   * @returns {boolean} - If true, it will clone the value before returning it. If false, it will return the value directly. Default is true.
   */
  get useClone() {
    return this._useClone;
  }
  /**
   * Sets whether to use clone
   * @param {boolean} value - If true, it will clone the value before returning it. If false, it will return the value directly. Default is true.
   */
  set useClone(value) {
    this._useClone = value;
  }
  /**
   * Gets the size of the LRU cache
   * @returns {number} - The size of the LRU cache. If set to 0, it will not use LRU cache. Default is 0. If you are using LRU then the limit is based on Map() size 17mm.
   */
  get lruSize() {
    return this._lruSize;
  }
  /**
   * Sets the size of the LRU cache
   * @param {number} value - The size of the LRU cache. If set to 0, it will not use LRU cache. Default is 0. If you are using LRU then the limit is based on Map() size 17mm.
   */
  set lruSize(value) {
    if (value > maximumMapSize) {
      this.emit("error", new Error(`LRU size cannot be larger than ${maximumMapSize} due to Map limitations.`));
      return;
    }
    this._lruSize = value;
    if (this._lruSize === 0) {
      this._lru = new DoublyLinkedList();
      return;
    }
    this.lruResize();
  }
  /**
   * Gets the check interval
   * @returns {number} - The interval to check for expired items. If set to 0, it will not check for expired items. Default is 0.
   */
  get checkInterval() {
    return this._checkInterval;
  }
  /**
   * Sets the check interval
   * @param {number} value - The interval to check for expired items. If set to 0, it will not check for expired items. Default is 0.
   */
  set checkInterval(value) {
    this._checkInterval = value;
  }
  /**
   * Gets the size of the cache
   * @returns {number} - The size of the cache
   */
  get size() {
    let size = 0;
    for (const store of this._store) {
      size += store.size;
    }
    return size;
  }
  /**
   * Gets the number of hash stores
   * @returns {number} - The number of hash stores
   */
  get storeHashSize() {
    return this._storeHashSize;
  }
  /**
   * Sets the number of hash stores. This will recreate the store and all data will be cleared
   * @param {number} value - The number of hash stores
   */
  set storeHashSize(value) {
    if (value === this._storeHashSize) {
      return;
    }
    this._storeHashSize = value;
    this._store = Array.from({ length: this._storeHashSize }, () => /* @__PURE__ */ new Map());
  }
  /**
   * Gets the store hash algorithm
   * @returns {StoreHashAlgorithm | StoreHashAlgorithmFunction} - The store hash algorithm
   */
  get storeHashAlgorithm() {
    return this._storeHashAlgorithm;
  }
  /**
   * Sets the store hash algorithm. This will recreate the store and all data will be cleared
   * @param {StoreHashAlgorithm | StoreHashAlgorithmFunction} value - The store hash algorithm
   */
  set storeHashAlgorithm(value) {
    this._storeHashAlgorithm = value;
  }
  /**
   * Gets the keys
   * @returns {IterableIterator<string>} - The keys
   */
  get keys() {
    const keys = new Array();
    for (const store of this._store) {
      for (const key of store.keys()) {
        const item = store.get(key);
        if (item && this.hasExpired(item)) {
          store.delete(key);
          continue;
        }
        keys.push(key);
      }
    }
    return keys.values();
  }
  /**
   * Gets the items
   * @returns {IterableIterator<CacheableStoreItem>} - The items
   */
  get items() {
    const items = new Array();
    for (const store of this._store) {
      for (const item of store.values()) {
        if (this.hasExpired(item)) {
          store.delete(item.key);
          continue;
        }
        items.push(item);
      }
    }
    return items.values();
  }
  /**
   * Gets the store
   * @returns {Array<Map<string, CacheableStoreItem>>} - The store
   */
  get store() {
    return this._store;
  }
  /**
   * Gets the value of the key
   * @param {string} key - The key to get the value
   * @returns {T | undefined} - The value of the key
   */
  get(key) {
    const store = this.getStore(key);
    const item = store.get(key);
    if (!item) {
      return void 0;
    }
    if (item.expires && Date.now() > item.expires) {
      store.delete(key);
      return void 0;
    }
    this.lruMoveToFront(key);
    if (!this._useClone) {
      return item.value;
    }
    return this.clone(item.value);
  }
  /**
   * Gets the values of the keys
   * @param {string[]} keys - The keys to get the values
   * @returns {T[]} - The values of the keys
   */
  getMany(keys) {
    const result = new Array();
    for (const key of keys) {
      result.push(this.get(key));
    }
    return result;
  }
  /**
   * Gets the raw value of the key
   * @param {string} key - The key to get the value
   * @returns {CacheableStoreItem | undefined} - The raw value of the key
   */
  getRaw(key) {
    const store = this.getStore(key);
    const item = store.get(key);
    if (!item) {
      return void 0;
    }
    if (item.expires && item.expires && Date.now() > item.expires) {
      store.delete(key);
      return void 0;
    }
    this.lruMoveToFront(key);
    return item;
  }
  /**
   * Gets the raw values of the keys
   * @param {string[]} keys - The keys to get the values
   * @returns {CacheableStoreItem[]} - The raw values of the keys
   */
  getManyRaw(keys) {
    const result = new Array();
    for (const key of keys) {
      result.push(this.getRaw(key));
    }
    return result;
  }
  /**
   * Sets the value of the key
   * @param {string} key - The key to set the value
   * @param {any} value - The value to set
   * @param {number|string|SetOptions} [ttl] - Time to Live - If you set a number it is miliseconds, if you set a string it is a human-readable.
   * If you want to set expire directly you can do that by setting the expire property in the SetOptions.
   * If you set undefined, it will use the default time-to-live. If both are undefined then it will not have a time-to-live.
   * @returns {void}
   */
  set(key, value, ttl) {
    const store = this.getStore(key);
    let expires;
    if (ttl !== void 0 || this._ttl !== void 0) {
      if (typeof ttl === "object") {
        if (ttl.expire) {
          expires = typeof ttl.expire === "number" ? ttl.expire : ttl.expire.getTime();
        }
        if (ttl.ttl) {
          const finalTtl = shorthandToTime(ttl.ttl);
          if (finalTtl !== void 0) {
            expires = finalTtl;
          }
        }
      } else {
        const finalTtl = shorthandToTime(ttl ?? this._ttl);
        if (finalTtl !== void 0) {
          expires = finalTtl;
        }
      }
    }
    if (this._lruSize > 0) {
      if (store.has(key)) {
        this.lruMoveToFront(key);
      } else {
        this.lruAddToFront(key);
        if (this._lru.size > this._lruSize) {
          const oldestKey = this._lru.getOldest();
          if (oldestKey) {
            this._lru.removeOldest();
            this.delete(oldestKey);
          }
        }
      }
    }
    const item = { key, value, expires };
    store.set(
      key,
      item
    );
  }
  /**
   * Sets the values of the keys
   * @param {CacheableItem[]} items - The items to set
   * @returns {void}
   */
  setMany(items) {
    for (const item of items) {
      this.set(item.key, item.value, item.ttl);
    }
  }
  /**
   * Checks if the key exists
   * @param {string} key - The key to check
   * @returns {boolean} - If true, the key exists. If false, the key does not exist.
   */
  has(key) {
    const item = this.get(key);
    return Boolean(item);
  }
  /**
   * @function hasMany
   * @param {string[]} keys - The keys to check
   * @returns {boolean[]} - If true, the key exists. If false, the key does not exist.
   */
  hasMany(keys) {
    const result = new Array();
    for (const key of keys) {
      const item = this.get(key);
      result.push(Boolean(item));
    }
    return result;
  }
  /**
   * Take will get the key and delete the entry from cache
   * @param {string} key - The key to take
   * @returns {T | undefined} - The value of the key
   */
  take(key) {
    const item = this.get(key);
    if (!item) {
      return void 0;
    }
    this.delete(key);
    return item;
  }
  /**
   * TakeMany will get the keys and delete the entries from cache
   * @param {string[]} keys - The keys to take
   * @returns {T[]} - The values of the keys
   */
  takeMany(keys) {
    const result = new Array();
    for (const key of keys) {
      result.push(this.take(key));
    }
    return result;
  }
  /**
   * Delete the key
   * @param {string} key - The key to delete
   * @returns {void}
   */
  delete(key) {
    const store = this.getStore(key);
    store.delete(key);
  }
  /**
   * Delete the keys
   * @param {string[]} keys - The keys to delete
   * @returns {void}
   */
  deleteMany(keys) {
    for (const key of keys) {
      this.delete(key);
    }
  }
  /**
   * Clear the cache
   * @returns {void}
   */
  clear() {
    this._store = Array.from({ length: this._storeHashSize }, () => /* @__PURE__ */ new Map());
    this._lru = new DoublyLinkedList();
  }
  /**
   * Get the store based on the key (internal use)
   * @param {string} key - The key to get the store
   * @returns {CacheableHashStore} - The store
   */
  getStore(key) {
    const hash2 = this.getKeyStoreHash(key);
    this._store[hash2] ||= /* @__PURE__ */ new Map();
    return this._store[hash2];
  }
  /**
   * Hash the key for which store to go to (internal use)
   * @param {string} key - The key to hash
   * Available algorithms are: SHA256, SHA1, MD5, and djb2Hash.
   * @returns {number} - The hashed key as a number
   */
  getKeyStoreHash(key) {
    if (this._store.length === 1) {
      return 0;
    }
    if (this._storeHashAlgorithm === "djb2Hash" /* djb2Hash */) {
      return djb2Hash(key, 0, this._storeHashSize);
    }
    if (typeof this._storeHashAlgorithm === "function") {
      return this._storeHashAlgorithm(key, this._storeHashSize);
    }
    return hashToNumber(key, 0, this._storeHashSize, this._storeHashAlgorithm);
  }
  /**
   * Clone the value. This is for internal use
   * @param {any} value - The value to clone
   * @returns {any} - The cloned value
   */
  clone(value) {
    if (this.isPrimitive(value)) {
      return value;
    }
    return structuredClone(value);
  }
  /**
   * Add to the front of the LRU cache. This is for internal use
   * @param {string} key - The key to add to the front
   * @returns {void}
   */
  lruAddToFront(key) {
    if (this._lruSize === 0) {
      return;
    }
    this._lru.addToFront(key);
  }
  /**
   * Move to the front of the LRU cache. This is for internal use
   * @param {string} key - The key to move to the front
   * @returns {void}
   */
  lruMoveToFront(key) {
    if (this._lruSize === 0) {
      return;
    }
    this._lru.moveToFront(key);
  }
  /**
   * Resize the LRU cache. This is for internal use.
   * @returns {void}
   */
  lruResize() {
    while (this._lru.size > this._lruSize) {
      const oldestKey = this._lru.getOldest();
      if (oldestKey) {
        this._lru.removeOldest();
        this.delete(oldestKey);
      }
    }
  }
  /**
   * Check for expiration. This is for internal use
   * @returns {void}
   */
  checkExpiration() {
    for (const store of this._store) {
      for (const item of store.values()) {
        if (item.expires && Date.now() > item.expires) {
          store.delete(item.key);
        }
      }
    }
  }
  /**
   * Start the interval check. This is for internal use
   * @returns {void}
   */
  startIntervalCheck() {
    if (this._checkInterval > 0) {
      if (this._interval) {
        clearInterval(this._interval);
      }
      this._interval = setInterval(() => {
        this.checkExpiration();
      }, this._checkInterval).unref();
    }
  }
  /**
   * Stop the interval check. This is for internal use
   * @returns {void}
   */
  stopIntervalCheck() {
    if (this._interval) {
      clearInterval(this._interval);
    }
    this._interval = 0;
    this._checkInterval = 0;
  }
  /**
   * Wrap the function for caching
   * @param {Function} function_ - The function to wrap
   * @param {Object} [options] - The options to wrap
   * @returns {Function} - The wrapped function
   */
  wrap(function_, options) {
    const wrapOptions = {
      ttl: options?.ttl ?? this._ttl,
      keyPrefix: options?.keyPrefix,
      cache: this
    };
    return wrapSync(function_, wrapOptions);
  }
  isPrimitive(value) {
    const result = false;
    if (value === null || value === void 0) {
      return true;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return true;
    }
    return result;
  }
  setTtl(ttl) {
    if (typeof ttl === "string" || ttl === void 0) {
      this._ttl = ttl;
    } else if (ttl > 0) {
      this._ttl = ttl;
    } else {
      this._ttl = void 0;
    }
  }
  hasExpired(item) {
    if (item.expires && Date.now() > item.expires) {
      return true;
    }
    return false;
  }
};

// src/keyv-memory.ts
var KeyvCacheableMemory = class {
  opts = {
    ttl: 0,
    useClone: true,
    lruSize: 0,
    checkInterval: 0
  };
  _defaultCache = new CacheableMemory();
  _nCache = /* @__PURE__ */ new Map();
  _namespace;
  constructor(options) {
    if (options) {
      this.opts = options;
      this._defaultCache = new CacheableMemory(options);
      if (options.namespace) {
        this._namespace = options.namespace;
        this._nCache.set(this._namespace, new CacheableMemory(options));
      }
    }
  }
  get namespace() {
    return this._namespace;
  }
  set namespace(value) {
    this._namespace = value;
  }
  get store() {
    return this.getStore(this._namespace);
  }
  async get(key) {
    const result = this.getStore(this._namespace).get(key);
    if (result) {
      return result;
    }
    return void 0;
  }
  async getMany(keys) {
    const result = this.getStore(this._namespace).getMany(keys);
    return result;
  }
  async set(key, value, ttl) {
    this.getStore(this._namespace).set(key, value, ttl);
  }
  async setMany(values) {
    this.getStore(this._namespace).setMany(values);
  }
  async delete(key) {
    this.getStore(this._namespace).delete(key);
    return true;
  }
  async deleteMany(key) {
    this.getStore(this._namespace).deleteMany(key);
    return true;
  }
  async clear() {
    this.getStore(this._namespace).clear();
  }
  async has(key) {
    return this.getStore(this._namespace).has(key);
  }
  on(event, listener) {
    this.getStore(this._namespace).on(event, listener);
    return this;
  }
  getStore(namespace) {
    if (!namespace) {
      return this._defaultCache;
    }
    if (!this._nCache.has(namespace)) {
      this._nCache.set(namespace, new CacheableMemory(this.opts));
    }
    return this._nCache.get(namespace);
  }
};
function createKeyv(options) {
  const store = new KeyvCacheableMemory(options);
  const namespace = options?.namespace;
  let ttl;
  if (options?.ttl && Number.isInteger(options.ttl)) {
    ttl = options?.ttl;
  }
  const keyv = new Keyv({ store, namespace, ttl });
  keyv.serialize = void 0;
  keyv.deserialize = void 0;
  return keyv;
}

// src/stats.ts
var CacheableStats = class {
  _hits = 0;
  _misses = 0;
  _gets = 0;
  _sets = 0;
  _deletes = 0;
  _clears = 0;
  _vsize = 0;
  _ksize = 0;
  _count = 0;
  _enabled = false;
  constructor(options) {
    if (options?.enabled) {
      this._enabled = options.enabled;
    }
  }
  /**
   * @returns {boolean} - Whether the stats are enabled
   */
  get enabled() {
    return this._enabled;
  }
  /**
   * @param {boolean} enabled - Whether to enable the stats
   */
  set enabled(enabled) {
    this._enabled = enabled;
  }
  /**
   * @returns {number} - The number of hits
   * @readonly
   */
  get hits() {
    return this._hits;
  }
  /**
   * @returns {number} - The number of misses
   * @readonly
   */
  get misses() {
    return this._misses;
  }
  /**
   * @returns {number} - The number of gets
   * @readonly
   */
  get gets() {
    return this._gets;
  }
  /**
   * @returns {number} - The number of sets
   * @readonly
   */
  get sets() {
    return this._sets;
  }
  /**
   * @returns {number} - The number of deletes
   * @readonly
   */
  get deletes() {
    return this._deletes;
  }
  /**
   * @returns {number} - The number of clears
   * @readonly
   */
  get clears() {
    return this._clears;
  }
  /**
   * @returns {number} - The vsize (value size) of the cache instance
   * @readonly
   */
  get vsize() {
    return this._vsize;
  }
  /**
   * @returns {number} - The ksize (key size) of the cache instance
   * @readonly
   */
  get ksize() {
    return this._ksize;
  }
  /**
   * @returns {number} - The count of the cache instance
   * @readonly
   */
  get count() {
    return this._count;
  }
  incrementHits() {
    if (!this._enabled) {
      return;
    }
    this._hits++;
  }
  incrementMisses() {
    if (!this._enabled) {
      return;
    }
    this._misses++;
  }
  incrementGets() {
    if (!this._enabled) {
      return;
    }
    this._gets++;
  }
  incrementSets() {
    if (!this._enabled) {
      return;
    }
    this._sets++;
  }
  incrementDeletes() {
    if (!this._enabled) {
      return;
    }
    this._deletes++;
  }
  incrementClears() {
    if (!this._enabled) {
      return;
    }
    this._clears++;
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  incrementVSize(value) {
    if (!this._enabled) {
      return;
    }
    this._vsize += this.roughSizeOfObject(value);
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  decreaseVSize(value) {
    if (!this._enabled) {
      return;
    }
    this._vsize -= this.roughSizeOfObject(value);
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  incrementKSize(key) {
    if (!this._enabled) {
      return;
    }
    this._ksize += this.roughSizeOfString(key);
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  decreaseKSize(key) {
    if (!this._enabled) {
      return;
    }
    this._ksize -= this.roughSizeOfString(key);
  }
  incrementCount() {
    if (!this._enabled) {
      return;
    }
    this._count++;
  }
  decreaseCount() {
    if (!this._enabled) {
      return;
    }
    this._count--;
  }
  setCount(count) {
    if (!this._enabled) {
      return;
    }
    this._count = count;
  }
  roughSizeOfString(value) {
    return value.length * 2;
  }
  roughSizeOfObject(object) {
    const objectList = [];
    const stack = [object];
    let bytes = 0;
    while (stack.length > 0) {
      const value = stack.pop();
      if (typeof value === "boolean") {
        bytes += 4;
      } else if (typeof value === "string") {
        bytes += value.length * 2;
      } else if (typeof value === "number") {
        bytes += 8;
      } else if (typeof value === "object" && value !== null && !objectList.includes(value)) {
        objectList.push(value);
        for (const key in value) {
          bytes += key.length * 2;
          stack.push(value[key]);
        }
      }
    }
    return bytes;
  }
  reset() {
    this._hits = 0;
    this._misses = 0;
    this._gets = 0;
    this._sets = 0;
    this._deletes = 0;
    this._clears = 0;
    this._vsize = 0;
    this._ksize = 0;
    this._count = 0;
  }
  resetStoreValues() {
    this._vsize = 0;
    this._ksize = 0;
    this._count = 0;
  }
};

// src/ttl.ts
function getTtlFromExpires(expires) {
  if (expires === void 0 || expires === null) {
    return void 0;
  }
  const now = Date.now();
  if (expires < now) {
    return void 0;
  }
  return expires - now;
}
function getCascadingTtl(cacheableTtl, primaryTtl, secondaryTtl) {
  return secondaryTtl ?? primaryTtl ?? shorthandToMilliseconds(cacheableTtl);
}
function calculateTtlFromExpiration(ttl, expires) {
  const ttlFromExpires = getTtlFromExpires(expires);
  const expiresFromTtl = ttl ? Date.now() + ttl : void 0;
  if (ttlFromExpires === void 0) {
    return ttl;
  }
  if (expiresFromTtl === void 0) {
    return ttlFromExpires;
  }
  if (expires > expiresFromTtl) {
    return ttl;
  }
  return ttlFromExpires;
}

// src/index.ts
import {
  KeyvHooks,
  Keyv as Keyv3
} from "keyv";
var CacheableHooks = /* @__PURE__ */ ((CacheableHooks2) => {
  CacheableHooks2["BEFORE_SET"] = "BEFORE_SET";
  CacheableHooks2["AFTER_SET"] = "AFTER_SET";
  CacheableHooks2["BEFORE_SET_MANY"] = "BEFORE_SET_MANY";
  CacheableHooks2["AFTER_SET_MANY"] = "AFTER_SET_MANY";
  CacheableHooks2["BEFORE_GET"] = "BEFORE_GET";
  CacheableHooks2["AFTER_GET"] = "AFTER_GET";
  CacheableHooks2["BEFORE_GET_MANY"] = "BEFORE_GET_MANY";
  CacheableHooks2["AFTER_GET_MANY"] = "AFTER_GET_MANY";
  CacheableHooks2["BEFORE_SECONDARY_SETS_PRIMARY"] = "BEFORE_SECONDARY_SETS_PRIMARY";
  return CacheableHooks2;
})(CacheableHooks || {});
var CacheableEvents = /* @__PURE__ */ ((CacheableEvents2) => {
  CacheableEvents2["ERROR"] = "error";
  return CacheableEvents2;
})(CacheableEvents || {});
var Cacheable = class extends Hookified2 {
  _primary = createKeyv();
  _secondary;
  _nonBlocking = false;
  _ttl;
  _stats = new CacheableStats({ enabled: false });
  _namespace;
  _cacheId = Math.random().toString(36).slice(2);
  /**
   * Creates a new cacheable instance
   * @param {CacheableOptions} [options] The options for the cacheable instance
   */
  constructor(options) {
    super();
    if (options?.primary) {
      this.setPrimary(options.primary);
    }
    if (options?.secondary) {
      this.setSecondary(options.secondary);
    }
    if (options?.nonBlocking) {
      this._nonBlocking = options.nonBlocking;
    }
    if (options?.stats) {
      this._stats.enabled = options.stats;
    }
    if (options?.ttl) {
      this.setTtl(options.ttl);
    }
    if (options?.cacheId) {
      this._cacheId = options.cacheId;
    }
    if (options?.namespace) {
      this._namespace = options.namespace;
      this._primary.namespace = this.getNameSpace();
      if (this._secondary) {
        this._secondary.namespace = this.getNameSpace();
      }
    }
  }
  /**
   * The namespace for the cacheable instance
   * @returns {string | (() => string) | undefined} The namespace for the cacheable instance
   */
  get namespace() {
    return this._namespace;
  }
  /**
   * Sets the namespace for the cacheable instance
   * @param {string | (() => string) | undefined} namespace The namespace for the cacheable instance
   * @returns {void}
   */
  set namespace(namespace) {
    this._namespace = namespace;
    this._primary.namespace = this.getNameSpace();
    if (this._secondary) {
      this._secondary.namespace = this.getNameSpace();
    }
  }
  /**
   * The statistics for the cacheable instance
   * @returns {CacheableStats} The statistics for the cacheable instance
   */
  get stats() {
    return this._stats;
  }
  /**
   * The primary store for the cacheable instance
   * @returns {Keyv} The primary store for the cacheable instance
   */
  get primary() {
    return this._primary;
  }
  /**
   * Sets the primary store for the cacheable instance
   * @param {Keyv} primary The primary store for the cacheable instance
   */
  set primary(primary) {
    this._primary = primary;
  }
  /**
   * The secondary store for the cacheable instance
   * @returns {Keyv | undefined} The secondary store for the cacheable instance
   */
  get secondary() {
    return this._secondary;
  }
  /**
   * Sets the secondary store for the cacheable instance. If it is set to undefined then the secondary store is disabled.
   * @param {Keyv | undefined} secondary The secondary store for the cacheable instance
   * @returns {void}
   */
  set secondary(secondary) {
    this._secondary = secondary;
  }
  /**
   * Gets whether the secondary store is non-blocking mode. It is set to false by default.
   * If it is set to true then the secondary store will not block the primary store.
   *
   * [Learn more about non-blocking mode](https://cacheable.org/docs/cacheable/#non-blocking-operations).
   *
   * @returns {boolean} Whether the cacheable instance is non-blocking
   */
  get nonBlocking() {
    return this._nonBlocking;
  }
  /**
   * Sets whether the secondary store is non-blocking mode. It is set to false by default.
   * If it is set to true then the secondary store will not block the primary store.
   *
   * [Learn more about non-blocking mode](https://cacheable.org/docs/cacheable/#non-blocking-operations).
   *
   * @param {boolean} nonBlocking Whether the cacheable instance is non-blocking
   * @returns {void}
   */
  set nonBlocking(nonBlocking) {
    this._nonBlocking = nonBlocking;
  }
  /**
   * The time-to-live for the cacheable instance and will be used as the default value.
   * can be a number in milliseconds or a human-readable format such as `1s` for 1 second or `1h` for 1 hour
   * or undefined if there is no time-to-live.
   *
   * [Learn more about time-to-live](https://cacheable.org/docs/cacheable/#shorthand-for-time-to-live-ttl).
   *
   * @returns {number | string | undefined} The time-to-live for the cacheable instance in milliseconds, human-readable format or undefined
   * @example
   * ```typescript
   * const cacheable = new Cacheable({ ttl: '1h' });
   * console.log(cacheable.ttl); // 1h
   * ```
   */
  get ttl() {
    return this._ttl;
  }
  /**
   * Sets the time-to-live for the cacheable instance and will be used as the default value.
   * If you set a number it is miliseconds, if you set a string it is a human-readable
   * format such as `1s` for 1 second or `1h` for 1 hour. Setting undefined means that
   * there is no time-to-live.
   *
   * [Learn more about time-to-live](https://cacheable.org/docs/cacheable/#shorthand-for-time-to-live-ttl).
   *
   * @param {number | string | undefined} ttl The time-to-live for the cacheable instance
   * @example
   * ```typescript
   * const cacheable = new Cacheable();
   * cacheable.ttl = '1h'; // Set the time-to-live to 1 hour
   * ```
   * or setting the time-to-live in milliseconds
   * ```typescript
   * const cacheable = new Cacheable();
   * cacheable.ttl = 3600000; // Set the time-to-live to 1 hour
   * ```
   */
  set ttl(ttl) {
    this.setTtl(ttl);
  }
  /**
   * The cacheId for the cacheable instance. This is primarily used for the wrap function to not have conflicts.
   * If it is not set then it will be a random string that is generated
   * @returns {string} The cacheId for the cacheable instance
   */
  get cacheId() {
    return this._cacheId;
  }
  /**
   * Sets the cacheId for the cacheable instance. This is primarily used for the wrap function to not have conflicts.
   * If it is not set then it will be a random string that is generated
   * @param {string} cacheId The cacheId for the cacheable instance
   */
  set cacheId(cacheId) {
    this._cacheId = cacheId;
  }
  /**
   * Sets the primary store for the cacheable instance
   * @param {Keyv | KeyvStoreAdapter} primary The primary store for the cacheable instance
   * @returns {void}
   */
  setPrimary(primary) {
    if (this.isKeyvInstance(primary)) {
      this._primary = primary;
    } else {
      this._primary = new Keyv2(primary);
    }
    this._primary.on("error", (error) => {
      this.emit("error" /* ERROR */, error);
    });
  }
  /**
   * Sets the secondary store for the cacheable instance. If it is set to undefined then the secondary store is disabled.
   * @param {Keyv | KeyvStoreAdapter} secondary The secondary store for the cacheable instance
   * @returns {void}
   */
  setSecondary(secondary) {
    if (this.isKeyvInstance(secondary)) {
      this._secondary = secondary;
    } else {
      this._secondary = new Keyv2(secondary);
    }
    this._secondary.on("error", (error) => {
      this.emit("error" /* ERROR */, error);
    });
  }
  isKeyvInstance(keyv) {
    if (keyv instanceof Keyv2) {
      return true;
    }
    const keyvMethods = ["generateIterator", "get", "getMany", "set", "setMany", "delete", "deleteMany", "has", "hasMany", "clear", "disconnect", "serialize", "deserialize"];
    return keyvMethods.every((method) => typeof keyv[method] === "function");
  }
  getNameSpace() {
    if (typeof this._namespace === "function") {
      return this._namespace();
    }
    return this._namespace;
  }
  async get(key, options = {}) {
    let result;
    const { raw = false } = options;
    try {
      await this.hook("BEFORE_GET" /* BEFORE_GET */, key);
      result = await this._primary.get(key, { raw: true });
      let ttl;
      if (!result && this._secondary) {
        const secondaryResult = await this.getSecondaryRawResults(key);
        if (secondaryResult?.value) {
          result = secondaryResult;
          const cascadeTtl = getCascadingTtl(this._ttl, this._primary.ttl);
          const expires = secondaryResult.expires ?? void 0;
          ttl = calculateTtlFromExpiration(cascadeTtl, expires);
          const setItem = { key, value: result.value, ttl };
          await this.hook("BEFORE_SECONDARY_SETS_PRIMARY" /* BEFORE_SECONDARY_SETS_PRIMARY */, setItem);
          await this._primary.set(setItem.key, setItem.value, setItem.ttl);
        }
      }
      await this.hook("AFTER_GET" /* AFTER_GET */, { key, result, ttl });
    } catch (error) {
      this.emit("error" /* ERROR */, error);
    }
    if (this.stats.enabled) {
      if (result) {
        this._stats.incrementHits();
      } else {
        this._stats.incrementMisses();
      }
      this.stats.incrementGets();
    }
    return raw ? result : result?.value;
  }
  async getMany(keys, options = {}) {
    let result = [];
    const { raw = false } = options;
    try {
      await this.hook("BEFORE_GET_MANY" /* BEFORE_GET_MANY */, keys);
      result = await this._primary.get(keys, { raw: true });
      if (this._secondary) {
        const missingKeys = [];
        for (const [i, key] of keys.entries()) {
          if (!result[i]) {
            missingKeys.push(key);
          }
        }
        const secondaryResults = await this.getManySecondaryRawResults(missingKeys);
        for await (const [i, key] of keys.entries()) {
          if (!result[i] && secondaryResults[i]) {
            result[i] = secondaryResults[i];
            const cascadeTtl = getCascadingTtl(this._ttl, this._primary.ttl);
            let { expires } = secondaryResults[i];
            if (expires === null) {
              expires = void 0;
            }
            const ttl = calculateTtlFromExpiration(cascadeTtl, expires);
            const setItem = { key, value: result[i].value, ttl };
            await this.hook("BEFORE_SECONDARY_SETS_PRIMARY" /* BEFORE_SECONDARY_SETS_PRIMARY */, setItem);
            await this._primary.set(setItem.key, setItem.value, setItem.ttl);
          }
        }
      }
      await this.hook("AFTER_GET_MANY" /* AFTER_GET_MANY */, { keys, result });
    } catch (error) {
      this.emit("error" /* ERROR */, error);
    }
    if (this.stats.enabled) {
      for (const item of result) {
        if (item) {
          this._stats.incrementHits();
        } else {
          this._stats.incrementMisses();
        }
      }
      this.stats.incrementGets();
    }
    return raw ? result : result.map((item) => item?.value);
  }
  /**
   * Sets the value of the key. If the secondary store is set then it will also set the value in the secondary store.
   * @param {string} key the key to set the value of
   * @param {T} value The value to set
   * @param {number | string} [ttl] set a number it is miliseconds, set a string it is a human-readable
   * format such as `1s` for 1 second or `1h` for 1 hour. Setting undefined means that it will use the default time-to-live.
   * @returns {boolean} Whether the value was set
   */
  async set(key, value, ttl) {
    let result = false;
    const finalTtl = shorthandToMilliseconds(ttl ?? this._ttl);
    try {
      const item = { key, value, ttl: finalTtl };
      await this.hook("BEFORE_SET" /* BEFORE_SET */, item);
      const promises = [];
      promises.push(this._primary.set(item.key, item.value, item.ttl));
      if (this._secondary) {
        promises.push(this._secondary.set(item.key, item.value, item.ttl));
      }
      if (this._nonBlocking) {
        result = await Promise.race(promises);
      } else {
        const results = await Promise.all(promises);
        result = results[0];
      }
      await this.hook("AFTER_SET" /* AFTER_SET */, item);
    } catch (error) {
      this.emit("error" /* ERROR */, error);
    }
    if (this.stats.enabled) {
      this.stats.incrementKSize(key);
      this.stats.incrementCount();
      this.stats.incrementVSize(value);
      this.stats.incrementSets();
    }
    return result;
  }
  /**
   * Sets the values of the keys. If the secondary store is set then it will also set the values in the secondary store.
   * @param {CacheableItem[]} items The items to set
   * @returns {boolean} Whether the values were set
   */
  async setMany(items) {
    let result = false;
    try {
      await this.hook("BEFORE_SET_MANY" /* BEFORE_SET_MANY */, items);
      result = await this.setManyKeyv(this._primary, items);
      if (this._secondary) {
        if (this._nonBlocking) {
          this.setManyKeyv(this._secondary, items);
        } else {
          await this.setManyKeyv(this._secondary, items);
        }
      }
      await this.hook("AFTER_SET_MANY" /* AFTER_SET_MANY */, items);
    } catch (error) {
      this.emit("error" /* ERROR */, error);
    }
    if (this.stats.enabled) {
      for (const item of items) {
        this.stats.incrementKSize(item.key);
        this.stats.incrementCount();
        this.stats.incrementVSize(item.value);
      }
    }
    return result;
  }
  /**
   * Takes the value of the key and deletes the key. If the key does not exist then it will return undefined.
   * @param {string} key The key to take the value of
   * @returns {Promise<T | undefined>} The value of the key or undefined if the key does not exist
   */
  async take(key) {
    const result = await this.get(key);
    await this.delete(key);
    return result;
  }
  /**
   * Takes the values of the keys and deletes the keys. If the key does not exist then it will return undefined.
   * @param {string[]} keys The keys to take the values of
   * @returns {Promise<Array<T | undefined>>} The values of the keys or undefined if the key does not exist
   */
  async takeMany(keys) {
    const result = await this.getMany(keys);
    await this.deleteMany(keys);
    return result;
  }
  /**
   * Checks if the key exists in the primary store. If it does not exist then it will check the secondary store.
   * @param {string} key The key to check
   * @returns {Promise<boolean>} Whether the key exists
   */
  async has(key) {
    const promises = [];
    promises.push(this._primary.has(key));
    if (this._secondary) {
      promises.push(this._secondary.has(key));
    }
    const resultAll = await Promise.all(promises);
    for (const result of resultAll) {
      if (result) {
        return true;
      }
    }
    return false;
  }
  /**
   * Checks if the keys exist in the primary store. If it does not exist then it will check the secondary store.
   * @param {string[]} keys The keys to check
   * @returns {Promise<boolean[]>} Whether the keys exist
   */
  async hasMany(keys) {
    const result = await this.hasManyKeyv(this._primary, keys);
    const missingKeys = [];
    for (const [i, key] of keys.entries()) {
      if (!result[i] && this._secondary) {
        missingKeys.push(key);
      }
    }
    if (missingKeys.length > 0 && this._secondary) {
      const secondary = await this.hasManyKeyv(this._secondary, keys);
      for (const [i, key] of keys.entries()) {
        if (!result[i] && secondary[i]) {
          result[i] = secondary[i];
        }
      }
    }
    return result;
  }
  /**
   * Deletes the key from the primary store. If the secondary store is set then it will also delete the key from the secondary store.
   * @param {string} key The key to delete
   * @returns {Promise<boolean>} Whether the key was deleted
   */
  async delete(key) {
    let result = false;
    const promises = [];
    if (this.stats.enabled) {
      const statResult = await this._primary.get(key);
      if (statResult) {
        this.stats.decreaseKSize(key);
        this.stats.decreaseVSize(statResult);
        this.stats.decreaseCount();
        this.stats.incrementDeletes();
      }
    }
    promises.push(this._primary.delete(key));
    if (this._secondary) {
      promises.push(this._secondary.delete(key));
    }
    if (this.nonBlocking) {
      result = await Promise.race(promises);
    } else {
      const resultAll = await Promise.all(promises);
      result = resultAll[0];
    }
    return result;
  }
  /**
   * Deletes the keys from the primary store. If the secondary store is set then it will also delete the keys from the secondary store.
   * @param {string[]} keys The keys to delete
   * @returns {Promise<boolean>} Whether the keys were deleted
   */
  async deleteMany(keys) {
    if (this.stats.enabled) {
      const statResult = await this._primary.get(keys);
      for (const key of keys) {
        this.stats.decreaseKSize(key);
        this.stats.decreaseVSize(statResult);
        this.stats.decreaseCount();
        this.stats.incrementDeletes();
      }
    }
    const result = await this.deleteManyKeyv(this._primary, keys);
    if (this._secondary) {
      if (this._nonBlocking) {
        this.deleteManyKeyv(this._secondary, keys);
      } else {
        await this.deleteManyKeyv(this._secondary, keys);
      }
    }
    return result;
  }
  /**
   * Clears the primary store. If the secondary store is set then it will also clear the secondary store.
   * @returns {Promise<void>}
   */
  async clear() {
    const promises = [];
    promises.push(this._primary.clear());
    if (this._secondary) {
      promises.push(this._secondary.clear());
    }
    await (this._nonBlocking ? Promise.race(promises) : Promise.all(promises));
    if (this.stats.enabled) {
      this._stats.resetStoreValues();
      this._stats.incrementClears();
    }
  }
  /**
   * Disconnects the primary store. If the secondary store is set then it will also disconnect the secondary store.
   * @returns {Promise<void>}
   */
  async disconnect() {
    const promises = [];
    promises.push(this._primary.disconnect());
    if (this._secondary) {
      promises.push(this._secondary.disconnect());
    }
    await (this._nonBlocking ? Promise.race(promises) : Promise.all(promises));
  }
  /**
   * Wraps a function with caching
   *
   * [Learn more about wrapping functions](https://cacheable.org/docs/cacheable/#wrap--memoization-for-sync-and-async-functions).
   * @param {Function} function_ The function to wrap
   * @param {WrapOptions} [options] The options for the wrap function
   * @returns {Function} The wrapped function
   */
  wrap(function_, options) {
    const wrapOptions = {
      ttl: options?.ttl ?? this._ttl,
      keyPrefix: options?.keyPrefix,
      cache: this,
      cacheId: this._cacheId
    };
    return wrap(function_, wrapOptions);
  }
  /**
   * Retrieves the value associated with the given key from the cache. If the key is not found,
   * invokes the provided function to calculate the value, stores it in the cache, and then returns it.
   *
   * @param {GetOrSetKey} key - The key to retrieve or set in the cache. This can also be a function that returns a string key.
   * If a function is provided, it will be called with the cache options to generate the key.
   * @param {() => Promise<T>} function_ - The asynchronous function that computes the value to be cached if the key does not exist.
   * @param {GetOrSetFunctionOptions} [options] - Optional settings for caching, such as the time to live (TTL) or whether to cache errors.
   * @return {Promise<T | undefined>} - A promise that resolves to the cached or newly computed value, or undefined if an error occurs and caching is not configured for errors.
   */
  async getOrSet(key, function_, options) {
    const getOrSetOptions = {
      cache: this,
      cacheId: this._cacheId,
      ttl: options?.ttl ?? this._ttl,
      cacheErrors: options?.cacheErrors,
      throwErrors: options?.throwErrors
    };
    return getOrSet(key, function_, getOrSetOptions);
  }
  /**
   * Will hash an object using the specified algorithm. The default algorithm is 'sha256'.
   * @param {any} object the object to hash
   * @param {string} algorithm the hash algorithm to use. The default is 'sha256'
   * @returns {string} the hash of the object
   */
  hash(object, algorithm = "sha256") {
    return hash(object, algorithm);
  }
  async getSecondaryRawResults(key) {
    let result;
    if (this._secondary) {
      result = await this._secondary.get(key, { raw: true });
    }
    return result;
  }
  async getManySecondaryRawResults(keys) {
    let result = new Array();
    if (this._secondary) {
      result = await this._secondary.get(keys, { raw: true });
    }
    return result;
  }
  async deleteManyKeyv(keyv, keys) {
    const promises = [];
    for (const key of keys) {
      promises.push(keyv.delete(key));
    }
    await Promise.all(promises);
    return true;
  }
  async setManyKeyv(keyv, items) {
    const promises = [];
    for (const item of items) {
      const finalTtl = shorthandToMilliseconds(item.ttl ?? this._ttl);
      promises.push(keyv.set(item.key, item.value, finalTtl));
    }
    await Promise.all(promises);
    return true;
  }
  async hasManyKeyv(keyv, keys) {
    const promises = [];
    for (const key of keys) {
      promises.push(keyv.has(key));
    }
    return Promise.all(promises);
  }
  setTtl(ttl) {
    if (typeof ttl === "string" || ttl === void 0) {
      this._ttl = ttl;
    } else if (ttl > 0) {
      this._ttl = ttl;
    } else {
      this._ttl = void 0;
    }
  }
};
export {
  Cacheable,
  CacheableEvents,
  CacheableHooks,
  CacheableMemory,
  CacheableStats,
  Keyv3 as Keyv,
  KeyvCacheableMemory,
  KeyvHooks,
  createKeyv,
  getOrSet,
  shorthandToMilliseconds,
  shorthandToTime,
  wrap,
  wrapSync
};
