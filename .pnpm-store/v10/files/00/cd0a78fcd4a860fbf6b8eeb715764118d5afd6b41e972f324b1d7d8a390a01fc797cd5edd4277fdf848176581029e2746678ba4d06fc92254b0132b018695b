"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AjvOptions = void 0;
class AjvOptions {
    constructor(options) {
        this.options = options;
    }
    get preprocessor() {
        return this.baseOptions();
    }
    get response() {
        const { allErrors, coerceTypes, removeAdditional } = (this.options.validateResponses);
        return Object.assign(Object.assign({}, this.baseOptions()), { allErrors, useDefaults: false, coerceTypes,
            removeAdditional });
    }
    get request() {
        const { allErrors, allowUnknownQueryParameters, coerceTypes, removeAdditional } = this.options.validateRequests;
        return Object.assign(Object.assign({}, this.baseOptions()), { allErrors,
            allowUnknownQueryParameters,
            coerceTypes,
            removeAdditional });
    }
    get multipart() {
        return this.baseOptions();
    }
    baseOptions() {
        const { coerceTypes, formats, validateFormats, serDes, ajvFormats, } = this.options;
        const serDesMap = {};
        for (const serDesObject of serDes) {
            if (!serDesMap[serDesObject.format]) {
                serDesMap[serDesObject.format] = serDesObject;
            }
            else {
                if (serDesObject.serialize) {
                    serDesMap[serDesObject.format].serialize = serDesObject.serialize;
                }
                if (serDesObject.deserialize) {
                    serDesMap[serDesObject.format].deserialize = serDesObject.deserialize;
                }
            }
        }
        const options = {
            strict: false,
            strictNumbers: true,
            strictTuples: true,
            allowUnionTypes: false,
            validateSchema: false, // this is true for startup validation, thus it can be bypassed here
            coerceTypes,
            useDefaults: true,
            removeAdditional: false,
            validateFormats,
            formats,
            serDesMap,
            ajvFormats,
        };
        return options;
    }
}
exports.AjvOptions = AjvOptions;
//# sourceMappingURL=options.js.map