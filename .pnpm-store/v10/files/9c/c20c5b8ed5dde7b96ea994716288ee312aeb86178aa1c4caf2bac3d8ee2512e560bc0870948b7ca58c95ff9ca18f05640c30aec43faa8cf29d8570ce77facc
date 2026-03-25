"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufferTextMapGetter = void 0;
/*
same as open telemetry's `defaultTextMapGetter`,
but also handle case where header is buffer,
adding toString() to make sure string is returned
*/
exports.bufferTextMapGetter = {
    get(carrier, key) {
        if (!carrier) {
            return undefined;
        }
        const keys = Object.keys(carrier);
        for (const carrierKey of keys) {
            if (carrierKey === key || carrierKey.toLowerCase() === key) {
                return carrier[carrierKey]?.toString();
            }
        }
        return undefined;
    },
    keys(carrier) {
        return carrier ? Object.keys(carrier) : [];
    },
};
//# sourceMappingURL=propagator.js.map