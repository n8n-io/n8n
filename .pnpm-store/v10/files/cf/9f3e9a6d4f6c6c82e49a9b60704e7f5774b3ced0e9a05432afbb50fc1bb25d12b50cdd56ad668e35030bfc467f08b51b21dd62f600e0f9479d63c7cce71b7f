"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchReference = void 0;
const ProtocolOperation_1 = require("../ProtocolOperation");
const MessageResponse_1 = require("./MessageResponse");
class SearchReference extends MessageResponse_1.MessageResponse {
    constructor(options) {
        super(options);
        this.protocolOperation = ProtocolOperation_1.ProtocolOperation.LDAP_RES_SEARCH_REF;
        this.uris = options.uris || [];
    }
    parseMessage(reader) {
        const end = reader.offset + reader.length;
        while (reader.offset < end) {
            const url = reader.readString();
            this.uris.push(url);
        }
    }
}
exports.SearchReference = SearchReference;
//# sourceMappingURL=SearchReference.js.map