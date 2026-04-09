"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importer = exports.Importer = void 0;
exports.__requireModule = __requireModule;
const logger_1 = require("./logger");
const memoize_1 = require("./memoize");
const messages_1 = require("./messages");
const logger = logger_1.rootLogger.child({ namespace: 'Importer' });
/**
 * @internal
 */
class Importer {
    static get instance() {
        logger.debug('creating Importer singleton');
        return new Importer();
    }
    babelJest(why) {
        return this._import(why, 'babel-jest');
    }
    babelCore(why) {
        return this._import(why, '@babel/core');
    }
    typescript(why, which) {
        return this._import(why, which);
    }
    esBuild(why) {
        return this._import(why, 'esbuild');
    }
    tryThese(moduleName, ...fallbacks) {
        let name;
        let loaded;
        const tries = [moduleName, ...fallbacks];
        while ((name = tries.shift()) !== undefined) {
            const req = requireWrapper(name);
            // remove exports from what we're going to log
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contextReq = { ...req };
            delete contextReq.exports;
            if (req.exists) {
                // module exists
                loaded = req;
                if (req.error) {
                    logger.error({ requireResult: contextReq }, `failed loading module '${name}'`, req.error.message);
                }
                else {
                    logger.debug({ requireResult: contextReq }, 'loaded module', name);
                }
                break;
            }
            else {
                // module does not exists in the path
                logger.debug({ requireResult: contextReq }, `module '${name}' not found`);
            }
        }
        // return the loaded one, could be one that has been loaded, or one which has failed during load
        // but not one which does not exists
        return loaded;
    }
    tryTheseOr(moduleNames, missingResult, allowLoadError = false) {
        const args = Array.isArray(moduleNames) ? moduleNames : [moduleNames];
        const result = this.tryThese(...args);
        if (!result)
            return missingResult;
        if (!result.error)
            return result.exports;
        if (allowLoadError)
            return missingResult;
        throw result.error;
    }
    _import(why, moduleName, { alternatives = [], installTip = moduleName } = {}) {
        // try to load any of the alternative after trying main one
        const res = this.tryThese(moduleName, ...alternatives);
        // if we could load one, return it
        if (res?.exists) {
            if (!res.error)
                return res.exports;
            // it could not load because of a failure while importing, but it exists
            throw new Error((0, messages_1.interpolate)("Loading module {{module}} failed with error: {{error}}" /* Errors.LoadingModuleFailed */, { module: res.given, error: res.error.message }));
        }
        // if it couldn't load, build a nice error message so the user can fix it by himself
        const msg = alternatives.length ? "Unable to load any of these modules: {{module}}. {{reason}}. To fix it:\n{{fix}}" /* Errors.UnableToLoadAnyModule */ : "Unable to load the module {{module}}. {{reason}} To fix it:\n{{fix}}" /* Errors.UnableToLoadOneModule */;
        const loadModule = [moduleName, ...alternatives].map((m) => `"${m}"`).join(', ');
        if (typeof installTip === 'string') {
            installTip = [{ module: installTip, label: `install "${installTip}"` }];
        }
        const fix = installTip
            .map((tip) => `    ${installTip.length === 1 ? '↳' : '•'} ${(0, messages_1.interpolate)(messages_1.Helps.FixMissingModule, tip)}`)
            .join('\n');
        throw new Error((0, messages_1.interpolate)(msg, {
            module: loadModule,
            reason: why,
            fix,
        }));
    }
}
exports.Importer = Importer;
__decorate([
    (0, memoize_1.Memoize)((...args) => args.join(':'))
], Importer.prototype, "tryThese", null);
__decorate([
    (0, memoize_1.Memoize)()
], Importer, "instance", null);
/**
 * @internal
 */
exports.importer = Importer.instance;
function requireWrapper(moduleName) {
    let path;
    let exists = false;
    try {
        path = resolveModule(moduleName);
        exists = true;
    }
    catch (error) {
        return { error: error, exists, given: moduleName };
    }
    const result = { exists, path, given: moduleName };
    try {
        result.exports = requireModule(path);
    }
    catch {
        try {
            result.exports = requireModule(moduleName);
        }
        catch (error) {
            result.error = error;
        }
    }
    return result;
}
let requireModule = (mod) => require(mod);
let resolveModule = (mod) => require.resolve(mod, { paths: [process.cwd(), __dirname] });
/**
 * @internal
 */
// so that we can test easier
function __requireModule(localRequire, localResolve) {
    requireModule = localRequire;
    resolveModule = localResolve;
}
