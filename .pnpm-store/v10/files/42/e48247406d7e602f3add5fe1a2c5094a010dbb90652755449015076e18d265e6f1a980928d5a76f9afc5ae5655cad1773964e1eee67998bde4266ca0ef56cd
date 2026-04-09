import { expandConfig } from "@libsql/core/config";
import { _createClient as _createSqlite3Client } from "./sqlite3.js";
import { _createClient as _createWsClient } from "./ws.js";
import { _createClient as _createHttpClient } from "./http.js";
export * from "@libsql/core/api";
/** Creates a {@link Client} object.
 *
 * You must pass at least an `url` in the {@link Config} object.
 */
export function createClient(config) {
    return _createClient(expandConfig(config, true));
}
function _createClient(config) {
    if (config.scheme === "wss" || config.scheme === "ws") {
        return _createWsClient(config);
    }
    else if (config.scheme === "https" || config.scheme === "http") {
        return _createHttpClient(config);
    }
    else {
        return _createSqlite3Client(config);
    }
}
