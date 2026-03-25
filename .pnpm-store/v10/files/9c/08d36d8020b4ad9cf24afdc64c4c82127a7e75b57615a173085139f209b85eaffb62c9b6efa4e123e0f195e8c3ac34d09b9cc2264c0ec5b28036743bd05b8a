"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSerDes = exports.date = exports.dateTime = void 0;
const types_1 = require("./types");
exports.dateTime = new types_1.SerDesSingleton({
    format: 'date-time',
    serialize: (d) => {
        return d && d.toISOString();
    },
    deserialize: (s) => {
        return new Date(s);
    }
});
exports.date = new types_1.SerDesSingleton({
    format: 'date',
    serialize: (d) => {
        return d && d.toISOString().split('T')[0];
    },
    deserialize: (s) => {
        return new Date(s);
    }
});
exports.defaultSerDes = [
    exports.date.serializer,
    exports.dateTime.serializer
];
//# sourceMappingURL=base.serdes.js.map