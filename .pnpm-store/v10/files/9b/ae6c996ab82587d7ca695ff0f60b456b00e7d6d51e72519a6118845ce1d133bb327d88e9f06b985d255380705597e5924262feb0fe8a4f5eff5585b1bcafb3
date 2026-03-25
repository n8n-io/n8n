"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfoLicenseStrict = void 0;
const oas_types_1 = require("../../oas-types");
const utils_1 = require("../utils");
const InfoLicenseStrict = () => {
    let specVersion;
    return {
        Root: {
            enter(root) {
                specVersion = (0, oas_types_1.detectSpec)(root);
            },
            License: {
                leave(license, ctx) {
                    if (specVersion === 'oas3_1') {
                        (0, utils_1.validateOneOfDefinedAndNonEmpty)(['url', 'identifier'], license, ctx);
                    }
                    else {
                        (0, utils_1.validateDefinedAndNonEmpty)('url', license, ctx);
                    }
                },
            },
        },
    };
};
exports.InfoLicenseStrict = InfoLicenseStrict;
