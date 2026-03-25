(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Comlink = factory());
})(this, (function () { 'use strict';

    /**
     * @license
     * Copyright 2019 Google LLC
     * SPDX-License-Identifier: Apache-2.0
     */
    function nodeEndpoint(nep) {
        const listeners = new WeakMap();
        return {
            postMessage: nep.postMessage.bind(nep),
            addEventListener: (_, eh) => {
                const l = (data) => {
                    if ("handleEvent" in eh) {
                        eh.handleEvent({ data });
                    }
                    else {
                        eh({ data });
                    }
                };
                nep.on("message", l);
                listeners.set(eh, l);
            },
            removeEventListener: (_, eh) => {
                const l = listeners.get(eh);
                if (!l) {
                    return;
                }
                nep.off("message", l);
                listeners.delete(eh);
            },
            start: nep.start && nep.start.bind(nep),
        };
    }

    return nodeEndpoint;

}));
//# sourceMappingURL=node-adapter.js.map
