"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionOptionsReader = void 0;
const tslib_1 = require("tslib");
const app_root_path_1 = tslib_1.__importDefault(require("app-root-path"));
const path_1 = tslib_1.__importDefault(require("path"));
const PlatformTools_1 = require("../platform/PlatformTools");
const ConnectionOptionsEnvReader_1 = require("./options-reader/ConnectionOptionsEnvReader");
const error_1 = require("../error");
const PathUtils_1 = require("../util/PathUtils");
const ImportUtils_1 = require("../util/ImportUtils");
/**
 * Reads connection options from the ormconfig.
 */
class ConnectionOptionsReader {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(options) {
        this.options = options;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Returns all connection options read from the ormconfig.
     */
    async all() {
        const options = await this.load();
        if (!options)
            throw new error_1.TypeORMError(`No connection options were found in any orm configuration files.`);
        return options;
    }
    /**
     * Gets a connection with a given name read from ormconfig.
     * If connection with such name would not be found then it throw error.
     */
    async get(name) {
        const allOptions = await this.all();
        const targetOptions = allOptions.find((options) => options.name === name || (name === "default" && !options.name));
        if (!targetOptions)
            throw new error_1.TypeORMError(`Cannot find connection ${name} because its not defined in any orm configuration files.`);
        return targetOptions;
    }
    /**
     * Checks if there is a TypeORM configuration file.
     */
    async has(name) {
        const allOptions = await this.load();
        if (!allOptions)
            return false;
        const targetOptions = allOptions.find((options) => options.name === name || (name === "default" && !options.name));
        return !!targetOptions;
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Loads all connection options from a configuration file.
     *
     * todo: get in count NODE_ENV somehow
     */
    async load() {
        let connectionOptions = undefined;
        const fileFormats = [
            "env",
            "js",
            "mjs",
            "cjs",
            "ts",
            "mts",
            "cts",
            "json",
        ];
        // Detect if baseFilePath contains file extension
        const possibleExtension = this.baseFilePath.substr(this.baseFilePath.lastIndexOf("."));
        const fileExtension = fileFormats.find((extension) => `.${extension}` === possibleExtension);
        // try to find any of following configuration formats
        const foundFileFormat = fileExtension ||
            fileFormats.find((format) => {
                return PlatformTools_1.PlatformTools.fileExist(this.baseFilePath + "." + format);
            });
        // Determine config file name
        const configFile = fileExtension
            ? this.baseFilePath
            : this.baseFilePath + "." + foundFileFormat;
        // if .env file found then load all its variables into process.env using dotenv package
        if (foundFileFormat === "env") {
            PlatformTools_1.PlatformTools.dotenv(configFile);
        }
        else if (PlatformTools_1.PlatformTools.fileExist(this.baseDirectory + "/.env")) {
            PlatformTools_1.PlatformTools.dotenv(this.baseDirectory + "/.env");
        }
        // try to find connection options from any of available sources of configuration
        if (PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_CONNECTION") ||
            PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_URL")) {
            connectionOptions = await new ConnectionOptionsEnvReader_1.ConnectionOptionsEnvReader().read();
        }
        else if (foundFileFormat === "js" ||
            foundFileFormat === "mjs" ||
            foundFileFormat === "cjs" ||
            foundFileFormat === "ts" ||
            foundFileFormat === "mts" ||
            foundFileFormat === "cts") {
            const [importOrRequireResult, moduleSystem] = await (0, ImportUtils_1.importOrRequireFile)(configFile);
            const configModule = await importOrRequireResult;
            if (moduleSystem === "esm" ||
                (configModule &&
                    "__esModule" in configModule &&
                    "default" in configModule)) {
                connectionOptions = configModule.default;
            }
            else {
                connectionOptions = configModule;
            }
        }
        else if (foundFileFormat === "json") {
            connectionOptions = require(configFile);
        }
        // normalize and return connection options
        if (connectionOptions) {
            return this.normalizeConnectionOptions(connectionOptions);
        }
        return undefined;
    }
    /**
     * Normalize connection options.
     */
    normalizeConnectionOptions(connectionOptions) {
        if (!Array.isArray(connectionOptions))
            connectionOptions = [connectionOptions];
        connectionOptions.forEach((options) => {
            options.baseDirectory = this.baseDirectory;
            if (options.entities) {
                const entities = options.entities.map((entity) => {
                    if (typeof entity === "string" &&
                        entity.substr(0, 1) !== "/")
                        return this.baseDirectory + "/" + entity;
                    return entity;
                });
                Object.assign(connectionOptions, { entities: entities });
            }
            if (options.subscribers) {
                const subscribers = options.subscribers.map((subscriber) => {
                    if (typeof subscriber === "string" &&
                        subscriber.substr(0, 1) !== "/")
                        return this.baseDirectory + "/" + subscriber;
                    return subscriber;
                });
                Object.assign(connectionOptions, { subscribers: subscribers });
            }
            if (options.migrations) {
                const migrations = options.migrations.map((migration) => {
                    if (typeof migration === "string" &&
                        migration.substr(0, 1) !== "/")
                        return this.baseDirectory + "/" + migration;
                    return migration;
                });
                Object.assign(connectionOptions, { migrations: migrations });
            }
            // make database path file in sqlite relative to package.json
            if (options.type === "sqlite" || options.type === "sqlite-pooled") {
                if (typeof options.database === "string" &&
                    !(0, PathUtils_1.isAbsolute)(options.database) &&
                    options.database.substr(0, 1) !== "/" && // unix absolute
                    options.database.substr(1, 2) !== ":\\" && // windows absolute
                    options.database !== ":memory:") {
                    Object.assign(options, {
                        database: this.baseDirectory + "/" + options.database,
                    });
                }
            }
        });
        return connectionOptions;
    }
    /**
     * Gets directory where configuration file should be located and configuration file name.
     */
    get baseFilePath() {
        return path_1.default.resolve(this.baseDirectory, this.baseConfigName);
    }
    /**
     * Gets directory where configuration file should be located.
     */
    get baseDirectory() {
        if (this.options && this.options.root)
            return this.options.root;
        return app_root_path_1.default.path;
    }
    /**
     * Gets configuration file name.
     */
    get baseConfigName() {
        if (this.options && this.options.configName)
            return this.options.configName;
        return "ormconfig";
    }
}
exports.ConnectionOptionsReader = ConnectionOptionsReader;

//# sourceMappingURL=ConnectionOptionsReader.js.map
