import { LibsqlError } from "@libsql/core/api";
import { expandConfig } from "@libsql/core/config";
import { supportedUrlLink } from "@libsql/core/util";
import { _createClient as _createWsClient } from "./ws.js";
import { _createClient as _createHttpClient } from "./http.js";
export * from "@libsql/core/api";
export function createClient(config) {
    return _createClient(expandConfig(config, true));
}
/** @private */
export function _createClient(config) {
    if (config.scheme === "ws" || config.scheme === "wss") {
        return _createWsClient(config);
    }
    else if (config.scheme === "http" || config.scheme === "https") {
        return _createHttpClient(config);
    }
    else {
        throw new LibsqlError('The client that uses Web standard APIs supports only "libsql:", "wss:", "ws:", "https:" and "http:" URLs, ' +
            `got ${JSON.stringify(config.scheme + ":")}. For more information, please read ${supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
    }
}
