exports.require = function () {
    if (typeof process === "object" && process.versions && process.versions["electron"]) {
        try {
            const originalFs = require("original-fs");
            if (Object.keys(originalFs).length > 0) {
                return originalFs;
            }
        } catch (e) {}
    }
    return require("fs");
};
