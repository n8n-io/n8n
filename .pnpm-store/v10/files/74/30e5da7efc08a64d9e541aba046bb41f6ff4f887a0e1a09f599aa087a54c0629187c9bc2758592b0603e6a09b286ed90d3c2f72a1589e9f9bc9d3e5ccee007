"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Change = void 0;
const Attribute_1 = require("./Attribute");
class Change {
    constructor(options = {
        modification: new Attribute_1.Attribute(),
    }) {
        this.operation = options.operation || 'add';
        this.modification = options.modification;
    }
    write(writer) {
        writer.startSequence();
        switch (this.operation) {
            case 'add':
                writer.writeEnumeration(0x00);
                break;
            case 'delete':
                writer.writeEnumeration(0x01);
                break;
            case 'replace':
                writer.writeEnumeration(0x02);
                break;
            default:
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                throw new Error(`Unknown change operation: ${this.operation}`);
        }
        this.modification.write(writer);
        writer.endSequence();
    }
    parse(reader) {
        reader.readSequence();
        const operation = reader.readEnumeration();
        switch (operation) {
            case 0x00:
                this.operation = 'add';
                break;
            case 0x01:
                this.operation = 'delete';
                break;
            case 0x02:
                this.operation = 'replace';
                break;
            default:
                throw new Error(`Unknown change operation: 0x${operation.toString(16)}`);
        }
        this.modification = new Attribute_1.Attribute();
        this.modification.parse(reader);
    }
}
exports.Change = Change;
//# sourceMappingURL=Change.js.map