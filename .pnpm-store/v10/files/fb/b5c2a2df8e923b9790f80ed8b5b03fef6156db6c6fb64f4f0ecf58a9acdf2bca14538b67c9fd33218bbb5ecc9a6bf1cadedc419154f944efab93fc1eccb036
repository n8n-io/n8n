export function isValidWeaviateVersion(version) {
    if (typeof version === 'string') {
        const versionNumbers = version.split('.');
        if (versionNumbers.length >= 2) {
            const major = parseInt(versionNumbers[0], 10);
            const minor = parseInt(versionNumbers[1], 10);
            return !(major <= 1 && minor < 16);
        }
    }
    return true;
}
