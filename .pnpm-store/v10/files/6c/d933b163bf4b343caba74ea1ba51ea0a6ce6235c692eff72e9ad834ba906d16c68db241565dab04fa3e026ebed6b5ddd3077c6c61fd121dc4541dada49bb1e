"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var path_1 = require("path");
var cache_getters_1 = require("../utils/cache-getters");
var level_1 = require("./level");
var message_1 = require("./message");
var logTargetWithLevelRegex = new RegExp("^\\s*(.+):([0-9]+|" + level_1.LogLevelNames.join('|') + ")\\s*$", 'i');
var parseLogTargets = function (targetString) {
    var items = (targetString || '').split(/([^\\]),/g).reduce(function (list, item, index) {
        if (index % 2 === 1) {
            list[list.length - 1] += item;
        }
        else {
            list.push(item);
        }
        return list;
    }, []);
    return items.reduce(function (targets, str) {
        var format;
        str = str.replace(/^(.+)%([a-z_][a-z0-9_]*)$/, function (_, before, key) {
            format = message_1.LogFormatters[key];
            return before;
        });
        var pieces = str.match(logTargetWithLevelRegex);
        var file;
        var level;
        if (pieces) {
            file = pieces[1].trim();
            level = pieces[2].trim();
        }
        else {
            file = str.trim();
        }
        var append = file.endsWith('+');
        if (append) {
            file = file.slice(0, -1).trim();
        }
        file = file.replace(/\\,/g, ',');
        if (!file) {
            return targets;
        }
        var isStandardFd = /^(stdout|stderr)$/i.test(file);
        if (format == null) {
            format = isStandardFd ? message_1.LogFormatters.simple : message_1.LogFormatters.json;
        }
        var target = cache_getters_1.cacheGetters({
            format: format,
            get minLevel() {
                return level_1.parseLogLevel(level) || -Infinity;
            },
            get stream() {
                if (isStandardFd) {
                    return process[file.toLowerCase()];
                }
                else {
                    return fs_1.createWriteStream(path_1.resolve(process.cwd(), file), {
                        flags: append ? 'a' : 'w',
                        autoClose: true,
                        encoding: 'utf8',
                    });
                }
            },
        }, 'minLevel', 'stream');
        return __spread(targets, [target]);
    }, []);
};
exports.parseLogTargets = parseLogTargets;
var DEFAULT_LOG_TARGET = "stderr:" + level_1.LogLevels.warn;
exports.DEFAULT_LOG_TARGET = DEFAULT_LOG_TARGET;
