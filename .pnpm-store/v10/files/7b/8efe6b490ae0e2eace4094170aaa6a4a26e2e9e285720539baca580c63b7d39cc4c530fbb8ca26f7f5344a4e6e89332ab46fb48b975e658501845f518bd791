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
exports.createDefaultProgram = void 0;
const debug_1 = __importDefault(require("debug"));
const path_1 = __importDefault(require("path"));
const ts = __importStar(require("typescript"));
const shared_1 = require("./shared");
const log = (0, debug_1.default)('typescript-eslint:typescript-estree:createDefaultProgram');
/**
 * @param parseSettings Internal settings for parsing the file
 * @returns If found, returns the source file corresponding to the code and the containing program
 * @deprecated
 * This is a legacy option that comes with severe performance penalties.
 * Please do not use it.
 */
function createDefaultProgram(parseSettings) {
    log('Getting default program for: %s', parseSettings.filePath || 'unnamed file');
    if (parseSettings.projects.length !== 1) {
        return undefined;
    }
    const tsconfigPath = parseSettings.projects[0];
    const commandLine = ts.getParsedCommandLineOfConfigFile(tsconfigPath, (0, shared_1.createDefaultCompilerOptionsFromExtra)(parseSettings), {
        ...ts.sys,
        // TODO: file issue on TypeScript to suggest making optional?
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        onUnRecoverableConfigFileDiagnostic: () => { },
    });
    if (!commandLine) {
        return undefined;
    }
    const compilerHost = ts.createCompilerHost(commandLine.options, 
    /* setParentNodes */ true);
    const oldReadFile = compilerHost.readFile;
    compilerHost.readFile = (fileName) => path_1.default.normalize(fileName) === path_1.default.normalize(parseSettings.filePath)
        ? parseSettings.codeFullText
        : oldReadFile(fileName);
    const program = ts.createProgram([parseSettings.filePath], {
        ...commandLine.options,
        jsDocParsingMode: parseSettings.jsDocParsingMode,
    }, compilerHost);
    const ast = program.getSourceFile(parseSettings.filePath);
    return ast && { ast, program };
}
exports.createDefaultProgram = createDefaultProgram;
//# sourceMappingURL=createDefaultProgram.js.map