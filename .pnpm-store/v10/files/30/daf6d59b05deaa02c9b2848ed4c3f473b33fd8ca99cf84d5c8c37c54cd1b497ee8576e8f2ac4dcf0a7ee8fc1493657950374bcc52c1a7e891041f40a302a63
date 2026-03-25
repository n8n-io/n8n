import { DataSourceOptions } from "../data-source/DataSourceOptions";
/**
 * Reads connection options from the ormconfig.
 */
export declare class ConnectionOptionsReader {
    protected options?: {
        /**
         * Directory where ormconfig should be read from.
         * By default its your application root (where your app package.json is located).
         */
        root?: string | undefined;
        /**
         * Filename of the ormconfig configuration. By default its equal to "ormconfig".
         */
        configName?: string | undefined;
    } | undefined;
    constructor(options?: {
        /**
         * Directory where ormconfig should be read from.
         * By default its your application root (where your app package.json is located).
         */
        root?: string | undefined;
        /**
         * Filename of the ormconfig configuration. By default its equal to "ormconfig".
         */
        configName?: string | undefined;
    } | undefined);
    /**
     * Returns all connection options read from the ormconfig.
     */
    all(): Promise<DataSourceOptions[]>;
    /**
     * Gets a connection with a given name read from ormconfig.
     * If connection with such name would not be found then it throw error.
     */
    get(name: string): Promise<DataSourceOptions>;
    /**
     * Checks if there is a TypeORM configuration file.
     */
    has(name: string): Promise<boolean>;
    /**
     * Loads all connection options from a configuration file.
     *
     * todo: get in count NODE_ENV somehow
     */
    protected load(): Promise<DataSourceOptions[] | undefined>;
    /**
     * Normalize connection options.
     */
    protected normalizeConnectionOptions(connectionOptions: DataSourceOptions | DataSourceOptions[]): DataSourceOptions[];
    /**
     * Gets directory where configuration file should be located and configuration file name.
     */
    protected get baseFilePath(): string;
    /**
     * Gets directory where configuration file should be located.
     */
    protected get baseDirectory(): string;
    /**
     * Gets configuration file name.
     */
    protected get baseConfigName(): string;
}
