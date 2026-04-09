import { Cursor } from "../cursor.js";
import type { WsClient } from "./client.js";
import type * as proto from "./proto.js";
import type { WsStream } from "./stream.js";
export declare class WsCursor extends Cursor {
    #private;
    /** @private */
    constructor(client: WsClient, stream: WsStream, cursorId: number);
    /** Fetch the next entry from the cursor. */
    next(): Promise<proto.CursorEntry | undefined>;
    /** @private */
    _setClosed(error: Error): void;
    /** Close the cursor. */
    close(): void;
    /** True if the cursor is closed. */
    get closed(): boolean;
}
