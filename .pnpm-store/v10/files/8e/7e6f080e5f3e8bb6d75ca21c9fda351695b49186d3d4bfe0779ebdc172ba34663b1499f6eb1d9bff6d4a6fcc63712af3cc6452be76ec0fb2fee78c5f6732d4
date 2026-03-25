import { Driver } from "./Driver";
/**
 * Common driver utility functions.
 */
export declare class DriverUtils {
    /**
     * Returns true if given driver is SQLite-based driver.
     */
    static isSQLiteFamily(driver: Driver): boolean;
    /**
     * Returns true if given driver is MySQL-based driver.
     */
    static isMySQLFamily(driver: Driver): boolean;
    static isReleaseVersionOrGreater(driver: Driver, version: string): boolean;
    static isPostgresFamily(driver: Driver): boolean;
    /**
     * Normalizes and builds a new driver options.
     * Extracts settings from connection url and sets to a new options object.
     */
    static buildDriverOptions(options: any, buildOptions?: {
        useSid: boolean;
    }): any;
    /**
     * buildDriverOptions for MongodDB only to support replica set
     */
    static buildMongoDBDriverOptions(options: any, buildOptions?: {
        useSid: boolean;
    }): any;
    /**
     * Joins and shortens alias if needed.
     *
     * If the alias length is greater than the limit allowed by the current
     * driver, replaces it with a shortend string, if the shortend string
     * is still too long, it will then hash the alias.
     *
     * @param driver Current `Driver`.
     * @param buildOptions Optional settings.
     * @param alias Alias parts.
     *
     * @return An alias that is no longer than the divers max alias length.
     */
    static buildAlias({ maxAliasLength }: Driver, buildOptions: {
        shorten?: boolean;
        joiner?: string;
    } | undefined, ...alias: string[]): string;
    /**
     * @deprecated use `buildAlias` instead.
     */
    static buildColumnAlias({ maxAliasLength }: Driver, buildOptions: {
        shorten?: boolean;
        joiner?: string;
    } | string, ...alias: string[]): string;
    /**
     * Extracts connection data from the connection url.
     */
    private static parseConnectionUrl;
    /**
     * Extracts connection data from the connection url for MongoDB to support replica set.
     */
    private static parseMongoDBConnectionUrl;
}
