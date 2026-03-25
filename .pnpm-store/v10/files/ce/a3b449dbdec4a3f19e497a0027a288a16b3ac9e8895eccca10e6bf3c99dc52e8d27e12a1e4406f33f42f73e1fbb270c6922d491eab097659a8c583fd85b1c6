"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionOptionsEnvReader = void 0;
const PlatformTools_1 = require("../../platform/PlatformTools");
const OrmUtils_1 = require("../../util/OrmUtils");
/**
 * Reads connection options from environment variables.
 * Environment variables can have only a single connection.
 * Its strongly required to define TYPEORM_CONNECTION env variable.
 *
 * @deprecated
 */
class ConnectionOptionsEnvReader {
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Reads connection options from environment variables.
     */
    async read() {
        return [
            {
                type: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_CONNECTION") ||
                    (PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_URL")
                        ? PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_URL").split("://")[0]
                        : undefined),
                url: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_URL"),
                host: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_HOST"),
                port: this.stringToNumber(PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_PORT")),
                username: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_USERNAME"),
                password: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_PASSWORD"),
                database: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_DATABASE"),
                schema: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_SCHEMA"),
                extra: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_DRIVER_EXTRA")
                    ? JSON.parse(PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_DRIVER_EXTRA"))
                    : undefined,
                synchronize: OrmUtils_1.OrmUtils.toBoolean(PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_SYNCHRONIZE")),
                dropSchema: OrmUtils_1.OrmUtils.toBoolean(PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_DROP_SCHEMA")),
                migrationsRun: OrmUtils_1.OrmUtils.toBoolean(PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_MIGRATIONS_RUN")),
                entities: this.stringToArray(PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_ENTITIES")),
                migrations: this.stringToArray(PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_MIGRATIONS")),
                migrationsTableName: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_MIGRATIONS_TABLE_NAME"),
                metadataTableName: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_METADATA_TABLE_NAME"),
                subscribers: this.stringToArray(PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_SUBSCRIBERS")),
                logging: this.transformLogging(PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_LOGGING")),
                logger: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_LOGGER"),
                entityPrefix: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_ENTITY_PREFIX"),
                maxQueryExecutionTime: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_MAX_QUERY_EXECUTION_TIME"),
                debug: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_DEBUG"),
                cache: this.transformCaching(),
                uuidExtension: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_UUID_EXTENSION"),
            },
        ];
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Transforms logging string into real logging value connection requires.
     */
    transformLogging(logging) {
        if (logging === "true" || logging === "TRUE" || logging === "1")
            return true;
        if (logging === "all")
            return "all";
        return this.stringToArray(logging);
    }
    /**
     * Transforms caching option into real caching value option requires.
     */
    transformCaching() {
        const caching = PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_CACHE");
        if (caching === "true" || caching === "TRUE" || caching === "1")
            return true;
        if (caching === "false" || caching === "FALSE" || caching === "0")
            return false;
        if (caching === "database")
            return {
                type: caching,
                options: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_CACHE_OPTIONS")
                    ? JSON.parse(PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_CACHE_OPTIONS"))
                    : undefined,
                alwaysEnabled: PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_CACHE_ALWAYS_ENABLED"),
                duration: parseInt(PlatformTools_1.PlatformTools.getEnvVariable("TYPEORM_CACHE_DURATION")),
            };
        return undefined;
    }
    /**
     * Converts a string which contains multiple elements split by comma into a string array of strings.
     */
    stringToArray(variable) {
        if (!variable)
            return [];
        return variable.split(",").map((str) => str.trim());
    }
    /**
     * Converts a string which contains a number into a javascript number
     */
    stringToNumber(value) {
        if (!value) {
            return undefined;
        }
        return parseInt(value);
    }
}
exports.ConnectionOptionsEnvReader = ConnectionOptionsEnvReader;

//# sourceMappingURL=ConnectionOptionsEnvReader.js.map
