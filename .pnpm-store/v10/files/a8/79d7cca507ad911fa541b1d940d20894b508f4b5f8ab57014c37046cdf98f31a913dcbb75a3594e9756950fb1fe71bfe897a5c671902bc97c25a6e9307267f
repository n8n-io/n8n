"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchResponse = void 0;
const ProtocolOperation_1 = require("../ProtocolOperation");
const MessageResponse_1 = require("./MessageResponse");
class SearchResponse extends MessageResponse_1.MessageResponse {
    constructor(options) {
        super(options);
        this.protocolOperation = ProtocolOperation_1.ProtocolOperation.LDAP_RES_SEARCH;
        this.searchEntries = options.searchEntries || [];
        this.searchReferences = options.searchReferences || [];
    }
}
exports.SearchResponse = SearchResponse;
//# sourceMappingURL=SearchResponse.js.map