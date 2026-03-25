"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return negateValue;
    }
});
function negateValue(value) {
    value = `${value}`;
    if (value === "0") {
        return "0";
    }
    // Flip sign of numbers
    if (/^[+-]?(\d+|\d*\.\d+)(e[+-]?\d+)?(%|\w+)?$/.test(value)) {
        return value.replace(/^[+-]?/, (sign)=>sign === "-" ? "" : "-");
    }
    // What functions we support negating numeric values for
    // var() isn't inherently a numeric function but we support it anyway
    // The trigonometric functions are omitted because you'll need to use calc(…) with them _anyway_
    // to produce generally useful results and that will be covered already
    let numericFunctions = [
        "var",
        "calc",
        "min",
        "max",
        "clamp"
    ];
    for (const fn of numericFunctions){
        if (value.includes(`${fn}(`)) {
            return `calc(${value} * -1)`;
        }
    }
}
