import {
  YArray,
  YMap,
  readDeleteSet,
  writeDeleteSet,
  createDeleteSet,
  DSEncoderV1, DSDecoderV1, ID, DeleteSet, YArrayEvent, Transaction, Doc // eslint-disable-line
} from '../internals.js'

import * as decoding from 'lib0/decoding'

import { mergeDeleteSets, isDeleted } from './DeleteSet.js'

export class PermanentUserData {
  /**
   * @param {Doc} doc
   * @param {YMap<any>} [storeType]
   */
  constructor (doc, storeType = doc.getMap('users')) {
    /**
     * @type {Map<string,DeleteSet>}
     */
    const dss = new Map()
    this.yusers = storeType
    this.doc = doc
    /**
     * Maps from clientid to userDescription
     *
     * @type {Map<number,string>}
     */
    this.clients = new Map()
    this.dss = dss
    /**
     * @param {YMap<any>} user
     * @param {string} userDescription
     */
    const initUser = (user, userDescription) => {
      /**
       * @type {YArray<Uint8Array>}
       */
      const ds = user.get('ds')
      const ids = user.get('ids')
      const addClientId = /** @param {number} clientid */ clientid => this.clients.set(clientid, userDescription)
      ds.observe(/** @param {YArrayEvent<any>} event */ event => {
        event.changes.added.forEach(item => {
          item.content.getContent().forEach(encodedDs => {
            if (encodedDs instanceof Uint8Array) {
              this.dss.set(userDescription, mergeDeleteSets([this.dss.get(userDescription) || createDeleteSet(), readDeleteSet(new DSDecoderV1(decoding.createDecoder(encodedDs)))]))
            }
          })
        })
      })
      this.dss.set(userDescription, mergeDeleteSets(ds.map(encodedDs => readDeleteSet(new DSDecoderV1(decoding.createDecoder(encodedDs))))))
      ids.observe(/** @param {YArrayEvent<any>} event */ event =>
        event.changes.added.forEach(item => item.content.getContent().forEach(addClientId))
      )
      ids.forEach(addClientId)
    }
    // observe users
    storeType.observe(event => {
      event.keysChanged.forEach(userDescription =>
        initUser(storeType.get(userDescription), userDescription)
      )
    })
    // add initial data
    storeType.forEach(initUser)
  }

  /**
   * @param {Doc} doc
   * @param {number} clientid
   * @param {string} userDescription
   * @param {Object} conf
   * @param {function(Transaction, DeleteSet):boolean} [conf.filter]
   */
  setUserMapping (doc, clientid, userDescription, { filter = () => true } = {}) {
    const users = this.yusers
    let user = users.get(userDescription)
    if (!user) {
      user = new YMap()
      user.set('ids', new YArray())
      user.set('ds', new YArray())
      users.set(userDescription, user)
    }
    user.get('ids').push([clientid])
    users.observe(_event => {
      setTimeout(() => {
        const userOverwrite = users.get(userDescription)
        if (userOverwrite !== user) {
          // user was overwritten, port all data over to the next user object
          // @todo Experiment with Y.Sets here
          user = userOverwrite
          // @todo iterate over old type
          this.clients.forEach((_userDescription, clientid) => {
            if (userDescription === _userDescription) {
              user.get('ids').push([clientid])
            }
          })
          const encoder = new DSEncoderV1()
          const ds = this.dss.get(userDescription)
          if (ds) {
            writeDeleteSet(encoder, ds)
            user.get('ds').push([encoder.toUint8Array()])
          }
        }
      }, 0)
    })
    doc.on('afterTransaction', /** @param {Transaction} transaction */ transaction => {
      setTimeout(() => {
        const yds = user.get('ds')
        const ds = transaction.deleteSet
        if (transaction.local && ds.clients.size > 0 && filter(transaction, ds)) {
          const encoder = new DSEncoderV1()
          writeDeleteSet(encoder, ds)
          yds.push([encoder.toUint8Array()])
        }
      })
    })
  }

  /**
   * @param {number} clientid
   * @return {any}
   */
  getUserByClientId (clientid) {
    return this.clients.get(clientid) || null
  }

  /**
   * @param {ID} id
   * @return {string | null}
   */
  getUserByDeletedId (id) {
    for (const [userDescription, ds] of this.dss.entries()) {
      if (isDeleted(ds, id)) {
        return userDescription
      }
    }
    return null
  }
}
