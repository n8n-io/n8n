"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushQueryArguments = void 0;
const CONFIG_GET = require("./CONFIG_GET");
const CONFIG_SET = require("./CONFIG_SET");
;
const DELETE = require("./DELETE");
const EXPLAIN = require("./EXPLAIN");
const LIST = require("./LIST");
const PROFILE = require("./PROFILE");
const QUERY = require("./QUERY");
const RO_QUERY = require("./RO_QUERY");
const SLOWLOG = require("./SLOWLOG");
exports.default = {
    CONFIG_GET,
    configGet: CONFIG_GET,
    CONFIG_SET,
    configSet: CONFIG_SET,
    DELETE,
    delete: DELETE,
    EXPLAIN,
    explain: EXPLAIN,
    LIST,
    list: LIST,
    PROFILE,
    profile: PROFILE,
    QUERY,
    query: QUERY,
    RO_QUERY,
    roQuery: RO_QUERY,
    SLOWLOG,
    slowLog: SLOWLOG
};
function pushQueryArguments(args, graph, query, options, compact) {
    args.push(graph);
    if (typeof options === 'number') {
        args.push(query);
        pushTimeout(args, options);
    }
    else {
        args.push(options?.params ?
            `CYPHER ${queryParamsToString(options.params)} ${query}` :
            query);
        if (options?.TIMEOUT !== undefined) {
            pushTimeout(args, options.TIMEOUT);
        }
    }
    if (compact) {
        args.push('--compact');
    }
    return args;
}
exports.pushQueryArguments = pushQueryArguments;
function pushTimeout(args, timeout) {
    args.push('TIMEOUT', timeout.toString());
}
function queryParamsToString(params) {
    const parts = [];
    for (const [key, value] of Object.entries(params)) {
        parts.push(`${key}=${queryParamToString(value)}`);
    }
    return parts.join(' ');
}
function queryParamToString(param) {
    if (param === null) {
        return 'null';
    }
    switch (typeof param) {
        case 'string':
            return `"${param.replace(/["\\]/g, '\\$&')}"`;
        case 'number':
        case 'boolean':
            return param.toString();
    }
    if (Array.isArray(param)) {
        return `[${param.map(queryParamToString).join(',')}]`;
    }
    else if (typeof param === 'object') {
        const body = [];
        for (const [key, value] of Object.entries(param)) {
            body.push(`${key}:${queryParamToString(value)}`);
        }
        return `{${body.join(',')}}`;
    }
    else {
        throw new TypeError(`Unexpected param type ${typeof param} ${param}`);
    }
}
