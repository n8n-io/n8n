"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = void 0;
function parse(uriString) {
    let result = {
        path: '',
        fragment: undefined,
        host: undefined,
        port: undefined,
        query: undefined,
        reference: undefined,
        scheme: undefined,
        userinfo: undefined,
    };
    if (uriString.includes('#')) {
        result.fragment = '';
    }
    let { parsed, addedDefaultScheme, addedTemporaryHost, error, } = recognizeUrl(uriString);
    if (error || parsed === undefined) {
        result.error = error;
        return result;
    }
    if (typeof parsed.protocol !== undefined && parsed.protocol !== '' && !addedDefaultScheme) {
        result.scheme = String(parsed.protocol).replace(':', '');
    }
    if (typeof parsed.username !== undefined && parsed.username !== '') {
        let userinfo = parsed.username;
        if (parsed.password) {
            userinfo += ':' + parsed.password;
        }
        result.userinfo = userinfo;
    }
    if (typeof parsed.hostname !== undefined && parsed.hostname !== '' && !addedTemporaryHost) {
        result.host = parsed.hostname;
        if (result.host.startsWith('[')) {
            result.host = result.host.substring(1);
            result.host = result.host.slice(0, -1);
        }
    }
    if (typeof parsed.port !== undefined && parsed.port !== '') {
        result.port = Number(parsed.port);
    }
    if (typeof parsed.pathname !== undefined && parsed.pathname !== '/') {
        result.path = parsed.pathname;
        if (addedTemporaryHost && result.path.startsWith('/')) {
            result.path = result.path.substring(1);
        }
    }
    if (typeof parsed.search !== undefined && parsed.search !== '') {
        result.query = parsed.search.replace('?', '');
    }
    if (typeof parsed.hash !== undefined && parsed.hash !== '') {
        result.fragment = parsed.hash.replace('#', '');
    }
    if (result.scheme === undefined && result.userinfo === undefined && result.host === undefined && result.port === undefined && !result.path && result.query === undefined) {
        result.reference = "same-document";
    }
    else if (result.scheme === undefined) {
        result.reference = "relative";
    }
    else if (result.fragment === undefined) {
        result.reference = "absolute";
    }
    else {
        result.reference = "uri";
    }
    return result;
}
exports.parse = parse;
const temporaryHost = '_remove_me_host/';
function recognizeUrl(uriString) {
    let result = {
        parsed: undefined,
        addedDefaultScheme: false,
        addedTemporaryHost: false,
        error: undefined,
    };
    let firstError;
    try {
        result.parsed = new URL(uriString);
        return result;
    }
    catch (error) {
        firstError = error;
    }
    if (uriString.startsWith('//')) {
        try {
            result.parsed = new URL('https:' + uriString);
            result.addedDefaultScheme = true;
            return result;
        }
        catch (otherError) {
            result.error = firstError.message;
            return result;
        }
    }
    try {
        result.parsed = new URL('https://' + temporaryHost + uriString);
        result.addedDefaultScheme = true;
        result.addedTemporaryHost = true;
        return result;
    }
    catch (otherError) {
    }
    result.error = firstError.message;
    return result;
}
