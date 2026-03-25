"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareSocket = void 0;
const events_1 = require("events");
/**
 * Wrapper around the Cloudflare built-in socket that can be used by the `Connection`.
 */
class CloudflareSocket extends events_1.EventEmitter {
    constructor(ssl) {
        super();
        this.ssl = ssl;
        this.writable = false;
        this.destroyed = false;
        this._upgrading = false;
        this._upgraded = false;
        this._cfSocket = null;
        this._cfWriter = null;
        this._cfReader = null;
    }
    setNoDelay() {
        return this;
    }
    setKeepAlive() {
        return this;
    }
    ref() {
        return this;
    }
    unref() {
        return this;
    }
    async connect(port, host, connectListener) {
        try {
            log('connecting');
            if (connectListener)
                this.once('connect', connectListener);
            const options = this.ssl ? { secureTransport: 'starttls' } : {};
            const mod = await import('cloudflare:sockets');
            const connect = mod.connect;
            this._cfSocket = connect(`${host}:${port}`, options);
            this._cfWriter = this._cfSocket.writable.getWriter();
            this._addClosedHandler();
            this._cfReader = this._cfSocket.readable.getReader();
            if (this.ssl) {
                this._listenOnce().catch((e) => this.emit('error', e));
            }
            else {
                this._listen().catch((e) => this.emit('error', e));
            }
            await this._cfWriter.ready;
            log('socket ready');
            this.writable = true;
            this.emit('connect');
            return this;
        }
        catch (e) {
            this.emit('error', e);
        }
    }
    async _listen() {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            log('awaiting receive from CF socket');
            const { done, value } = await this._cfReader.read();
            log('CF socket received:', done, value);
            if (done) {
                log('done');
                break;
            }
            this.emit('data', Buffer.from(value));
        }
    }
    async _listenOnce() {
        log('awaiting first receive from CF socket');
        const { done, value } = await this._cfReader.read();
        log('First CF socket received:', done, value);
        this.emit('data', Buffer.from(value));
    }
    write(data, encoding = 'utf8', callback = () => { }) {
        if (data.length === 0)
            return callback();
        if (typeof data === 'string')
            data = Buffer.from(data, encoding);
        log('sending data direct:', data);
        this._cfWriter.write(data).then(() => {
            log('data sent');
            callback();
        }, (err) => {
            log('send error', err);
            callback(err);
        });
        return true;
    }
    end(data = Buffer.alloc(0), encoding = 'utf8', callback = () => { }) {
        log('ending CF socket');
        this.write(data, encoding, (err) => {
            this._cfSocket.close();
            if (callback)
                callback(err);
        });
        return this;
    }
    destroy(reason) {
        log('destroying CF socket', reason);
        this.destroyed = true;
        return this.end();
    }
    startTls(options) {
        if (this._upgraded) {
            // Don't try to upgrade again.
            this.emit('error', 'Cannot call `startTls()` more than once on a socket');
            return;
        }
        this._cfWriter.releaseLock();
        this._cfReader.releaseLock();
        this._upgrading = true;
        this._cfSocket = this._cfSocket.startTls(options);
        this._cfWriter = this._cfSocket.writable.getWriter();
        this._cfReader = this._cfSocket.readable.getReader();
        this._addClosedHandler();
        this._listen().catch((e) => this.emit('error', e));
    }
    _addClosedHandler() {
        this._cfSocket.closed.then(() => {
            if (!this._upgrading) {
                log('CF socket closed');
                this._cfSocket = null;
                this.emit('close');
            }
            else {
                this._upgrading = false;
                this._upgraded = true;
            }
        }).catch((e) => this.emit('error', e));
    }
}
exports.CloudflareSocket = CloudflareSocket;
const debug = false;
function dump(data) {
    if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
        const hex = Buffer.from(data).toString('hex');
        const str = new TextDecoder().decode(data);
        return `\n>>> STR: "${str.replace(/\n/g, '\\n')}"\n>>> HEX: ${hex}\n`;
    }
    else {
        return data;
    }
}
function log(...args) {
    debug && console.log(...args.map(dump));
}
//# sourceMappingURL=index.js.map