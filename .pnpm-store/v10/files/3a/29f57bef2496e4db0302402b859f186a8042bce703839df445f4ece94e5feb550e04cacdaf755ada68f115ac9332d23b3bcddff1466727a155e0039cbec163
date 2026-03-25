"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseContainsHeader = void 0;
const utils_1 = require("../../utils");
const ResponseContainsHeader = (options) => {
    const names = options.names || {};
    return {
        Operation: {
            Response: {
                enter: (response, { report, location, key }) => {
                    const expectedHeaders = names[key] ||
                        names[(0, utils_1.getMatchingStatusCodeRange)(key)] ||
                        names[(0, utils_1.getMatchingStatusCodeRange)(key).toLowerCase()] ||
                        [];
                    for (const expectedHeader of expectedHeaders) {
                        if (!response?.headers ||
                            !Object.keys(response?.headers).some((header) => header.toLowerCase() === expectedHeader.toLowerCase())) {
                            report({
                                message: `Response object must contain a "${expectedHeader}" header.`,
                                location: location.child('headers').key(),
                            });
                        }
                    }
                },
            },
        },
    };
};
exports.ResponseContainsHeader = ResponseContainsHeader;
