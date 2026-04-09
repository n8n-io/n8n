"use strict";
// URI parser based on RFC 3986
// We can't use the standard `URL` object, because we want to support relative `file:` URLs like
// `file:relative/path/database.db`, which are not correct according to RFC 8089, which standardizes the
// `file` scheme.
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeBaseUrl = exports.parseUri = void 0;
const api_js_1 = require("./api.js");
function parseUri(text) {
    const match = URI_RE.exec(text);
    if (match === null) {
        throw new api_js_1.LibsqlError(`The URL '${text}' is not in a valid format`, "URL_INVALID");
    }
    const groups = match.groups;
    const scheme = groups["scheme"];
    const authority = groups["authority"] !== undefined
        ? parseAuthority(groups["authority"])
        : undefined;
    const path = percentDecode(groups["path"]);
    const query = groups["query"] !== undefined ? parseQuery(groups["query"]) : undefined;
    const fragment = groups["fragment"] !== undefined
        ? percentDecode(groups["fragment"])
        : undefined;
    return { scheme, authority, path, query, fragment };
}
exports.parseUri = parseUri;
const URI_RE = (() => {
    const SCHEME = "(?<scheme>[A-Za-z][A-Za-z.+-]*)";
    const AUTHORITY = "(?<authority>[^/?#]*)";
    const PATH = "(?<path>[^?#]*)";
    const QUERY = "(?<query>[^#]*)";
    const FRAGMENT = "(?<fragment>.*)";
    return new RegExp(`^${SCHEME}:(//${AUTHORITY})?${PATH}(\\?${QUERY})?(#${FRAGMENT})?$`, "su");
})();
function parseAuthority(text) {
    const match = AUTHORITY_RE.exec(text);
    if (match === null) {
        throw new api_js_1.LibsqlError("The authority part of the URL is not in a valid format", "URL_INVALID");
    }
    const groups = match.groups;
    const host = percentDecode(groups["host_br"] ?? groups["host"]);
    const port = groups["port"] ? parseInt(groups["port"], 10) : undefined;
    const userinfo = groups["username"] !== undefined
        ? {
            username: percentDecode(groups["username"]),
            password: groups["password"] !== undefined
                ? percentDecode(groups["password"])
                : undefined,
        }
        : undefined;
    return { host, port, userinfo };
}
const AUTHORITY_RE = (() => {
    return new RegExp(`^((?<username>[^:]*)(:(?<password>.*))?@)?((?<host>[^:\\[\\]]*)|(\\[(?<host_br>[^\\[\\]]*)\\]))(:(?<port>[0-9]*))?$`, "su");
})();
// Query string is parsed as application/x-www-form-urlencoded according to the Web URL standard:
// https://url.spec.whatwg.org/#urlencoded-parsing
function parseQuery(text) {
    const sequences = text.split("&");
    const pairs = [];
    for (const sequence of sequences) {
        if (sequence === "") {
            continue;
        }
        let key;
        let value;
        const splitIdx = sequence.indexOf("=");
        if (splitIdx < 0) {
            key = sequence;
            value = "";
        }
        else {
            key = sequence.substring(0, splitIdx);
            value = sequence.substring(splitIdx + 1);
        }
        pairs.push({
            key: percentDecode(key.replaceAll("+", " ")),
            value: percentDecode(value.replaceAll("+", " ")),
        });
    }
    return { pairs };
}
function percentDecode(text) {
    try {
        return decodeURIComponent(text);
    }
    catch (e) {
        if (e instanceof URIError) {
            throw new api_js_1.LibsqlError(`URL component has invalid percent encoding: ${e}`, "URL_INVALID", undefined, undefined, e);
        }
        throw e;
    }
}
function encodeBaseUrl(scheme, authority, path) {
    if (authority === undefined) {
        throw new api_js_1.LibsqlError(`URL with scheme ${JSON.stringify(scheme + ":")} requires authority (the "//" part)`, "URL_INVALID");
    }
    const schemeText = `${scheme}:`;
    const hostText = encodeHost(authority.host);
    const portText = encodePort(authority.port);
    const userinfoText = encodeUserinfo(authority.userinfo);
    const authorityText = `//${userinfoText}${hostText}${portText}`;
    let pathText = path.split("/").map(encodeURIComponent).join("/");
    if (pathText !== "" && !pathText.startsWith("/")) {
        pathText = "/" + pathText;
    }
    return new URL(`${schemeText}${authorityText}${pathText}`);
}
exports.encodeBaseUrl = encodeBaseUrl;
function encodeHost(host) {
    return host.includes(":") ? `[${encodeURI(host)}]` : encodeURI(host);
}
function encodePort(port) {
    return port !== undefined ? `:${port}` : "";
}
function encodeUserinfo(userinfo) {
    if (userinfo === undefined) {
        return "";
    }
    const usernameText = encodeURIComponent(userinfo.username);
    const passwordText = userinfo.password !== undefined
        ? `:${encodeURIComponent(userinfo.password)}`
        : "";
    return `${usernameText}${passwordText}@`;
}
