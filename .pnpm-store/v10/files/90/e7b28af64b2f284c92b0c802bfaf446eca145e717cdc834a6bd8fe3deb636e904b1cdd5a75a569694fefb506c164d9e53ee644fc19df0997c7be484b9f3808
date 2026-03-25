"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntryChangeNotificationControl = void 0;
const asn1_1 = require("asn1");
const Control_1 = require("./Control");
class EntryChangeNotificationControl extends Control_1.Control {
    constructor(options = {}) {
        super(EntryChangeNotificationControl.type, options);
        this.value = options.value;
    }
    parseControl(reader) {
        if (reader.readSequence()) {
            const changeType = reader.readInt();
            let previousDN;
            if (changeType === 8) {
                previousDN = reader.readString();
            }
            const changeNumber = reader.readInt();
            this.value = {
                changeType,
                previousDN,
                changeNumber,
            };
        }
    }
    writeControl(writer) {
        if (!this.value) {
            return;
        }
        const controlWriter = new asn1_1.BerWriter();
        controlWriter.startSequence();
        controlWriter.writeInt(this.value.changeType);
        if (this.value.previousDN) {
            controlWriter.writeString(this.value.previousDN);
        }
        controlWriter.writeInt(this.value.changeNumber);
        controlWriter.endSequence();
        writer.writeBuffer(controlWriter.buffer, 0x04);
    }
}
EntryChangeNotificationControl.type = '2.16.840.1.113730.3.4.7';
exports.EntryChangeNotificationControl = EntryChangeNotificationControl;
//# sourceMappingURL=EntryChangeNotificationControl.js.map