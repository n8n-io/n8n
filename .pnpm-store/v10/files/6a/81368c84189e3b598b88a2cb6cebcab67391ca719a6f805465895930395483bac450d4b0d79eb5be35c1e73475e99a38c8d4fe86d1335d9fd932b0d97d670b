import { ClientError, ClosedError } from "../errors.js";
import { Cursor } from "../cursor.js";
import { Queue } from "../queue.js";
const fetchChunkSize = 1000;
const fetchQueueSize = 10;
export class WsCursor extends Cursor {
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
        this.#entryQueue = new Queue();
        this.#fetchQueue = new Queue();
        this.#closed = undefined;
        this.#done = false;
    }
    /** Fetch the next entry from the cursor. */
    async next() {
        for (;;) {
            if (this.#closed !== undefined) {
                throw new ClosedError("Cursor is closed", this.#closed);
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
        this._setClosed(new ClientError("Cursor was manually closed"));
    }
    /** True if the cursor is closed. */
    get closed() {
        return this.#closed !== undefined;
    }
}
