"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsCursor = void 0;
const errors_js_1 = require("../errors.js");
const cursor_js_1 = require("../cursor.js");
const queue_js_1 = require("../queue.js");
const fetchChunkSize = 1000;
const fetchQueueSize = 10;
class WsCursor extends cursor_js_1.Cursor {
    #client;
    #stream;
    #cursorId;
    #entryQueue;
    #fetchQueue;
    #closed;
    #done;
    /** @private */
    constructor(client, stream, cursorId) {
        super();
        this.#client = client;
        this.#stream = stream;
        this.#cursorId = cursorId;
        this.#entryQueue = new queue_js_1.Queue();
        this.#fetchQueue = new queue_js_1.Queue();
        this.#closed = undefined;
        this.#done = false;
    }
    /** Fetch the next entry from the cursor. */
    async next() {
        for (;;) {
            if (this.#closed !== undefined) {
                throw new errors_js_1.ClosedError("Cursor is closed", this.#closed);
            }
            while (!this.#done && this.#fetchQueue.length < fetchQueueSize) {
                this.#fetchQueue.push(this.#fetch());
            }
            const entry = this.#entryQueue.shift();
            if (this.#done || entry !== undefined) {
                return entry;
            }
            // we assume that `Cursor.next()` is never called concurrently
            await this.#fetchQueue.shift().then((response) => {
                if (response === undefined) {
                    return;
                }
                for (const entry of response.entries) {
                    this.#entryQueue.push(entry);
                }
                this.#done ||= response.done;
            });
        }
    }
    #fetch() {
        return this.#stream._sendCursorRequest(this, {
            type: "fetch_cursor",
            cursorId: this.#cursorId,
            maxCount: fetchChunkSize,
        }).then((resp) => resp, (error) => {
            this._setClosed(error);
            return undefined;
        });
    }
    /** @private */
    _setClosed(error) {
        if (this.#closed !== undefined) {
            return;
        }
        this.#closed = error;
        this.#stream._sendCursorRequest(this, {
            type: "close_cursor",
            cursorId: this.#cursorId,
        }).catch(() => undefined);
        this.#stream._cursorClosed(this);
    }
    /** Close the cursor. */
    close() {
        this._setClosed(new errors_js_1.ClientError("Cursor was manually closed"));
    }
    /** True if the cursor is closed. */
    get closed() {
        return this.#closed !== undefined;
    }
}
exports.WsCursor = WsCursor;
