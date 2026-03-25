"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formats = void 0;
const maxInt32 = 2 ** 31 - 1;
const minInt32 = (-2) ** 31;
const maxInt64 = 2 ** 63 - 1;
const minInt64 = (-2) ** 63;
const maxFloat = (2 - 2 ** -23) * 2 ** 127;
const minPosFloat = 2 ** -126;
const minFloat = -1 * maxFloat;
const maxNegFloat = -1 * minPosFloat;
const alwaysTrue = () => true;
const base64regExp = /^[A-Za-z0-9+/]*(=|==)?$/;
exports.formats = {
    int32: {
        validate: (i) => Number.isInteger(i) && i <= maxInt32 && i >= minInt32,
        type: 'number',
    },
    int64: {
        validate: (i) => Number.isInteger(i) && i <= maxInt64 && i >= minInt64,
        type: 'number',
    },
    float: {
        validate: (i) => typeof i === 'number' &&
            (i === 0 ||
                (i <= maxFloat && i >= minPosFloat) ||
                (i >= minFloat && i <= maxNegFloat)),
        type: 'number',
    },
    double: {
        validate: (i) => typeof i === 'number',
        type: 'number',
    },
    byte: (b) => b.length % 4 === 0 && base64regExp.test(b),
    binary: alwaysTrue,
    password: alwaysTrue,
};
//# sourceMappingURL=formats.js.map