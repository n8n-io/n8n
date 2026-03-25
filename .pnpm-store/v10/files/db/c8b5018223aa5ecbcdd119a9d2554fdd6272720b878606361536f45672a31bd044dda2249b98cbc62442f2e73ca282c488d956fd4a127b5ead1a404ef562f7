"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serdes = exports.error = exports.middleware = exports.resolvers = void 0;
const cloneDeep = require("lodash.clonedeep");
const res = require("./resolvers");
const openapi_validator_1 = require("./openapi.validator");
const openapi_spec_loader_1 = require("./framework/openapi.spec.loader");
const types_1 = require("./framework/types");
// export default openapiValidator;
exports.resolvers = res;
exports.middleware = openapiValidator;
exports.error = {
    InternalServerError: types_1.InternalServerError,
    UnsupportedMediaType: types_1.UnsupportedMediaType,
    RequestEntityTooLarge: types_1.RequestEntityTooLarge,
    BadRequest: types_1.BadRequest,
    MethodNotAllowed: types_1.MethodNotAllowed,
    NotAcceptable: types_1.NotAcceptable,
    NotFound: types_1.NotFound,
    Unauthorized: types_1.Unauthorized,
    Forbidden: types_1.Forbidden,
};
exports.serdes = require("./framework/base.serdes");
function openapiValidator(options) {
    const oav = new openapi_validator_1.OpenApiValidator(options);
    exports.middleware._oav = oav;
    return oav.installMiddleware(new openapi_spec_loader_1.OpenApiSpecLoader({
        apiDoc: cloneDeep(options.apiSpec),
        validateApiSpec: options.validateApiSpec,
        $refParser: options.$refParser,
    }).load());
}
//# sourceMappingURL=index.js.map