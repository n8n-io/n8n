"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BodySchemaParser = void 0;
const util_1 = require("../util");
const types_1 = require("../../framework/types");
class BodySchemaParser {
    constructor() {
    }
    parse(path, pathSchema, contentType) {
        // The schema.preprocessor will have dereferenced the RequestBodyObject
        // thus we can assume a RequestBodyObject, not a ReferenceObject
        const requestBody = pathSchema.requestBody;
        if (requestBody === null || requestBody === void 0 ? void 0 : requestBody.hasOwnProperty('content')) {
            return this.toSchema(path, contentType, requestBody);
        }
        return {};
    }
    toSchema(path, contentType, requestBody) {
        var _a;
        if (!(requestBody === null || requestBody === void 0 ? void 0 : requestBody.content))
            return {};
        let content = null;
        let requestBodyTypes = Object.keys(requestBody.content);
        for (const type of requestBodyTypes) {
            let openApiContentType = util_1.ContentType.fromString(type);
            if (contentType.normalize() == openApiContentType.normalize()) {
                content = requestBody.content[type];
                break;
            }
        }
        if (!content) {
            const equivalentContentTypes = contentType.equivalents();
            for (const type of requestBodyTypes) {
                let openApiContentType = util_1.ContentType.fromString(type);
                if (equivalentContentTypes.find((type2) => openApiContentType.normalize() === type2.normalize())) {
                    content = requestBody.content[type];
                    break;
                }
            }
        }
        if (!content) {
            for (const requestContentType of Object.keys(requestBody.content)
                .sort()
                .reverse()) {
                if (requestContentType === '*/*') {
                    content = requestBody.content[requestContentType];
                    break;
                }
                if (!new RegExp(/^[a-z]+\/\*$/).test(requestContentType))
                    continue; // not a wildcard of type application/*
                const [type] = requestContentType.split('/', 1);
                if (new RegExp(`^${type}\/.+$`).test(contentType.normalize())) {
                    content = requestBody.content[requestContentType];
                    break;
                }
            }
        }
        if (!content) {
            // check if required is false, if so allow request when no content type is supplied
            const contentNotProvided = contentType.normalize() === 'not_provided';
            if ((contentType.normalize() === undefined || contentNotProvided) && requestBody.required === false) {
                return {};
            }
            const msg = contentNotProvided
                ? 'media type not specified'
                : `unsupported media type ${contentType.normalize()}`;
            throw new types_1.UnsupportedMediaType({ path: path, message: msg });
        }
        return (_a = content.schema) !== null && _a !== void 0 ? _a : {};
    }
}
exports.BodySchemaParser = BodySchemaParser;
//# sourceMappingURL=body.parse.js.map