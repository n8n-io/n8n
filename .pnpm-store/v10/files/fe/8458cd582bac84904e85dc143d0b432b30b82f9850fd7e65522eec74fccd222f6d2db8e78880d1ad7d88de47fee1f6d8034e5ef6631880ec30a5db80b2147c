"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfoLicense = void 0;
const utils_1 = require("../utils");
const InfoLicense = () => {
    return {
        Info(info, { report }) {
            if (!info.license) {
                report({
                    message: (0, utils_1.missingRequiredField)('Info', 'license'),
                    location: { reportOnKey: true },
                });
            }
        },
    };
};
exports.InfoLicense = InfoLicense;
