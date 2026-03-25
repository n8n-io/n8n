'use strict';

class AbortSignal {
    onabort = null;
    _aborted = false;
    constructor() {
        Object.defineProperty(this, "_aborted", {
            value: false,
            writable: true,
        });
    }
    get aborted() {
        return this._aborted;
    }
    abort() {
        this._aborted = true;
        if (this.onabort) {
            this.onabort(this);
            this.onabort = null;
        }
    }
}

class AbortController {
    signal = new AbortSignal();
    abort() {
        this.signal.abort();
    }
}

exports.AbortController = AbortController;
exports.AbortSignal = AbortSignal;
