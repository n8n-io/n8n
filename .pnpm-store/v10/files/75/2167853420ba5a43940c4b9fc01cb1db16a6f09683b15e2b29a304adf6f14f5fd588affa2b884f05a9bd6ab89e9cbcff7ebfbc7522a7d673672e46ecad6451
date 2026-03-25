export const PACKAGE_VERSION = '1.16.2';
export const ClientVersion = {
    /**
     * Parses a version string into a structured Version object.
     * @param version - The version string to parse (e.g., "1.2.3").
     * @returns A Version object.
     * @throws If the version format is invalid.
     */
    parseVersion(version) {
        if (!version) {
            throw new Error('Version is null');
        }
        let major = undefined;
        let minor = undefined;
        [major, minor] = version.split('.', 2);
        major = parseInt(major, 10);
        minor = parseInt(minor, 10);
        if (isNaN(major) || isNaN(minor)) {
            throw new Error(`Unable to parse version, expected format: x.y[.z], found: ${version}`);
        }
        return {
            major,
            minor,
        };
    },
    /**
     * Checks if the client version is compatible with the server version.
     * @param clientVersion - The client version string.
     * @param serverVersion - The server version string.
     * @returns True if compatible, otherwise false.
     */
    isCompatible(clientVersion, serverVersion) {
        if (!clientVersion || !serverVersion) {
            console.debug(`Unable to compare versions with null values. Client: ${clientVersion}, Server: ${serverVersion}`);
            return false;
        }
        if (clientVersion === serverVersion)
            return true;
        try {
            const client = ClientVersion.parseVersion(clientVersion);
            const server = ClientVersion.parseVersion(serverVersion);
            return client.major === server.major && Math.abs(client.minor - server.minor) <= 1;
        }
        catch (error) {
            console.debug(`Unable to compare versions: ${error}`);
            return false;
        }
    },
};
