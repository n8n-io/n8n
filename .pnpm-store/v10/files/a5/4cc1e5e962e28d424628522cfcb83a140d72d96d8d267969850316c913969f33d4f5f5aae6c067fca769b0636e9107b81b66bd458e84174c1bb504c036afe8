"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpotSupportedVersions = void 0;
const arazzo_1 = require("../../typings/arazzo");
const utils_1 = require("../../utils");
const SpotSupportedVersions = () => {
    const supportedVersions = arazzo_1.ARAZZO_VERSIONS_SUPPORTED_BY_SPOT.join(', ');
    return {
        Root: {
            enter(root, { report, location }) {
                if (!arazzo_1.ARAZZO_VERSIONS_SUPPORTED_BY_SPOT.includes(root.arazzo)) {
                    report({
                        message: `Only ${supportedVersions} Arazzo ${(0, utils_1.pluralize)('version is', arazzo_1.ARAZZO_VERSIONS_SUPPORTED_BY_SPOT.length)} supported by Spot.`,
                        location: location.child('arazzo'),
                    });
                }
            },
        },
    };
};
exports.SpotSupportedVersions = SpotSupportedVersions;
