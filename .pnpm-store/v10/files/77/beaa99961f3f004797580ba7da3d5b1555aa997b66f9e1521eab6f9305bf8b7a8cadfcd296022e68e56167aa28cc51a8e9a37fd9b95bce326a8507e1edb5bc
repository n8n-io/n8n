"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AjaxResponse = void 0;
var getXHRResponse_1 = require("./getXHRResponse");
var AjaxResponse = (function () {
    function AjaxResponse(originalEvent, xhr, request, type) {
        if (type === void 0) { type = 'download_load'; }
        this.originalEvent = originalEvent;
        this.xhr = xhr;
        this.request = request;
        this.type = type;
        var status = xhr.status, responseType = xhr.responseType;
        this.status = status !== null && status !== void 0 ? status : 0;
        this.responseType = responseType !== null && responseType !== void 0 ? responseType : '';
        var allHeaders = xhr.getAllResponseHeaders();
        this.responseHeaders = allHeaders
            ?
                allHeaders.split('\n').reduce(function (headers, line) {
                    var index = line.indexOf(': ');
                    headers[line.slice(0, index)] = line.slice(index + 2);
                    return headers;
                }, {})
            : {};
        this.response = getXHRResponse_1.getXHRResponse(xhr);
        var loaded = originalEvent.loaded, total = originalEvent.total;
        this.loaded = loaded;
        this.total = total;
    }
    return AjaxResponse;
}());
exports.AjaxResponse = AjaxResponse;
//# sourceMappingURL=AjaxResponse.js.map