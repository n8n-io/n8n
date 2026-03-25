"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchEntry = void 0;
const Attribute_1 = require("../Attribute");
const ProtocolOperation_1 = require("../ProtocolOperation");
const MessageResponse_1 = require("./MessageResponse");
class SearchEntry extends MessageResponse_1.MessageResponse {
    constructor(options) {
        super(options);
        this.protocolOperation = ProtocolOperation_1.ProtocolOperation.LDAP_RES_SEARCH_ENTRY;
        this.name = options.name || '';
        this.attributes = options.attributes || [];
    }
    parseMessage(reader) {
        this.name = reader.readString();
        reader.readSequence();
        const end = reader.offset + reader.length;
        while (reader.offset < end) {
            const attribute = new Attribute_1.Attribute();
            attribute.parse(reader);
            this.attributes.push(attribute);
        }
    }
    toObject(requestAttributes, explicitBufferAttributes) {
        const result = {
            dn: this.name,
        };
        const hasExplicitBufferAttributes = explicitBufferAttributes && explicitBufferAttributes.length;
        for (const attribute of this.attributes) {
            let { values } = attribute;
            if (hasExplicitBufferAttributes && explicitBufferAttributes.includes(attribute.type)) {
                values = attribute.parsedBuffers;
            }
            if (values && values.length) {
                if (values.length === 1) {
                    result[attribute.type] = values[0] ?? [];
                }
                else {
                    result[attribute.type] = values;
                }
            }
            else {
                result[attribute.type] = [];
            }
        }
        // Fill in any missing attributes that were requested
        for (const attribute of requestAttributes) {
            if (typeof result[attribute] === 'undefined') {
                result[attribute] = [];
            }
        }
        return result;
    }
}
exports.SearchEntry = SearchEntry;
//# sourceMappingURL=SearchEntry.js.map