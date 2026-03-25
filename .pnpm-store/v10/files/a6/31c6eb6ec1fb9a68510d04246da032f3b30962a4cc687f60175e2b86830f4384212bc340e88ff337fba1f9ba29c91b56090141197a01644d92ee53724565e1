"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Operation4xxProblemDetailsRfc7807 = void 0;
const utils_1 = require("../utils");
/**
 * Validation according to rfc7807 - https://datatracker.ietf.org/doc/html/rfc7807
 */
const Operation4xxProblemDetailsRfc7807 = () => {
    return {
        Response: {
            skip(_, key) {
                return !/4[Xx0-9]{2}/.test(`${key}`);
            },
            enter(response, { report, location }) {
                if (!response.content || !response.content['application/problem+json'])
                    report({
                        message: 'Response `4xx` must have content-type `application/problem+json`.',
                        location: location.key(),
                    });
            },
            MediaType: {
                skip(_, key) {
                    return key !== 'application/problem+json';
                },
                enter(media, ctx) {
                    (0, utils_1.validateDefinedAndNonEmpty)('schema', media, ctx);
                },
                SchemaProperties(schema, ctx) {
                    (0, utils_1.validateDefinedAndNonEmpty)('type', schema, ctx);
                    (0, utils_1.validateDefinedAndNonEmpty)('title', schema, ctx);
                },
            },
        },
    };
};
exports.Operation4xxProblemDetailsRfc7807 = Operation4xxProblemDetailsRfc7807;
