/* eslint-env browser */

/**
 * Helpers to work with IndexedDB.
 * This is an experimental implementation using Pledge instead of Promise.
 *
 * @experimental
 *
 * @module indexeddbv2
 */

import * as pledge from './pledge.js'

/* c8 ignore start */

/**
 * IDB Request to Pledge transformer
 *
 * @param {pledge.PledgeInstance<any>} p
 * @param {IDBRequest} request
 */
export const bindPledge = (p, request) => {
  // @ts-ignore
  request.onerror = event => p.cancel(event.target.error)
  // @ts-ignore
  request.onsuccess = event => p.resolve(event.target.result)
}

/**
 * @param {string} name
 * @param {function(IDBDatabase):any} initDB Called when the database is first created
 * @return {pledge.PledgeInstance<IDBDatabase>}
 */
export const openDB = (name, initDB) => {
  /**
   * @type {pledge.PledgeInstance<IDBDatabase>}
   */
  const p = pledge.create()
  const request = indexedDB.open(name)
  /**
   * @param {any} event
   */
  request.onupgradeneeded = event => initDB(event.target.result)
  /**
   * @param {any} event
   */
  request.onerror = event => p.cancel(event.target.error)
  /**
   * @param {any} event
   */
  request.onsuccess = event => {
    /**
     * @type {IDBDatabase}
     */
    const db = event.target.result
    db.onversionchange = () => { db.close() }
    p.resolve(db)
  }
  return p
}

/**
 * @param {pledge.Pledge<string>} name
 * @return {pledge.PledgeInstance<void>}
 */
export const deleteDB = name => pledge.createWithDependencies((p, name) => bindPledge(p, indexedDB.deleteDatabase(name)), name)

/**
 * @param {IDBDatabase} db
 * @param {Array<Array<string>|Array<string|IDBObjectStoreParameters|undefined>>} definitions
 */
export const createStores = (db, definitions) => definitions.forEach(d =>
  // @ts-ignore
  db.createObjectStore.apply(db, d)
)

/**
 * @param {pledge.Pledge<IDBDatabase>} db
 * @param {pledge.Pledge<Array<string>>} stores
 * @param {"readwrite"|"readonly"} [access]
 * @return {pledge.Pledge<Array<IDBObjectStore>>}
 */
export const transact = (db, stores, access = 'readwrite') => pledge.createWithDependencies((p, db, stores) => {
  const transaction = db.transaction(stores, access)
  p.resolve(stores.map(store => getStore(transaction, store)))
}, db, stores)

/**
 * @param {IDBObjectStore} store
 * @param {pledge.Pledge<IDBKeyRange|undefined>} [range]
 * @return {pledge.PledgeInstance<number>}
 */
export const count = (store, range) => pledge.createWithDependencies((p, store, range) => bindPledge(p, store.count(range)), store, range)

/**
 * @param {pledge.Pledge<IDBObjectStore>} store
 * @param {pledge.Pledge<String | number | ArrayBuffer | Date | Array<any>>} key
 * @return {pledge.PledgeInstance<String | number | ArrayBuffer | Date | Array<any>>}
 */
export const get = (store, key) => pledge.createWithDependencies((p, store, key) => bindPledge(p, store.get(key)), store, key)

/**
 * @param {pledge.Pledge<IDBObjectStore>} store
 * @param {String | number | ArrayBuffer | Date | IDBKeyRange | Array<any> } key
 */
export const del = (store, key) => pledge.createWithDependencies((p, store, key) => bindPledge(p, store.delete(key)), store, key)

/**
 * @param {pledge.Pledge<IDBObjectStore>} store
 * @param {String | number | ArrayBuffer | Date | boolean} item
 * @param {String | number | ArrayBuffer | Date | Array<any>} [key]
 */
export const put = (store, item, key) => pledge.createWithDependencies((p, store, item, key) => bindPledge(p, store.put(item, key)), store, item, key)

/**
 * @param {pledge.Pledge<IDBObjectStore>} store
 * @param {String | number | ArrayBuffer | Date | boolean}  item
 * @param {String | number | ArrayBuffer | Date | Array<any>}  key
 * @return {pledge.PledgeInstance<any>}
 */
export const add = (store, item, key) => pledge.createWithDependencies((p, store, item, key) => bindPledge(p, store.add(item, key)), store, item, key)

/**
 * @param {pledge.Pledge<IDBObjectStore>} store
 * @param {String | number | ArrayBuffer | Date}  item
 * @return {pledge.PledgeInstance<number>} Returns the generated key
 */
export const addAutoKey = (store, item) => pledge.createWithDependencies((p, store, item) => bindPledge(p, store.add(item)), store, item)

/**
 * @param {pledge.Pledge<IDBObjectStore>} store
 * @param {IDBKeyRange} [range]
 * @param {number} [limit]
 * @return {pledge.PledgeInstance<Array<any>>}
 */
export const getAll = (store, range, limit) => pledge.createWithDependencies((p, store, range, limit) => bindPledge(p, store.getAll(range, limit)), store, range, limit)

/**
 * @param {pledge.Pledge<IDBObjectStore>} store
 * @param {IDBKeyRange} [range]
 * @param {number} [limit]
 * @return {pledge.PledgeInstance<Array<any>>}
 */
export const getAllKeys = (store, range, limit) => pledge.createWithDependencies((p, store, range, limit) => bindPledge(p, store.getAllKeys(range, limit)), store, range, limit)

/**
 * @param {IDBObjectStore} store
 * @param {IDBKeyRange|null} query
 * @param {'next'|'prev'|'nextunique'|'prevunique'} direction
 * @return {pledge.PledgeInstance<any>}
 */
export const queryFirst = (store, query, direction) => {
  /**
   * @type {any}
   */
  let first = null
  return iterateKeys(store, query, key => {
    first = key
    return false
  }, direction).map(() => first)
}

/**
 * @param {IDBObjectStore} store
 * @param {IDBKeyRange?} [range]
 * @return {pledge.PledgeInstance<any>}
 */
export const getLastKey = (store, range = null) => queryFirst(store, range, 'prev')

/**
 * @param {IDBObjectStore} store
 * @param {IDBKeyRange?} [range]
 * @return {pledge.PledgeInstance<any>}
 */
export const getFirstKey = (store, range = null) => queryFirst(store, range, 'next')

/**
 * @typedef KeyValuePair
 * @type {Object}
 * @property {any} k key
 * @property {any} v Value
 */

/**
 * @param {pledge.Pledge<IDBObjectStore>} store
 * @param {pledge.Pledge<IDBKeyRange|undefined>} [range]
 * @param {pledge.Pledge<number|undefined>} [limit]
 * @return {pledge.PledgeInstance<Array<KeyValuePair>>}
 */
export const getAllKeysValues = (store, range, limit) => pledge.createWithDependencies((p, store, range, limit) => {
  pledge.all([getAllKeys(store, range, limit), getAll(store, range, limit)]).map(([ks, vs]) => ks.map((k, i) => ({ k, v: vs[i] }))).whenResolved(p.resolve.bind(p))
}, store, range, limit)

/**
 * @param {pledge.PledgeInstance<void>} p
 * @param {any} request
 * @param {function(IDBCursorWithValue):void|boolean|Promise<void|boolean>} f
 */
const iterateOnRequest = (p, request, f) => {
  request.onerror = p.cancel.bind(p)
  /**
   * @param {any} event
   */
  request.onsuccess = async event => {
    const cursor = event.target.result
    if (cursor === null || (await f(cursor)) === false) {
      p.resolve(undefined)
      return
    }
    cursor.continue()
  }
}

/**
 * Iterate on keys and values
 * @param {pledge.Pledge<IDBObjectStore>} store
 * @param {pledge.Pledge<IDBKeyRange|null>} keyrange
 * @param {function(any,any):void|boolean|Promise<void|boolean>} f Callback that receives (value, key)
 * @param {'next'|'prev'|'nextunique'|'prevunique'} direction
 */
export const iterate = (store, keyrange, f, direction = 'next') => pledge.createWithDependencies((p, store, keyrange) => {
  iterateOnRequest(p, store.openCursor(keyrange, direction), cursor => f(cursor.value, cursor.key))
}, store, keyrange)

/**
 * Iterate on the keys (no values)
 *
 * @param {pledge.Pledge<IDBObjectStore>} store
 * @param {pledge.Pledge<IDBKeyRange|null>} keyrange
 * @param {function(any):void|boolean|Promise<void|boolean>} f callback that receives the key
 * @param {'next'|'prev'|'nextunique'|'prevunique'} direction
 */
export const iterateKeys = (store, keyrange, f, direction = 'next') => pledge.createWithDependencies((p, store, keyrange) => {
  iterateOnRequest(p, store.openKeyCursor(keyrange, direction), cursor => f(cursor.key))
}, store, keyrange)

/**
 * Open store from transaction
 * @param {IDBTransaction} t
 * @param {String} store
 * @returns {IDBObjectStore}
 */
export const getStore = (t, store) => t.objectStore(store)

/**
 * @param {any} lower
 * @param {any} upper
 * @param {boolean} lowerOpen
 * @param {boolean} upperOpen
 */
export const createIDBKeyRangeBound = (lower, upper, lowerOpen, upperOpen) => IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen)

/**
 * @param {any} upper
 * @param {boolean} upperOpen
 */
export const createIDBKeyRangeUpperBound = (upper, upperOpen) => IDBKeyRange.upperBound(upper, upperOpen)

/**
 * @param {any} lower
 * @param {boolean} lowerOpen
 */
export const createIDBKeyRangeLowerBound = (lower, lowerOpen) => IDBKeyRange.lowerBound(lower, lowerOpen)

/* c8 ignore stop */
