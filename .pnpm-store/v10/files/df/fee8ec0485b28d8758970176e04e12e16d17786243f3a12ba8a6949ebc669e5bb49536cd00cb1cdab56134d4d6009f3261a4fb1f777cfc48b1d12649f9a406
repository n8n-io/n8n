"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientAttributes = void 0;
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const semconv_1 = require("../semconv");
const instrumentation_1 = require("@opentelemetry/instrumentation");
function getClientAttributes(diag, options, semconvStability) {
    const attributes = {};
    if (semconvStability & instrumentation_1.SemconvStability.OLD) {
        Object.assign(attributes, {
            [semconv_1.ATTR_DB_SYSTEM]: semconv_1.DB_SYSTEM_VALUE_REDIS,
            [semconv_1.ATTR_NET_PEER_NAME]: options?.socket?.host,
            [semconv_1.ATTR_NET_PEER_PORT]: options?.socket?.port,
            [semconv_1.ATTR_DB_CONNECTION_STRING]: removeCredentialsFromDBConnectionStringAttribute(diag, options?.url),
        });
    }
    if (semconvStability & instrumentation_1.SemconvStability.STABLE) {
        Object.assign(attributes, {
            [semantic_conventions_1.ATTR_DB_SYSTEM_NAME]: semconv_1.DB_SYSTEM_NAME_VALUE_REDIS,
            [semantic_conventions_1.ATTR_SERVER_ADDRESS]: options?.socket?.host,
            [semantic_conventions_1.ATTR_SERVER_PORT]: options?.socket?.port,
        });
    }
    return attributes;
}
exports.getClientAttributes = getClientAttributes;
/**
 * removeCredentialsFromDBConnectionStringAttribute removes basic auth from url and user_pwd from query string
 *
 * Examples:
 *   redis://user:pass@localhost:6379/mydb => redis://localhost:6379/mydb
 *   redis://localhost:6379?db=mydb&user_pwd=pass => redis://localhost:6379?db=mydb
 */
function removeCredentialsFromDBConnectionStringAttribute(diag, url) {
    if (typeof url !== 'string' || !url) {
        return;
    }
    try {
        const u = new URL(url);
        u.searchParams.delete('user_pwd');
        u.username = '';
        u.password = '';
        return u.href;
    }
    catch (err) {
        diag.error('failed to sanitize redis connection url', err);
    }
    return;
}
//# sourceMappingURL=utils.js.map