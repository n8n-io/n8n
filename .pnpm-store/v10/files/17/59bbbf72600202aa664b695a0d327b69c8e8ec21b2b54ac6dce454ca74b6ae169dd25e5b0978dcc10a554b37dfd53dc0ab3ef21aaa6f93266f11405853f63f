"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfoContact = void 0;
const utils_1 = require("../utils");
const InfoContact = () => {
    return {
        Info(info, { report, location }) {
            if (!info.contact) {
                report({
                    message: (0, utils_1.missingRequiredField)('Info', 'contact'),
                    location: location.child('contact').key(),
                });
            }
        },
    };
};
exports.InfoContact = InfoContact;
