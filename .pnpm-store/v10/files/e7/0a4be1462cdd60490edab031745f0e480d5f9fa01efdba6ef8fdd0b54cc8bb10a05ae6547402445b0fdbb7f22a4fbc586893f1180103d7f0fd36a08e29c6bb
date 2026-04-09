"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitAction = void 0;
const path = __importStar(require("node:path"));
const node_core_library_1 = require("@rushstack/node-core-library");
const ts_command_line_1 = require("@rushstack/ts-command-line");
const terminal_1 = require("@rushstack/terminal");
const ExtractorConfig_1 = require("../api/ExtractorConfig");
class InitAction extends ts_command_line_1.CommandLineAction {
    constructor(parser) {
        super({
            actionName: 'init',
            summary: `Create an ${ExtractorConfig_1.ExtractorConfig.FILENAME} config file`,
            documentation: `Use this command when setting up API Extractor for a new project.  It writes an` +
                ` ${ExtractorConfig_1.ExtractorConfig.FILENAME} config file template with code comments that describe all the settings.` +
                ` The file will be written in the current directory.`
        });
    }
    async onExecuteAsync() {
        const inputFilePath = path.resolve(__dirname, '../schemas/api-extractor-template.json');
        const outputFilePath = path.resolve(ExtractorConfig_1.ExtractorConfig.FILENAME);
        if (node_core_library_1.FileSystem.exists(outputFilePath)) {
            console.log(terminal_1.Colorize.red('The output file already exists:'));
            console.log('\n  ' + outputFilePath + '\n');
            throw new Error('Unable to write output file');
        }
        console.log(terminal_1.Colorize.green('Writing file: ') + outputFilePath);
        node_core_library_1.FileSystem.copyFile({
            sourcePath: inputFilePath,
            destinationPath: outputFilePath
        });
        console.log('\nThe recommended location for this file is in the project\'s "config" subfolder,\n' +
            'or else in the top-level folder with package.json.');
    }
}
exports.InitAction = InitAction;
//# sourceMappingURL=InitAction.js.map