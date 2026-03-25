"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersistentSearchControl = void 0;
const asn1_1 = require("asn1");
const Control_1 = require("./Control");
class PersistentSearchControl extends Control_1.Control {
    constructor(options = {}) {
        super(PersistentSearchControl.type, options);
        this.value = options.value;
    }
    parseControl(reader) {
        if (reader.readSequence()) {
            const changeTypes = reader.readInt();
            const changesOnly = reader.readBoolean();
            const returnECs = reader.readBoolean();
            this.value = {
                changeTypes,
                changesOnly,
                returnECs,
            };
        }
    }
    writeControl(writer) {
        if (!this.value) {
            return;
        }
        const controlWriter = new asn1_1.BerWriter();
        controlWriter.startSequence();
        controlWriter.writeInt(this.value.changeTypes);
        controlWriter.writeBoolean(this.value.changesOnly);
        controlWriter.writeBoolean(this.value.returnECs);
        controlWriter.endSequence();
        writer.writeBuffer(controlWriter.buffer, 0x04);
    }
}
PersistentSearchControl.type = '2.16.840.1.113730.3.4.3';
exports.PersistentSearchControl = PersistentSearchControl;
//# sourceMappingURL=PersistentSearchControl.js.map