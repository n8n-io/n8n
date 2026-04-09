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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RigConfig = void 0;
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const nodeResolve = __importStar(require("resolve"));
const strip_json_comments_1 = __importDefault(require("strip-json-comments"));
const Helpers_1 = require("./Helpers");
/**
 * {@inheritdoc IRigConfig}
 *
 * @public
 */
class RigConfig {
    constructor(options) {
        const { projectFolderPath, rigFound, filePath, rigPackageName, rigProfile = 'default' } = options;
        this.projectFolderOriginalPath = projectFolderPath;
        this.projectFolderPath = path.resolve(projectFolderPath);
        this.rigFound = rigFound;
        this.filePath = filePath;
        this.rigPackageName = rigPackageName;
        this.rigProfile = rigProfile;
        if (this.rigFound) {
            this.relativeProfileFolderPath = 'profiles/' + this.rigProfile;
        }
        else {
            this.relativeProfileFolderPath = '';
        }
    }
    /**
     * The JSON contents of the {@link RigConfig.jsonSchemaPath} file.
     *
     * @remarks
     * The JSON object will be lazily loaded when this property getter is accessed, and the result
     * will be cached.
     * Accessing this property may make a synchronous filesystem call.
     */
    static get jsonSchemaObject() {
        if (RigConfig._jsonSchemaObject === undefined) {
            const jsonSchemaContent = fs.readFileSync(RigConfig.jsonSchemaPath).toString();
            RigConfig._jsonSchemaObject = JSON.parse(jsonSchemaContent);
        }
        return RigConfig._jsonSchemaObject;
    }
    /**
     * Use this method to load the `config/rig.json` file for a given project.
     *
     * @remarks
     * If the file cannot be found, an empty `RigConfig` object will be returned with {@link RigConfig.rigFound}
     * equal to `false`.
     */
    static loadForProjectFolder(options) {
        const { overrideRigJsonObject, projectFolderPath } = options;
        const fromCache = !options.bypassCache && !overrideRigJsonObject
            ? RigConfig._configCache.get(projectFolderPath)
            : undefined;
        if (fromCache) {
            return fromCache;
        }
        const rigConfigFilePath = path.join(projectFolderPath, 'config/rig.json');
        let config;
        let json = overrideRigJsonObject;
        try {
            if (!json) {
                const rigConfigFileContent = fs.readFileSync(rigConfigFilePath).toString();
                json = JSON.parse((0, strip_json_comments_1.default)(rigConfigFileContent));
            }
            RigConfig._validateSchema(json);
        }
        catch (error) {
            config = RigConfig._handleConfigError(error, projectFolderPath, rigConfigFilePath);
        }
        if (!config) {
            config = new RigConfig({
                projectFolderPath: projectFolderPath,
                rigFound: true,
                filePath: rigConfigFilePath,
                rigPackageName: json.rigPackageName,
                rigProfile: json.rigProfile
            });
        }
        if (!overrideRigJsonObject) {
            RigConfig._configCache.set(projectFolderPath, config);
        }
        return config;
    }
    /**
     * An async variant of {@link RigConfig.loadForProjectFolder}
     */
    static async loadForProjectFolderAsync(options) {
        const { overrideRigJsonObject, projectFolderPath } = options;
        const fromCache = !options.bypassCache && !overrideRigJsonObject && RigConfig._configCache.get(projectFolderPath);
        if (fromCache) {
            return fromCache;
        }
        const rigConfigFilePath = path.join(projectFolderPath, 'config/rig.json');
        let config;
        let json = overrideRigJsonObject;
        try {
            if (!json) {
                const rigConfigFileContent = (await fs.promises.readFile(rigConfigFilePath)).toString();
                json = JSON.parse((0, strip_json_comments_1.default)(rigConfigFileContent));
            }
            RigConfig._validateSchema(json);
        }
        catch (error) {
            config = RigConfig._handleConfigError(error, projectFolderPath, rigConfigFilePath);
        }
        if (!config) {
            config = new RigConfig({
                projectFolderPath: projectFolderPath,
                rigFound: true,
                filePath: rigConfigFilePath,
                rigPackageName: json.rigPackageName,
                rigProfile: json.rigProfile
            });
        }
        if (!overrideRigJsonObject) {
            RigConfig._configCache.set(projectFolderPath, config);
        }
        return config;
    }
    static _handleConfigError(error, projectFolderPath, rigConfigFilePath) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
            throw new Error(error.message + '\nError loading config file: ' + rigConfigFilePath);
        }
        // File not found, i.e. no rig config
        return new RigConfig({
            projectFolderPath,
            rigFound: false,
            filePath: '',
            rigPackageName: '',
            rigProfile: ''
        });
    }
    /**
     * {@inheritdoc IRigConfig.getResolvedProfileFolder}
     */
    getResolvedProfileFolder() {
        if (this._resolvedRigPackageFolder === undefined) {
            if (!this.rigFound) {
                throw new Error('Cannot resolve the rig package because no rig was specified for this project');
            }
            const rigPackageJsonModuleSpecifier = `${this.rigPackageName}/package.json`;
            const resolveOptions = { basedir: this.projectFolderPath };
            const resolvedRigPackageJsonPath = nodeResolve.sync(rigPackageJsonModuleSpecifier, resolveOptions);
            this._resolvedRigPackageFolder = path.dirname(resolvedRigPackageJsonPath);
        }
        if (this._resolvedProfileFolder === undefined) {
            this._resolvedProfileFolder = path.join(this._resolvedRigPackageFolder, this.relativeProfileFolderPath);
            if (!fs.existsSync(this._resolvedProfileFolder)) {
                throw new Error(`The rig profile "${this.rigProfile}" is not defined` +
                    ` by the rig package "${this.rigPackageName}"`);
            }
        }
        return this._resolvedProfileFolder;
    }
    /**
     * {@inheritdoc IRigConfig.getResolvedProfileFolderAsync}
     */
    async getResolvedProfileFolderAsync() {
        if (this._resolvedRigPackageFolder === undefined) {
            if (!this.rigFound) {
                throw new Error('Cannot resolve the rig package because no rig was specified for this project');
            }
            const rigPackageJsonModuleSpecifier = `${this.rigPackageName}/package.json`;
            const resolveOptions = { basedir: this.projectFolderPath };
            const resolvedRigPackageJsonPath = await Helpers_1.Helpers.nodeResolveAsync(rigPackageJsonModuleSpecifier, resolveOptions);
            this._resolvedRigPackageFolder = path.dirname(resolvedRigPackageJsonPath);
        }
        if (this._resolvedProfileFolder === undefined) {
            this._resolvedProfileFolder = path.join(this._resolvedRigPackageFolder, this.relativeProfileFolderPath);
            if (!(await Helpers_1.Helpers.fsExistsAsync(this._resolvedProfileFolder))) {
                throw new Error(`The rig profile "${this.rigProfile}" is not defined` +
                    ` by the rig package "${this.rigPackageName}"`);
            }
        }
        return this._resolvedProfileFolder;
    }
    /**
     * {@inheritdoc IRigConfig.tryResolveConfigFilePath}
     */
    tryResolveConfigFilePath(configFileRelativePath) {
        if (!Helpers_1.Helpers.isDownwardRelative(configFileRelativePath)) {
            throw new Error('The configFileRelativePath is not a relative path: ' + configFileRelativePath);
        }
        const localPath = path.join(this.projectFolderPath, configFileRelativePath);
        if (fs.existsSync(localPath)) {
            return localPath;
        }
        if (this.rigFound) {
            const riggedPath = path.join(this.getResolvedProfileFolder(), configFileRelativePath);
            if (fs.existsSync(riggedPath)) {
                return riggedPath;
            }
        }
        return undefined;
    }
    /**
     * {@inheritdoc IRigConfig.tryResolveConfigFilePathAsync}
     */
    async tryResolveConfigFilePathAsync(configFileRelativePath) {
        if (!Helpers_1.Helpers.isDownwardRelative(configFileRelativePath)) {
            throw new Error('The configFileRelativePath is not a relative path: ' + configFileRelativePath);
        }
        const localPath = path.join(this.projectFolderPath, configFileRelativePath);
        if (await Helpers_1.Helpers.fsExistsAsync(localPath)) {
            return localPath;
        }
        if (this.rigFound) {
            const riggedPath = path.join(await this.getResolvedProfileFolderAsync(), configFileRelativePath);
            if (await Helpers_1.Helpers.fsExistsAsync(riggedPath)) {
                return riggedPath;
            }
        }
        return undefined;
    }
    static _validateSchema(json) {
        for (const key of Object.getOwnPropertyNames(json)) {
            switch (key) {
                case '$schema':
                case 'rigPackageName':
                case 'rigProfile':
                    break;
                default:
                    throw new Error(`Unsupported field ${JSON.stringify(key)}`);
            }
        }
        if (!json.rigPackageName) {
            throw new Error('Missing required field "rigPackageName"');
        }
        if (!RigConfig._packageNameRegExp.test(json.rigPackageName)) {
            throw new Error(`The "rigPackageName" value is not a valid NPM package name: ${JSON.stringify(json.rigPackageName)}`);
        }
        if (!RigConfig._rigNameRegExp.test(json.rigPackageName)) {
            throw new Error(`The "rigPackageName" value is missing the "-rig" suffix: ` + JSON.stringify(json.rigProfile));
        }
        if (json.rigProfile !== undefined) {
            if (!RigConfig._profileNameRegExp.test(json.rigProfile)) {
                throw new Error(`The profile name must consist of lowercase alphanumeric words separated by hyphens: ` +
                    JSON.stringify(json.rigProfile));
            }
        }
    }
}
exports.RigConfig = RigConfig;
// For syntax details, see PackageNameParser from @rushstack/node-core-library
RigConfig._packageNameRegExp = /^(@[A-Za-z0-9\-_\.]+\/)?[A-Za-z0-9\-_\.]+$/;
// Rig package names must have the "-rig" suffix.
// Also silently accept "-rig-test" for our build test projects.
RigConfig._rigNameRegExp = /-rig(-test)?$/;
// Profiles must be lowercase alphanumeric words separated by hyphens
RigConfig._profileNameRegExp = /^[a-z0-9_\.]+(\-[a-z0-9_\.]+)*$/;
/**
 * Returns the absolute path of the `rig.schema.json` JSON schema file for `config/rig.json`,
 * which is bundled with this NPM package.
 *
 * @remarks
 * The `RigConfig` class already performs schema validation when loading `rig.json`; however
 * this schema file may be useful for integration with other validation tools.
 *
 * @public
 */
RigConfig.jsonSchemaPath = path.resolve(__dirname, './schemas/rig.schema.json');
RigConfig._jsonSchemaObject = undefined;
RigConfig._configCache = new Map();
//# sourceMappingURL=RigConfig.js.map