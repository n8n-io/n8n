"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
const flattenColorPalette = (colors)=>Object.assign({}, ...Object.entries(colors !== null && colors !== void 0 ? colors : {}).flatMap(([color, values])=>typeof values == "object" ? Object.entries(flattenColorPalette(values)).map(([number, hex])=>({
                [color + (number === "DEFAULT" ? "" : `-${number}`)]: hex
            })) : [
            {
                [`${color}`]: values
            }
        ]));
const _default = flattenColorPalette;
