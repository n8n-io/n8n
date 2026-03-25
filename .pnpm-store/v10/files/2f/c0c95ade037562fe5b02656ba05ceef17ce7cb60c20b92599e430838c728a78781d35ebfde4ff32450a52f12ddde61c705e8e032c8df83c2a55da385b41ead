import { getXHRResponse } from './getXHRResponse';
import { createErrorClass } from '../util/createErrorClass';
export var AjaxError = createErrorClass(function (_super) {
    return function AjaxErrorImpl(message, xhr, request) {
        this.message = message;
        this.name = 'AjaxError';
        this.xhr = xhr;
        this.request = request;
        this.status = xhr.status;
        this.responseType = xhr.responseType;
        var response;
        try {
            response = getXHRResponse(xhr);
        }
        catch (err) {
            response = xhr.responseText;
        }
        this.response = response;
    };
});
export var AjaxTimeoutError = (function () {
    function AjaxTimeoutErrorImpl(xhr, request) {
        AjaxError.call(this, 'ajax timeout', xhr, request);
        this.name = 'AjaxTimeoutError';
        return this;
    }
    AjaxTimeoutErrorImpl.prototype = Object.create(AjaxError.prototype);
    return AjaxTimeoutErrorImpl;
})();
//# sourceMappingURL=errors.js.map