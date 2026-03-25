import { observable } from "mobx";
import { useState } from "react";
export function useLocalObservable(initializer, annotations) {
    return useState(function () { return observable(initializer(), annotations, { autoBind: true }); })[0];
}
//# sourceMappingURL=useLocalObservable.js.map