import { DataSourceOptions } from "../../data-source/DataSourceOptions";
/**
 * Reads connection options from environment variables.
 * Environment variables can have only a single connection.
 * Its strongly required to define TYPEORM_CONNECTION env variable.
 *
 * @deprecated
 */
export declare class ConnectionOptionsEnvReader {
    /**
     * Reads connection options from environment variables.
     */
    read(): Promise<DataSourceOptions[]>;
    /**
     * Transforms logging string into real logging value connection requires.
     */
    protected transformLogging(logging: string): any;
    /**
     * Transforms caching option into real caching value option requires.
     */
    protected transformCaching(): boolean | object | undefined;
    /**
     * Converts a string which contains multiple elements split by comma into a string array of strings.
     */
    protected stringToArray(variable?: string): string[];
    /**
     * Converts a string which contains a number into a javascript number
     */
    private stringToNumber;
}
