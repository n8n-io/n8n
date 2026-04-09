import type * as proto from "./shared/proto.js";
export declare abstract class Cursor {
    /** Fetch the next entry from the cursor. */
    abstract next(): Promise<proto.CursorEntry | undefined>;
    /** Close the cursor. */
    abstract close(): void;
    /** True if the cursor is closed. */
    abstract get closed(): boolean;
}
