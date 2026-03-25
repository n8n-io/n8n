import { useDeprecated } from "./utils/utils";
import { observable, runInAction } from "mobx";
import { useState } from "react";
export function useAsObservableSource(current) {
    if ("production" !== process.env.NODE_ENV)
        useDeprecated("[mobx-react-lite] 'useAsObservableSource' is deprecated, please store the values directly in an observable, for example by using 'useLocalObservable', and sync future updates using 'useEffect' when needed. See the README for examples.");
    // We're deliberately not using idiomatic destructuring for the hook here.
    // Accessing the state value as an array element prevents TypeScript from generating unnecessary helpers in the resulting code.
    // For further details, please refer to mobxjs/mobx#3842.
    var res = useState(function () { return observable(current, {}, { deep: false }); })[0];
    runInAction(function () {
        Object.assign(res, current);
    });
    return res;
}
//# sourceMappingURL=useAsObservableSource.js.map