"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePath = void 0;
const path_to_regexp_1 = require("path-to-regexp");
class BasePath {
    constructor(server) {
        var _a;
        this.variables = {};
        this.expressPath = '';
        this.allPaths = null;
        // break the url into parts
        // baseUrl param added to make the parsing of relative paths go well
        let urlPath = this.findUrlPath(server.url);
        if (/:/.test(urlPath)) {
            // escape colons as (any at this point) do not signify express route params.
            // this is an openapi base path, thus route params are wrapped in braces {}, 
            // not prefixed by colon : (like express route params)
            urlPath = urlPath.replace(':', '\\:');
        }
        if (/{\w+}/.test(urlPath)) {
            // has variable that we need to check out
            urlPath = urlPath.replace(/{(\w+)}/g, (substring, p1) => `:"${p1}"`);
        }
        this.expressPath = urlPath;
        for (const variable in server.variables) {
            if (server.variables.hasOwnProperty(variable)) {
                const v = server.variables[variable];
                const enums = (_a = v.enum) !== null && _a !== void 0 ? _a : [];
                if (enums.length === 0 && v.default)
                    enums.push(v.default);
                this.variables[variable] = {
                    enum: enums,
                    default: v.default,
                };
            }
        }
    }
    static fromServers(servers) {
        if (!servers) {
            return [new BasePath({ url: '' })];
        }
        return servers.map(server => new BasePath(server));
    }
    hasVariables() {
        return Object.keys(this.variables).length > 0;
    }
    all() {
        if (!this.hasVariables())
            return [this.expressPath];
        if (this.allPaths)
            return this.allPaths;
        // TODO performance optimization
        // ignore variables that are not part of path params
        const allParams = Object.entries(this.variables).reduce((acc, v) => {
            const [key, value] = v;
            const params = value.enum.map(e => ({
                [key]: e,
            }));
            acc.push(params);
            return acc;
        }, []);
        const allParamCombos = cartesian(...allParams);
        // path-to-regexp v 8.x.x requires we escape the open and close parentheses `(`,`)` added a replace function to catch that use case.
        const filteredExpressPath = this.expressPath.replace(/[(]/g, '\\\\(').replace(/[)]/g, '\\\\)');
        const toPath = (0, path_to_regexp_1.compile)(filteredExpressPath);
        const paths = new Set();
        for (const combo of allParamCombos) {
            paths.add(toPath(combo));
        }
        this.allPaths = Array.from(paths);
        return this.allPaths;
    }
    findUrlPath(u) {
        const findColonSlashSlash = p => {
            const r = /:\/\//.exec(p);
            if (r)
                return r.index;
            return -1;
        };
        const findFirstSlash = p => {
            const r = /\//.exec(p);
            if (r)
                return r.index;
            return -1;
        };
        const fcssIdx = findColonSlashSlash(u);
        const startSearchIdx = fcssIdx !== -1 ? fcssIdx + 3 : 0;
        const startPathIdx = findFirstSlash(u.substring(startSearchIdx));
        if (startPathIdx === -1)
            return '/';
        const pathIdx = startPathIdx + startSearchIdx;
        const path = u.substring(pathIdx);
        // ensure a trailing slash is always present
        return path[path.length - 1] === '/' ? path : path + '/';
    }
}
exports.BasePath = BasePath;
function cartesian(...arg) {
    const r = [], max = arg.length - 1;
    function helper(obj, i) {
        const values = arg[i];
        for (var j = 0, l = values.length; j < l; j++) {
            const a = Object.assign({}, obj);
            const key = Object.keys(values[j])[0];
            a[key] = values[j][key];
            if (i == max)
                r.push(a);
            else
                helper(a, i + 1);
        }
    }
    helper({}, 0);
    return r;
}
//# sourceMappingURL=base.path.js.map