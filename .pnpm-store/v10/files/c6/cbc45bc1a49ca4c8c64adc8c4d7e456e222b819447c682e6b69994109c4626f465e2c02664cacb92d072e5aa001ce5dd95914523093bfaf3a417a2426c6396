import { IEnumMap } from './utils';
export declare type HTTPMode = 'loose' | 'strict';
export declare enum ERROR {
    OK = 0,
    INTERNAL = 1,
    STRICT = 2,
    LF_EXPECTED = 3,
    UNEXPECTED_CONTENT_LENGTH = 4,
    CLOSED_CONNECTION = 5,
    INVALID_METHOD = 6,
    INVALID_URL = 7,
    INVALID_CONSTANT = 8,
    INVALID_VERSION = 9,
    INVALID_HEADER_TOKEN = 10,
    INVALID_CONTENT_LENGTH = 11,
    INVALID_CHUNK_SIZE = 12,
    INVALID_STATUS = 13,
    INVALID_EOF_STATE = 14,
    INVALID_TRANSFER_ENCODING = 15,
    CB_MESSAGE_BEGIN = 16,
    CB_HEADERS_COMPLETE = 17,
    CB_MESSAGE_COMPLETE = 18,
    CB_CHUNK_HEADER = 19,
    CB_CHUNK_COMPLETE = 20,
    PAUSED = 21,
    PAUSED_UPGRADE = 22,
    PAUSED_H2_UPGRADE = 23,
    USER = 24
}
export declare enum TYPE {
    BOTH = 0,
    REQUEST = 1,
    RESPONSE = 2
}
export declare enum FLAGS {
    CONNECTION_KEEP_ALIVE = 1,
    CONNECTION_CLOSE = 2,
    CONNECTION_UPGRADE = 4,
    CHUNKED = 8,
    UPGRADE = 16,
    CONTENT_LENGTH = 32,
    SKIPBODY = 64,
    TRAILING = 128,
    TRANSFER_ENCODING = 512
}
export declare enum LENIENT_FLAGS {
    HEADERS = 1,
    CHUNKED_LENGTH = 2,
    KEEP_ALIVE = 4
}
export declare enum METHODS {
    DELETE = 0,
    GET = 1,
    HEAD = 2,
    POST = 3,
    PUT = 4,
    CONNECT = 5,
    OPTIONS = 6,
    TRACE = 7,
    COPY = 8,
    LOCK = 9,
    MKCOL = 10,
    MOVE = 11,
    PROPFIND = 12,
    PROPPATCH = 13,
    SEARCH = 14,
    UNLOCK = 15,
    BIND = 16,
    REBIND = 17,
    UNBIND = 18,
    ACL = 19,
    REPORT = 20,
    MKACTIVITY = 21,
    CHECKOUT = 22,
    MERGE = 23,
    'M-SEARCH' = 24,
    NOTIFY = 25,
    SUBSCRIBE = 26,
    UNSUBSCRIBE = 27,
    PATCH = 28,
    PURGE = 29,
    MKCALENDAR = 30,
    LINK = 31,
    UNLINK = 32,
    SOURCE = 33,
    PRI = 34,
    DESCRIBE = 35,
    ANNOUNCE = 36,
    SETUP = 37,
    PLAY = 38,
    PAUSE = 39,
    TEARDOWN = 40,
    GET_PARAMETER = 41,
    SET_PARAMETER = 42,
    REDIRECT = 43,
    RECORD = 44,
    FLUSH = 45
}
export declare const METHODS_HTTP: METHODS[];
export declare const METHODS_ICE: METHODS[];
export declare const METHODS_RTSP: METHODS[];
export declare const METHOD_MAP: IEnumMap;
export declare const H_METHOD_MAP: IEnumMap;
export declare enum FINISH {
    SAFE = 0,
    SAFE_WITH_CB = 1,
    UNSAFE = 2
}
export declare type CharList = Array<string | number>;
export declare const ALPHA: CharList;
export declare const NUM_MAP: {
    0: number;
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
    7: number;
    8: number;
    9: number;
};
export declare const HEX_MAP: {
    0: number;
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
    7: number;
    8: number;
    9: number;
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    F: number;
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
};
export declare const NUM: CharList;
export declare const ALPHANUM: CharList;
export declare const MARK: CharList;
export declare const USERINFO_CHARS: CharList;
export declare const STRICT_URL_CHAR: CharList;
export declare const URL_CHAR: CharList;
export declare const HEX: CharList;
export declare const STRICT_TOKEN: CharList;
export declare const TOKEN: CharList;
export declare const HEADER_CHARS: CharList;
export declare const CONNECTION_TOKEN_CHARS: CharList;
export declare const MAJOR: {
    0: number;
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
    7: number;
    8: number;
    9: number;
};
export declare const MINOR: {
    0: number;
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
    7: number;
    8: number;
    9: number;
};
export declare enum HEADER_STATE {
    GENERAL = 0,
    CONNECTION = 1,
    CONTENT_LENGTH = 2,
    TRANSFER_ENCODING = 3,
    UPGRADE = 4,
    CONNECTION_KEEP_ALIVE = 5,
    CONNECTION_CLOSE = 6,
    CONNECTION_UPGRADE = 7,
    TRANSFER_ENCODING_CHUNKED = 8
}
export declare const SPECIAL_HEADERS: {
    connection: HEADER_STATE;
    'content-length': HEADER_STATE;
    'proxy-connection': HEADER_STATE;
    'transfer-encoding': HEADER_STATE;
    upgrade: HEADER_STATE;
};
