export declare const PACKAGE_VERSION = "1.16.2";
interface Version {
    major: number;
    minor: number;
}
export declare const ClientVersion: {
    /**
     * Parses a version string into a structured Version object.
     * @param version - The version string to parse (e.g., "1.2.3").
     * @returns A Version object.
     * @throws If the version format is invalid.
     */
    parseVersion(version: string): Version;
    /**
     * Checks if the client version is compatible with the server version.
     * @param clientVersion - The client version string.
     * @param serverVersion - The server version string.
     * @returns True if compatible, otherwise false.
     */
    isCompatible(clientVersion: string, serverVersion: string): boolean;
};
export {};
