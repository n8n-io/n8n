"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTarget = getTarget;
const is_plain_object_1 = require("is-plain-object");
const debug_1 = require("./debug");
const debug = debug_1.Debug.extend('router');
async function getTarget(req, config) {
    let newTarget;
    const router = config.router;
    if ((0, is_plain_object_1.isPlainObject)(router)) {
        newTarget = getTargetFromProxyTable(req, router);
    }
    else if (typeof router === 'function') {
        newTarget = await router(req);
    }
    return newTarget;
}
function getTargetFromProxyTable(req, table) {
    let result;
    const host = req.headers.host;
    const path = req.url;
    const hostAndPath = host + path;
    for (const [key, value] of Object.entries(table)) {
        if (containsPath(key)) {
            if (hostAndPath.indexOf(key) > -1) {
                // match 'localhost:3000/api'
                result = value;
                debug('match: "%s" -> "%s"', key, result);
                break;
            }
        }
        else {
            if (key === host) {
                // match 'localhost:3000'
                result = value;
                debug('match: "%s" -> "%s"', host, result);
                break;
            }
        }
    }
    return result;
}
function containsPath(v) {
    return v.indexOf('/') > -1;
}
