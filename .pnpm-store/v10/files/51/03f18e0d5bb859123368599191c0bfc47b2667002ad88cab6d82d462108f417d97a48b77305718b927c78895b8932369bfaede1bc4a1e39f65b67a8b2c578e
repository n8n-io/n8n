"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfoOverride = void 0;
const InfoOverride = (newInfo) => {
    return {
        Info: {
            leave(info) {
                if (typeof newInfo !== 'object' || Array.isArray(newInfo) || newInfo === null) {
                    throw new Error(`"info-override" decorator should be called with an object`);
                }
                const { severity: _, ...rest } = newInfo;
                Object.assign(info, rest);
            },
        },
    };
};
exports.InfoOverride = InfoOverride;
