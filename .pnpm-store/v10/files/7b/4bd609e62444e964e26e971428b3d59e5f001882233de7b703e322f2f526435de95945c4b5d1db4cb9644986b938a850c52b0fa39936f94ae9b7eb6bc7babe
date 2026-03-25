"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLocalObservable = void 0;
var mobx_1 = require("mobx");
var react_1 = require("react");
function useLocalObservable(initializer, annotations) {
    return (0, react_1.useState)(function () { return (0, mobx_1.observable)(initializer(), annotations, { autoBind: true }); })[0];
}
exports.useLocalObservable = useLocalObservable;
//# sourceMappingURL=useLocalObservable.js.map