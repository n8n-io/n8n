"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PendingOperation_1 = require("./PendingOperation");
const Resource_1 = require("./Resource");
const utils_1 = require("./utils");
const events_1 = require("events");
const timers_1 = require("timers");
class Pool {
    constructor(opt) {
        this.destroyed = false;
        this.emitter = new events_1.EventEmitter();
        opt = opt || {};
        if (!opt.create) {
            throw new Error('Tarn: opt.create function most be provided');
        }
        if (!opt.destroy) {
            throw new Error('Tarn: opt.destroy function most be provided');
        }
        if (typeof opt.min !== 'number' || opt.min < 0 || opt.min !== Math.round(opt.min)) {
            throw new Error('Tarn: opt.min must be an integer >= 0');
        }
        if (typeof opt.max !== 'number' || opt.max <= 0 || opt.max !== Math.round(opt.max)) {
            throw new Error('Tarn: opt.max must be an integer > 0');
        }
        if (opt.min > opt.max) {
            throw new Error('Tarn: opt.max is smaller than opt.min');
        }
        if (!utils_1.checkOptionalTime(opt.acquireTimeoutMillis)) {
            throw new Error('Tarn: invalid opt.acquireTimeoutMillis ' + JSON.stringify(opt.acquireTimeoutMillis));
        }
        if (!utils_1.checkOptionalTime(opt.createTimeoutMillis)) {
            throw new Error('Tarn: invalid opt.createTimeoutMillis ' + JSON.stringify(opt.createTimeoutMillis));
        }
        if (!utils_1.checkOptionalTime(opt.destroyTimeoutMillis)) {
            throw new Error('Tarn: invalid opt.destroyTimeoutMillis ' + JSON.stringify(opt.destroyTimeoutMillis));
        }
        if (!utils_1.checkOptionalTime(opt.idleTimeoutMillis)) {
            throw new Error('Tarn: invalid opt.idleTimeoutMillis ' + JSON.stringify(opt.idleTimeoutMillis));
        }
        if (!utils_1.checkOptionalTime(opt.reapIntervalMillis)) {
            throw new Error('Tarn: invalid opt.reapIntervalMillis ' + JSON.stringify(opt.reapIntervalMillis));
        }
        if (!utils_1.checkOptionalTime(opt.createRetryIntervalMillis)) {
            throw new Error('Tarn: invalid opt.createRetryIntervalMillis ' +
                JSON.stringify(opt.createRetryIntervalMillis));
        }
        const allowedKeys = {
            create: true,
            validate: true,
            destroy: true,
            log: true,
            min: true,
            max: true,
            acquireTimeoutMillis: true,
            createTimeoutMillis: true,
            destroyTimeoutMillis: true,
            idleTimeoutMillis: true,
            reapIntervalMillis: true,
            createRetryIntervalMillis: true,
            propagateCreateError: true
        };
        for (const key of Object.keys(opt)) {
            if (!allowedKeys[key]) {
                throw new Error(`Tarn: unsupported option opt.${key}`);
            }
        }
        this.creator = opt.create;
        this.destroyer = opt.destroy;
        this.validate = typeof opt.validate === 'function' ? opt.validate : () => true;
        this.log = opt.log || (() => { });
        this.acquireTimeoutMillis = opt.acquireTimeoutMillis || 30000;
        this.createTimeoutMillis = opt.createTimeoutMillis || 30000;
        this.destroyTimeoutMillis = opt.destroyTimeoutMillis || 5000;
        this.idleTimeoutMillis = opt.idleTimeoutMillis || 30000;
        this.reapIntervalMillis = opt.reapIntervalMillis || 1000;
        this.createRetryIntervalMillis = opt.createRetryIntervalMillis || 200;
        this.propagateCreateError = !!opt.propagateCreateError;
        this.min = opt.min;
        this.max = opt.max;
        // All the resources, which are either already acquired or which are
        // considered for being passed to acquire in async validation phase.
        this.used = [];
        // All the resources, which are either just created and free or returned
        // back to pool after using.
        this.free = [];
        this.pendingCreates = [];
        this.pendingAcquires = [];
        this.pendingDestroys = [];
        // When acquire is pending, but also still in validation phase
        this.pendingValidations = [];
        this.destroyed = false;
        this.interval = null;
        this.eventId = 1;
    }
    numUsed() {
        return this.used.length;
    }
    numFree() {
        return this.free.length;
    }
    numPendingAcquires() {
        return this.pendingAcquires.length;
    }
    numPendingValidations() {
        return this.pendingValidations.length;
    }
    numPendingCreates() {
        return this.pendingCreates.length;
    }
    acquire() {
        const eventId = this.eventId++;
        this._executeEventHandlers('acquireRequest', eventId);
        const pendingAcquire = new PendingOperation_1.PendingOperation(this.acquireTimeoutMillis);
        this.pendingAcquires.push(pendingAcquire);
        // If the acquire fails for whatever reason
        // remove it from the pending queue.
        pendingAcquire.promise = pendingAcquire.promise
            .then(resource => {
            this._executeEventHandlers('acquireSuccess', eventId, resource);
            return resource;
        })
            .catch(err => {
            this._executeEventHandlers('acquireFail', eventId, err);
            remove(this.pendingAcquires, pendingAcquire);
            return Promise.reject(err);
        });
        this._tryAcquireOrCreate();
        return pendingAcquire;
    }
    release(resource) {
        this._executeEventHandlers('release', resource);
        for (let i = 0, l = this.used.length; i < l; ++i) {
            const used = this.used[i];
            if (used.resource === resource) {
                this.used.splice(i, 1);
                this.free.push(used.resolve());
                this._tryAcquireOrCreate();
                return true;
            }
        }
        return false;
    }
    isEmpty() {
        return ([
            this.numFree(),
            this.numUsed(),
            this.numPendingAcquires(),
            this.numPendingValidations(),
            this.numPendingCreates()
        ].reduce((total, value) => total + value) === 0);
    }
    /**
     * Reaping cycle.
     */
    check() {
        const timestamp = utils_1.now();
        const newFree = [];
        const minKeep = this.min - this.used.length;
        const maxDestroy = this.free.length - minKeep;
        let numDestroyed = 0;
        this.free.forEach(free => {
            if (utils_1.duration(timestamp, free.timestamp) >= this.idleTimeoutMillis &&
                numDestroyed < maxDestroy) {
                numDestroyed++;
                this._destroy(free.resource);
            }
            else {
                newFree.push(free);
            }
        });
        this.free = newFree;
        // Pool is completely empty, stop reaping.
        // Next .acquire will start reaping interval again.
        if (this.isEmpty()) {
            this._stopReaping();
        }
    }
    destroy() {
        const eventId = this.eventId++;
        this._executeEventHandlers('poolDestroyRequest', eventId);
        this._stopReaping();
        this.destroyed = true;
        // First wait for all the pending creates get ready.
        return utils_1.reflect(Promise.all(this.pendingCreates.map(create => utils_1.reflect(create.promise)))
            .then(() => {
            // eslint-disable-next-line
            return new Promise((resolve, reject) => {
                // poll every 100ms and wait that all validations are ready
                if (this.numPendingValidations() === 0) {
                    resolve();
                    return;
                }
                const interval = setInterval(() => {
                    if (this.numPendingValidations() === 0) {
                        timers_1.clearInterval(interval);
                        resolve();
                    }
                }, 100);
            });
        })
            .then(() => {
            // Wait for all the used resources to be freed.
            return Promise.all(this.used.map(used => utils_1.reflect(used.promise)));
        })
            .then(() => {
            // Abort all pending acquires.
            return Promise.all(this.pendingAcquires.map(acquire => {
                acquire.abort();
                return utils_1.reflect(acquire.promise);
            }));
        })
            .then(() => {
            // Now we can destroy all the freed resources.
            return Promise.all(this.free.map(free => utils_1.reflect(this._destroy(free.resource))));
        })
            .then(() => {
            // Also wait rest of the pending destroys to finish
            return Promise.all(this.pendingDestroys.map(pd => pd.promise));
        })
            .then(() => {
            this.free = [];
            this.pendingAcquires = [];
        })).then(res => {
            this._executeEventHandlers('poolDestroySuccess', eventId);
            this.emitter.removeAllListeners();
            return res;
        });
    }
    on(event, listener) {
        this.emitter.on(event, listener);
    }
    removeListener(event, listener) {
        this.emitter.removeListener(event, listener);
    }
    removeAllListeners(event) {
        this.emitter.removeAllListeners(event);
    }
    /**
     * The most important method that is called always when resources
     * are created / destroyed / acquired / released. In other words
     * every time when resources are moved from used to free or vice
     * versa.
     *
     * Either assigns free resources to pendingAcquires or creates new
     * resources if there is room for it in the pool.
     */
    _tryAcquireOrCreate() {
        if (this.destroyed) {
            return;
        }
        if (this._hasFreeResources()) {
            this._doAcquire();
        }
        else if (this._shouldCreateMoreResources()) {
            this._doCreate();
        }
    }
    _hasFreeResources() {
        return this.free.length > 0;
    }
    _doAcquire() {
        // Acquire as many pending acquires as possible concurrently
        while (this._canAcquire()) {
            // To allow async validation, we actually need to move free resource
            // and pending acquire temporary from their respective arrays and depending
            // on validation result to either leave the free resource to used resources array
            // or destroy the free resource if validation did fail.
            const pendingAcquire = this.pendingAcquires.shift();
            const free = this.free.pop();
            if (free === undefined || pendingAcquire === undefined) {
                const errMessage = 'this.free was empty while trying to acquire resource';
                this.log(`Tarn: ${errMessage}`, 'warn');
                throw new Error(`Internal error, should never happen. ${errMessage}`);
            }
            // Make sure that pendingAcquire that is being validated is not lost and
            // can be freed when pool is destroyed.
            this.pendingValidations.push(pendingAcquire);
            // Must be added here pre-emptively to prevent logic that decides
            // if new resources are created will keep on working correctly.
            this.used.push(free);
            // if acquire fails also pending validation, must be aborted so that pre reserved
            // resource will be returned to free resources immediately
            const abortAbleValidation = new PendingOperation_1.PendingOperation(this.acquireTimeoutMillis);
            // eslint-disable-next-line
            pendingAcquire.promise.catch(err => {
                abortAbleValidation.abort();
            });
            abortAbleValidation.promise
                .catch(err => {
                // There's nothing we can do here but log the error. This would otherwise
                // leak out as an unhandled exception.
                this.log('Tarn: resource validator threw an exception ' + err.stack, 'warn');
                return false;
            })
                .then(validationSuccess => {
                try {
                    if (validationSuccess && !pendingAcquire.isRejected) {
                        // At least one active resource exist, start reaping.
                        this._startReaping();
                        pendingAcquire.resolve(free.resource);
                    }
                    else {
                        remove(this.used, free);
                        // Only destroy the resource if the validation has failed
                        if (!validationSuccess) {
                            this._destroy(free.resource);
                            // Since we destroyed an invalid resource and were not able to fulfill
                            // all the pending acquires, we may need to create new ones or at
                            // least run this acquire loop again to verify it. But not immediately
                            // to prevent starving event loop.
                            setTimeout(() => {
                                this._tryAcquireOrCreate();
                            }, 0);
                        }
                        else {
                            this.free.push(free);
                        }
                        // is acquire was canceled, failed or timed out already
                        // no need to return it to pending queries
                        if (!pendingAcquire.isRejected) {
                            this.pendingAcquires.unshift(pendingAcquire);
                        }
                    }
                }
                finally {
                    remove(this.pendingValidations, pendingAcquire);
                }
            });
            // try to validate
            this._validateResource(free.resource)
                .then(validationSuccess => {
                abortAbleValidation.resolve(validationSuccess);
            })
                .catch(err => {
                abortAbleValidation.reject(err);
            });
        }
    }
    _canAcquire() {
        return this.free.length > 0 && this.pendingAcquires.length > 0;
    }
    _validateResource(resource) {
        try {
            return Promise.resolve(this.validate(resource));
        }
        catch (err) {
            // prevent leaking of sync exception
            return Promise.reject(err);
        }
    }
    _shouldCreateMoreResources() {
        return (this.used.length + this.pendingCreates.length < this.max &&
            this.pendingCreates.length < this.pendingAcquires.length);
    }
    _doCreate() {
        const pendingAcquiresBeforeCreate = this.pendingAcquires.slice();
        const pendingCreate = this._create();
        pendingCreate.promise
            .then(() => {
            // Not returned on purpose.
            this._tryAcquireOrCreate();
            return null;
        })
            .catch(err => {
            if (this.propagateCreateError && this.pendingAcquires.length !== 0) {
                // If propagateCreateError is true, we don't retry the create
                // but reject the first pending acquire immediately. Intentionally
                // use `this.pendingAcquires` instead of `pendingAcquiresBeforeCreate`
                // in case some acquires in pendingAcquiresBeforeCreate have already
                // been resolved.
                this.pendingAcquires[0].reject(err);
            }
            // Save the create error to all pending acquires so that we can use it
            // as the error to reject the acquire if it times out.
            pendingAcquiresBeforeCreate.forEach(pendingAcquire => {
                pendingAcquire.possibleTimeoutCause = err;
            });
            // Not returned on purpose.
            utils_1.delay(this.createRetryIntervalMillis).then(() => this._tryAcquireOrCreate());
        });
    }
    _create() {
        const eventId = this.eventId++;
        this._executeEventHandlers('createRequest', eventId);
        const pendingCreate = new PendingOperation_1.PendingOperation(this.createTimeoutMillis);
        // If an error occurs (likely a create timeout) remove this creation from
        // the list of pending creations so we try to create a new one.
        pendingCreate.promise = pendingCreate.promise.catch(err => {
            if (remove(this.pendingCreates, pendingCreate)) {
                // TODO: figure out more consistent way for different error handlers in next rewrite
                this._executeEventHandlers('createFail', eventId, err);
            }
            throw err;
        });
        this.pendingCreates.push(pendingCreate);
        callbackOrPromise(this.creator)
            .then(resource => {
            if (pendingCreate.isRejected) {
                this.destroyer(resource);
                return null;
            }
            remove(this.pendingCreates, pendingCreate);
            this.free.push(new Resource_1.Resource(resource));
            // Not returned on purpose.
            pendingCreate.resolve(resource);
            this._executeEventHandlers('createSuccess', eventId, resource);
            return null;
        })
            .catch(err => {
            if (pendingCreate.isRejected) {
                return null;
            }
            if (remove(this.pendingCreates, pendingCreate)) {
                this._executeEventHandlers('createFail', eventId, err);
            }
            // Not returned on purpose.
            pendingCreate.reject(err);
            return null;
        });
        return pendingCreate;
    }
    _destroy(resource) {
        const eventId = this.eventId++;
        this._executeEventHandlers('destroyRequest', eventId, resource);
        // this.destroyer can be both synchronous and asynchronous.
        // so we wrap it to promise to get all exceptions through same pipeline
        const pendingDestroy = new PendingOperation_1.PendingOperation(this.destroyTimeoutMillis);
        const retVal = Promise.resolve().then(() => this.destroyer(resource));
        retVal
            .then(() => {
            pendingDestroy.resolve(resource);
        })
            .catch((err) => {
            pendingDestroy.reject(err);
        });
        this.pendingDestroys.push(pendingDestroy);
        // In case of an error there's nothing we can do here but log it.
        return pendingDestroy.promise
            .then(res => {
            this._executeEventHandlers('destroySuccess', eventId, resource);
            return res;
        })
            .catch(err => this._logDestroyerError(eventId, resource, err))
            .then(res => {
            const index = this.pendingDestroys.findIndex(pd => pd === pendingDestroy);
            this.pendingDestroys.splice(index, 1);
            return res;
        });
    }
    _logDestroyerError(eventId, resource, err) {
        this._executeEventHandlers('destroyFail', eventId, resource, err);
        this.log('Tarn: resource destroyer threw an exception ' + err.stack, 'warn');
    }
    _startReaping() {
        if (!this.interval) {
            this._executeEventHandlers('startReaping');
            this.interval = setInterval(() => this.check(), this.reapIntervalMillis);
        }
    }
    _stopReaping() {
        if (this.interval !== null) {
            this._executeEventHandlers('stopReaping');
            timers_1.clearInterval(this.interval);
        }
        this.interval = null;
    }
    _executeEventHandlers(eventName, ...args) {
        const listeners = this.emitter.listeners(eventName);
        // just calling .emit() would stop running rest of the listeners if one them fails
        listeners.forEach(listener => {
            try {
                listener(...args);
            }
            catch (err) {
                // There's nothing we can do here but log the error. This would otherwise
                // leak out as an unhandled exception.
                this.log(`Tarn: event handler "${eventName}" threw an exception ${err.stack}`, 'warn');
            }
        });
    }
}
exports.Pool = Pool;
function remove(arr, item) {
    const idx = arr.indexOf(item);
    if (idx === -1) {
        return false;
    }
    else {
        arr.splice(idx, 1);
        return true;
    }
}
function callbackOrPromise(func) {
    return new Promise((resolve, reject) => {
        const callback = (err, resource) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(resource);
            }
        };
        utils_1.tryPromise(() => func(callback))
            .then(res => {
            // If the result is falsy, we assume that the callback will
            // be called instead of interpreting the falsy value as a
            // result value.
            if (res) {
                resolve(res);
            }
        })
            .catch(err => {
            reject(err);
        });
    });
}
