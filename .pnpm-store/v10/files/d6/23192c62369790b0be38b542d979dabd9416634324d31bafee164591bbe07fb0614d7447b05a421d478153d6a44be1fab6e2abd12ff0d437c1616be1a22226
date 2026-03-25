"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageResponse = void 0;
const Message_1 = require("./Message");
class MessageResponse extends Message_1.Message {
    constructor(options) {
        super(options);
        this.status = options.status || 0; // LDAP Success
        this.matchedDN = options.matchedDN || '';
        this.errorMessage = options.errorMessage || '';
    }
    parseMessage(reader) {
        this.status = reader.readEnumeration();
        this.matchedDN = reader.readString();
        this.errorMessage = reader.readString();
    }
}
exports.MessageResponse = MessageResponse;
//# sourceMappingURL=MessageResponse.js.map