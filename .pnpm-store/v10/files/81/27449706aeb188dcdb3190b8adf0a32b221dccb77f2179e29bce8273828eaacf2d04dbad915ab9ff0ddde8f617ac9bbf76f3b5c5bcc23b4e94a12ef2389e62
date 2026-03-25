import {
  findIndexSS,
  getState,
  splitItem,
  iterateStructs,
  UpdateEncoderV2,
  DSDecoderV1, DSEncoderV1, DSDecoderV2, DSEncoderV2, Item, GC, StructStore, Transaction, ID // eslint-disable-line
} from '../internals.js'

import * as array from 'lib0/array'
import * as math from 'lib0/math'
import * as map from 'lib0/map'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

export class DeleteItem {
  /**
   * @param {number} clock
   * @param {number} len
   */
  constructor (clock, len) {
    /**
     * @type {number}
     */
    this.clock = clock
    /**
     * @type {number}
     */
    this.len = len
  }
}

/**
 * We no longer maintain a DeleteStore. DeleteSet is a temporary object that is created when needed.
 * - When created in a transaction, it must only be accessed after sorting, and merging
 *   - This DeleteSet is send to other clients
 * - We do not create a DeleteSet when we send a sync message. The DeleteSet message is created directly from StructStore
 * - We read a DeleteSet as part of a sync/update message. In this case the DeleteSet is already sorted and merged.
 */
export class DeleteSet {
  constructor () {
    /**
     * @type {Map<number,Array<DeleteItem>>}
     */
    this.clients = new Map()
  }
}

/**
 * Iterate over all structs that the DeleteSet gc's.
 *
 * @param {Transaction} transaction
 * @param {DeleteSet} ds
 * @param {function(GC|Item):void} f
 *
 * @function
 */
export const iterateDeletedStructs = (transaction, ds, f) =>
  ds.clients.forEach((deletes, clientid) => {
    const structs = /** @type {Array<GC|Item>} */ (transaction.doc.store.clients.get(clientid))
    if (structs != null) {
      const lastStruct = structs[structs.length - 1]
      const clockState = lastStruct.id.clock + lastStruct.length
      for (let i = 0, del = deletes[i]; i < deletes.length && del.clock < clockState; del = deletes[++i]) {
        iterateStructs(transaction, structs, del.clock, del.len, f)
      }
    }
  })

/**
 * @param {Array<DeleteItem>} dis
 * @param {number} clock
 * @return {number|null}
 *
 * @private
 * @function
 */
export const findIndexDS = (dis, clock) => {
  let left = 0
  let right = dis.length - 1
  while (left <= right) {
    const midindex = math.floor((left + right) / 2)
    const mid = dis[midindex]
    const midclock = mid.clock
    if (midclock <= clock) {
      if (clock < midclock + mid.len) {
        return midindex
      }
      left = midindex + 1
    } else {
      right = midindex - 1
    }
  }
  return null
}

/**
 * @param {DeleteSet} ds
 * @param {ID} id
 * @return {boolean}
 *
 * @private
 * @function
 */
export const isDeleted = (ds, id) => {
  const dis = ds.clients.get(id.client)
  return dis !== undefined && findIndexDS(dis, id.clock) !== null
}

/**
 * @param {DeleteSet} ds
 *
 * @private
 * @function
 */
export const sortAndMergeDeleteSet = ds => {
  ds.clients.forEach(dels => {
    dels.sort((a, b) => a.clock - b.clock)
    // merge items without filtering or splicing the array
    // i is the current pointer
    // j refers to the current insert position for the pointed item
    // try to merge dels[i] into dels[j-1] or set dels[j]=dels[i]
    let i, j
    for (i = 1, j = 1; i < dels.length; i++) {
      const left = dels[j - 1]
      const right = dels[i]
      if (left.clock + left.len >= right.clock) {
        left.len = math.max(left.len, right.clock + right.len - left.clock)
      } else {
        if (j < i) {
          dels[j] = right
        }
        j++
      }
    }
    dels.length = j
  })
}

/**
 * @param {Array<DeleteSet>} dss
 * @return {DeleteSet} A fresh DeleteSet
 */
export const mergeDeleteSets = dss => {
  const merged = new DeleteSet()
  for (let dssI = 0; dssI < dss.length; dssI++) {
    dss[dssI].clients.forEach((delsLeft, client) => {
      if (!merged.clients.has(client)) {
        // Write all missing keys from current ds and all following.
        // If merged already contains `client` current ds has already been added.
        /**
         * @type {Array<DeleteItem>}
         */
        const dels = delsLeft.slice()
        for (let i = dssI + 1; i < dss.length; i++) {
          array.appendTo(dels, dss[i].clients.get(client) || [])
        }
        merged.clients.set(client, dels)
      }
    })
  }
  sortAndMergeDeleteSet(merged)
  return merged
}

/**
 * @param {DeleteSet} ds
 * @param {number} client
 * @param {number} clock
 * @param {number} length
 *
 * @private
 * @function
 */
export const addToDeleteSet = (ds, client, clock, length) => {
  map.setIfUndefined(ds.clients, client, () => /** @type {Array<DeleteItem>} */ ([])).push(new DeleteItem(clock, length))
}

export const createDeleteSet = () => new DeleteSet()

/**
 * @param {StructStore} ss
 * @return {DeleteSet} Merged and sorted DeleteSet
 *
 * @private
 * @function
 */
export const createDeleteSetFromStructStore = ss => {
  const ds = createDeleteSet()
  ss.clients.forEach((structs, client) => {
    /**
     * @type {Array<DeleteItem>}
     */
    const dsitems = []
    for (let i = 0; i < structs.length; i++) {
      const struct = structs[i]
      if (struct.deleted) {
        const clock = struct.id.clock
        let len = struct.length
        if (i + 1 < structs.length) {
          for (let next = structs[i + 1]; i + 1 < structs.length && next.deleted; next = structs[++i + 1]) {
            len += next.length
          }
        }
        dsitems.push(new DeleteItem(clock, len))
      }
    }
    if (dsitems.length > 0) {
      ds.clients.set(client, dsitems)
    }
  })
  return ds
}

/**
 * @param {DSEncoderV1 | DSEncoderV2} encoder
 * @param {DeleteSet} ds
 *
 * @private
 * @function
 */
export const writeDeleteSet = (encoder, ds) => {
  encoding.writeVarUint(encoder.restEncoder, ds.clients.size)

  // Ensure that the delete set is written in a deterministic order
  array.from(ds.clients.entries())
    .sort((a, b) => b[0] - a[0])
    .forEach(([client, dsitems]) => {
      encoder.resetDsCurVal()
      encoding.writeVarUint(encoder.restEncoder, client)
      const len = dsitems.length
      encoding.writeVarUint(encoder.restEncoder, len)
      for (let i = 0; i < len; i++) {
        const item = dsitems[i]
        encoder.writeDsClock(item.clock)
        encoder.writeDsLen(item.len)
      }
    })
}

/**
 * @param {DSDecoderV1 | DSDecoderV2} decoder
 * @return {DeleteSet}
 *
 * @private
 * @function
 */
export const readDeleteSet = decoder => {
  const ds = new DeleteSet()
  const numClients = decoding.readVarUint(decoder.restDecoder)
  for (let i = 0; i < numClients; i++) {
    decoder.resetDsCurVal()
    const client = decoding.readVarUint(decoder.restDecoder)
    const numberOfDeletes = decoding.readVarUint(decoder.restDecoder)
    if (numberOfDeletes > 0) {
      const dsField = map.setIfUndefined(ds.clients, client, () => /** @type {Array<DeleteItem>} */ ([]))
      for (let i = 0; i < numberOfDeletes; i++) {
        dsField.push(new DeleteItem(decoder.readDsClock(), decoder.readDsLen()))
      }
    }
  }
  return ds
}

/**
 * @todo YDecoder also contains references to String and other Decoders. Would make sense to exchange YDecoder.toUint8Array for YDecoder.DsToUint8Array()..
 */

/**
 * @param {DSDecoderV1 | DSDecoderV2} decoder
 * @param {Transaction} transaction
 * @param {StructStore} store
 * @return {Uint8Array|null} Returns a v2 update containing all deletes that couldn't be applied yet; or null if all deletes were applied successfully.
 *
 * @private
 * @function
 */
export const readAndApplyDeleteSet = (decoder, transaction, store) => {
  const unappliedDS = new DeleteSet()
  const numClients = decoding.readVarUint(decoder.restDecoder)
  for (let i = 0; i < numClients; i++) {
    decoder.resetDsCurVal()
    const client = decoding.readVarUint(decoder.restDecoder)
    const numberOfDeletes = decoding.readVarUint(decoder.restDecoder)
    const structs = store.clients.get(client) || []
    const state = getState(store, client)
    for (let i = 0; i < numberOfDeletes; i++) {
      const clock = decoder.readDsClock()
      const clockEnd = clock + decoder.readDsLen()
      if (clock < state) {
        if (state < clockEnd) {
          addToDeleteSet(unappliedDS, client, state, clockEnd - state)
        }
        let index = findIndexSS(structs, clock)
        /**
         * We can ignore the case of GC and Delete structs, because we are going to skip them
         * @type {Item}
         */
        // @ts-ignore
        let struct = structs[index]
        // split the first item if necessary
        if (!struct.deleted && struct.id.clock < clock) {
          structs.splice(index + 1, 0, splitItem(transaction, struct, clock - struct.id.clock))
          index++ // increase we now want to use the next struct
        }
        while (index < structs.length) {
          // @ts-ignore
          struct = structs[index++]
          if (struct.id.clock < clockEnd) {
            if (!struct.deleted) {
              if (clockEnd < struct.id.clock + struct.length) {
                structs.splice(index, 0, splitItem(transaction, struct, clockEnd - struct.id.clock))
              }
              struct.delete(transaction)
            }
          } else {
            break
          }
        }
      } else {
        addToDeleteSet(unappliedDS, client, clock, clockEnd - clock)
      }
    }
  }
  if (unappliedDS.clients.size > 0) {
    const ds = new UpdateEncoderV2()
    encoding.writeVarUint(ds.restEncoder, 0) // encode 0 structs
    writeDeleteSet(ds, unappliedDS)
    return ds.toUint8Array()
  }
  return null
}

/**
 * @param {DeleteSet} ds1
 * @param {DeleteSet} ds2
 */
export const equalDeleteSets = (ds1, ds2) => {
  if (ds1.clients.size !== ds2.clients.size) return false
  for (const [client, deleteItems1] of ds1.clients.entries()) {
    const deleteItems2 = /** @type {Array<import('../internals.js').DeleteItem>} */ (ds2.clients.get(client))
    if (deleteItems2 === undefined || deleteItems1.length !== deleteItems2.length) return false
    for (let i = 0; i < deleteItems1.length; i++) {
      const di1 = deleteItems1[i]
      const di2 = deleteItems2[i]
      if (di1.clock !== di2.clock || di1.len !== di2.len) {
        return false
      }
    }
  }
  return true
}
