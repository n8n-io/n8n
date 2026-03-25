!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e="undefined"!=typeof globalThis?globalThis:e||self).Comlink=t()}(this,(function(){"use strict";
/**
     * @license
     * Copyright 2019 Google LLC
     * SPDX-License-Identifier: Apache-2.0
     */return function(e){const t=new WeakMap;return{postMessage:e.postMessage.bind(e),addEventListener:(n,s)=>{const o=e=>{"handleEvent"in s?s.handleEvent({data:e}):s({data:e})};e.on("message",o),t.set(s,o)},removeEventListener:(n,s)=>{const o=t.get(s);o&&(e.off("message",o),t.delete(s))},start:e.start&&e.start.bind(e)}}}));
//# sourceMappingURL=node-adapter.min.js.map
