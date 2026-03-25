"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getXHRResponse = void 0;
function getXHRResponse(xhr) {
    switch (xhr.responseType) {
        case 'json': {
            if ('response' in xhr) {
                return xhr.response;
            }
            else {
                var ieXHR = xhr;
                return JSON.parse(ieXHR.responseText);
            }
        }
        case 'document':
            return xhr.responseXML;
        case 'text':
        default: {
            if ('response' in xhr) {
                return xhr.response;
            }
            else {
                var ieXHR = xhr;
                return ieXHR.responseText;
            }
        }
    }
}
exports.getXHRResponse = getXHRResponse;
//# sourceMappingURL=getXHRResponse.js.map