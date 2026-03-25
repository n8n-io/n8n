"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLocalStore = void 0;
var mobx_1 = require("mobx");
var react_1 = require("react");
var utils_1 = require("./utils/utils");
var useAsObservableSource_1 = require("./useAsObservableSource");
function useLocalStore(initializer, current) {
    if ("production" !== process.env.NODE_ENV) {
        (0, utils_1.useDeprecated)("[mobx-react-lite] 'useLocalStore' is deprecated, use 'useLocalObservable' instead.");
    }
    var source = current && (0, useAsObservableSource_1.useAsObservableSource)(current);
    return (0, react_1.useState)(function () { return (0, mobx_1.observable)(initializer(source), undefined, { autoBind: true }); })[0];
}
exports.useLocalStore = useLocalStore;
//# sourceMappingURL=useLocalStore.js.map