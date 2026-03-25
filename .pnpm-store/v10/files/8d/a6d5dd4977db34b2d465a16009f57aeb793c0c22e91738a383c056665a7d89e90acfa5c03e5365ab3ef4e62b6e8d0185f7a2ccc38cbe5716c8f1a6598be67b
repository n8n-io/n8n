"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPECIAL_HEADERS = exports.MINOR = exports.MAJOR = exports.HTAB_SP_VCHAR_OBS_TEXT = exports.QUOTED_STRING = exports.CONNECTION_TOKEN_CHARS = exports.HEADER_CHARS = exports.TOKEN = exports.HEX = exports.URL_CHAR = exports.USERINFO_CHARS = exports.MARK = exports.ALPHANUM = exports.NUM = exports.HEX_MAP = exports.NUM_MAP = exports.ALPHA = exports.STATUSES_HTTP = exports.H_METHOD_MAP = exports.METHOD_MAP = exports.METHODS_RTSP = exports.METHODS_ICE = exports.METHODS_HTTP = exports.HEADER_STATE = exports.FINISH = exports.STATUSES = exports.METHODS = exports.LENIENT_FLAGS = exports.FLAGS = exports.TYPE = exports.ERROR = void 0;
const utils_1 = require("./utils");
// Emums
exports.ERROR = {
    OK: 0,
    INTERNAL: 1,
    STRICT: 2,
    CR_EXPECTED: 25,
    LF_EXPECTED: 3,
    UNEXPECTED_CONTENT_LENGTH: 4,
    UNEXPECTED_SPACE: 30,
    CLOSED_CONNECTION: 5,
    INVALID_METHOD: 6,
    INVALID_URL: 7,
    INVALID_CONSTANT: 8,
    INVALID_VERSION: 9,
    INVALID_HEADER_TOKEN: 10,
    INVALID_CONTENT_LENGTH: 11,
    INVALID_CHUNK_SIZE: 12,
    INVALID_STATUS: 13,
    INVALID_EOF_STATE: 14,
    INVALID_TRANSFER_ENCODING: 15,
    CB_MESSAGE_BEGIN: 16,
    CB_HEADERS_COMPLETE: 17,
    CB_MESSAGE_COMPLETE: 18,
    CB_CHUNK_HEADER: 19,
    CB_CHUNK_COMPLETE: 20,
    PAUSED: 21,
    PAUSED_UPGRADE: 22,
    PAUSED_H2_UPGRADE: 23,
    USER: 24,
    CB_URL_COMPLETE: 26,
    CB_STATUS_COMPLETE: 27,
    CB_METHOD_COMPLETE: 32,
    CB_VERSION_COMPLETE: 33,
    CB_HEADER_FIELD_COMPLETE: 28,
    CB_HEADER_VALUE_COMPLETE: 29,
    CB_CHUNK_EXTENSION_NAME_COMPLETE: 34,
    CB_CHUNK_EXTENSION_VALUE_COMPLETE: 35,
    CB_RESET: 31,
    CB_PROTOCOL_COMPLETE: 38,
};
exports.TYPE = {
    BOTH: 0, // default
    REQUEST: 1,
    RESPONSE: 2,
};
exports.FLAGS = {
    CONNECTION_KEEP_ALIVE: 1 << 0,
    CONNECTION_CLOSE: 1 << 1,
    CONNECTION_UPGRADE: 1 << 2,
    CHUNKED: 1 << 3,
    UPGRADE: 1 << 4,
    CONTENT_LENGTH: 1 << 5,
    SKIPBODY: 1 << 6,
    TRAILING: 1 << 7,
    // 1 << 8 is unused
    TRANSFER_ENCODING: 1 << 9,
};
exports.LENIENT_FLAGS = {
    HEADERS: 1 << 0,
    CHUNKED_LENGTH: 1 << 1,
    KEEP_ALIVE: 1 << 2,
    TRANSFER_ENCODING: 1 << 3,
    VERSION: 1 << 4,
    DATA_AFTER_CLOSE: 1 << 5,
    OPTIONAL_LF_AFTER_CR: 1 << 6,
    OPTIONAL_CRLF_AFTER_CHUNK: 1 << 7,
    OPTIONAL_CR_BEFORE_LF: 1 << 8,
    SPACES_AFTER_CHUNK_SIZE: 1 << 9,
};
exports.METHODS = {
    'DELETE': 0,
    'GET': 1,
    'HEAD': 2,
    'POST': 3,
    'PUT': 4,
    /* pathological */
    'CONNECT': 5,
    'OPTIONS': 6,
    'TRACE': 7,
    /* WebDAV */
    'COPY': 8,
    'LOCK': 9,
    'MKCOL': 10,
    'MOVE': 11,
    'PROPFIND': 12,
    'PROPPATCH': 13,
    'SEARCH': 14,
    'UNLOCK': 15,
    'BIND': 16,
    'REBIND': 17,
    'UNBIND': 18,
    'ACL': 19,
    /* subversion */
    'REPORT': 20,
    'MKACTIVITY': 21,
    'CHECKOUT': 22,
    'MERGE': 23,
    /* upnp */
    'M-SEARCH': 24,
    'NOTIFY': 25,
    'SUBSCRIBE': 26,
    'UNSUBSCRIBE': 27,
    /* RFC-5789 */
    'PATCH': 28,
    'PURGE': 29,
    /* CalDAV */
    'MKCALENDAR': 30,
    /* RFC-2068, section 19.6.1.2 */
    'LINK': 31,
    'UNLINK': 32,
    /* icecast */
    'SOURCE': 33,
    /* RFC-7540, section 11.6 */
    'PRI': 34,
    /* RFC-2326 RTSP */
    'DESCRIBE': 35,
    'ANNOUNCE': 36,
    'SETUP': 37,
    'PLAY': 38,
    'PAUSE': 39,
    'TEARDOWN': 40,
    'GET_PARAMETER': 41,
    'SET_PARAMETER': 42,
    'REDIRECT': 43,
    'RECORD': 44,
    /* RAOP */
    'FLUSH': 45,
    /* DRAFT https://www.ietf.org/archive/id/draft-ietf-httpbis-safe-method-w-body-02.html */
    'QUERY': 46,
};
exports.STATUSES = {
    CONTINUE: 100,
    SWITCHING_PROTOCOLS: 101,
    PROCESSING: 102,
    EARLY_HINTS: 103,
    RESPONSE_IS_STALE: 110, // Unofficial
    REVALIDATION_FAILED: 111, // Unofficial
    DISCONNECTED_OPERATION: 112, // Unofficial
    HEURISTIC_EXPIRATION: 113, // Unofficial
    MISCELLANEOUS_WARNING: 199, // Unofficial
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NON_AUTHORITATIVE_INFORMATION: 203,
    NO_CONTENT: 204,
    RESET_CONTENT: 205,
    PARTIAL_CONTENT: 206,
    MULTI_STATUS: 207,
    ALREADY_REPORTED: 208,
    TRANSFORMATION_APPLIED: 214, // Unofficial
    IM_USED: 226,
    MISCELLANEOUS_PERSISTENT_WARNING: 299, // Unofficial
    MULTIPLE_CHOICES: 300,
    MOVED_PERMANENTLY: 301,
    FOUND: 302,
    SEE_OTHER: 303,
    NOT_MODIFIED: 304,
    USE_PROXY: 305,
    SWITCH_PROXY: 306, // No longer used
    TEMPORARY_REDIRECT: 307,
    PERMANENT_REDIRECT: 308,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCEPTABLE: 406,
    PROXY_AUTHENTICATION_REQUIRED: 407,
    REQUEST_TIMEOUT: 408,
    CONFLICT: 409,
    GONE: 410,
    LENGTH_REQUIRED: 411,
    PRECONDITION_FAILED: 412,
    PAYLOAD_TOO_LARGE: 413,
    URI_TOO_LONG: 414,
    UNSUPPORTED_MEDIA_TYPE: 415,
    RANGE_NOT_SATISFIABLE: 416,
    EXPECTATION_FAILED: 417,
    IM_A_TEAPOT: 418,
    PAGE_EXPIRED: 419, // Unofficial
    ENHANCE_YOUR_CALM: 420, // Unofficial
    MISDIRECTED_REQUEST: 421,
    UNPROCESSABLE_ENTITY: 422,
    LOCKED: 423,
    FAILED_DEPENDENCY: 424,
    TOO_EARLY: 425,
    UPGRADE_REQUIRED: 426,
    PRECONDITION_REQUIRED: 428,
    TOO_MANY_REQUESTS: 429,
    REQUEST_HEADER_FIELDS_TOO_LARGE_UNOFFICIAL: 430, // Unofficial
    REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
    LOGIN_TIMEOUT: 440, // Unofficial
    NO_RESPONSE: 444, // Unofficial
    RETRY_WITH: 449, // Unofficial
    BLOCKED_BY_PARENTAL_CONTROL: 450, // Unofficial
    UNAVAILABLE_FOR_LEGAL_REASONS: 451,
    CLIENT_CLOSED_LOAD_BALANCED_REQUEST: 460, // Unofficial
    INVALID_X_FORWARDED_FOR: 463, // Unofficial
    REQUEST_HEADER_TOO_LARGE: 494, // Unofficial
    SSL_CERTIFICATE_ERROR: 495, // Unofficial
    SSL_CERTIFICATE_REQUIRED: 496, // Unofficial
    HTTP_REQUEST_SENT_TO_HTTPS_PORT: 497, // Unofficial
    INVALID_TOKEN: 498, // Unofficial
    CLIENT_CLOSED_REQUEST: 499, // Unofficial
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    HTTP_VERSION_NOT_SUPPORTED: 505,
    VARIANT_ALSO_NEGOTIATES: 506,
    INSUFFICIENT_STORAGE: 507,
    LOOP_DETECTED: 508,
    BANDWIDTH_LIMIT_EXCEEDED: 509,
    NOT_EXTENDED: 510,
    NETWORK_AUTHENTICATION_REQUIRED: 511,
    WEB_SERVER_UNKNOWN_ERROR: 520, // Unofficial
    WEB_SERVER_IS_DOWN: 521, // Unofficial
    CONNECTION_TIMEOUT: 522, // Unofficial
    ORIGIN_IS_UNREACHABLE: 523, // Unofficial
    TIMEOUT_OCCURED: 524, // Unofficial
    SSL_HANDSHAKE_FAILED: 525, // Unofficial
    INVALID_SSL_CERTIFICATE: 526, // Unofficial
    RAILGUN_ERROR: 527, // Unofficial
    SITE_IS_OVERLOADED: 529, // Unofficial
    SITE_IS_FROZEN: 530, // Unofficial
    IDENTITY_PROVIDER_AUTHENTICATION_ERROR: 561, // Unofficial
    NETWORK_READ_TIMEOUT: 598, // Unofficial
    NETWORK_CONNECT_TIMEOUT: 599, // Unofficial
};
exports.FINISH = {
    SAFE: 0,
    SAFE_WITH_CB: 1,
    UNSAFE: 2,
};
exports.HEADER_STATE = {
    GENERAL: 0,
    CONNECTION: 1,
    CONTENT_LENGTH: 2,
    TRANSFER_ENCODING: 3,
    UPGRADE: 4,
    CONNECTION_KEEP_ALIVE: 5,
    CONNECTION_CLOSE: 6,
    CONNECTION_UPGRADE: 7,
    TRANSFER_ENCODING_CHUNKED: 8,
};
// C headers
exports.METHODS_HTTP = [
    exports.METHODS.DELETE,
    exports.METHODS.GET,
    exports.METHODS.HEAD,
    exports.METHODS.POST,
    exports.METHODS.PUT,
    exports.METHODS.CONNECT,
    exports.METHODS.OPTIONS,
    exports.METHODS.TRACE,
    exports.METHODS.COPY,
    exports.METHODS.LOCK,
    exports.METHODS.MKCOL,
    exports.METHODS.MOVE,
    exports.METHODS.PROPFIND,
    exports.METHODS.PROPPATCH,
    exports.METHODS.SEARCH,
    exports.METHODS.UNLOCK,
    exports.METHODS.BIND,
    exports.METHODS.REBIND,
    exports.METHODS.UNBIND,
    exports.METHODS.ACL,
    exports.METHODS.REPORT,
    exports.METHODS.MKACTIVITY,
    exports.METHODS.CHECKOUT,
    exports.METHODS.MERGE,
    exports.METHODS['M-SEARCH'],
    exports.METHODS.NOTIFY,
    exports.METHODS.SUBSCRIBE,
    exports.METHODS.UNSUBSCRIBE,
    exports.METHODS.PATCH,
    exports.METHODS.PURGE,
    exports.METHODS.MKCALENDAR,
    exports.METHODS.LINK,
    exports.METHODS.UNLINK,
    exports.METHODS.PRI,
    // TODO(indutny): should we allow it with HTTP?
    exports.METHODS.SOURCE,
    exports.METHODS.QUERY,
];
exports.METHODS_ICE = [
    exports.METHODS.SOURCE,
];
exports.METHODS_RTSP = [
    exports.METHODS.OPTIONS,
    exports.METHODS.DESCRIBE,
    exports.METHODS.ANNOUNCE,
    exports.METHODS.SETUP,
    exports.METHODS.PLAY,
    exports.METHODS.PAUSE,
    exports.METHODS.TEARDOWN,
    exports.METHODS.GET_PARAMETER,
    exports.METHODS.SET_PARAMETER,
    exports.METHODS.REDIRECT,
    exports.METHODS.RECORD,
    exports.METHODS.FLUSH,
    // For AirPlay
    exports.METHODS.GET,
    exports.METHODS.POST,
];
exports.METHOD_MAP = (0, utils_1.enumToMap)(exports.METHODS);
exports.H_METHOD_MAP = Object.fromEntries(Object.entries(exports.METHODS).filter(([k]) => k.startsWith('H')));
exports.STATUSES_HTTP = [
    exports.STATUSES.CONTINUE,
    exports.STATUSES.SWITCHING_PROTOCOLS,
    exports.STATUSES.PROCESSING,
    exports.STATUSES.EARLY_HINTS,
    exports.STATUSES.RESPONSE_IS_STALE,
    exports.STATUSES.REVALIDATION_FAILED,
    exports.STATUSES.DISCONNECTED_OPERATION,
    exports.STATUSES.HEURISTIC_EXPIRATION,
    exports.STATUSES.MISCELLANEOUS_WARNING,
    exports.STATUSES.OK,
    exports.STATUSES.CREATED,
    exports.STATUSES.ACCEPTED,
    exports.STATUSES.NON_AUTHORITATIVE_INFORMATION,
    exports.STATUSES.NO_CONTENT,
    exports.STATUSES.RESET_CONTENT,
    exports.STATUSES.PARTIAL_CONTENT,
    exports.STATUSES.MULTI_STATUS,
    exports.STATUSES.ALREADY_REPORTED,
    exports.STATUSES.TRANSFORMATION_APPLIED,
    exports.STATUSES.IM_USED,
    exports.STATUSES.MISCELLANEOUS_PERSISTENT_WARNING,
    exports.STATUSES.MULTIPLE_CHOICES,
    exports.STATUSES.MOVED_PERMANENTLY,
    exports.STATUSES.FOUND,
    exports.STATUSES.SEE_OTHER,
    exports.STATUSES.NOT_MODIFIED,
    exports.STATUSES.USE_PROXY,
    exports.STATUSES.SWITCH_PROXY,
    exports.STATUSES.TEMPORARY_REDIRECT,
    exports.STATUSES.PERMANENT_REDIRECT,
    exports.STATUSES.BAD_REQUEST,
    exports.STATUSES.UNAUTHORIZED,
    exports.STATUSES.PAYMENT_REQUIRED,
    exports.STATUSES.FORBIDDEN,
    exports.STATUSES.NOT_FOUND,
    exports.STATUSES.METHOD_NOT_ALLOWED,
    exports.STATUSES.NOT_ACCEPTABLE,
    exports.STATUSES.PROXY_AUTHENTICATION_REQUIRED,
    exports.STATUSES.REQUEST_TIMEOUT,
    exports.STATUSES.CONFLICT,
    exports.STATUSES.GONE,
    exports.STATUSES.LENGTH_REQUIRED,
    exports.STATUSES.PRECONDITION_FAILED,
    exports.STATUSES.PAYLOAD_TOO_LARGE,
    exports.STATUSES.URI_TOO_LONG,
    exports.STATUSES.UNSUPPORTED_MEDIA_TYPE,
    exports.STATUSES.RANGE_NOT_SATISFIABLE,
    exports.STATUSES.EXPECTATION_FAILED,
    exports.STATUSES.IM_A_TEAPOT,
    exports.STATUSES.PAGE_EXPIRED,
    exports.STATUSES.ENHANCE_YOUR_CALM,
    exports.STATUSES.MISDIRECTED_REQUEST,
    exports.STATUSES.UNPROCESSABLE_ENTITY,
    exports.STATUSES.LOCKED,
    exports.STATUSES.FAILED_DEPENDENCY,
    exports.STATUSES.TOO_EARLY,
    exports.STATUSES.UPGRADE_REQUIRED,
    exports.STATUSES.PRECONDITION_REQUIRED,
    exports.STATUSES.TOO_MANY_REQUESTS,
    exports.STATUSES.REQUEST_HEADER_FIELDS_TOO_LARGE_UNOFFICIAL,
    exports.STATUSES.REQUEST_HEADER_FIELDS_TOO_LARGE,
    exports.STATUSES.LOGIN_TIMEOUT,
    exports.STATUSES.NO_RESPONSE,
    exports.STATUSES.RETRY_WITH,
    exports.STATUSES.BLOCKED_BY_PARENTAL_CONTROL,
    exports.STATUSES.UNAVAILABLE_FOR_LEGAL_REASONS,
    exports.STATUSES.CLIENT_CLOSED_LOAD_BALANCED_REQUEST,
    exports.STATUSES.INVALID_X_FORWARDED_FOR,
    exports.STATUSES.REQUEST_HEADER_TOO_LARGE,
    exports.STATUSES.SSL_CERTIFICATE_ERROR,
    exports.STATUSES.SSL_CERTIFICATE_REQUIRED,
    exports.STATUSES.HTTP_REQUEST_SENT_TO_HTTPS_PORT,
    exports.STATUSES.INVALID_TOKEN,
    exports.STATUSES.CLIENT_CLOSED_REQUEST,
    exports.STATUSES.INTERNAL_SERVER_ERROR,
    exports.STATUSES.NOT_IMPLEMENTED,
    exports.STATUSES.BAD_GATEWAY,
    exports.STATUSES.SERVICE_UNAVAILABLE,
    exports.STATUSES.GATEWAY_TIMEOUT,
    exports.STATUSES.HTTP_VERSION_NOT_SUPPORTED,
    exports.STATUSES.VARIANT_ALSO_NEGOTIATES,
    exports.STATUSES.INSUFFICIENT_STORAGE,
    exports.STATUSES.LOOP_DETECTED,
    exports.STATUSES.BANDWIDTH_LIMIT_EXCEEDED,
    exports.STATUSES.NOT_EXTENDED,
    exports.STATUSES.NETWORK_AUTHENTICATION_REQUIRED,
    exports.STATUSES.WEB_SERVER_UNKNOWN_ERROR,
    exports.STATUSES.WEB_SERVER_IS_DOWN,
    exports.STATUSES.CONNECTION_TIMEOUT,
    exports.STATUSES.ORIGIN_IS_UNREACHABLE,
    exports.STATUSES.TIMEOUT_OCCURED,
    exports.STATUSES.SSL_HANDSHAKE_FAILED,
    exports.STATUSES.INVALID_SSL_CERTIFICATE,
    exports.STATUSES.RAILGUN_ERROR,
    exports.STATUSES.SITE_IS_OVERLOADED,
    exports.STATUSES.SITE_IS_FROZEN,
    exports.STATUSES.IDENTITY_PROVIDER_AUTHENTICATION_ERROR,
    exports.STATUSES.NETWORK_READ_TIMEOUT,
    exports.STATUSES.NETWORK_CONNECT_TIMEOUT,
];
exports.ALPHA = [];
for (let i = 'A'.charCodeAt(0); i <= 'Z'.charCodeAt(0); i++) {
    // Upper case
    exports.ALPHA.push(String.fromCharCode(i));
    // Lower case
    exports.ALPHA.push(String.fromCharCode(i + 0x20));
}
exports.NUM_MAP = {
    0: 0, 1: 1, 2: 2, 3: 3, 4: 4,
    5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
};
exports.HEX_MAP = {
    0: 0, 1: 1, 2: 2, 3: 3, 4: 4,
    5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
    A: 0XA, B: 0XB, C: 0XC, D: 0XD, E: 0XE, F: 0XF,
    a: 0xa, b: 0xb, c: 0xc, d: 0xd, e: 0xe, f: 0xf,
};
exports.NUM = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
];
exports.ALPHANUM = exports.ALPHA.concat(exports.NUM);
exports.MARK = ['-', '_', '.', '!', '~', '*', '\'', '(', ')'];
exports.USERINFO_CHARS = exports.ALPHANUM
    .concat(exports.MARK)
    .concat(['%', ';', ':', '&', '=', '+', '$', ',']);
// TODO(indutny): use RFC
exports.URL_CHAR = [
    '!', '"', '$', '%', '&', '\'',
    '(', ')', '*', '+', ',', '-', '.', '/',
    ':', ';', '<', '=', '>',
    '@', '[', '\\', ']', '^', '_',
    '`',
    '{', '|', '}', '~',
].concat(exports.ALPHANUM);
exports.HEX = exports.NUM.concat(['a', 'b', 'c', 'd', 'e', 'f', 'A', 'B', 'C', 'D', 'E', 'F']);
/* Tokens as defined by rfc 2616. Also lowercases them.
 *        token       = 1*<any CHAR except CTLs or separators>
 *     separators     = "(" | ")" | "<" | ">" | "@"
 *                    | "," | ";" | ":" | "\" | <">
 *                    | "/" | "[" | "]" | "?" | "="
 *                    | "{" | "}" | SP | HT
 */
exports.TOKEN = [
    '!', '#', '$', '%', '&', '\'',
    '*', '+', '-', '.',
    '^', '_', '`',
    '|', '~',
].concat(exports.ALPHANUM);
/*
 * Verify that a char is a valid visible (printable) US-ASCII
 * character or %x80-FF
 */
exports.HEADER_CHARS = ['\t'];
for (let i = 32; i <= 255; i++) {
    if (i !== 127) {
        exports.HEADER_CHARS.push(i);
    }
}
// ',' = \x44
exports.CONNECTION_TOKEN_CHARS = exports.HEADER_CHARS.filter((c) => c !== 44);
exports.QUOTED_STRING = ['\t', ' '];
for (let i = 0x21; i <= 0xff; i++) {
    if (i !== 0x22 && i !== 0x5c) { // All characters in ASCII except \ and "
        exports.QUOTED_STRING.push(i);
    }
}
exports.HTAB_SP_VCHAR_OBS_TEXT = ['\t', ' '];
// VCHAR: https://tools.ietf.org/html/rfc5234#appendix-B.1
for (let i = 0x21; i <= 0x7E; i++) {
    exports.HTAB_SP_VCHAR_OBS_TEXT.push(i);
}
// OBS_TEXT: https://datatracker.ietf.org/doc/html/rfc9110#name-collected-abnf
for (let i = 0x80; i <= 0xff; i++) {
    exports.HTAB_SP_VCHAR_OBS_TEXT.push(i);
}
exports.MAJOR = exports.NUM_MAP;
exports.MINOR = exports.MAJOR;
exports.SPECIAL_HEADERS = {
    'connection': exports.HEADER_STATE.CONNECTION,
    'content-length': exports.HEADER_STATE.CONTENT_LENGTH,
    'proxy-connection': exports.HEADER_STATE.CONNECTION,
    'transfer-encoding': exports.HEADER_STATE.TRANSFER_ENCODING,
    'upgrade': exports.HEADER_STATE.UPGRADE,
};
exports.default = {
    ERROR: exports.ERROR,
    TYPE: exports.TYPE,
    FLAGS: exports.FLAGS,
    LENIENT_FLAGS: exports.LENIENT_FLAGS,
    METHODS: exports.METHODS,
    STATUSES: exports.STATUSES,
    FINISH: exports.FINISH,
    HEADER_STATE: exports.HEADER_STATE,
    ALPHA: exports.ALPHA,
    NUM_MAP: exports.NUM_MAP,
    HEX_MAP: exports.HEX_MAP,
    NUM: exports.NUM,
    ALPHANUM: exports.ALPHANUM,
    MARK: exports.MARK,
    USERINFO_CHARS: exports.USERINFO_CHARS,
    URL_CHAR: exports.URL_CHAR,
    HEX: exports.HEX,
    TOKEN: exports.TOKEN,
    HEADER_CHARS: exports.HEADER_CHARS,
    CONNECTION_TOKEN_CHARS: exports.CONNECTION_TOKEN_CHARS,
    QUOTED_STRING: exports.QUOTED_STRING,
    HTAB_SP_VCHAR_OBS_TEXT: exports.HTAB_SP_VCHAR_OBS_TEXT,
    MAJOR: exports.MAJOR,
    MINOR: exports.MINOR,
    SPECIAL_HEADERS: exports.SPECIAL_HEADERS,
    METHODS_HTTP: exports.METHODS_HTTP,
    METHODS_ICE: exports.METHODS_ICE,
    METHODS_RTSP: exports.METHODS_RTSP,
    METHOD_MAP: exports.METHOD_MAP,
    H_METHOD_MAP: exports.H_METHOD_MAP,
    STATUSES_HTTP: exports.STATUSES_HTTP,
};
