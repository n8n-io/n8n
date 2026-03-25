"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Filters = void 0;
var classes_js_1 = require("./classes.js");
Object.defineProperty(exports, "Filters", { enumerable: true, get: function () { return classes_js_1.Filters; } });
const classes_js_2 = require("./classes.js");
const filter = () => {
    return {
        byProperty: (name, length = false) => {
            return new classes_js_2.FilterProperty(name, length);
        },
        byRef: (linkOn) => {
            return new classes_js_2.FilterRef({ type_: 'single', linkOn: linkOn });
        },
        byRefMultiTarget: (linkOn, targetCollection) => {
            return new classes_js_2.FilterRef({
                type_: 'multi',
                linkOn: linkOn,
                targetCollection: targetCollection,
            });
        },
        byRefCount: (linkOn) => {
            return new classes_js_2.FilterCount(linkOn);
        },
        byId: () => {
            return new classes_js_2.FilterId();
        },
        byCreationTime: () => {
            return new classes_js_2.FilterCreationTime();
        },
        byUpdateTime: () => {
            return new classes_js_2.FilterUpdateTime();
        },
    };
};
exports.default = filter;
