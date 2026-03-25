// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
var MutexLockStatus;
(function (MutexLockStatus) {
    MutexLockStatus[MutexLockStatus["LOCKED"] = 0] = "LOCKED";
    MutexLockStatus[MutexLockStatus["UNLOCKED"] = 1] = "UNLOCKED";
})(MutexLockStatus || (MutexLockStatus = {}));
/**
 * An async mutex lock.
 */
export class Mutex {
    /**
     * Lock for a specific key. If the lock has been acquired by another customer, then
     * will wait until getting the lock.
     *
     * @param key - lock key
     */
    static async lock(key) {
        return new Promise((resolve) => {
            if (this.keys[key] === undefined || this.keys[key] === MutexLockStatus.UNLOCKED) {
                this.keys[key] = MutexLockStatus.LOCKED;
                resolve();
            }
            else {
                this.onUnlockEvent(key, () => {
                    this.keys[key] = MutexLockStatus.LOCKED;
                    resolve();
                });
            }
        });
    }
    /**
     * Unlock a key.
     *
     * @param key -
     */
    static async unlock(key) {
        return new Promise((resolve) => {
            if (this.keys[key] === MutexLockStatus.LOCKED) {
                this.emitUnlockEvent(key);
            }
            delete this.keys[key];
            resolve();
        });
    }
    static onUnlockEvent(key, handler) {
        if (this.listeners[key] === undefined) {
            this.listeners[key] = [handler];
        }
        else {
            this.listeners[key].push(handler);
        }
    }
    static emitUnlockEvent(key) {
        if (this.listeners[key] !== undefined && this.listeners[key].length > 0) {
            const handler = this.listeners[key].shift();
            setImmediate(() => {
                handler.call(this);
            });
        }
    }
}
Mutex.keys = {};
Mutex.listeners = {};
//# sourceMappingURL=Mutex.js.map