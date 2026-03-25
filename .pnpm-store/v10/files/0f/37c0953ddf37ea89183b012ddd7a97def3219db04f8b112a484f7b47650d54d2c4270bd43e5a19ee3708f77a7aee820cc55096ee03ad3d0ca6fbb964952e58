"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return buildMediaQuery;
    }
});
function buildMediaQuery(screens) {
    screens = Array.isArray(screens) ? screens : [
        screens
    ];
    return screens.map((screen)=>{
        let values = screen.values.map((screen)=>{
            if (screen.raw !== undefined) {
                return screen.raw;
            }
            return [
                screen.min && `(min-width: ${screen.min})`,
                screen.max && `(max-width: ${screen.max})`
            ].filter(Boolean).join(" and ");
        });
        return screen.not ? `not all and ${values}` : values;
    }).join(", ");
}
