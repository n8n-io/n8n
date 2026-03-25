import type { RequestContext } from "@smithy/types";
import type { ConnectConfiguration } from "@smithy/types";
import type { ConnectionManager, ConnectionManagerConfiguration } from "@smithy/types";
import type { ClientHttp2Session } from "http2";
/**
 * @public
 */
export declare class NodeHttp2ConnectionManager implements ConnectionManager<ClientHttp2Session> {
    constructor(config: ConnectionManagerConfiguration);
    private config;
    private readonly sessionCache;
    lease(requestContext: RequestContext, connectionConfiguration: ConnectConfiguration): ClientHttp2Session;
    /**
     * Delete a session from the connection pool.
     * @param authority The authority of the session to delete.
     * @param session The session to delete.
     */
    deleteSession(authority: string, session: ClientHttp2Session): void;
    release(requestContext: RequestContext, session: ClientHttp2Session): void;
    destroy(): void;
    setMaxConcurrentStreams(maxConcurrentStreams: number): void;
    setDisableConcurrentStreams(disableConcurrentStreams: boolean): void;
    private getUrlString;
}
