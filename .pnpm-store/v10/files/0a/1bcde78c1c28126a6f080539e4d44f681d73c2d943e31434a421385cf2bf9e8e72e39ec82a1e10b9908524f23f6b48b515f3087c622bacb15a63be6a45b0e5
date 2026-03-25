"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Control = void 0;
class Control {
    constructor(type, options = {}) {
        this.type = type;
        this.critical = options.critical === true;
    }
    write(writer) {
        writer.startSequence();
        writer.writeString(this.type);
        writer.writeBoolean(this.critical);
        this.writeControl(writer);
        writer.endSequence();
    }
    parse(reader) {
        this.parseControl(reader);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    writeControl(_) {
        // Do nothing as the default action
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    parseControl(_) {
        // Do nothing as the default action
    }
}
exports.Control = Control;
//# sourceMappingURL=Control.js.map