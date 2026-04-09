"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAsObservableSource = useAsObservableSource;
var utils_1 = require("./utils/utils");
var mobx_1 = require("mobx");
var react_1 = require("react");
function useAsObservableSource(current) {
    if ("production" !== process.env.NODE_ENV)
        (0, utils_1.useDeprecated)("[mobx-react-lite] 'useAsObservableSource' is deprecated, please store the values directly in an observable, for example by using 'useLocalObservable', and sync future updates using 'useEffect' when needed. See the README for examples.");
    // We're deliberately not using idiomatic destructuring for the hook here.
    // Accessing the state value as an array element prevents TypeScript from generating unnecessary helpers in the resulting code.
    // For further details, please refer to mobxjs/mobx#3842.
    var res = (0, react_1.useState)(function () { return (0, mobx_1.observable)(current, {}, { deep: false }); })[0];
    (0, mobx_1.runInAction)(function () {
        Object.assign(res, current);
    });
    return res;
}
//# sourceMappingURL=useAsObservableSource.js.map