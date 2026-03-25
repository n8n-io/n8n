'use strict';

var process$1 = require('process');
var semver = require('semver');
var os = require('os');
var path = require('path');
var fs = require('fs');
var https = require('https');

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

var packageJson = process$1.env.npm_package_json;
var userAgent = process$1.env.npm_config_user_agent;
var isNpm6 = Boolean(userAgent && userAgent.startsWith('npm'));
var isNpm7 = Boolean(packageJson && packageJson.endsWith('package.json'));
var isNpm = isNpm6 || isNpm7;
var isYarn = Boolean(userAgent && userAgent.startsWith('yarn'));
var isNpmOrYarn = isNpm || isYarn;

var homeDirectory = os.homedir();
var configDir = process.env.XDG_CONFIG_HOME ||
    path.join(homeDirectory, '.config', 'simple-update-notifier');
var getConfigFile = function (packageName) {
    return path.join(configDir, "".concat(packageName.replace('@', '').replace('/', '__'), ".json"));
};
var createConfigDir = function () {
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
};
var getLastUpdate = function (packageName) {
    var configFile = getConfigFile(packageName);
    try {
        if (!fs.existsSync(configFile)) {
            return undefined;
        }
        var file = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        return file.lastUpdateCheck;
    }
    catch (_a) {
        return undefined;
    }
};
var saveLastUpdate = function (packageName) {
    var configFile = getConfigFile(packageName);
    fs.writeFileSync(configFile, JSON.stringify({ lastUpdateCheck: new Date().getTime() }));
};

var getDistVersion = function (packageName, distTag) { return __awaiter(void 0, void 0, void 0, function () {
    var url;
    return __generator(this, function (_a) {
        url = "https://registry.npmjs.org/-/package/".concat(packageName, "/dist-tags");
        return [2 /*return*/, new Promise(function (resolve, reject) {
                https
                    .get(url, function (res) {
                    var body = '';
                    res.on('data', function (chunk) { return (body += chunk); });
                    res.on('end', function () {
                        try {
                            var json = JSON.parse(body);
                            var version = json[distTag];
                            if (!version) {
                                reject(new Error('Error getting version'));
                            }
                            resolve(version);
                        }
                        catch (_a) {
                            reject(new Error('Could not parse version response'));
                        }
                    });
                })
                    .on('error', function (err) { return reject(err); });
            })];
    });
}); };

var hasNewVersion = function (_a) {
    var pkg = _a.pkg, _b = _a.updateCheckInterval, updateCheckInterval = _b === void 0 ? 1000 * 60 * 60 * 24 : _b, _c = _a.distTag, distTag = _c === void 0 ? 'latest' : _c, alwaysRun = _a.alwaysRun, debug = _a.debug;
    return __awaiter(void 0, void 0, void 0, function () {
        var lastUpdateCheck, latestVersion;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    createConfigDir();
                    lastUpdateCheck = getLastUpdate(pkg.name);
                    if (!(alwaysRun ||
                        !lastUpdateCheck ||
                        lastUpdateCheck < new Date().getTime() - updateCheckInterval)) return [3 /*break*/, 2];
                    return [4 /*yield*/, getDistVersion(pkg.name, distTag)];
                case 1:
                    latestVersion = _d.sent();
                    saveLastUpdate(pkg.name);
                    if (semver.gt(latestVersion, pkg.version)) {
                        return [2 /*return*/, latestVersion];
                    }
                    else if (debug) {
                        console.error("Latest version (".concat(latestVersion, ") not newer than current version (").concat(pkg.version, ")"));
                    }
                    return [3 /*break*/, 3];
                case 2:
                    if (debug) {
                        console.error("Too recent to check for a new update. simpleUpdateNotifier() interval set to ".concat(updateCheckInterval, "ms but only ").concat(new Date().getTime() - lastUpdateCheck, "ms since last check."));
                    }
                    _d.label = 3;
                case 3: return [2 /*return*/, false];
            }
        });
    });
};

var borderedText = function (text) {
    var lines = text.split('\n');
    var width = Math.max.apply(Math, lines.map(function (l) { return l.length; }));
    var res = ["\u250C".concat('─'.repeat(width + 2), "\u2510")];
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        res.push("\u2502 ".concat(line.padEnd(width), " \u2502"));
    }
    res.push("\u2514".concat('─'.repeat(width + 2), "\u2518"));
    return res.join('\n');
};

var simpleUpdateNotifier = function (args) { return __awaiter(void 0, void 0, void 0, function () {
    var latestVersion, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!args.alwaysRun &&
                    (!process.stdout.isTTY || (isNpmOrYarn && !args.shouldNotifyInNpmScript))) {
                    if (args.debug) {
                        console.error('Opting out of running simpleUpdateNotifier()');
                    }
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, hasNewVersion(args)];
            case 2:
                latestVersion = _a.sent();
                if (latestVersion) {
                    console.error(borderedText("New version of ".concat(args.pkg.name, " available!\nCurrent Version: ").concat(args.pkg.version, "\nLatest Version: ").concat(latestVersion)));
                }
                return [3 /*break*/, 4];
            case 3:
                err_1 = _a.sent();
                // Catch any network errors or cache writing errors so module doesn't cause a crash
                if (args.debug && err_1 instanceof Error) {
                    console.error('Unexpected error in simpleUpdateNotifier():', err_1);
                }
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };

module.exports = simpleUpdateNotifier;
