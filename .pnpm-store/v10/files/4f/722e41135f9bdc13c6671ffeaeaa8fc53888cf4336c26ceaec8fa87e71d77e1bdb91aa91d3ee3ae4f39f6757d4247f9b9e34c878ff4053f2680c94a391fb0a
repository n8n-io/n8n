"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const get_timer_1 = __importDefault(require("./get-timer"));
class KeepaliveManager {
    get keepaliveTimeoutTimestamp() {
        return this._keepaliveTimeoutTimestamp;
    }
    get intervalEvery() {
        return this._intervalEvery;
    }
    get keepalive() {
        return this._keepalive;
    }
    constructor(client, variant) {
        this.destroyed = false;
        this.client = client;
        this.timer = (0, get_timer_1.default)(variant);
        this.setKeepalive(client.options.keepalive);
    }
    clear() {
        if (this.timerId) {
            this.timer.clear(this.timerId);
            this.timerId = null;
        }
    }
    setKeepalive(value) {
        value *= 1000;
        if (isNaN(value) ||
            value <= 0 ||
            value > 2147483647) {
            throw new Error(`Keepalive value must be an integer between 0 and 2147483647. Provided value is ${value}`);
        }
        this._keepalive = value;
        this.reschedule();
        this.client['log'](`KeepaliveManager: set keepalive to ${value}ms`);
    }
    destroy() {
        this.clear();
        this.destroyed = true;
    }
    reschedule() {
        if (this.destroyed) {
            return;
        }
        this.clear();
        this.counter = 0;
        const keepAliveTimeout = Math.ceil(this._keepalive * 1.5);
        this._keepaliveTimeoutTimestamp = Date.now() + keepAliveTimeout;
        this._intervalEvery = Math.ceil(this._keepalive / 2);
        this.timerId = this.timer.set(() => {
            if (this.destroyed) {
                return;
            }
            this.counter += 1;
            if (this.counter === 2) {
                this.client.sendPing();
            }
            else if (this.counter > 2) {
                this.client.onKeepaliveTimeout();
            }
        }, this._intervalEvery);
    }
}
exports.default = KeepaliveManager;
//# sourceMappingURL=KeepaliveManager.js.map