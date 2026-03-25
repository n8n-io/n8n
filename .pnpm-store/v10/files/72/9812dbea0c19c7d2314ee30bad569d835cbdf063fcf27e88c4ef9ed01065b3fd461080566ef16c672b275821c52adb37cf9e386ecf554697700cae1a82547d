"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedCodeMap = void 0;
const source_map_1 = require("@volar/source-map");
class LinkedCodeMap extends source_map_1.SourceMap {
    *getLinkedOffsets(start) {
        for (const mapped of this.toGeneratedLocation(start)) {
            yield mapped[0];
        }
        for (const mapped of this.toSourceLocation(start)) {
            yield mapped[0];
        }
    }
}
exports.LinkedCodeMap = LinkedCodeMap;
//# sourceMappingURL=linkedCodeMap.js.map