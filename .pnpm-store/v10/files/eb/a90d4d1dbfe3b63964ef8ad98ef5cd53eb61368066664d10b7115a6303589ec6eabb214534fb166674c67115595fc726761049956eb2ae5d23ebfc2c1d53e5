"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.omitCustomConfigProperties = omitCustomConfigProperties;
function omitCustomConfigProperties(config) {
    const copy = { ...config };
    delete copy.defaultFilenames;
    delete copy.dependencyConstraints;
    return copy;
}
