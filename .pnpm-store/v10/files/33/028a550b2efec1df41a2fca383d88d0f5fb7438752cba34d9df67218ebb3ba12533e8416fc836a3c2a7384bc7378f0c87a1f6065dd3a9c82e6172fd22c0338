"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
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
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.processArgv = void 0;
var bs_logger_1 = require("bs-logger");
var yargs_parser_1 = __importDefault(require("yargs-parser"));
var utils_1 = require("../utils");
var VALID_COMMANDS = ['help', 'config:migrate', 'config:init'];
var logger = utils_1.rootLogger.child((_a = {}, _a[bs_logger_1.LogContexts.namespace] = 'cli', _a[bs_logger_1.LogContexts.application] = 'ts-jest', _a));
function cli(args) {
    return __awaiter(this, void 0, void 0, function () {
        var parsedArgv, command, isHelp, _a, run, help, cmd;
        return __generator(this, function (_b) {
            parsedArgv = (0, yargs_parser_1.default)(args, {
                boolean: ['dry-run', 'jest-preset', 'allow-js', 'diff', 'babel', 'force', 'jsdom'],
                string: ['tsconfig', 'js'],
                count: ['verbose'],
                alias: { verbose: ['v'] },
                default: { jestPreset: true, verbose: 0 },
                coerce: {
                    js: function (val) {
                        var res = val.trim().toLowerCase();
                        if (!['babel', 'ts'].includes(res))
                            throw new Error("The 'js' option must be 'babel' or 'ts', given: '".concat(val, "'."));
                        return res;
                    },
                },
            });
            // deprecated
            if (parsedArgv.allowJs != null) {
                if (parsedArgv.js)
                    throw new Error("The 'allowJs' and 'js' options cannot be set together.");
                parsedArgv.js = parsedArgv.allowJs ? 'ts' : undefined;
            }
            command = parsedArgv._.shift();
            isHelp = command === 'help';
            if (isHelp)
                command = parsedArgv._.shift();
            if (!VALID_COMMANDS.includes(command))
                command = 'help';
            _a = require("./".concat(command.replace(/:/g, '/'))), run = _a.run, help = _a.help;
            cmd = isHelp && command !== 'help' ? help : run;
            return [2 /*return*/, cmd(parsedArgv, logger)];
        });
    });
}
var errorHasMessage = function (err) {
    if (typeof err !== 'object' || err === null)
        return false;
    return 'message' in err;
};
/**
 * @internal
 */
function processArgv() {
    return __awaiter(this, void 0, void 0, function () {
        var err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, cli(process.argv.slice(2))];
                case 1:
                    _a.sent();
                    process.exit(0);
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    if (errorHasMessage(err_1)) {
                        logger.fatal(err_1.message);
                        process.exit(1);
                    }
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.processArgv = processArgv;
