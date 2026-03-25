"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
/**
 * Convenient class to convert the process of scanning keys to a readable stream.
 */
class ScanStream extends stream_1.Readable {
    constructor(opt) {
        super(opt);
        this.opt = opt;
        this._redisCursor = "0";
        this._redisDrained = false;
    }
    _read() {
        if (this._redisDrained) {
            this.push(null);
            return;
        }
        const args = [this._redisCursor];
        if (this.opt.key) {
            args.unshift(this.opt.key);
        }
        if (this.opt.match) {
            args.push("MATCH", this.opt.match);
        }
        if (this.opt.type) {
            args.push("TYPE", this.opt.type);
        }
        if (this.opt.count) {
            args.push("COUNT", String(this.opt.count));
        }
        this.opt.redis[this.opt.command](args, (err, res) => {
            if (err) {
                this.emit("error", err);
                return;
            }
            this._redisCursor = res[0] instanceof Buffer ? res[0].toString() : res[0];
            if (this._redisCursor === "0") {
                this._redisDrained = true;
            }
            this.push(res[1]);
        });
    }
    close() {
        this._redisDrained = true;
    }
}
exports.default = ScanStream;
