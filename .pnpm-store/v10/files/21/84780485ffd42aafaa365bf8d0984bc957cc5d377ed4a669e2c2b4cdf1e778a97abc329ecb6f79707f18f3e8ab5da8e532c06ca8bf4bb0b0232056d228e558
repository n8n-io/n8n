

export { ReadStream } from "fs";
/**
 * Platform-specific tools.
 */
export declare class PlatformTools {
    /**
     * Normalizes given path. Does "path.normalize" and replaces backslashes with forward slashes on Windows.
     */
    static pathNormalize(pathStr: string): string;
    /**
     * Gets file extension. Does "path.extname".
     */
    static pathExtname(pathStr: string): string;
    /**
     * Resolved given path. Does "path.resolve".
     */
    static pathResolve(pathStr: string): string;
    /**
     * Synchronously checks if file exist. Does "fs.existsSync".
     */
    static fileExist(pathStr: string): boolean;
    static readFileSync(filename: string): Buffer;
    static appendFileSync(filename: string, data: any): void;
    static writeFile(path: string, data: any): Promise<void>;
    /**
     * Loads a dotenv file into the environment variables.
     *
     * @param path The file to load as a dotenv configuration
     */
    static dotenv(pathStr: string): void;
    /**
     * Gets environment variable.
     */
    static getEnvVariable(name: string): any;
    /**
     * Logging functions needed by AdvancedConsoleLogger
     */
    static logInfo(prefix: string, info: any): void;
    static logError(prefix: string, error: any): void;
    static logWarn(prefix: string, warning: any): void;
    static log(message: string): void;
    static info(info: any): string;
    static error(error: any): string;
    static warn(message: string): string;
    static logCmdErr(prefix: string, err?: any): void;
}
