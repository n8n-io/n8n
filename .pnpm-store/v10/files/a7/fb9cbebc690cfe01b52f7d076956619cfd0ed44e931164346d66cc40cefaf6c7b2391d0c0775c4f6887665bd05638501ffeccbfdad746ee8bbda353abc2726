import { observable } from "mobx";
import { useState } from "react";
import { useDeprecated } from "./utils/utils";
import { useAsObservableSource } from "./useAsObservableSource";
export function useLocalStore(initializer, current) {
    if ("production" !== process.env.NODE_ENV) {
        useDeprecated("[mobx-react-lite] 'useLocalStore' is deprecated, use 'useLocalObservable' instead.");
    }
    var source = current && useAsObservableSource(current);
    return useState(function () { return observable(initializer(source), undefined, { autoBind: true }); })[0];
}
//# sourceMappingURL=useLocalStore.js.map