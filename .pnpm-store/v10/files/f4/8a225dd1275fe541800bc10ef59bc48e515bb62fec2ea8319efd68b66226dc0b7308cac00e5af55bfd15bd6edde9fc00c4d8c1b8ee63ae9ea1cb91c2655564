"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCorrect = exports.isInSubnet = void 0;
function isInSubnet(address) {
    if (this.subnetMask < address.subnetMask) {
        return false;
    }
    if (this.mask(address.subnetMask) === address.mask()) {
        return true;
    }
    return false;
}
exports.isInSubnet = isInSubnet;
function isCorrect(defaultBits) {
    return function () {
        if (this.addressMinusSuffix !== this.correctForm()) {
            return false;
        }
        if (this.subnetMask === defaultBits && !this.parsedSubnet) {
            return true;
        }
        return this.parsedSubnet === String(this.subnetMask);
    };
}
exports.isCorrect = isCorrect;
//# sourceMappingURL=common.js.map