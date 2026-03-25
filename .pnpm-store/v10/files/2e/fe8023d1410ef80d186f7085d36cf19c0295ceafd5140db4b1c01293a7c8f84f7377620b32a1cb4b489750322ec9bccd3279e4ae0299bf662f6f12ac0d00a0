"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionUtils = void 0;
class VersionUtils {
    static isGreaterOrEqual(version, targetVersion) {
        const v1 = parseVersion(version);
        const v2 = parseVersion(targetVersion);
        return (v1[0] > v2[0] ||
            (v1[0] === v2[0] && v1[1] > v2[1]) ||
            (v1[0] === v2[0] && v1[1] === v2[1] && v1[2] >= v2[2]));
    }
}
exports.VersionUtils = VersionUtils;
function parseVersion(version = "") {
    const v = [0, 0, 0];
    version.split(".").forEach((value, i) => (v[i] = parseInt(value, 10)));
    return v;
}

//# sourceMappingURL=VersionUtils.js.map
