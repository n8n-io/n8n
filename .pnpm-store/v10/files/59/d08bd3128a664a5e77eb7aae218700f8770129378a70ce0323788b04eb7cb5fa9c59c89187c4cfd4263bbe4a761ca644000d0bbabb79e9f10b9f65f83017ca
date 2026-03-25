"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearTSServerProjectService = exports.clearTSConfigMatchCache = exports.createParseSettings = void 0;
const debug_1 = __importDefault(require("debug"));
const ts = __importStar(require("typescript"));
const createProjectService_1 = require("../create-program/createProjectService");
const shared_1 = require("../create-program/shared");
const source_files_1 = require("../source-files");
const ExpiringCache_1 = require("./ExpiringCache");
const getProjectConfigFiles_1 = require("./getProjectConfigFiles");
const inferSingleRun_1 = require("./inferSingleRun");
const resolveProjectList_1 = require("./resolveProjectList");
const warnAboutTSVersion_1 = require("./warnAboutTSVersion");
const log = (0, debug_1.default)('typescript-eslint:typescript-estree:parser:parseSettings:createParseSettings');
let TSCONFIG_MATCH_CACHE;
let TSSERVER_PROJECT_SERVICE = null;
// NOTE - we intentionally use "unnecessary" `?.` here because in TS<5.3 this enum doesn't exist
// This object exists so we can centralize these for tracking and so we don't proliferate these across the file
// https://github.com/microsoft/TypeScript/issues/56579
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
const JSDocParsingMode = {
    ParseAll: ts.JSDocParsingMode?.ParseAll,
    ParseNone: ts.JSDocParsingMode?.ParseNone,
    ParseForTypeErrors: ts.JSDocParsingMode?.ParseForTypeErrors,
    ParseForTypeInfo: ts.JSDocParsingMode?.ParseForTypeInfo,
};
/* eslint-enable @typescript-eslint/no-unnecessary-condition */
function createParseSettings(code, options = {}) {
    const codeFullText = enforceCodeString(code);
    const singleRun = (0, inferSingleRun_1.inferSingleRun)(options);
    const tsconfigRootDir = typeof options.tsconfigRootDir === 'string'
        ? options.tsconfigRootDir
        : process.cwd();
    const passedLoggerFn = typeof options.loggerFn === 'function';
    const jsDocParsingMode = (() => {
        switch (options.jsDocParsingMode) {
            case 'all':
                return JSDocParsingMode.ParseAll;
            case 'none':
                return JSDocParsingMode.ParseNone;
            case 'type-info':
                return JSDocParsingMode.ParseForTypeInfo;
            default:
                return JSDocParsingMode.ParseAll;
        }
    })();
    const parseSettings = {
        allowInvalidAST: options.allowInvalidAST === true,
        code,
        codeFullText,
        comment: options.comment === true,
        comments: [],
        DEPRECATED__createDefaultProgram: 
        // eslint-disable-next-line deprecation/deprecation -- will be cleaned up with the next major
        options.DEPRECATED__createDefaultProgram === true,
        debugLevel: options.debugLevel === true
            ? new Set(['typescript-eslint'])
            : Array.isArray(options.debugLevel)
                ? new Set(options.debugLevel)
                : new Set(),
        errorOnTypeScriptSyntacticAndSemanticIssues: false,
        errorOnUnknownASTType: options.errorOnUnknownASTType === true,
        EXPERIMENTAL_projectService: options.EXPERIMENTAL_useProjectService ||
            (options.project &&
                options.EXPERIMENTAL_useProjectService !== false &&
                process.env.TYPESCRIPT_ESLINT_EXPERIMENTAL_TSSERVER === 'true')
            ? (TSSERVER_PROJECT_SERVICE ??= (0, createProjectService_1.createProjectService)(options.EXPERIMENTAL_useProjectService, jsDocParsingMode))
            : undefined,
        EXPERIMENTAL_useSourceOfProjectReferenceRedirect: options.EXPERIMENTAL_useSourceOfProjectReferenceRedirect === true,
        extraFileExtensions: Array.isArray(options.extraFileExtensions) &&
            options.extraFileExtensions.every(ext => typeof ext === 'string')
            ? options.extraFileExtensions
            : [],
        filePath: (0, shared_1.ensureAbsolutePath)(typeof options.filePath === 'string' && options.filePath !== '<input>'
            ? options.filePath
            : getFileName(options.jsx), tsconfigRootDir),
        jsDocParsingMode,
        jsx: options.jsx === true,
        loc: options.loc === true,
        log: typeof options.loggerFn === 'function'
            ? options.loggerFn
            : options.loggerFn === false
                ? () => { } // eslint-disable-line @typescript-eslint/no-empty-function
                : console.log, // eslint-disable-line no-console
        preserveNodeMaps: options.preserveNodeMaps !== false,
        programs: Array.isArray(options.programs) ? options.programs : null,
        projects: [],
        range: options.range === true,
        singleRun,
        suppressDeprecatedPropertyWarnings: options.suppressDeprecatedPropertyWarnings ??
            process.env.NODE_ENV !== 'test',
        tokens: options.tokens === true ? [] : null,
        tsconfigMatchCache: (TSCONFIG_MATCH_CACHE ??= new ExpiringCache_1.ExpiringCache(singleRun
            ? 'Infinity'
            : options.cacheLifetime?.glob ??
                ExpiringCache_1.DEFAULT_TSCONFIG_CACHE_DURATION_SECONDS)),
        tsconfigRootDir,
    };
    // debug doesn't support multiple `enable` calls, so have to do it all at once
    if (parseSettings.debugLevel.size > 0) {
        const namespaces = [];
        if (parseSettings.debugLevel.has('typescript-eslint')) {
            namespaces.push('typescript-eslint:*');
        }
        if (parseSettings.debugLevel.has('eslint') ||
            // make sure we don't turn off the eslint debug if it was enabled via --debug
            debug_1.default.enabled('eslint:*,-eslint:code-path')) {
            // https://github.com/eslint/eslint/blob/9dfc8501fb1956c90dc11e6377b4cb38a6bea65d/bin/eslint.js#L25
            namespaces.push('eslint:*,-eslint:code-path');
        }
        debug_1.default.enable(namespaces.join(','));
    }
    if (Array.isArray(options.programs)) {
        if (!options.programs.length) {
            throw new Error(`You have set parserOptions.programs to an empty array. This will cause all files to not be found in existing programs. Either provide one or more existing TypeScript Program instances in the array, or remove the parserOptions.programs setting.`);
        }
        log('parserOptions.programs was provided, so parserOptions.project will be ignored.');
    }
    // Providing a program or project service overrides project resolution
    if (!parseSettings.programs && !parseSettings.EXPERIMENTAL_projectService) {
        parseSettings.projects = (0, resolveProjectList_1.resolveProjectList)({
            cacheLifetime: options.cacheLifetime,
            project: (0, getProjectConfigFiles_1.getProjectConfigFiles)(parseSettings, options.project),
            projectFolderIgnoreList: options.projectFolderIgnoreList,
            singleRun: parseSettings.singleRun,
            tsconfigRootDir: tsconfigRootDir,
        });
    }
    // No type-aware linting which means that cross-file (or even same-file) JSDoc is useless
    // So in this specific case we default to 'none' if no value was provided
    if (options.jsDocParsingMode == null &&
        parseSettings.projects.length === 0 &&
        parseSettings.programs == null &&
        parseSettings.EXPERIMENTAL_projectService == null) {
        parseSettings.jsDocParsingMode = JSDocParsingMode.ParseNone;
    }
    (0, warnAboutTSVersion_1.warnAboutTSVersion)(parseSettings, passedLoggerFn);
    return parseSettings;
}
exports.createParseSettings = createParseSettings;
function clearTSConfigMatchCache() {
    TSCONFIG_MATCH_CACHE?.clear();
}
exports.clearTSConfigMatchCache = clearTSConfigMatchCache;
function clearTSServerProjectService() {
    TSSERVER_PROJECT_SERVICE = null;
}
exports.clearTSServerProjectService = clearTSServerProjectService;
/**
 * Ensures source code is a string.
 */
function enforceCodeString(code) {
    return (0, source_files_1.isSourceFile)(code)
        ? code.getFullText(code)
        : typeof code === 'string'
            ? code
            : String(code);
}
/**
 * Compute the filename based on the parser options.
 *
 * Even if jsx option is set in typescript compiler, filename still has to
 * contain .tsx file extension.
 */
function getFileName(jsx) {
    return jsx ? 'estree.tsx' : 'estree.ts';
}
//# sourceMappingURL=createParseSettings.js.map