"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerSideSortingRequestControl = void 0;
const asn1_1 = require("asn1");
const Control_1 = require("./Control");
class ServerSideSortingRequestControl extends Control_1.Control {
    constructor(options = {}) {
        super(ServerSideSortingRequestControl.type, options);
        if (Array.isArray(options.value)) {
            this.values = options.value;
        }
        else if (typeof options.value === 'object') {
            this.values = [options.value];
        }
        else {
            this.values = [];
        }
    }
    parseControl(reader) {
        if (reader.readSequence(0x30)) {
            while (reader.readSequence(0x30)) {
                const attributeType = reader.readString();
                let orderingRule = '';
                let reverseOrder = false;
                if (reader.peek() === 0x80) {
                    orderingRule = reader.readString(0x80);
                }
                if (reader.peek() === 0x81) {
                    reverseOrder = reader._readTag(0x81) !== 0;
                }
                this.values.push({
                    attributeType,
                    orderingRule,
                    reverseOrder,
                });
            }
        }
    }
    writeControl(writer) {
        if (!this.values.length) {
            return;
        }
        const controlWriter = new asn1_1.BerWriter();
        controlWriter.startSequence(0x30);
        for (const value of this.values) {
            controlWriter.startSequence(0x30);
            controlWriter.writeString(value.attributeType, asn1_1.Ber.OctetString);
            if (value.orderingRule) {
                controlWriter.writeString(value.orderingRule, 0x80);
            }
            if (typeof value.reverseOrder !== 'undefined') {
                controlWriter.writeBoolean(value.reverseOrder, 0x81);
            }
            controlWriter.endSequence();
        }
        controlWriter.endSequence();
        writer.writeBuffer(controlWriter.buffer, 0x04);
    }
}
ServerSideSortingRequestControl.type = '2.16.840.1.113730.3.4.3';
exports.ServerSideSortingRequestControl = ServerSideSortingRequestControl;
//# sourceMappingURL=ServerSideSortingRequestControl.js.map