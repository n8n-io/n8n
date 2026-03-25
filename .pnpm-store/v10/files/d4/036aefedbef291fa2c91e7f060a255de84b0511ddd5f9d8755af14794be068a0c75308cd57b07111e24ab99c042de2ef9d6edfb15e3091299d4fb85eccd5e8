"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlParser = void 0;
const asn1_1 = require("asn1");
const controls_1 = require("./controls");
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class ControlParser {
    static parse(reader) {
        if (reader.readSequence() === null) {
            return null;
        }
        let type = '';
        let critical = false;
        let value = Buffer.alloc(0);
        if (reader.length) {
            const end = reader.offset + reader.length;
            type = reader.readString();
            if (reader.offset < end) {
                if (reader.peek() === asn1_1.Ber.Boolean) {
                    critical = reader.readBoolean();
                }
            }
            if (reader.offset < end) {
                value = reader.readString(asn1_1.Ber.OctetString, true);
            }
        }
        let control;
        switch (type) {
            case controls_1.EntryChangeNotificationControl.type:
                control = new controls_1.EntryChangeNotificationControl({
                    critical,
                });
                break;
            case controls_1.PagedResultsControl.type:
                control = new controls_1.PagedResultsControl({
                    critical,
                });
                break;
            case controls_1.PersistentSearchControl.type:
                control = new controls_1.PersistentSearchControl({
                    critical,
                });
                break;
            case controls_1.ServerSideSortingRequestControl.type:
                control = new controls_1.ServerSideSortingRequestControl({
                    critical,
                });
                break;
            default:
                return null;
        }
        const controlReader = new asn1_1.BerReader(value);
        control.parse(controlReader);
        return control;
    }
}
exports.ControlParser = ControlParser;
//# sourceMappingURL=ControlParser.js.map