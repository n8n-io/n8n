import { WebSocket } from "@libsql/isomorphic-ws";
import { subprotocolsV2, subprotocolsV3 } from "./ws/client.js";
import { WebSocketUnsupportedError } from "./errors.js";
import { HttpClient } from "./http/client.js";
import { WsClient } from "./ws/client.js";
export { WebSocket } from "@libsql/isomorphic-ws";
export { fetch, Request, Headers } from "cross-fetch";
export { Client } from "./client.js";
export * from "./errors.js";
export { Batch, BatchStep, BatchCond } from "./batch.js";
export { parseLibsqlUrl } from "./libsql_url.js";
export { Sql } from "./sql.js";
export { Stmt } from "./stmt.js";
export { Stream } from "./stream.js";
export { HttpClient } from "./http/client.js";
export { HttpStream } from "./http/stream.js";
export { WsClient } from "./ws/client.js";
export { WsStream } from "./ws/stream.js";
/** Open a Hrana client over WebSocket connected to the given `url`. */
export function openWs(url, jwt, protocolVersion = 2) {
    if (typeof WebSocket === "undefined") {
        throw new WebSocketUnsupportedError("WebSockets are not supported in this environment");
    }
    var subprotocols = undefined;
    if (protocolVersion == 3) {
        subprotocols = Array.from(subprotocolsV3.keys());
    }
    else {
        subprotocols = Array.from(subprotocolsV2.keys());
    }
    const socket = new WebSocket(url, subprotocols);
    return new WsClient(socket, jwt);
}
/** Open a Hrana client over HTTP connected to the given `url`.
 *
 * If the `customFetch` argument is passed and not `undefined`, it is used in place of the `fetch` function
 * from `cross-fetch`. This function is always called with a `Request` object from
 * `cross-fetch`.
 */
export function openHttp(url, jwt, customFetch, remoteEncryptionKey, protocolVersion = 2) {
    return new HttpClient(url instanceof URL ? url : new URL(url), jwt, customFetch, remoteEncryptionKey, protocolVersion);
}
