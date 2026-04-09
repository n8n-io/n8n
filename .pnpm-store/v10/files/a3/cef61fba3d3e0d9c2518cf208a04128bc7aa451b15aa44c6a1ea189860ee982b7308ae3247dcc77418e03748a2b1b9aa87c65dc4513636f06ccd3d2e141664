import type { Stream } from "./stream.js";
import type { IntMode } from "./value.js";
export type ProtocolVersion = 1 | 2 | 3;
export type ProtocolEncoding = "json" | "protobuf";
/** A client for the Hrana protocol (a "database connection pool"). */
export declare abstract class Client {
    /** @private */
    constructor();
    /** Get the protocol version negotiated with the server. */
    abstract getVersion(): Promise<ProtocolVersion>;
    /** @private */
    abstract _ensureVersion(minVersion: ProtocolVersion, feature: string): void;
    /** Open a {@link Stream}, a stream for executing SQL statements. */
    abstract openStream(): Stream;
    /** Immediately close the client.
     *
     * This closes the client immediately, aborting any pending operations.
     */
    abstract close(): void;
    /** True if the client is closed. */
    abstract get closed(): boolean;
    /** Representation of integers returned from the database. See {@link IntMode}.
     *
     * This value is inherited by {@link Stream} objects created with {@link openStream}, but you can
     * override the integer mode for every stream by setting {@link Stream.intMode} on the stream.
     */
    intMode: IntMode;
}
