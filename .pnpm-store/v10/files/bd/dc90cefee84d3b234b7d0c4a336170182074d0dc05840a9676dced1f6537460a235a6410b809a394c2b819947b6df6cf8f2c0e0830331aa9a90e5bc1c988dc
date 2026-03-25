"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readable_stream_1 = require("readable-stream");
const streamsOpts = { objectMode: true };
const defaultStoreOptions = {
    clean: true,
};
class Store {
    constructor(options) {
        this.options = options || {};
        this.options = Object.assign(Object.assign({}, defaultStoreOptions), options);
        this._inflights = new Map();
    }
    put(packet, cb) {
        this._inflights.set(packet.messageId, packet);
        if (cb) {
            cb();
        }
        return this;
    }
    createStream() {
        const stream = new readable_stream_1.Readable(streamsOpts);
        const values = [];
        let destroyed = false;
        let i = 0;
        this._inflights.forEach((value, key) => {
            values.push(value);
        });
        stream._read = () => {
            if (!destroyed && i < values.length) {
                stream.push(values[i++]);
            }
            else {
                stream.push(null);
            }
        };
        stream.destroy = (err) => {
            if (destroyed) {
                return;
            }
            destroyed = true;
            setTimeout(() => {
                stream.emit('close');
            }, 0);
            return stream;
        };
        return stream;
    }
    del(packet, cb) {
        const toDelete = this._inflights.get(packet.messageId);
        if (toDelete) {
            this._inflights.delete(packet.messageId);
            cb(null, toDelete);
        }
        else if (cb) {
            cb(new Error('missing packet'));
        }
        return this;
    }
    get(packet, cb) {
        const storedPacket = this._inflights.get(packet.messageId);
        if (storedPacket) {
            cb(null, storedPacket);
        }
        else if (cb) {
            cb(new Error('missing packet'));
        }
        return this;
    }
    close(cb) {
        if (this.options.clean) {
            this._inflights = null;
        }
        if (cb) {
            cb();
        }
    }
}
exports.default = Store;
//# sourceMappingURL=store.js.map