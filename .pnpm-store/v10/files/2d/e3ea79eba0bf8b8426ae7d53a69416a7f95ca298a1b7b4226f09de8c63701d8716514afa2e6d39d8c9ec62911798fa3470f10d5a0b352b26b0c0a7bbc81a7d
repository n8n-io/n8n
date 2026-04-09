"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECEIVED_LABEL = exports.EXPECTED_LABEL = exports.RECEIVED_COLOR = exports.EXPECTED_COLOR = void 0;
exports.printReceived = printReceived;
exports.printExpected = printExpected;
const colorette_1 = require("colorette");
exports.EXPECTED_COLOR = colorette_1.green;
exports.RECEIVED_COLOR = colorette_1.red;
exports.EXPECTED_LABEL = 'Expected';
exports.RECEIVED_LABEL = 'Received';
function printReceived(received) {
    return (0, exports.RECEIVED_COLOR)(JSON.stringify(received, null, 2));
}
function printExpected(expected) {
    return (0, exports.EXPECTED_COLOR)(JSON.stringify(expected, null, 2));
}
//# sourceMappingURL=print-message.js.map