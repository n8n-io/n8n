import * as VFS from './VFS.js';

// Options for navigator.locks.request().
/** @type {LockOptions} */ const SHARED = { mode: 'shared' };
/** @type {LockOptions} */ const POLL_SHARED = { ifAvailable: true, mode: 'shared' };
/** @type {LockOptions} */ const POLL_EXCLUSIVE = { ifAvailable: true, mode: 'exclusive' };

const POLICIES = ['exclusive', 'shared', 'shared+hint'];

/**
 * @typedef LockState
 * @property {string} baseName
 * @property {number} type
 * @property {boolean} writeHint
 * 
 * These properties are functions that release a specific lock.
 * @property {(() => void)?} [gate]
 * @property {(() => void)?} [access]
 * @property {(() => void)?} [reserved]
 * @property {(() => void)?} [hint]
 */

/**
 * Mix-in for FacadeVFS that implements the SQLite VFS locking protocol.
 * @param {*} superclass FacadeVFS (or subclass)
 * @returns 
 */
export const WebLocksMixin = superclass => class extends superclass {
  #options = {
    lockPolicy: 'exclusive',
    lockTimeout: Infinity
  };

  /** @type {Map<number, LockState>} */ #mapIdToState = new Map();

  constructor(name, module, options) {
    super(name, module, options);
    Object.assign(this.#options, options);
    if (POLICIES.indexOf(this.#options.lockPolicy) === -1) {
      throw new Error(`WebLocksMixin: invalid lock mode: ${options.lockPolicy}`);
    }
  }

  /**
   * @param {number} fileId 
   * @param {number} lockType 
   * @returns {Promise<number>}
   */
  async jLock(fileId, lockType) {
    try {
      const lockState = this.#getLockState(fileId);
      if (lockType <= lockState.type) return VFS.SQLITE_OK;
  
      switch (this.#options.lockPolicy) {
        case 'exclusive':
          return await this.#lockExclusive(lockState, lockType);
        case 'shared':
        case 'shared+hint':
          return await this.#lockShared(lockState, lockType);
      }
    } catch (e) {
      console.error('WebLocksMixin: lock error', e);
      return VFS.SQLITE_IOERR_LOCK;
    }
  }
  
  /**
   * @param {number} fileId 
   * @param {number} lockType 
   * @returns {Promise<number>}
   */
  async jUnlock(fileId, lockType) {
    try {
      const lockState = this.#getLockState(fileId);
      if (!(lockType < lockState.type)) return VFS.SQLITE_OK;
  
      switch (this.#options.lockPolicy) {
        case 'exclusive':
          return await this.#unlockExclusive(lockState, lockType);
        case 'shared':
        case 'shared+hint':
            return await this.#unlockShared(lockState, lockType);
      }
    } catch (e) {
      console.error('WebLocksMixin: unlock error', e);
      return VFS.SQLITE_IOERR_UNLOCK;
    }
  }

  /**
   * @param {number} fileId 
   * @param {DataView} pResOut 
   * @returns {Promise<number>}
   */
  async jCheckReservedLock(fileId, pResOut) {
    try {
      const lockState = this.#getLockState(fileId);
      switch (this.#options.lockPolicy) {
        case 'exclusive':
          return this.#checkReservedExclusive(lockState, pResOut);
        case 'shared':
        case 'shared+hint':
          return await this.#checkReservedShared(lockState, pResOut);
      }
    } catch (e) {
      console.error('WebLocksMixin: check reserved lock error', e);
      return VFS.SQLITE_IOERR_CHECKRESERVEDLOCK;
    }
    pResOut.setInt32(0, 0, true);
    return VFS.SQLITE_OK;
  }

  /**
   * @param {number} fileId
   * @param {number} op
   * @param {DataView} pArg
   * @returns {number|Promise<number>}
   */
  jFileControl(fileId, op, pArg) {
    if (op === WebLocksMixin.WRITE_HINT_OP_CODE &&
        this.#options.lockPolicy === 'shared+hint'){
      const lockState = this.#getLockState(fileId);
      lockState.writeHint = true;
    }
    return VFS.SQLITE_NOTFOUND;
  }

  #getLockState(fileId) {
    let lockState = this.#mapIdToState.get(fileId);
    if (!lockState) {
      // The state doesn't exist yet so create it.
      const name = this.getFilename(fileId);
      lockState = {
        baseName: name,
        type: VFS.SQLITE_LOCK_NONE,
        writeHint: false
      };
      this.#mapIdToState.set(fileId, lockState);
    }
    return lockState
  }

  /**
   * @param {LockState} lockState 
   * @param {number} lockType 
   * @returns 
   */
  async #lockExclusive(lockState, lockType) {
    if (!lockState.access) {
      if (!await this.#acquire(lockState, 'access')) {
        return VFS.SQLITE_BUSY;
      }
      console.assert(!!lockState.access);
    }
    lockState.type = lockType;
    return VFS.SQLITE_OK;
  }

  /**
   * @param {LockState} lockState 
   * @param {number} lockType 
   * @returns {number}
   */
  #unlockExclusive(lockState, lockType) {
    if (lockType === VFS.SQLITE_LOCK_NONE) {
      lockState.access?.();
      console.assert(!lockState.access);
    }
    lockState.type = lockType;
    return VFS.SQLITE_OK;
  }

  /**
   * @param {LockState} lockState 
   * @param {DataView} pResOut 
   * @returns {number}
   */
  #checkReservedExclusive(lockState, pResOut) {
    pResOut.setInt32(0, 0, true);
    return VFS.SQLITE_OK;
  }

  /**
   * @param {LockState} lockState 
   * @param {number} lockType 
   * @returns 
   */
  async #lockShared(lockState, lockType) {
    switch (lockState.type) {
      case VFS.SQLITE_LOCK_NONE:
        switch (lockType) {
          case VFS.SQLITE_LOCK_SHARED:
            if (lockState.writeHint) {
              // xFileControl() has hinted that this transaction will
              // write. Acquire the hint lock, which is required to reach
              // the RESERVED state.
              if (!await this.#acquire(lockState, 'hint')) {
                // Timeout before lock acquired.
                return VFS.SQLITE_BUSY;
              }
            }

            // Must have the gate lock to request the access lock.
            if (!await this.#acquire(lockState, 'gate', SHARED)) {
                // Timeout before lock acquired.
                lockState.hint?.();
              return VFS.SQLITE_BUSY;
            }
            await this.#acquire(lockState, 'access', SHARED);
            lockState.gate();
            console.assert(!lockState.gate);
            console.assert(!!lockState.access);
            console.assert(!lockState.reserved);
            break;

          default:
            throw new Error('unsupported lock transition');
        }
        break;
      case VFS.SQLITE_LOCK_SHARED:
        switch (lockType) {
          case VFS.SQLITE_LOCK_RESERVED:
            if (this.#options.lockPolicy === 'shared+hint') {
              // Ideally we should already have the hint lock, but if not
              // poll for it here.
              if (!lockState.hint &&
                !await this.#acquire(lockState, 'hint', POLL_EXCLUSIVE)) {
                // Another connection has the hint lock so this is a
                // deadlock. This connection must retry.
                return VFS.SQLITE_BUSY;
              }
            }

            // Poll for the reserved lock. This should always succeed
            // if all clients use the 'shared+hint' policy.
            if (!await this.#acquire(lockState, 'reserved', POLL_EXCLUSIVE)) {
              // This is a deadlock. The connection holding the reserved
              // lock blocks us, and it can't acquire an exclusive access
              // lock because we hold a shared access lock. This connection
              // must retry.
              lockState.hint?.();
              return VFS.SQLITE_BUSY;
            }
            lockState.access();
            console.assert(!lockState.gate);
            console.assert(!lockState.access);
            console.assert(!!lockState.reserved);
            break;

          case VFS.SQLITE_LOCK_EXCLUSIVE:
            // Jumping directly from SHARED to EXCLUSIVE without passing
            // through RESERVED is only done with a hot journal.
            if (!await this.#acquire(lockState, 'gate')) {
              // Timeout before lock acquired.
              return VFS.SQLITE_BUSY;
            }
            lockState.access();
            if (!await this.#acquire(lockState, 'access')) {
              // Timeout before lock acquired.
              lockState.gate();
              return VFS.SQLITE_BUSY;
            }
            console.assert(!!lockState.gate);
            console.assert(!!lockState.access);
            console.assert(!lockState.reserved);
            break;

          default:
            throw new Error('unsupported lock transition');
        }
        break;
      case VFS.SQLITE_LOCK_RESERVED:
        switch (lockType) {
          case VFS.SQLITE_LOCK_EXCLUSIVE:
            // Prevent other connections from entering the SHARED state.
            if (!await this.#acquire(lockState, 'gate')) {
              // Timeout before lock acquired.
              return VFS.SQLITE_BUSY;
            }

            // Block until all other connections exit the SHARED state.
            if (!await this.#acquire(lockState, 'access')) {
              // Timeout before lock acquired.
              lockState.gate();
              return VFS.SQLITE_BUSY;
            }
            console.assert(!!lockState.gate);
            console.assert(!!lockState.access);
            console.assert(!!lockState.reserved);
            break;

          default:
            throw new Error('unsupported lock transition');
        }
        break;
    }
    lockState.type = lockType;
    return VFS.SQLITE_OK;
  }

  /**
   * @param {LockState} lockState 
   * @param {number} lockType 
   * @returns 
   */
  async #unlockShared(lockState, lockType) {
    // lockType can only be SQLITE_LOCK_SHARED or SQLITE_LOCK_NONE.
    if (lockType === VFS.SQLITE_LOCK_NONE) {
      lockState.access?.();
      lockState.gate?.();
      lockState.reserved?.();
      lockState.hint?.();
      lockState.writeHint = false;
      console.assert(!lockState.access);
      console.assert(!lockState.gate);
      console.assert(!lockState.reserved);
      console.assert(!lockState.hint);
    } else { // lockType === VFS.SQLITE_LOCK_SHARED
      switch (lockState.type) {
        case VFS.SQLITE_LOCK_EXCLUSIVE:
          // Release our exclusive access lock and reacquire it with a
          // shared lock. This should always succeed because we hold
          // the gate lock.
          lockState.access();
          await this.#acquire(lockState, 'access', SHARED);

          // Release our gate and reserved locks. We might not have a
          // reserved lock if we were handling a hot journal.
          lockState.gate();
          lockState.reserved?.();
          lockState.hint?.();
          console.assert(!!lockState.access);
          console.assert(!lockState.gate);
          console.assert(!lockState.reserved);
          break;

        case VFS.SQLITE_LOCK_RESERVED:
          // This transition is rare, probably only on an I/O error
          // while writing to a journal file.
          await this.#acquire(lockState, 'access', SHARED);
          lockState.reserved();
          lockState.hint?.();
          console.assert(!!lockState.access);
          console.assert(!lockState.gate);
          console.assert(!lockState.reserved);
          break;
      }
    }
    lockState.type = lockType;
    return VFS.SQLITE_OK;
  }

  /**
   * @param {LockState} lockState 
   * @param {DataView} pResOut 
   * @returns {Promise<number>}
   */
  async #checkReservedShared(lockState, pResOut) {
    if (await this.#acquire(lockState, 'reserved', POLL_SHARED)) {
      // We were able to get the lock so it was not reserved.
      lockState.reserved();
      pResOut.setInt32(0, 0, true);
    } else {
      pResOut.setInt32(0, 1, true);
    }
    return VFS.SQLITE_OK;
  }

  /**
   * @param {LockState} lockState 
   * @param {'gate'|'access'|'reserved'|'hint'} name
   * @param {LockOptions} options 
   * @returns {Promise<boolean>}
   */
  #acquire(lockState, name, options = {}) {
    console.assert(!lockState[name]);
    return new Promise(resolve => {
      if (!options.ifAvailable && this.#options.lockTimeout < Infinity) {
        // Add a timeout to the lock request.
        const controller = new AbortController();
        options = Object.assign({}, options, { signal: controller.signal });
        setTimeout(() => {
          controller.abort();
          resolve?.(false);
        }, this.#options.lockTimeout);
      }

      const lockName = `lock##${lockState.baseName}##${name}`;
      navigator.locks.request(lockName, options, lock => {
        if (lock) {
          return new Promise(release => {
            lockState[name] = () => {
              release();
              lockState[name] = null;
            };
            resolve(true);
            resolve = null;
          });
        } else {
          lockState[name] = null;
          resolve(false);
          resolve = null;
        }
      }).catch(e => {
        if (e.name !== 'AbortError') throw e;
      });
    });
  }
}

WebLocksMixin.WRITE_HINT_OP_CODE = -9999;