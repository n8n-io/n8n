"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformNumbersReply = exports.transformRedisJsonNullReply = exports.transformRedisJsonReply = exports.transformRedisJsonArgument = void 0;
const ARRAPPEND = require("./ARRAPPEND");
const ARRINDEX = require("./ARRINDEX");
const ARRINSERT = require("./ARRINSERT");
const ARRLEN = require("./ARRLEN");
const ARRPOP = require("./ARRPOP");
const ARRTRIM = require("./ARRTRIM");
const DEBUG_MEMORY = require("./DEBUG_MEMORY");
const DEL = require("./DEL");
const FORGET = require("./FORGET");
const GET = require("./GET");
const MERGE = require("./MERGE");
const MGET = require("./MGET");
const MSET = require("./MSET");
const NUMINCRBY = require("./NUMINCRBY");
const NUMMULTBY = require("./NUMMULTBY");
const OBJKEYS = require("./OBJKEYS");
const OBJLEN = require("./OBJLEN");
const RESP = require("./RESP");
const SET = require("./SET");
const STRAPPEND = require("./STRAPPEND");
const STRLEN = require("./STRLEN");
const TYPE = require("./TYPE");
exports.default = {
    ARRAPPEND,
    arrAppend: ARRAPPEND,
    ARRINDEX,
    arrIndex: ARRINDEX,
    ARRINSERT,
    arrInsert: ARRINSERT,
    ARRLEN,
    arrLen: ARRLEN,
    ARRPOP,
    arrPop: ARRPOP,
    ARRTRIM,
    arrTrim: ARRTRIM,
    DEBUG_MEMORY,
    debugMemory: DEBUG_MEMORY,
    DEL,
    del: DEL,
    FORGET,
    forget: FORGET,
    GET,
    get: GET,
    MERGE,
    merge: MERGE,
    MGET,
    mGet: MGET,
    MSET,
    mSet: MSET,
    NUMINCRBY,
    numIncrBy: NUMINCRBY,
    NUMMULTBY,
    numMultBy: NUMMULTBY,
    OBJKEYS,
    objKeys: OBJKEYS,
    OBJLEN,
    objLen: OBJLEN,
    RESP,
    resp: RESP,
    SET,
    set: SET,
    STRAPPEND,
    strAppend: STRAPPEND,
    STRLEN,
    strLen: STRLEN,
    TYPE,
    type: TYPE
};
function transformRedisJsonArgument(json) {
    return JSON.stringify(json);
}
exports.transformRedisJsonArgument = transformRedisJsonArgument;
function transformRedisJsonReply(json) {
    return JSON.parse(json);
}
exports.transformRedisJsonReply = transformRedisJsonReply;
function transformRedisJsonNullReply(json) {
    if (json === null)
        return null;
    return transformRedisJsonReply(json);
}
exports.transformRedisJsonNullReply = transformRedisJsonNullReply;
function transformNumbersReply(reply) {
    return JSON.parse(reply);
}
exports.transformNumbersReply = transformNumbersReply;
