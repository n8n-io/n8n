"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PagedResultsControl = void 0;
const asn1_1 = require("asn1");
const Control_1 = require("./Control");
class PagedResultsControl extends Control_1.Control {
    constructor(options = {}) {
        super(PagedResultsControl.type, options);
        this.value = options.value;
    }
    parseControl(reader) {
        if (reader.readSequence()) {
            const size = reader.readInt();
            const cookie = reader.readString(asn1_1.Ber.OctetString, true) || Buffer.alloc(0);
            this.value = {
                size,
                cookie,
            };
        }
    }
    writeControl(writer) {
        if (!this.value) {
            return;
        }
        const controlWriter = new asn1_1.BerWriter();
        controlWriter.startSequence();
        controlWriter.writeInt(this.value.size);
        if (this.value.cookie && this.value.cookie.length) {
            controlWriter.writeBuffer(this.value.cookie, asn1_1.Ber.OctetString);
        }
        else {
            controlWriter.writeString('');
        }
        controlWriter.endSequence();
        writer.writeBuffer(controlWriter.buffer, 0x04);
    }
}
PagedResultsControl.type = '1.2.840.113556.1.4.319';
exports.PagedResultsControl = PagedResultsControl;
//# sourceMappingURL=PagedResultsControl.js.map