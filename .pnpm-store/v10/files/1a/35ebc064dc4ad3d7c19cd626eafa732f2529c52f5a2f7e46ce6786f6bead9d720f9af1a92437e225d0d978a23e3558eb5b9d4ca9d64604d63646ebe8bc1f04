"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multipart = multipart;
const ajv_1 = require("../framework/ajv");
const types_1 = require("../framework/types");
const multer = require('multer');
function multipart(apiDoc, options) {
    const mult = multer(options.multerOpts);
    const Ajv = (0, ajv_1.createRequestAjv)(apiDoc, Object.assign({}, options.ajvOpts));
    return async (req, res, next) => {
        // TODO check that format: binary (for upload) else do not use multer.any()
        // use multer.none() if no binary parameters exist
        if (shouldHandle(Ajv, req)) {
            try {
                await new Promise((resolve, reject) => {
                    mult.any()(req, res, (err) => {
                        if (err) {
                            reject(error(req, err));
                        }
                        else {
                            // TODO:
                            // If a form parameter 'file' is defined to take file value, but the user provides a string value instead
                            // req.files will be empty and req.body.file will be populated with a string
                            // This will incorrectly PASS validation.
                            // Instead, we should return a 400 with an invalid type e.g. file expects a file, but found string.
                            //
                            // In order to support this, we likely need to inspect the schema directly to find the type.
                            // For example, if param with type: 'string', format: 'binary' is defined, we expect to see it in
                            // req.files. If it's not present we should throw a 400
                            //
                            // This is a bit complex because the schema may be defined inline (easy) or via a $ref (complex) in which
                            // case we must follow the $ref to check the type.
                            if (req.files) {
                                // to handle single and multiple file upload at the same time, let us this initialize this count variable
                                // for example { "files": 5 }
                                const count_by_fieldname = req.files
                                    .map((file) => file.fieldname)
                                    .reduce((acc, curr) => {
                                    acc[curr] = (acc[curr] || 0) + 1;
                                    return acc;
                                }, {});
                                // add file(s) to body
                                Object.entries(count_by_fieldname).forEach(([fieldname, count]) => {
                                    // TODO maybe also check in the api doc if it is a single upload or multiple
                                    const is_multiple = count > 1;
                                    req.body[fieldname] = is_multiple
                                        ? new Array(count).fill('')
                                        : '';
                                });
                            }
                            resolve();
                        }
                    });
                });
                next();
            }
            catch (error) {
                next(error);
            }
        }
        else {
            next();
        }
    };
}
function shouldHandle(Ajv, req) {
    var _a, _b, _c, _d;
    const reqContentType = req.headers['content-type'];
    if (isMultipart(req) && (reqContentType === null || reqContentType === void 0 ? void 0 : reqContentType.includes('multipart/form-data'))) {
        return true;
    }
    const bodyRef = (_b = (_a = req === null || req === void 0 ? void 0 : req.openapi) === null || _a === void 0 ? void 0 : _a.schema) === null || _b === void 0 ? void 0 : _b.$ref;
    const requestBody = bodyRef
        ? Ajv.getSchema(bodyRef)
        : (_d = (_c = req === null || req === void 0 ? void 0 : req.openapi) === null || _c === void 0 ? void 0 : _c.schema) === null || _d === void 0 ? void 0 : _d.requestBody;
    const bodyContent = requestBody === null || requestBody === void 0 ? void 0 : requestBody.content;
    if (!bodyContent)
        return false;
    const content = bodyContent;
    const contentTypes = Object.entries(content);
    for (const [contentType, mediaType] of contentTypes) {
        if (!contentType.includes(reqContentType))
            continue;
        const mediaTypeSchema = mediaType === null || mediaType === void 0 ? void 0 : mediaType.schema;
        const schema = (mediaTypeSchema === null || mediaTypeSchema === void 0 ? void 0 : mediaTypeSchema.$ref)
            ? Ajv.getSchema(mediaTypeSchema.$ref)
            : mediaTypeSchema;
        const format = schema === null || schema === void 0 ? void 0 : schema.format;
        if (format === 'binary') {
            return true;
        }
    }
}
function isMultipart(req) {
    var _a, _b, _c, _d;
    return (_d = (_c = (_b = (_a = req === null || req === void 0 ? void 0 : req.openapi) === null || _a === void 0 ? void 0 : _a.schema) === null || _b === void 0 ? void 0 : _b.requestBody) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d['multipart/form-data'];
}
function error(req, err) {
    var _a;
    if (err instanceof multer.MulterError) {
        // distinguish common errors :
        // - 413 ( Request Entity Too Large ) : Too many parts / File too large / Too many files
        // - 400 ( Bad Request ) : Field * too long / Too many fields
        // - 500 ( Internal Server Error ) : Unexpected field
        const multerError = err;
        const payload_too_big = /LIMIT_(FILE|PART)_(SIZE|COUNT)/.test(multerError.code);
        const unexpected = /LIMIT_UNEXPECTED_FILE/.test(multerError.code);
        const status = payload_too_big ? 413 : !unexpected ? 400 : 500;
        return types_1.HttpError.create({
            status: status,
            path: req.path,
            message: err.message,
        });
        /*return payload_too_big
          ? new RequestEntityTooLarge({ path: req.path, message: err.message })
          : !unexpected
          ? new BadRequest({ path: req.path, message: err.message })
          : new InternalServerError({ path: req.path, message: err.message });*/
    }
    else if (err instanceof types_1.HttpError) {
        return err;
    }
    else {
        // HACK
        // TODO improve multer error handling
        const missingField = /Multipart: Boundary not found/i.test((_a = err.message) !== null && _a !== void 0 ? _a : '');
        if (missingField) {
            return new types_1.BadRequest({
                path: req.path,
                message: 'multipart file(s) required',
            });
        }
        else {
            return new types_1.InternalServerError({ path: req.path, message: err.message });
        }
    }
}
//# sourceMappingURL=openapi.multipart.js.map