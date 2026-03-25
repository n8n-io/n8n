"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prerelease = void 0;
function prerelease(apiVersion) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            const warnmsg = `This is a prerelease feature implemented against the ${apiVersion} version of our API.`;
            console.warn(warnmsg);
            return originalMethod.apply(this, args);
        };
        return descriptor;
    };
}
exports.prerelease = prerelease;
//# sourceMappingURL=prerelease.js.map