import type { ProtocolEncoding } from "../client.js";
import { Cursor } from "../cursor.js";
import type * as proto from "./proto.js";
import type { HttpStream } from "./stream.js";
export declare class HttpCursor extends Cursor {
    #private;
    /** @private */
    constructor(stream: HttpStream, encoding: ProtocolEncoding);
    open(response: Response): Promise<proto.CursorRespBody>;
    /** Fetch the next entry from the cursor. */
    next(): Promise<proto.CursorEntry | undefined>;
    /** Close the cursor. */
    close(): void;
    /** @private */
    _setClosed(error: Error): void;
    /** True if the cursor is closed. */
    get closed(): boolean;
}
