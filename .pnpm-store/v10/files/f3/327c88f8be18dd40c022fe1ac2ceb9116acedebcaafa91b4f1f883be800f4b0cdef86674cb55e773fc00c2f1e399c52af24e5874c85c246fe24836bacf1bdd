"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseValidator = void 0;
const modded_express_mung_1 = require("../framework/modded.express.mung");
const ajv_1 = require("../framework/ajv");
const util_1 = require("./util");
const types_1 = require("../framework/types");
const mediaTypeParser = require("media-typer");
const contentTypeParser = require("content-type");
class ResponseValidator {
    constructor(openApiSpec, options = {}, eovOptions = {}, serial = -1) {
        this.validatorsCache = {};
        this.spec = openApiSpec;
        this.ajvBody = (0, ajv_1.createResponseAjv)(openApiSpec, options);
        this.eovOptions = eovOptions;
        this.serial = serial;
        // This is a pseudo-middleware function. It doesn't get registered with
        // express via `use`
        modded_express_mung_1.default.onError = (err, req, res, next) => {
            return next(err);
        };
    }
    validate() {
        return modded_express_mung_1.default.json((body, req, res) => {
            var _a;
            if (req.openapi && this.serial == req.openapi.serial) {
                const openapi = req.openapi;
                // instead of openapi.schema, use openapi._responseSchema to get the response copy
                const responses = (_a = openapi
                    ._responseSchema) === null || _a === void 0 ? void 0 : _a.responses;
                const validators = this._getOrBuildValidator(req, responses);
                const path = req.originalUrl;
                const statusCode = res.statusCode;
                const contentType = res.getHeaders()['content-type'];
                const accept = req.headers['accept'];
                // ir response has a content type use it, else use accept headers
                const accepts = contentType
                    ? [contentType]
                    : accept
                        ? accept.split(',').map((h) => h.trim())
                        : [];
                try {
                    return this._validate({
                        validators,
                        body,
                        statusCode,
                        path,
                        accepts, // return 406 if not acceptable
                    });
                }
                catch (err) {
                    // If a custom error handler was provided, we call that
                    if (err instanceof types_1.InternalServerError && this.eovOptions.onError) {
                        this.eovOptions.onError(err, body, req);
                    }
                    else {
                        // No custom error handler, or something unexpected happen.
                        throw err;
                    }
                }
            }
            return body;
        });
    }
    // TODO public for test only - fix me
    // Build validators for each url/method/contenttype tuple
    _getOrBuildValidator(req, responses) {
        var _a;
        // get the request content type - used only to build the cache key
        const contentTypeMeta = util_1.ContentType.from(req);
        const contentType = (_a = contentTypeMeta.normalize()) !== null && _a !== void 0 ? _a : 'not_provided';
        const openapi = req.openapi;
        const key = `${req.method}-${openapi.expressRoute}-${contentType}`;
        let validators = this.validatorsCache[key];
        if (!validators) {
            validators = this.buildValidators(responses, key);
            this.validatorsCache[key] = validators;
        }
        return validators;
    }
    // TODO public for test only - fix me
    _validate({ validators, body, statusCode, path, accepts, // optional
     }) {
        const status = statusCode !== null && statusCode !== void 0 ? statusCode : 'default';
        const statusXX = status.toString()[0] + 'XX';
        let svalidator;
        if (status in validators) {
            svalidator = validators[status];
        }
        else if (statusXX in validators) {
            svalidator = validators[statusXX];
        }
        else if (validators.default) {
            svalidator = validators.default;
        }
        else {
            throw new types_1.InternalServerError({
                path: path,
                message: `no schema defined for status code '${status}' in the openapi spec`,
            });
        }
        const validatorContentTypes = Object.keys(svalidator);
        const contentType = (0, util_1.findResponseContent)(accepts, validatorContentTypes) ||
            validatorContentTypes[0]; // take first contentType, if none found
        if (validatorContentTypes.length === 0) {
            // spec specifies no content for this response
            if (body !== undefined) {
                // response contains content/body
                throw new types_1.InternalServerError({
                    path: '/response',
                    message: 'response should NOT have a body',
                });
            }
            // response contains no content/body so OK
            return;
        }
        if (!contentType) {
            // not contentType inferred, assume valid
            console.warn('no contentType found');
            return;
        }
        const validator = svalidator[contentType];
        if (!validator) {
            // no validator found, assume valid
            console.warn('no validator found');
            return;
        }
        if (body === undefined || body === null) {
            throw new types_1.InternalServerError({
                path: '/response',
                message: 'response body required.',
            });
        }
        // CHECK If Content-Type is validatable
        try {
            if (!this.canValidateContentType(contentType)) {
                console.warn('Cannot validate content type', contentType);
                // assume valid
                return;
            }
        }
        catch (e) {
            // Do nothing. Move on and validate response
        }
        const valid = validator({
            response: body,
        });
        if (!valid) {
            const errors = (0, util_1.augmentAjvErrors)(validator.errors);
            const message = this.ajvBody.errorsText(errors, {
                dataVar: '', // responses
            });
            throw new types_1.InternalServerError({
                path: path,
                errors: (0, util_1.ajvErrorsToValidatorError)(500, errors).errors,
                message: message,
            });
        }
    }
    /**
     * Build a map of response name to response validator, for the set of responses
     * defined on the current endpoint
     * @param responses
     * @returns a map of validators
     */
    buildValidators(responses, ajvCacheKey) {
        var _a, _b, _c;
        const validationTypes = (response) => {
            if (!response.content) {
                return ['no_content'];
            }
            if (typeof response.content !== 'object') {
                return [];
            }
            const types = [];
            for (let contentType of Object.keys(response.content)) {
                try {
                    if (this.canValidateContentType(contentType)) {
                        if (response.content[contentType] &&
                            response.content[contentType].schema) {
                            types.push(contentType);
                        }
                    }
                }
                catch (e) {
                    // Handle wildcards
                    if (response.content[contentType].schema &&
                        (contentType === '*/*' ||
                            new RegExp(/^[a-z]+\/\*$/).test(contentType))) {
                        types.push(contentType);
                    }
                }
            }
            return types;
        };
        const responseSchemas = {};
        for (const [name, resp] of Object.entries(responses)) {
            let tmpResponse = resp;
            if (tmpResponse.$ref) {
                // resolve top level response $ref
                const id = tmpResponse.$ref.replace(/^.+\//i, '');
                tmpResponse = (_b = (_a = this.spec.components) === null || _a === void 0 ? void 0 : _a.responses) === null || _b === void 0 ? void 0 : _b[id];
            }
            const response = tmpResponse;
            const types = validationTypes(response);
            for (const mediaTypeToValidate of types) {
                if (!mediaTypeToValidate) {
                    // TODO support content other than JSON
                    // don't validate
                    // assume is valid
                    continue;
                }
                else if (mediaTypeToValidate === 'no_content') {
                    responseSchemas[name] = {};
                    continue;
                }
                const schema = response.content[mediaTypeToValidate].schema;
                responseSchemas[name] = Object.assign(Object.assign({}, responseSchemas[name]), { [mediaTypeToValidate]: {
                        // $schema: 'http://json-schema.org/schema#',
                        // $schema: "http://json-schema.org/draft-04/schema#",
                        type: 'object',
                        properties: {
                            response: schema,
                        },
                        components: (_c = this.spec.components) !== null && _c !== void 0 ? _c : {},
                    } });
            }
        }
        const validators = {};
        for (const [code, contentTypeSchemas] of Object.entries(responseSchemas)) {
            if (Object.keys(contentTypeSchemas).length === 0) {
                validators[code] = {};
            }
            for (const contentType of Object.keys(contentTypeSchemas)) {
                const schema = contentTypeSchemas[contentType];
                schema.paths = this.spec.paths; // add paths for resolution with multi-file
                schema.components = this.spec.components; // add components for resolution w/ multi-file
                const validator = (0, util_1.useAjvCache)(this.ajvBody, schema, `${ajvCacheKey}-${code}-${contentType}`);
                validators[code] = Object.assign(Object.assign({}, validators[code]), { [contentType]: validator });
            }
        }
        return validators;
    }
    /**
     * Checks if specific Content-Type is validatable
     * @param contentType
     * @returns boolean
     * @throws error on invalid content type format
     */
    canValidateContentType(contentType) {
        const contentTypeParsed = contentTypeParser.parse(contentType);
        const mediaTypeParsed = mediaTypeParser.parse(contentTypeParsed.type);
        return (mediaTypeParsed.subtype === 'json' || mediaTypeParsed.suffix === 'json');
    }
}
exports.ResponseValidator = ResponseValidator;
//# sourceMappingURL=openapi.response.validator.js.map