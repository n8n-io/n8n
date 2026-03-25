"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AjaxTimeoutError = exports.AjaxError = void 0;
var getXHRResponse_1 = require("./getXHRResponse");
var createErrorClass_1 = require("../util/createErrorClass");
exports.AjaxError = createErrorClass_1.createErrorClass(function (_super) {
    return function AjaxErrorImpl(message, xhr, request) {
        this.message = message;
        this.name = 'AjaxError';
        this.xhr = xhr;
        this.request = request;
        this.status = xhr.status;
        this.responseType = xhr.responseType;
        var response;
        try {
            response = getXHRResponse_1.getXHRResponse(xhr);
        }
        catch (err) {
            response = xhr.responseText;
        }
        this.response = response;
    };
});
exports.AjaxTimeoutError = (function () {
    function AjaxTimeoutErrorImpl(xhr, request) {
        exports.AjaxError.call(this, 'ajax timeout', xhr, request);
        this.name = 'AjaxTimeoutError';
        return this;
    }
    AjaxTimeoutErrorImpl.prototype = Object.create(exports.AjaxError.prototype);
    return AjaxTimeoutErrorImpl;
})();
//# sourceMappingURL=errors.js.map