"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "cloneDeep", {
    enumerable: true,
    get: function() {
        return cloneDeep;
    }
});
function cloneDeep(value) {
    if (Array.isArray(value)) {
        return value.map((child)=>cloneDeep(child));
    }
    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(Object.entries(value).map(([k, v])=>[
                k,
                cloneDeep(v)
            ]));
    }
    return value;
}
