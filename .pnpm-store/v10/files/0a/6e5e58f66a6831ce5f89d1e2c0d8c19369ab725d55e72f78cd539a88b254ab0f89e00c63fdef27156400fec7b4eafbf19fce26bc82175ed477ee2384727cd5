"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RespectSupportedVersions = void 0;
const arazzo_1 = require("../../typings/arazzo");
const utils_1 = require("../../utils");
const RespectSupportedVersions = () => {
    const supportedVersions = arazzo_1.ARAZZO_VERSIONS_SUPPORTED_BY_RESPECT.join(', ');
    return {
        Root: {
            enter(root, { report, location }) {
                if (!arazzo_1.ARAZZO_VERSIONS_SUPPORTED_BY_RESPECT.includes(root.arazzo)) {
                    report({
                        message: `Only ${supportedVersions} Arazzo ${(0, utils_1.pluralize)('version is', arazzo_1.ARAZZO_VERSIONS_SUPPORTED_BY_RESPECT.length)} fully supported by Respect.`,
                        location: location.child('arazzo'),
                    });
                }
            },
        },
    };
};
exports.RespectSupportedVersions = RespectSupportedVersions;
